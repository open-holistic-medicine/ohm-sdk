# Contributing

This repo holds the **runnable examples** for the
[`@ohm_studio/*` SDK packages](https://www.npmjs.com/org/ohm_studio).
The SDK source itself isn't here — it's distributed via npm. We
keep this repo focused on examples + docs.

## Filing issues

| Issue type | Where |
|---|---|
| **SDK bug** (something wrong in `@ohm_studio/sdk` or `@ohm_studio/sdk-react-native`) | [open an issue here](https://github.com/open-holistic-medicine/ohm-sdk/issues/new) — pick "SDK bug" template |
| **Example bug** (an example doesn't build / run / behave correctly) | here, with the example folder name in the title |
| **Doc gap** (something missing or unclear at docs.ohm.doctor) | here, with a link to the doc page |
| **Feature request** | here — describe the use case, not the implementation |
| **Security report** | email `security@ohm.doctor` (DO NOT open a public issue) |

## Filing PRs

We accept PRs for:

- Fixes to existing examples (build errors, env quirks, README clarifications)
- New examples that fill a runtime gap (bare RN visit feature, Python CLI, etc.)
- Doc-related improvements that the examples link to

We don't accept PRs for:

- The SDK source code itself — that lives in our private monorepo. File
  an issue with the use case and we'll wire it.

## Running an example locally

Each example folder is self-contained:

```bash
git clone https://github.com/open-holistic-medicine/ohm-sdk
cd ohm-sdk/examples/<example-name>
npm install
cp .env*.example .env*       # then edit the env file
npm start                    # or npm run dev / npm run start, see README
```

You'll need a test-mode API key (`ohms_test_*`) from
[studio.ohm.doctor](https://studio.ohm.doctor) → Keys.

## Style

- TypeScript everywhere. `strict: true`. No `any` unless interop demands it.
- Comments explain **why**, not what. The code shows what.
- Each example has its own README that opens with "What it shows" so
  readers can decide in 30 seconds if it's the right starting point.
- Don't reference vendor names (Sarvam, OpenRouter, model IDs, etc.) in
  customer-facing example code. Those are OHM's implementation details.

## Versioning

The examples track the latest stable SDK on npm. When we publish a new
SDK minor (e.g., `0.5.x` → `0.6.x`), we bump every `package.json` here
in a single PR and update the cookbook + this repo's READMEs to match.

## License

MIT — see [LICENSE](./LICENSE). Apply the same license to any new
examples you contribute.
