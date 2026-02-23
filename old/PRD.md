# Product Requirements Document: Hoshin

**Generated**: 2026-02-16
**Status**: Ready for AI Interview

## Initial Input

**Project Description**: Web site to implement a visual hoshin editor/evaluator based on hoshin-northstar-process.pdf

**I want to build Hoshin that has the following features:**

1. have ability to download a hoshin in https://github.com/visionik/vbrief format
2. enable users to visually fill in a hoshin "form" (it shouldn't be a plain html form thing though it should be visual like the form in the pdf
3. "calculate" the hoshin and highlight what the most important task should be (highest dependency task)

---

# Specification Generation

Agent workflow for creating project specifications via structured interview.

Legend (from RFC2119): !=MUST, ~=SHOULD, ≉=SHOULD NOT, ⊗=MUST NOT, ?=MAY.

## Input Template

```
I want to build Hoshin that has the following features:
1. [feature]
2. [feature]
...
N. [feature]
```

## Interview Process

- ~ Use Claude AskInterviewQuestion when available (emulate it if not available)
- ! If Input Template fields are empty: ask overview, then features, then details
- ! Ask **ONE** focused, non-trivial question per step
- ⊗ ask more than one question per step; or try to sneak-in "also" questions
- ~ Provide numbered answer options when appropriate
- ! Include "other" option for custom/unknown responses
- ! make it clear which option you feel is RECOMMENDED
- ! when you are done, append to the end of this file all questions asked and answers given.

**Question Areas:**

- ! Missing decisions (language, framework, deployment)
- ! Edge cases (errors, boundaries, failure modes)
- ! Implementation details (architecture, patterns, libraries)
- ! Requirements (performance, security, scalability)
- ! UX/constraints (users, timeline, compatibility)
- ! Tradeoffs (simplicity vs features, speed vs safety)

**Completion:**

- ! Continue until little ambiguity remains
- ! Ensure spec is comprehensive enough to implement

## Output Generation

- ! Generate as SPECIFICATION.md
- ! follow all relevant deft guidelines
- ! use RFC2119 MUST, SHOULD, MAY, SHOULD NOT, MUST NOT wording
- ! Break into phases, subphases, tasks
- ! end of each phase/subphase must implement and run testing until it passes
- ! Mark all dependencies explicitly: "Phase 2 (depends on: Phase 1)"
- ! Design for parallel work (multiple agents)
- ⊗ Write code (specification only)

## Afterwards

- ! let user know to type "implement SPECIFICATION.md" to start implementation

**Structure:**

```markdown
# Project Name

## Overview

## Requirements

## Architecture

## Implementation Plan

### Phase 1: Foundation

#### Subphase 1.1: Setup

- Task 1.1.1: (description, dependencies, acceptance criteria)

#### Subphase 1.2: Core (depends on: 1.1)

### Phase 2: Features (depends on: Phase 1)

## Testing Strategy

## Deployment
```

## Best Practices

- ! Detailed enough to implement without guesswork
- ! Clear scope boundaries (in vs out)
- ! Include rationale for major decisions
- ~ Size tasks for 1-4 hours
- ! Minimize inter-task dependencies
- ! Define clear component interfaces

## Anti-Patterns

- ⊗ Multiple questions at once
- ⊗ Assumptions without clarifying
- ⊗ Vague requirements
- ⊗ Missing dependencies
- ⊗ Sequential tasks that could be parallel

---

## Interview Transcript (Questions and Answers)

1. **Q:** For v1, what is the data ownership + persistence model?<br/>
   **A:** Option 1 — local-first, no auth.
2. **Q:** How strict should visual layout be relative to the PDF form?<br/>
   **A:** Option 1 — fixed template layout.
3. **Q:** Should v1 use exact PDF ranking semantics?<br/>
   **A:** Yes — direct arrows-out count with driver tie-break.
4. **Q:** How strict should `vbrief` export validation be?<br/>
   **A:** Option 1 — strict mode only.
5. **Q:** Should v1 enforce exact structural rules from PDF?<br/>
   **A:** Option 1 — exactly 5 statements, `I/We must` prefix, 3-7 words.
6. **Q:** How should users set arrow direction?<br/>
   **A:** Support both Option 1 (line click + choose direction) and Option 2 (drag source to target), configurable.
7. **Q:** What should default arrow mode behavior be?<br/>
   **A:** Option 1 default mode; Option 3 persistence (remember last mode on device).
8. **Q:** Should v1 support `vbrief` import?<br/>
   **A:** Option 3 — export now, import later.
9. **Q:** Should PDF Step 8 be included in v1?<br/>
   **A:** Enable full Option 3 in a later phase (not v1).
10. **Q:** What should primary deployment target be?<br/>
    **A:** Option 2 — static export hosted by Cloudflare Pages via GitHub, provided no features/functions are lost.
11. **Q:** What local persistence model should v1 use?<br/>
    **A:** Option 2 — IndexedDB; also add a repository abstraction for future server-side save.
12. **Q:** How strict should validation be during save/edit flows?<br/>
    **A:** Option 2 — allow invalid draft saves, but block calculate/export until valid.
13. **Q:** What device support should v1 target?<br/>
    **A:** Option 2 — desktop + tablet.
14. **Q:** What browser compatibility should v1 target?<br/>
    **A:** Option 1 — modern evergreen browsers only.
15. **Q:** What undo/redo support should v1 include?<br/>
    **A:** Option 2 — basic undo/redo for text and arrow direction changes.
16. **Q:** What should be source-of-truth for `vbrief` schema/version?<br/>
    **A:** Option 1 — pin to a tagged `vbrief` release.
17. **Q:** What accessibility target should v1 meet?<br/>
    **A:** Option 1 — WCAG 2.1 AA for core editor flows.
