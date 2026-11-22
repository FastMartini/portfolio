# Review template

### PR Review: [PR Title]

**Decision:** [Exactly one of APPROVE, REQUEST CHANGES, COMMENT]

**Summary:** [Intended behavior, overall assessment, and relevant verification or coverage.]

**What Looks Good:** [Specific strengths supported by the review.]

**Issues Found:** [Confirmed blockers, most consequential first, or state that no blockers were confirmed.]

- **[Critical / High / Medium / Low]** · `path/to/file:line` · [Short title]
  - [Trigger and problem.]
  - [Concrete impact.]
  - [Recommended fix.]

**Suggested Improvements:** [Confirmed non-blocking improvements. Label any material unconfirmed concerns as open questions and identify what would resolve them.]

**Final Verdict:** [Brief rationale and the action needed, if any.]

## Example

### PR Review: Add order pagination

**Decision:** REQUEST CHANGES

**Summary:** This PR adds cursor pagination to the orders endpoint. I inspected the query and pagination tests. I did not run the test suite.

**What Looks Good:** The endpoint caps page size and reuses the existing order serializer.

**Issues Found:**

- **High** · `orders/query.py:84` · Orders can disappear between pages.
  - The query sorts and filters on `created_at` alone. When two orders share a timestamp and straddle a page boundary, the next page's strict timestamp filter excludes the remaining order.
  - Users can miss orders when paging through their history.
  - Sort by `(created_at, id)`, encode both fields in the cursor, and use the same ordering in the filter. Add a regression test with identical timestamps spanning two pages.

**Suggested Improvements:** None.

**Final Verdict:** Fix the cursor tie-breaker before merging so pagination returns every order.
