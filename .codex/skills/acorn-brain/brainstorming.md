# Brainstorming rough ideas into an approved design

Adapted for Acorn Brain from Superpowers `brainstorming` 6.4.2 by Jesse Vincent. See `acorn/third-party-notices.md`.

The outcome is a design the Human recognizes as their intent. Acorn Brain converts that approved design into ticket candidates; this file does not create specs, plans, commits, or implementation.

## Establish shared understanding

1. Determine the intended outcome, who it serves, and what success looks like.
2. When material information is missing, ask one focused question per message. Prefer concise choices when they make the decision easier.
3. Reflect the current understanding in a short note. Separate Human statements from assumptions and invite correction.
4. Preserve the agreed intent through design and ticket conversion.

Do not repeat questions already answered. If the Human delegates judgment, choose conservative defaults and record only assumptions that affect scope or acceptance.

## Scale the exploration

- Small, bounded idea: clarify the missing decisions and present a short design in chat.
- Large or architectural idea: identify independent areas first, explore meaningful approaches, then present the design in reviewable sections.
- Feasibility uncertainty: clarify the question and evidence needed before promising a ticketable solution.

If the idea contains multiple independent systems, decompose the design before detailing each system. Do not hide a large program inside one ticket candidate.

## Explore approaches

When more than one materially different approach exists, present two or three options with trade-offs. Lead with the recommended smallest approach that satisfies the agreed outcome. Do not invent alternatives merely to perform ceremony.

Check every proposed capability against the agreed success criteria. Remove speculative features and flexibility.

## Present and approve the design

Cover only relevant sections:

- user-visible outcome and scope;
- important behavior and boundaries;
- components or data flow;
- failure handling and compatibility;
- verification and rollout constraints.

Scale each section to its complexity. Ask for correction or approval before treating the design as final. Approval permits ticket-candidate generation only; it does not permit ticket registration or implementation.

Return the approved design to Acorn Brain as concise decisions, constraints, acceptance conditions, dependencies, and unresolved blockers. Pass decisions, not conversation history.
