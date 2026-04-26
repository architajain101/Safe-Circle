# SafeCircle Security Specification

## Data Invariants
1. A user profile (`users/{uid}`) can only be created with its ID matching the authenticated user's UID.
2. A report (`reports/{id}`) must have a `reporterId` matching the authenticated user's UID.
3. Once a report is created, it should be immutable by the reporter to prevent evidence tampering.
4. Search (list) operations on reports must be allowed for any signed-in user, as long as they provide the correct target identifier.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: Attempt to create a report with `reporterId` set to another user's UID.
2. **Profile Hijacking**: Attempt to update another user's profile metadata.
3. **Evidence Tampering**: Attempt to update a report's `evidenceText` or `riskLevel` after creation.
4. **Shadow Write**: Attempt to create a report with an undeclared field `isVerified: true`.
5. **PII Scraping**: Attempt to list ALL reports without a filter (if `allow list` was too broad).
6. **Malicious ID**: Attempt to create a document with a 2MB string as its ID.
7. **Type Poisoning**: Attempt to set `createdAt` to a string instead of a number.
8. **Status Bypass**: Attempt to set `riskLevel` to 'critical' (an undeclared enum).
9. **Orphaned User**: Attempt to update a user profile but change the `uid` field (if it were inside).
10. **Timestamp Fraud**: Attempt to set `createdAt` to a future date instead of the server time.
11. **Resource Exhaustion**: Use a target identifier that is a 10KB string.
12. **Recursive Leak**: Attempt to access user PII in a collection without direct ownership.

## Security Test Runner Logic
The following rules will use helper functions `isValidReport` and `isValidUser` to enforce these constraints.
