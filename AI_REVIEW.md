# AI_REVIEW.md

## 5) Self-Critique

### ✅ AI Did Well (2)

1. **Fast project acceleration and structure setup**
- AI helped bootstrap a clear split architecture between frontend and backend with TypeScript-ready foundations.
- This reduced initial setup time and made feature implementation start quickly.

2. **Good baseline consistency across API and UI layers**
- AI-generated patterns for response envelopes, validators, and module-level UI structure were mostly consistent.
- This consistency reduced integration friction between frontend API calls and backend endpoints.

### ❌ Where AI Was Wrong (2)

1. **Missed some behavior edge cases in UI flow**
- In the student create flow, selection and mode behavior caused confusing UX (create mode could unintentionally switch context).
- This required manual debugging and logic refinement in state transitions.

2. **Did not enforce domain constraints strongly enough at first pass**
- AI initially accepted broader date handling than needed for `expectedGraduation`, which later had to be tightened to strict date-only format.
- Similar business-rule details (for transitions and update behavior) required human review and correction.

### ⚠️ Technical Debt (Future Improvement)

1. **Replace JSON file persistence with a production-grade database**
- The current JSON file storage is suitable for demo/local workflows, but not ideal for concurrency, durability, and scale.
- Future improvement: migrate to PostgreSQL with migrations, indexing, pagination, and authentication/authorization.
