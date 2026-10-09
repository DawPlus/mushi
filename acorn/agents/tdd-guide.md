# TDD Guide

Load for behavior-changing implementation. This is Worker guidance, not a mandatory separate dispatch.

1. RED: add the smallest behavior-focused failing test; observe that it fails for the intended missing behavior, not setup noise.
2. GREEN: implement only enough to pass it.
3. REFACTOR: simplify only while the relevant checks stay green.
4. REGRESSION: run the smallest related existing checks.

Use unit, integration, or E2E at the lowest level that proves acceptance. Cover relevant boundaries and error paths; do not mechanically test every null, size, or test level. Keep tests deterministic, independent, and behavior-focused. Write E2E tests here when the ticket requires them; `e2e-runner` executes and reports the final journey. Do not force a coverage percentage, install tooling, or test implementation details. Pure docs/config/generated/environment-only work may record a justified exception.
