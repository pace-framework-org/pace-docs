---
title: Commit Signing
description: Configure SSH commit signing so your commits pass the verified signature requirement on pace-framework-starter main.
sidebar:
  order: 3
---

The `main` branch of `pace-framework-starter` requires **verified commit signatures**. Unsigned commits will be rejected by GitHub when you push or open a pull request.

This page shows you how to set up SSH signing — no GPG installation required.

## Why signing is required

Signed commits prove that a commit was made by the person whose account it claims. For an open-source framework used in production pipelines, this reduces the risk of supply chain tampering.

## Option A — SSH signing (recommended)

SSH signing uses the same key type you already use for `git push`. No additional tools needed beyond OpenSSH, which ships with macOS and most Linux distributions.

### 1. Generate a signing key

Create a dedicated key for signing (separate from your authentication key):

```bash
ssh-keygen -t ed25519 -C "you@example.com" -f ~/.ssh/github_signing -N ""
```

This creates:
- `~/.ssh/github_signing` — private key (never share this)
- `~/.ssh/github_signing.pub` — public key (added to GitHub)

### 2. Add the key to GitHub as a Signing Key

1. Copy your public key:
   ```bash
   cat ~/.ssh/github_signing.pub
   ```
2. Go to **github.com → Settings → SSH and GPG keys → New SSH key**
3. Set **Key type** to **Signing Key** (not Authentication Key)
4. Paste the public key and save

:::caution
Make sure you select **Signing Key**, not **Authentication Key**. GitHub treats these separately — an authentication key will not verify commits.
:::

### 3. Configure git globally

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/github_signing.pub
git config --global commit.gpgsign true
```

All future commits on this machine will be signed automatically.

### 4. Verify it works

Make a test commit and inspect the signature:

```bash
echo "test" >> /tmp/test.txt
cd /tmp && git init test-sign && cd test-sign
git add . && git commit -m "test signing"
git cat-file commit HEAD | grep gpgsig
```

You should see `gpgsig -----BEGIN SSH SIGNATURE-----`. If the line is absent, revisit step 3.

### 5. Check your local repo config

If a repo has `commit.gpgsign=false` set locally (which overrides the global setting), fix it:

```bash
# Inside pace-framework-starter/
git config --local commit.gpgsign true
```

---

## Option B — GPG signing

If you already have a GPG setup, you can use it instead.

### 1. Install GPG

```bash
# macOS
brew install gnupg

# Ubuntu/Debian
sudo apt install gnupg
```

### 2. Generate a GPG key

```bash
gpg --full-generate-key
```

Choose RSA 4096 or Ed25519. Use the same email address as your GitHub account.

### 3. Export and add to GitHub

```bash
# Get your key ID
gpg --list-secret-keys --keyid-format LONG

# Export the public key (replace KEY_ID with yours)
gpg --armor --export KEY_ID
```

Go to **github.com → Settings → SSH and GPG keys → New GPG key** and paste the output.

### 4. Configure git

```bash
git config --global user.signingkey KEY_ID
git config --global commit.gpgsign true
```

---

## Troubleshooting

### "No signature" after committing

Check that the local repo is not overriding the global setting:

```bash
git config --local --list | grep gpgsign
```

If it shows `commit.gpgsign=false`, run:

```bash
git config --local commit.gpgsign true
```

### "cannot run gpg: No such file or directory"

GPG is not installed, or `gpg.format` is not set to `ssh`. If you want SSH signing, make sure you have run:

```bash
git config --global gpg.format ssh
```

### Push rejected — "Commits must have verified signatures"

GitHub could not verify your commit's signature. Common causes:

1. The key was added as **Authentication Key** instead of **Signing Key** on GitHub
2. The commit author email (`user.email`) does not match a verified email on your GitHub account
3. The commit was made before signing was configured — re-commit with signing enabled

To check your commit author email:

```bash
git config user.email
```

This must match a verified email at **github.com → Settings → Emails**.

---

## Next steps

Once signing is configured, you are ready to [Submit a PR](/contributing/submit-a-pr/).
