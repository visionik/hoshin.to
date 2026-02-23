# Product Requirements Document: Hoshin Wizard

**Generated**: 2026-02-22
**Status**: Ready for AI Interview

## Initial Input

**Project Description**: Add a wizard like feature that compares one hoshin box to each other box, one at a time, and asks which box best enables or makes the other box easier to do

**I want to build Hoshin Wizard that has the following features:**

---

# Specification Generation

Agent workflow for creating project specifications via structured interview.

Legend (from RFC2119): !=MUST, ~=SHOULD, ≉=SHOULD NOT, ⊗=MUST NOT, ?=MAY.

## Input Template

```
I want to build Hoshin Wizard that has the following features:
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

## Interview: Questions and Answers

**Step 1 — Who is the primary user of the Hoshin Wizard?**  
Options: 1 = Only you; 2 = Your team in a workshop; 3 = End users of a product (each with own matrices/history); 4 = Other.  
**Answer:** 3 (End users of a product — each user has their own matrices and history; multi-user, auth, persistence).

**Step 2 — What should the wizard do with the comparison result?**  
Options: 1 = Save an ordering; 2 = Suggest sequence only; 3 = Export only; 4 = Display only; 5 = Other.  
**Answer:** 1 (Save an ordering — store which box enables which; user sees suggested sequence).

**Step 3 — Where do the boxes in the wizard come from?**  
Options: 1 = From an existing Hoshin; 2 = Created in the wizard; 3 = Both; 4 = Other.  
**Answer:** 1 (From an existing Hoshin — wizard uses that document’s five statements, runs pairwise comparisons, writes results back into that Hoshin’s connections and ranking).

**Step 4 — How does the user start the wizard?**  
Options: 1 = Button from the editor; 2 = From document list; 3 = Both; 4 = Other.  
**Answer:** 1 (Button from the editor — “Run wizard” / “Compare boxes” launches the wizard for the current Hoshin).

**Step 5 — If the user leaves the wizard before finishing all pairwise comparisons, what should happen?**  
Options: 1 = Discard; 2 = Save partial; 3 = Confirm exit (discard vs save partial); 4 = Other.  
**Answer:** 2 (Save partial — persist completed comparisons; leave the rest unchanged).

**Step 6 — How should users sign in?**  
Clarification given: There is no sign-in; everything is stored in browser-side data stores.

**Step 7 — When the user clicks “Run wizard”, what if some statements are empty or the document isn’t valid yet?**  
Options: 1 = Block and explain; 2 = Allow if statements and orders are set; 3 = Other.  
**Answer:** 2 (Allow when statements and orders are set — require only five statements and unique 1–5 orders; connections may be null; wizard sets or overwrites the 10 directions).
