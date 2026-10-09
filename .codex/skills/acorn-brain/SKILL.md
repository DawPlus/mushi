---
name: acorn-brain
description: Use only when the Human explicitly invokes `$acorn-brain` to refine a rough idea before Acorn ticket registration.
---

# Acorn Brain

Turn an unstructured product or engineering idea into approved Acorn tickets. Do not activate from ordinary planning, feature, or ticket wording.

## Preconditions

Require `acorn/config.json` and its configured ticket board. If either is missing, stop and ask the Human to install or repair Acorn Kit.

Read [brainstorming.md](brainstorming.md) and use it as the required discovery and design method. Its approved design replaces the Superpowers spec, implementation plan, and commit stages.

## Flow

1. Refine the idea with the vendored Superpowers brainstorming method. Inspect only the project context needed for the current question.
2. Obtain design approval in conversation. Do not create project files yet.
3. Load `acorn/agents/planner.md` and `acorn/workflow/tickets.md`. Convert the approved design into the smallest useful set of ticket candidates.
4. Show every candidate with `Goal / Do / Keep / Done / Role / Gates` and optional `Read / Depends`. Explain ordering or dependencies when there is more than one.
5. Ask for ticket-registration approval. Design approval is not registration approval.
6. Only after explicit registration approval, create the ticket bodies and BOARD rows under the project contracts.
7. Stop. Worker and declared gates own execution; Reporter owns completion.

Split tickets only for independent outcomes, blocking dependencies, ownership boundaries, or separately meaningful verification. Do not create umbrella tickets or one ticket per component without execution value.

The only default durable output is the approved Acorn ticket set. Do not create a Superpowers spec, invoke `writing-plans`, implement code, commit, review, or close tickets.
