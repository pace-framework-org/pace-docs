import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'PACE Framework',
      description: 'AI-driven sprint execution for software teams. Plan · Architect · Code · Evaluate.',
      favicon: '/favicon.svg',
      logo: {
        light: './src/assets/pace-logo-light.svg',
        dark: './src/assets/pace-logo-dark.svg',
        alt: 'PACE Framework',
        replacesTitle: true,
      },
      social: {
        github: 'https://github.com/pace-framework-org/pace-framework-starter',
      },
      editLink: {
        baseUrl: 'https://github.com/pace-framework-org/pace-docs/edit/main/',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', link: '/' },
            { label: 'Quickstart', link: '/tutorials/quickstart/' },
            { label: 'Your First Sprint', link: '/tutorials/first-sprint/' },
            { label: 'Add PACE to an Existing Project', link: '/tutorials/existing-project/' },
          ],
        },
        {
          label: 'Language Stack Tutorials',
          items: [
            { label: 'Java (Spring Boot)', link: '/tutorials/java/' },
            { label: 'C# (.NET)', link: '/tutorials/csharp/' },
            { label: 'Node.js / TypeScript', link: '/tutorials/nodejs/' },
            { label: 'Go', link: '/tutorials/go/' },
          ],
        },
        {
          label: 'Platform Integration Tutorials',
          items: [
            { label: 'GitHub Actions', link: '/tutorials/github-actions/' },
            { label: 'GitLab CI/CD', link: '/tutorials/gitlab-cicd/' },
            { label: 'Jenkins', link: '/tutorials/jenkins/' },
            { label: 'Bitbucket Pipelines', link: '/tutorials/bitbucket-pipelines/' },
          ],
        },
        {
          label: 'How-To Guides',
          items: [
            { label: 'Configure Your Project', link: '/guides/configure-your-project/' },
            { label: 'Switch LLM Provider', link: '/guides/switch-llm-provider/' },
            { label: 'Switch Platform', link: '/guides/switch-platform/' },
            { label: 'Write a Sprint Plan', link: '/guides/write-a-sprint-plan/' },
            { label: 'Set Human Gate Days', link: '/guides/set-human-gate-days/' },
            { label: 'Push Advisory Findings to Issues', link: '/guides/push-advisory-to-issues/' },
            { label: 'Control Daily API Spend', link: '/guides/budget-cap/' },
            { label: 'Connect PACE to Jira', link: '/guides/jira-adapter/' },
            { label: 'Add a New Platform', link: '/guides/add-a-new-platform/' },
            { label: 'Add a New LLM Provider', link: '/guides/add-a-new-llm/' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'The PACE Pipeline', link: '/concepts/pipeline/' },
            { label: 'Advisory Backlog', link: '/concepts/advisory-backlog/' },
            { label: 'SCRIBE & Context Documents', link: '/concepts/scribe-and-context/' },
            { label: 'Platform Adapters', link: '/concepts/platform-adapters/' },
            { label: 'LLM Adapters', link: '/concepts/llm-adapters/' },
            { label: 'BMAD vs PACE', link: '/concepts/bmad-vs-pace/' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'pace.config.yaml', link: '/reference/pace-config-yaml/' },
            { label: 'plan.yaml Fields', link: '/reference/plan-yaml/' },
            { label: 'Agent Output Schemas', link: '/reference/agent-outputs/' },
            { label: 'Environment Variables', link: '/reference/env-vars/' },
            { label: 'CLI Commands', link: '/reference/cli/' },
          ],
        },
        {
          label: 'Contributing',
          items: [
            { label: 'Overview', link: '/contributing/overview/' },
            { label: 'Dev Environment Setup', link: '/contributing/dev-setup/' },
            { label: 'Commit Signing', link: '/contributing/commit-signing/' },
            { label: 'Submit a Pull Request', link: '/contributing/submit-a-pr/' },
          ],
        },
      ],
    }),
  ],
  site: 'https://pace-framework.org',
});
