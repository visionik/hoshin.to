# Hoshin Wizard — Specification

## Overview

The Hoshin Wizard is an addition to the existing Hoshin Success Compass app. It guides the user through the ten fixed pairwise connections by asking, for each pair, which statement best enables or makes the other easier to do. The wizard writes chosen directions into the current Hoshin document and supports partial progress (save on exit). All data remain browser-side; there is no sign-in.

## Requirements

### Functional Requirements

- The wizard MUST operate on the currently selected Hoshin document in the editor.
- The wizard MUST use the existing domain model: five statements (s1–s5), ten fixed connection pairs, and `Connection.direction` (driver → driven).
- The user MUST be able to start the wizard from the editor via a dedicated control (e.g. “Run wizard” / “Compare boxes” button).
- Wizard entry MUST be gated by “wizard-ready” validation: exactly five statements, each with valid prefix (“I/We must” or “I must” or “We must”) and 3–7 additional words, and unique initial order 1–5 for all statements. Connection directions MAY be null or already set.
- The wizard MUST present one pair at a time, showing the two statement texts and asking which statement best enables the other (choice A→B or B→A).
- For each answered pair, the wizard MUST write the chosen direction to the document’s corresponding connection and MUST persist the document (e.g. via existing `HoshinRepository.upsert`).
- If the user exits the wizard before answering all pairs, the app MUST save partial progress (all answered pairs persisted); connections not yet answered MUST remain unchanged.
- When the user completes all ten pairs, the wizard MUST close and return focus to the editor with the document updated; the user MAY then run “Calculate ranking” when full validation (including all connection directions) is satisfied.
- On a subsequent “Run wizard” for the same document, the app SHOULD offer to continue (only present pairs with null direction) or restart (clear all ten directions and re-ask all). If only “continue” is implemented first, that is acceptable.
- The wizard MUST NOT require authentication; persistence MUST use the existing browser-side store (IndexedDB via `HoshinRepository`).

### Non-Functional Requirements

- The wizard MUST fit the existing stack: Next.js, React, TypeScript, Tailwind; same repository and domain layer.
- The implementation MUST preserve existing behavior: editor, Calculate, Export, undo/redo, and validation for calculation/export MUST remain unchanged except where explicitly extended.
- Quality: MUST run `task check` (fmt, lint, typecheck, test:coverage) and maintain ≥85% coverage.

## Architecture

### Wizard-Ready Validation

- A new validation function (e.g. `canRunWizard(document)` or a subset of `validateDraft`) MUST define wizard-ready: five statements, each with valid prefix and word count and non-null unique initial order 1–5. It MUST NOT require connection directions.
- The existing “calculation-ready” validation (all statements + all connection directions) MUST remain the gate for Calculate and Export.

### Wizard Flow and State

- Wizard state: current document (or a copy used only in wizard), current pair index (or list of unanswered pair ids), and progress (which pairs have been answered).
- Pair order: use the existing `FIXED_CONNECTION_PAIRS` order (or a deterministic ordering of the ten pairs).
- On “answer”: update `document.connections` for that pair with `direction: { from, to }`, call repository upsert, advance to next pair (or finish).
- On “exit” / “back”: upsert current document (with any partial answers), then close wizard and return to editor.

### UI Placement

- Add a “Run wizard” (or “Compare boxes”) button in the editor toolbar/header, near Calculate and Export. It MUST be disabled when the document is not wizard-ready; optional tooltip or message explaining requirements when disabled.
- Wizard MAY be implemented as a modal/overlay on the same page or a dedicated route; modal is recommended to keep context (current document) obvious.

### Dependencies

- Depends on existing: `HoshinDocument`, `Statement`, `Connection`, `FIXED_CONNECTION_PAIRS`, `toConnectionPairId`, `HoshinRepository`, editor’s document state and `applyDocumentUpdate` / persistence.
- No new backend or auth; no schema changes to IndexedDB beyond existing document shape.

## Implementation Plan

### Phase 1: Wizard-ready validation and entry (depends on: none)

- Task 1.1: Add wizard-ready validation.
  - Implement a function (e.g. in `domain/hoshin/validation.ts` or a dedicated module) that returns whether a document is wizard-ready: exactly five statements, each with valid prefix and 3–7 additional words, and unique initial order 1–5. Do not require connection directions.
  - Add unit tests; ensure existing validation and ranking tests still pass.
- Task 1.2: Add “Run wizard” entry point in the editor.
  - Add a button (e.g. “Run wizard” or “Compare boxes”) that is enabled only when the current document is wizard-ready.
  - When disabled, optionally show a short message or tooltip (e.g. “Complete all 5 statements and set order 1–5 to run the wizard”).
  - Clicking the button MUST open the wizard flow (modal or route) with the current document.
  - Acceptance: button state matches wizard-ready; opening wizard receives correct document.

### Phase 2: Wizard flow — one pair at a time, persist, partial save (depends on: Phase 1)

- Task 2.1: Wizard UI — present one pair per step.
  - For the current pair, show the two statement texts (and optionally ids, e.g. s1, s2) and two clear options: e.g. “A enables B” and “B enables A” (with A/B mapped to the two statements for that pair).
  - On choice: set `connection.direction` for that pair, update document in memory, call `repository.upsert(document)`, then advance to the next unanswered pair (or to “complete” if all ten are answered).
  - Use `FIXED_CONNECTION_PAIRS` (or equivalent) for deterministic order.
  - Acceptance: each answer updates the document and persists; advancing shows the next pair; completion closes the wizard and returns to editor.
- Task 2.2: Partial save on exit.
  - Provide an explicit “Back” / “Exit” / “Cancel” control that, on click, upserts the current document (with any directions set so far) and closes the wizard.
  - Do not clear or reset directions for unanswered pairs; leave them as they were when the wizard was opened.
  - Acceptance: exiting mid-wizard leaves answered pairs saved and rest unchanged; re-opening editor shows updated document.
- Task 2.3: Integration with editor state.
  - When the wizard closes (complete or exit), the editor MUST reflect the updated document (reload from repository or pass updated document back so the editor’s current document is in sync).
  - Acceptance: after wizard, editor shows latest connections; Calculate/Export behave as before when full validation is met.

### Phase 3: Continue vs restart (depends on: Phase 2)

- Task 3.1: Re-run behavior.
  - When opening the wizard for a document that already has some connection directions set, either: (a) only show pairs with null direction (“Continue”), or (b) offer “Continue” vs “Restart” (restart clears all ten directions for this document, then asks all ten).
  - At least one of (a) or (b) MUST be implemented; (a) alone is acceptable for initial release.
  - Acceptance: re-running wizard does not lose existing answers unless user explicitly chooses restart.

## Testing Strategy

- Unit tests for wizard-ready validation (valid/invalid statements, orders, connection state).
- Unit tests for wizard logic: given a document and a sequence of choices, final `connections` and persistence behavior are correct; partial save leaves other pairs unchanged.
- Integration or component tests: wizard opens with correct document; one full pass through ten pairs updates document and closes; exit mid-way persists partial and leaves rest unchanged.
- Existing test suite MUST remain green; coverage MUST remain ≥85%.

## Deployment

- No change to deployment model: static export, existing hosting. No new environment variables or backend.

## Summary of Interview Decisions

- Primary user: end users of the product, with their own matrices and history — implemented as browser-side data only (no sign-in).
- Wizard outcome: save an ordering (write chosen directions into the document’s connections).
- Boxes source: from the current Hoshin (wizard uses its five statements; does not create new documents).
- Entry: button from the editor for the current document.
- Mid-wizard exit: save partial (persist answered pairs; leave rest unchanged).
- Auth: none; everything stored in browser-side data stores.
- Wizard gate: allow when statements and initial orders are set (option 2); connection directions may be null.
