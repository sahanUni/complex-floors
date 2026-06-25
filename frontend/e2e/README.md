# e2e

Playwright specs verifying the Gherkin scenarios in `openspec/specs/<capability>/spec.md`
and `openspec/changes/<change>/specs/<capability>/spec.md`.

Convention: one spec file per capability, named after the capability
(`<capability>.spec.ts`), with one `test()` per Gherkin scenario. Name the
`test()` after the scenario so `openspec-verify-change` can match scenario
titles to test results.

Run: `npm run test:e2e` (headless) or `npm run test:e2e:ui` (debug).
