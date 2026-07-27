# SDD ledger — plan: docs/superpowers/plans/2026-07-26-calendar-core-library.md
Task 1: parked — npm script `test:calendar` uses `node --test lib/calendar/*.test.js` instead of brief's literal `node --test lib/calendar/` — ruling: verified myself that the literal form fails with MODULE_NOT_FOUND on this environment's Node v24.5.0 (directory arg not recursively scanned); substitute preserves intent exactly, stands.
Task 1: complete (commits 9e8a9389..0488c466, review clean except 1 parked)
Task 4: complete (branch calendar-core-library-task4, commit cda2706b..4fce8168, review clean)
Task 3: minor (deferred): model.test.js "merges featured localized notes" description overstates behavior (it maps, doesn't merge notes) — cosmetic, not functional
Task 3: complete (branch calendar-core-library-task3, commit cda2706b..f6ad84f6, review clean)
Task 6: complete (branch calendar-core-library-task6, commit cda2706b..c86b2206, review clean)
Task 5: minor (deferred): no test for anchor date whose weekday differs from recurrence.weekday (behavior is sensible — first target-weekday on/after anchor — just untested)
Task 5: complete (branch calendar-core-library-task5, commit cda2706b..85ecffc4, review clean)
Task 7: complete (branch calendar-core-library-task7, commit cda2706b..e0841f06, review clean)
Task 8: minor (deferred): implementer's report insertion-count stats didn't match diff stat (documentation-only, not a code defect)
Task 8: complete (branch calendar-core-library-task8, commit cda2706b..33584e4a, review clean)
Task 2: fix round 1/5 (1 addressed, 0 open; commits cda2706b..638e3382)
Task 2: complete (commits 0488c466..638e3382, review clean after 1 fix round)
Tasks 3-8: merged into calendar-core-library via parallel worktrees (base cda2706b, fixed to 638e3382 after Task 2's fix), 6 clean git merges, 30/30 tests passing post-merge. Worktrees + branches cleaned up.
Task 9: complete (commits 53ede7c6..4b8fc0c6, review clean)
Task 10: complete (commits 4b8fc0c6..71fc8ed7, review clean)
ALL 10 TASKS COMPLETE. Full suite: 34/34 passing (node --test lib/calendar/*.test.js). REMAINING: final whole-branch review (dispatch on most capable model per SKILL.md, package via scripts/review-package PLAN_FILE MERGE_BASE HEAD where MERGE_BASE = merge-base of production and calendar-core-library HEAD), then superpowers:finishing-a-development-branch to integrate calendar-core-library into production. Branch: calendar-core-library. Worktree: .worktrees/calendar-core-library (repo root: /Users/fabiogerhold/Sandboxes/Claude/fabio-gerhold/projects/wild-care/website).
