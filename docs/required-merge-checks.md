# Require CI before merging into main

The existing `.github/workflows/ci.yml` runs on every push and pull request, without
path filters. Its job `Unit, build, and Chromium` runs `npm ci`, `npm test` (unit tests
and production build), and the full Chromium Playwright suite with `--forbid-only`.
The current `npm run lint` command is only an alias for the production build; there
is no separate lint engine. These checks do not test a deployed Supabase database.

## One-time GitHub setup

An owner/admin must enable this in the repository settings. A workflow alone cannot
prevent merges. On inspection, `main` had no protection and the repository had no
rulesets. The connected GitHub integration cannot change these settings.

1. Open https://github.com/Miola585/MoodJournal/settings/branches.
2. Add a **classic branch protection rule** with branch name pattern `main`.
3. Enable **Require a pull request before merging**. For solo development, leave
   required approvals off unless another reviewer is available.
4. Enable **Require status checks to pass before merging**. Select the exact check
   **Unit, build, and Chromium**, from GitHub Actions. Do not enter the workflow name
   `CI` as a substitute for the job name.
5. Enable **Require branches to be up to date before merging**.
6. Enable **Do not allow bypassing the above settings**, so it applies to admins too.
7. Leave force pushes and branch deletions disabled, then save the rule.

An open PR runs CI immediately and reruns it after new commits. A pending/failed job
must block merging. Updating a branch against a changed `main` must run fresh checks.
CI does not first begin when Merge is clicked; the required check gates that button.
Do not enable automatic merging unless deliberately wanted.

If a merge queue is enabled later, add the `merge_group` event to the CI workflow
first. This setup does not enable a queue.

GitHub documentation:
https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
