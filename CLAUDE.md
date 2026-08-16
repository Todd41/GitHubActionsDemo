# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A sandbox for exploring GitHub Actions features. The Node.js app under `src/` exists only to give the
workflows something real to install, lint, test, and "deploy" — it is not a product. The interesting
content of this repo is the workflow/action YAML under `.github/`.

## Commands

- `npm test` — run the test suite (`node --test`, no external test runner)
- `npm run lint` — syntax-check `src/greet.js` and `src/index.js` via `node --check`
- `npm start` — run the CLI (`node src/index.js [name]`); reads an optional `GREETING_SECRET` env var
- Run a single test file directly: `node --test test/greet.test.js`

There is no build step (plain ESM, no bundler/TS).

## Architecture

### App

- `src/greet.js` exports `greet(name, secretPhrase)`, a pure function.
- `src/index.js` is the CLI entry point: reads a name from `process.argv[2]` and the `GREETING_SECRET`
  env var, then calls `greet`. The env var exists specifically to demonstrate secret propagation through
  the workflow layers below — printing it is intentional, not a leftover.
- `test/greet.test.js` uses the built-in `node:test`/`node:assert` modules — no Jest/Mocha/etc.

### GitHub Actions layers

The workflows are deliberately layered to exercise composite actions, reusable workflows, matrices, and
environments together rather than being flattened into one file:

1. **`.github/actions/setup-node-app/action.yml`** — composite action. Wraps `actions/setup-node` (with
   npm caching) + `npm ci`. Used by every job below instead of duplicating setup steps.

2. **`.github/workflows/reusable-ci.yml`** — reusable workflow (`workflow_call`). Takes a `node-version`
   input and an optional `greeting-secret` secret; runs lint, test, and the CLI. This is the actual
   install/lint/test logic — it has no `on.push`/`on.pull_request` of its own and only runs when called.
   It also writes a `dist/release.json` build-provenance file (commit, Node version, build time —
   deliberately no secrets) and uploads it as artifact `dist-node-<node-version>`.

3. **`.github/workflows/ci.yml`** — the caller/orchestrator, triggered on `push` to `main`,
   `pull_request`, and `workflow_dispatch`:
   - `test` job: matrix over Node versions (currently just `24`), each matrix leg calling `reusable-ci.yml`
     and forwarding `secrets.GREETING_SECRET` through as `greeting-secret`. The matrix entries must stay in
     sync with the required status checks on the `main` branch ruleset (`test (<version>) / build-and-test`)
     — adding/removing a version here without updating the ruleset will leave a stale required check that
     can never pass, or a real check that isn't required.
   - `deploy` job: depends on `test`; gated with `environment: production` (or the `workflow_dispatch`
     `environment` input). Its `if` restricts it to `push` on `main` or manual dispatch — on a
     `pull_request` run it reports as **skipped**, not failed. This is the intended way to see
     environment-scoped secrets and (if required reviewers are configured on the `production`
     environment) manual-approval gating. It downloads the `dist-node-24` artifact the `test` job
     produced and deploys that, rather than rebuilding — the artifact name is hardcoded to match the
     matrix's single `24` entry, so it has to be updated in lockstep if the matrix changes.

4. **`.github/workflows/github-actions-demo.yml`** — the original GitHub-generated starter workflow
   (`on: [push]`, a handful of `echo` steps). Left untouched as the baseline/reference; not part of the
   layered CI above.

### Conventions to preserve when extending this

- Keep setup/caching logic in the composite action, not copy-pasted into workflow steps.
- Keep the install/test logic in the reusable workflow so it stays callable with different inputs
  (e.g. different Node versions) rather than duplicated per-workflow.
- New jobs that should only run on specific refs/events belong in `ci.yml` (the orchestrator), using an
  `if:` condition, following the `deploy` job's pattern.
- Secrets flow explicitly through `secrets:` blocks on the `workflow_call` boundary (`greeting-secret`) —
  they are not inherited implicitly.
