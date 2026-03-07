---
title: Run PACE on Jenkins
description: Automate your PACE sprint with a Jenkins declarative pipeline — parameterized day triggers, credentials binding, and artifact archiving.
sidebar:
  order: 11
---

This tutorial shows how to run PACE inside a Jenkins declarative pipeline. Each sprint day is triggered via a parameterized build, PACE writes code back to the branch, and `.pace/` outputs are archived as build artifacts.

## How it works

```
Engineer triggers parameterized build (DAY=3)
        ↓
Jenkins agent clones repository
        ↓
pip install pace dependencies
        ↓
python pace/orchestrator.py --day 3
  ├── PRIME generates story card
  ├── FORGE writes code + commits
  ├── GATE runs your test suite
  ├── SENTINEL checks for issues
  ├── CONDUIT reviews CI config
  └── SCRIBE updates docs
        ↓
Outputs: .pace/day-3/ archived, advisory written to .pace/
```

## Prerequisites

- PACE cloned into the `pace/` subdirectory of your repo
- Jenkins with the **Pipeline** and **Git** plugins installed
- Python 3.11+ available on the agent
- `ANTHROPIC_API_KEY` stored as a Jenkins credential (Secret text)

## 1 — Add Jenkins credentials

Go to **Jenkins → Manage Jenkins → Credentials → (global)** and add:

| ID | Type | Value |
|----|------|-------|
| `ANTHROPIC_API_KEY` | Secret text | Your Anthropic API key |
| `JENKINS_API_TOKEN` | Secret text | Jenkins API token (for PACE CI polling) |

For other LLM providers, see the [Environment Variables reference](/reference/env-vars/).

## 2 — Configure `pace.config.yaml`

Set `platform.type: jenkins`:

```yaml
platform:
  type: jenkins
```

Jenkins does not have a native PR or issue concept, so PACE writes these to local files. For issue tracking alongside Jenkins CI, see [Combining Jira with Jenkins CI](/guides/jira-adapter/#combining-jira-with-jenkins-ci).

## 3 — Create the Jenkinsfile

Add a `Jenkinsfile` to your repo root:

```groovy
pipeline {
    agent any

    parameters {
        string(
            name: 'DAY',
            defaultValue: '1',
            description: 'Sprint day number to run'
        )
        booleanParam(
            name: 'RETRY',
            defaultValue: false,
            description: 'Re-run the same day after fixing a HOLD'
        )
    }

    environment {
        ANTHROPIC_API_KEY = credentials('ANTHROPIC_API_KEY')
        JENKINS_URL_ENV   = "${env.JENKINS_URL}"
        JENKINS_USER      = 'admin'
        JENKINS_TOKEN     = credentials('JENKINS_API_TOKEN')
        JENKINS_JOB_NAME  = "${env.JOB_NAME}"
    }

    stages {
        stage('Setup') {
            steps {
                sh '''
                    cd pace
                    python3 -m venv .venv
                    source .venv/bin/activate
                    pip install -r requirements.txt
                '''
            }
        }

        stage('Run PACE') {
            steps {
                sh '''
                    cd pace
                    source .venv/bin/activate
                    RETRY_FLAG=""
                    if [ "$RETRY" = "true" ]; then RETRY_FLAG="--retry"; fi
                    python pace/orchestrator.py --day $DAY $RETRY_FLAG
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts(
                artifacts: '.pace/**/*',
                allowEmptyArchive: true
            )
            archiveArtifacts(
                artifacts: 'jenkins-summary.md',
                allowEmptyArchive: true
            )
        }
    }
}
```

:::note
PACE's Jenkins adapter writes PR descriptions and escalation issues to local files (`.pace/day-N/review-pr.md`, `.pace/day-N/escalation-issue.md`) since Jenkins has no native PR or issue concept. These are archived as build artifacts.
:::

## 4 — Trigger a day

### Via the Jenkins UI

1. Open the pipeline job
2. Click **Build with Parameters**
3. Set `DAY` to the sprint day number (e.g. `3`)
4. Click **Build**

### Via the Jenkins REST API

```bash
curl -X POST \
  "https://ci.example.com/job/my-pace-pipeline/buildWithParameters" \
  --user "admin:$JENKINS_API_TOKEN" \
  --data-urlencode "DAY=3" \
  --data-urlencode "RETRY=false"
```

## 5 — View outputs

After the build completes:

- **Build artifacts** — click **Build → Artifacts** to download `.pace/day-N/` and `jenkins-summary.md`
- **Console output** — the orchestrator streams logs directly to the Jenkins console
- **Advisory files** — if `advisory.push_to_issues: true`, findings are written to `.pace/advisory-dayN-agent.md` and archived

## 6 — Language-specific setup

Install the language runtime on your Jenkins agent or use a Docker agent.

### Java (Maven) — shell agent

```groovy
stage('Setup') {
    steps {
        sh '''
            java -version
            mvn -version
            cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
        '''
    }
}
```

Ensure the Maven and Java installations are configured in **Manage Jenkins → Global Tool Configuration**.

### Java (Maven) — Docker agent

```groovy
pipeline {
    agent {
        docker { image 'maven:3.9-eclipse-temurin-21' }
    }
    // ...
    stage('Setup') {
        steps {
            sh 'apt-get update -q && apt-get install -y python3 python3-pip python3-venv'
            sh 'cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt'
        }
    }
}
```

### C# (.NET) — Docker agent

```groovy
agent {
    docker { image 'mcr.microsoft.com/dotnet/sdk:8.0' }
}
```

Add `apt-get install -y python3 python3-pip python3-venv` to the Setup stage.

### Node.js — shell agent with nvm

```groovy
stage('Setup') {
    steps {
        sh '''
            export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"
            nvm use 20
            npm ci
            cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
        '''
    }
}
```

### Go — shell agent

```groovy
stage('Setup') {
    steps {
        sh '''
            go version
            cd pace && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
        '''
    }
}
```

## 7 — Combining Jenkins CI with Jira issue tracking

A common enterprise pattern: Jenkins handles CI polling, Jira handles issue creation.

Set `platform.type: jira` in `pace.config.yaml`:

```yaml
platform:
  type: jira
```

Add Jira credentials to Jenkins:

```groovy
environment {
    ANTHROPIC_API_KEY = credentials('ANTHROPIC_API_KEY')
    JIRA_URL          = 'https://mycompany.atlassian.net'
    JIRA_EMAIL        = credentials('JIRA_EMAIL')
    JIRA_TOKEN        = credentials('JIRA_TOKEN')
    JIRA_PROJECT_KEY  = 'ENG'
}
```

With this configuration:
- PACE will NOT poll Jenkins for CI results (Jira adapter returns `no_runs`)
- HOLD escalations open Jira bugs
- Advisory findings open Jira tasks (if `advisory.push_to_issues: true`)

See [Connect PACE to Jira](/guides/jira-adapter/) for the full Jira setup guide.

## 8 — Retrying a HOLD day

When GATE issues a HOLD, the build fails and the escalation is written to `.pace/day-N/escalation-issue.md` (or a Jira bug if using Jira). After you push a fix:

1. Click **Build with Parameters**
2. Set the same `DAY` number
3. Set `RETRY` to `true`
4. Click **Build**

## Common issues

**`python3: command not found`**
Install Python 3.11+ on the Jenkins agent, or use a Docker agent with a Python image. Ensure Python is on the agent's `PATH`.

**`source` command not found in sh steps**
Jenkins `sh` uses `/bin/sh` by default, which may not support `source`. Replace `source .venv/bin/activate` with `. .venv/bin/activate` (POSIX-compatible).

**`git push` fails — permission denied**
FORGE commits and pushes to the remote branch. Ensure the Jenkins agent has write access to the repository. Configure SSH keys or a personal access token in the Git plugin under **Manage Jenkins → Credentials**.

**CI polling returns `no_runs` unexpectedly**
If `platform.type: jenkins` and the Git plugin is not installed, PACE cannot match builds to commit SHAs. Install the **Git plugin** and verify your job records commit metadata in the build console. See [Switch Platform — Jenkins](/guides/switch-platform/#jenkins) for details.

**Artifacts not archived on HOLD**
The `post { always { archiveArtifacts ... } }` block runs regardless of build result. If artifacts are missing, confirm `.pace/` exists after the failed PACE run — a very early failure (e.g. missing credentials) may abort before PACE writes any output.
