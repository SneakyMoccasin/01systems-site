# CE Two-Layer MTC CP5B — Terminal-Boundary Correction Audit

Status: **PASS**

Starting commit: `b2692cb5d1e4f5ccda222abbbb76c7e34ac22916`

Scope: localized CP5B comparison correction only. CP6, Clean MU and Test 01A
were not started.

## Correction

The comparison timeline previously stopped at the final period-commit
Decision Space snapshot. When CP5A had appended an authoritative
terminal-boundary snapshot, terminal equivalence therefore compared a
pre-terminal snapshot rather than the final CP5A result.

CP5B now adds a terminal-boundary comparison point for completed pairs when
either supplied CP5A result contains that point. Each side contributes its
last authoritative CP5A Decision Space snapshot: the explicit terminal
snapshot where CP5A created one, otherwise the already-equivalent final
period snapshot. No terminal snapshot is derived or created by CP5B. Layer 2
remains period-commit-only.

The timing-only projection also excludes `terminalLifecycle`, because it is
derived mechanically from scheduled start, duration and horizon. Duration,
horizon and every other non-schedule semantic remain bound by comparability.

## Regression evidence

The exact horizon-six reproduction compares foundation starts at periods five
and six. Run A's final period snapshot is already terminal. Run B is active
after period six and its CP5A history contains the terminal-boundary snapshot
at boundary seven. Historical differences remain, terminal structure and
Decision Space are independently equivalent, and the Decision Space interval
converges at terminal boundary seven instead of persisting.

A duration-two control leaves Run A completed and Run B active at the
authoritative terminal boundary. It remains timing-only comparable and proves
that genuine terminal Decision Space inequality reports false equivalence.
Existing unresolved, failed-bounds, orientation, provenance and no-value tests
remain green.

## Verification

The frozen manifest remains 94 tracked test files. Two tests were added to an
existing file, so the 909-test baseline becomes the expected 911 tests. The
scoped MTC suite passes 97/97; the root suite passes 901/901; and
`01systems-site` passes 10/10. Total: 911 discovered, run and passed, with zero
failures, skips, cancellations or todos. TypeScript, scoped MTC lint, import
isolation and `git diff --check` pass.

No CP5A, Layer 1, Layer 2, V1, Golden or hash fixture file changed. No
architecture expansion or comparison capability outside the correction was
introduced.
