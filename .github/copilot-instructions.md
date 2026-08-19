# Copilot instructions for GitHubActionsDemo

## Build, test, and lint

- `npm test` — run the full test suite with Node's built-in test runner (`node --test`)
- `npm run lint` — syntax-check the app files with `node --check src/greet.js && node --check src/index.js`
- `npm start` — run the CLI (`node src/index.js [name]`); it reads an optional `GREETING_SECRET` environment variable
- Single test file: `node --test test/greet.test.js`
- There is no build step; this is a plain ESM Node app and the repo expects Node `>=24`.

## High-level architecture

This repo is intentionally a small sandbox for GitHub Actions patterns, not a product app.

- `src/greet.js` exports a pure `greet(name, secretPhrase)` function.
- `src/index.js` is the CLI entry point: it reads the name from `process.argv[2]` and the `GREETING_SECRET` env var, then calls `greet`.
- `test/greet.test.js` verifies the greeting logic using `node:test` and `node:assert/strict`.

The interesting logic lives under `.github/`:

- `.github/actions/setup-node-app/action.yml` is a composite action that wraps `actions/setup-node` with npm caching and runs `npm ci`. This is the shared setup used by workflow jobs instead of duplicating install steps.
- `.github/workflows/reusable-ci.yml` is the real CI logic behind `workflow_call`; it takes a `node-version` input and an optional `greeting-secret`, runs lint/test/app execution, writes `dist/release.json`, and uploads an artifact named `dist-node-<node-version>`.
- `.github/workflows/ci.yml` is the orchestrator triggered on `push`, `pull_request`, and `workflow_dispatch`. It runs the reusable workflow in a matrix and includes the deploy job that downloads the artifact and simulates deployment.
- `.github/workflows/github-actions-demo.yml` is the original starter workflow and is intentionally left as a baseline/reference; it is not part of the layered CI design.

## Key conventions

- Keep Node setup and dependency installation in the composite action (`.github/actions/setup-node-app`), not duplicated in each workflow step.
- Keep install/test logic in the reusable workflow (`.github/workflows/reusable-ci.yml`) so it remains callable with different inputs rather than being repeated per workflow.
- Secrets are intentionally passed through the `workflow_call` boundary using the `secrets:` block (`greeting-secret`); do not rely on implicit inheritance.
- When changing the matrix version or artifact naming, keep the Node version, artifact name, and deployment download steps in sync. The `test` matrix and `deploy` job's `dist-node-24` artifact name are coupled.
- The app intentionally prints the secret phrase in CLI output as a demonstration of secret propagation through the workflow pipeline; this is part of the repo's purpose and should not be treated as accidental output.
- This repo uses plain ESM Node with no bundler, TypeScript build step, or test framework beyond Node's built-in modules.
