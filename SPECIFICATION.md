# Hoshin

## Overview

Hoshin is a local-first web app for creating and evaluating a Hoshin Success Compass in a visual format aligned to the source PDF process by Matthew Cross. The app MUST support creating one Hoshin with five statements, assigning causal arrows across the ten fixed pairwise connections, calculating ranking based on arrows out, and exporting to `vbrief` format.

v1 scope MUST prioritize correctness and usability for desktop/tablet on modern evergreen browsers, using static hosting (Cloudflare Pages via GitHub) with no required feature loss. Post-v1 phases SHOULD add recursive follow-up Hoshins, `vbrief` import, and server-side save.

## Requirements

### Functional Requirements

- The editor MUST use a fixed template layout modeled after the PDF form (no freeform canvas).
- A Hoshin MUST contain exactly five statements.
- Each statement MUST begin with `I/We must` and MUST include 3-7 additional words.
- The user MUST provide an initial order value (1-5) for each statement.
- The editor MUST expose ten fixed pairwise connections and require direction for each.
- Arrow direction MUST represent driver -> driven.
- The app MUST support two arrow-input modes:
  - Mode A: click/tap a connection and select direction.
  - Mode B: drag source statement to target statement.
- Default arrow-input mode MUST be Mode A.
- The app MUST remember the last selected arrow-input mode per device/browser.
- The calculate flow MUST implement the PDF rule exactly:
  - Count outgoing arrows per statement.
  - Re-rank by highest arrows out = rank #1.
  - Resolve ties by placing the statement that drives the other ahead.
- Results MUST highlight focus items #1 and #2.
- The app MUST allow saving invalid drafts locally.
- The app MUST block calculate and export when validation fails.
- Export MUST support `vbrief` download in strict mode only (block export if invalid).
- `vbrief` export MUST pin to a tagged upstream `vbrief` version and include version metadata.
- `vbrief` import MUST be out of scope for v1 and planned for a later phase.
- PDF Step 8 recursive continuation MUST be out of scope for v1 and planned as a later phase with full lineage support.
- v1 undo/redo MUST support text edits and arrow-direction changes.

### Persistence and Data Ownership

- v1 MUST be local-first and MUST NOT require authentication.
- v1 MUST persist data in IndexedDB.
- The codebase MUST define a repository abstraction to support later server-side persistence without core logic rewrites.

### Non-Functional Requirements

- The app MUST target desktop + tablet UX in v1.
- The app MUST officially support modern evergreen Chrome/Safari/Edge/Firefox.
- The app MUST meet WCAG 2.1 AA for core editor flows.
- The deployment model MUST be static export hosted on Cloudflare Pages via GitHub.

## Architecture

### High-Level Architecture

- Frontend: Next.js + React + TypeScript (static export configuration).
- Styling/UI: Tailwind + shadcn/ui primitives.
- State domains:
  - `domain/hoshin`: entities, value objects, invariants.
  - `domain/ranking`: arrows-out calculation and tie-break logic.
  - `domain/validation`: structural and semantic validation.
  - `application/repository`: persistence interface and use-cases.
  - `infrastructure/indexeddb`: v1 IndexedDB implementation.
  - `infrastructure/export/vbrief`: strict serializer + versioned schema mapping.

### Core Domain Model

- `HoshinDocument`
  - `id`
  - `promptQuestion`
  - `statements[5]` with `id`, `text`, `initialOrder`
  - `connections[10]` fixed pairs with required direction
  - `settings` (arrow input mode)
  - `timestamps`
- `CalculatedResult`
  - `arrowsOutByStatement`
  - `finalRanking`
  - `focusTopTwo`

### Repository Abstraction

- `HoshinRepository` interface MUST define create/read/update/list/delete for local docs and drafts.
- `IndexedDbHoshinRepository` MUST implement `HoshinRepository` for v1.
- `RemoteHoshinRepository` SHOULD be defined as a planned adapter in a later phase.

### Validation Layers

- Edit-time validation SHOULD be non-blocking and inline.
- Pre-calculate and pre-export validation MUST be blocking.
- Validation MUST include:
  - Exactly five statements.
  - Statement prefix and word-count constraints.
  - Complete initial order coverage.
  - All ten connection directions set.

## Implementation Plan

### Phase 1: Foundation (depends on: none)

#### Subphase 1.1: Project setup

- Task 1.1.1: Initialize Next.js static-export-ready TypeScript app shell with Tailwind + shadcn/ui.
  - Dependencies: none
  - Acceptance criteria: local build and static export both succeed.
- Task 1.1.2: Establish Taskfile workflows (`dev`, `test`, `lint`, `typecheck`, `check`, `build`).
  - Dependencies: 1.1.1
  - Acceptance criteria: `task --list` shows documented targets; `task check` runs full quality pipeline.
- Task 1.1.3: Configure testing stack (Vitest + RTL + coverage thresholds >=85%).
  - Dependencies: 1.1.1
  - Acceptance criteria: baseline tests pass and coverage gating is active.
- Subphase 1.1 completion gate: implement and run tests until passing.

#### Subphase 1.2: Domain and rules engine (depends on: 1.1)

- Task 1.2.1: Implement domain entities and fixed 5-node/10-edge template model.
  - Dependencies: 1.1.3
  - Acceptance criteria: model enforces shape constraints.
- Task 1.2.2: Implement validation engine for statement and connection rules.
  - Dependencies: 1.2.1
  - Acceptance criteria: invalid cases return deterministic error codes/messages.
- Task 1.2.3: Implement ranking engine per PDF rule (arrows out + driver tie-break).
  - Dependencies: 1.2.1
  - Acceptance criteria: deterministic ranking across edge/tie scenarios.
- Task 1.2.4: Add unit + property-style tests for parser/validation/ranking paths.
  - Dependencies: 1.2.2, 1.2.3
  - Acceptance criteria: >=85% coverage for domain modules.
- Subphase 1.2 completion gate: implement and run tests until passing.

### Phase 2: Visual editor and interactions (depends on: Phase 1)

#### Subphase 2.1: Fixed template editor UI

- Task 2.1.1: Build fixed-form visual layout with five statement cards and ten connection lines.
  - Dependencies: 1.2.1
  - Acceptance criteria: visual structure matches fixed template behavior.
- Task 2.1.2: Build statement editing, initial order fields, and inline validation rendering.
  - Dependencies: 2.1.1, 1.2.2
  - Acceptance criteria: users can complete all required inputs with clear errors.
- Task 2.1.3: Add basic undo/redo for statement and order edits.
  - Dependencies: 2.1.2
  - Acceptance criteria: keyboard + UI controls support undo/redo for covered actions.
- Subphase 2.1 completion gate: implement and run tests until passing.

#### Subphase 2.2: Dual arrow-input modes and settings (depends on: 2.1)

- Task 2.2.1: Implement Mode A (line click/tap -> direction chooser).
  - Dependencies: 2.1.1
  - Acceptance criteria: each of ten connections can be directed and flipped.
- Task 2.2.2: Implement Mode B (drag source -> target) with pair validity checks.
  - Dependencies: 2.2.1
  - Acceptance criteria: drag sets only valid fixed-pair directions.
- Task 2.2.3: Implement mode settings UI (default Mode A) and last-used persistence.
  - Dependencies: 2.2.1, 2.2.2
  - Acceptance criteria: mode persists across reloads on same device/browser.
- Task 2.2.4: Extend undo/redo to arrow-direction changes.
  - Dependencies: 2.2.1, 2.2.2
  - Acceptance criteria: direction changes are reversible.
- Subphase 2.2 completion gate: implement and run tests until passing.

#### Subphase 2.3: Calculation and focus outputs (depends on: 2.2)

- Task 2.3.1: Implement blocking validation for calculate.
  - Dependencies: 2.1.2, 2.2.2
  - Acceptance criteria: calculate unavailable until all blocking validations pass.
- Task 2.3.2: Render arrows-out totals, final ranking, and highlighted #1/#2 focus.
  - Dependencies: 2.3.1, 1.2.3
  - Acceptance criteria: output matches deterministic engine results.
- Task 2.3.3: Add accessibility support (keyboard flow, labels, focus states, SR announcements).
  - Dependencies: 2.3.2
  - Acceptance criteria: core flows satisfy WCAG 2.1 AA checks.
- Subphase 2.3 completion gate: implement and run tests until passing.

### Phase 3: Persistence, export, and deployment (depends on: Phase 2)

#### Subphase 3.1: Local persistence via repository abstraction

- Task 3.1.1: Define `HoshinRepository` interface and use-case services.
  - Dependencies: 1.2.1
  - Acceptance criteria: domain/application layers compile against interface only.
- Task 3.1.2: Implement `IndexedDbHoshinRepository`.
  - Dependencies: 3.1.1
  - Acceptance criteria: create/read/update/list/delete works offline.
- Task 3.1.3: Enable autosave of drafts (including invalid drafts).
  - Dependencies: 3.1.2
  - Acceptance criteria: refresh retains in-progress edits and validation states.
- Subphase 3.1 completion gate: implement and run tests until passing.

#### Subphase 3.2: Strict `vbrief` export

- Task 3.2.1: Pin supported `vbrief` version tag and define mapping contract.
  - Dependencies: 1.2.1
  - Acceptance criteria: explicit export versioning documented and test-covered.
- Task 3.2.2: Implement strict exporter and blocking pre-export validation.
  - Dependencies: 3.2.1, 1.2.2
  - Acceptance criteria: invalid docs cannot export; valid docs export deterministically.
- Task 3.2.3: Add export download UX and clear validation/error messaging.
  - Dependencies: 3.2.2
  - Acceptance criteria: user can download valid `vbrief` artifact from UI.
- Subphase 3.2 completion gate: implement and run tests until passing.

#### Subphase 3.3: Static deployment pipeline

- Task 3.3.1: Configure Next static export and Cloudflare Pages build settings.
  - Dependencies: 1.1.1, 3.2.3
  - Acceptance criteria: CI build produces deployable static artifacts.
- Task 3.3.2: Configure GitHub -> Cloudflare Pages deployment workflow.
  - Dependencies: 3.3.1
  - Acceptance criteria: push to main deploys successfully.
- Task 3.3.3: Add smoke tests for deployed static bundle behavior.
  - Dependencies: 3.3.2
  - Acceptance criteria: post-deploy checks pass on supported browsers.
- Subphase 3.3 completion gate: implement and run tests until passing.

### Phase 4: Post-v1 expansion (depends on: Phase 3)

#### Subphase 4.1: `vbrief` import (later phase)

- Task 4.1.1: Implement strict import parser and compatibility checks for pinned version.
- Task 4.1.2: Add import UX + conflict/error handling.
- Completion gate: implement and run tests until passing.

#### Subphase 4.2: Server-side persistence (later phase)

- Task 4.2.1: Add remote persistence API contract and auth model.
- Task 4.2.2: Implement `RemoteHoshinRepository` behind same interface.
- Task 4.2.3: Add migration/sync strategy from local IndexedDB.
- Completion gate: implement and run tests until passing.

#### Subphase 4.3: Recursive follow-up Hoshins (full PDF Step 8) (later phase)

- Task 4.3.1: Add one-click follow-up creation from ranked #1 and #2.
- Task 4.3.2: Add lineage graph/history and parent-child navigation.
- Task 4.3.3: Add recursive planning workflows and summary views.
- Completion gate: implement and run tests until passing.

## Testing Strategy

- Unit tests MUST cover domain rules, validation, ranking, repository adapters, and export mapping.
- Integration tests MUST cover full editor workflows: create -> validate -> calculate -> export.
- Accessibility tests MUST cover keyboard-only operation, focus order, labels, and screen reader-critical announcements.
- Cross-browser test matrix MUST include current evergreen Chrome/Safari/Edge/Firefox.
- Coverage MUST be >=85% overall and per critical module.
- CI MUST fail on lint/type/test/coverage failures.

## Deployment

- Deployment MUST use static export hosted on Cloudflare Pages from GitHub.
- The release pipeline SHOULD include preview deployments per pull request.
- Runtime architecture MUST assume no required server dependency for v1 features.
- Secrets/configuration MUST be managed via Cloudflare Pages/GitHub environment controls as needed.
