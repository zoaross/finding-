# Finding AI Simulation QA Report

Generated: 2026-05-31

## Scope

No UI redesign was performed. This pass prepared and ran MVP stabilization tests for:

- Auth signup/login/logout/session persistence
- Profile creation
- Need posting and lifecycle close state
- Identity card persistence with media and voice upload
- Public-profile style matching target selection
- Save person/card/need persistence
- Conversation creation and message persistence
- Settings persistence
- Block/report persistence
- Invalid need status rejection

## Gemini Status

Gemini was requested for simulation generation, but the project currently has no `GEMINI_API_KEY` or `GOOGLE_API_KEY` configured. The simulation seed is therefore deterministic and Gemini-ready rather than live Gemini-generated.

## Artifacts Added

- `supabase/seed_gemini_ai_simulation.sql`
  - Creates 50 simulated users.
  - Creates profiles, identity cards, portfolio items, needs, saved items, conversations/messages, blocks, reports, settings, and lifecycle feedback.
  - Uses current MVP status values: `open`, `paused`, `closed`, `matched`, `completed`, `failed`.
  - Uses current saved tables: `saved_users`, `saved_cards`, `saved_needs`, `saved_portfolio_items`.
  - Uses simulated profiles as valid conversation targets.

- `scripts/qa-mvp-smoke.mjs`
  - Updated away from legacy `bookmarks`, `matching`, and `archived`.
  - Tests current MVP persistence surfaces and constraints.

## Automated Test Result

Build: PASS

Smoke QA:

- PASS: 17
- FAIL: 15

The failures are concentrated behind one root blocker: Supabase email confirmation prevents the newly signed-up QA user from obtaining a session. Without a session, RLS correctly rejects all `auth.uid()`-scoped writes.

## Bugs Found

### Critical: QA signup cannot proceed without email confirmation

Affected flow:

- Auth login
- Session persistence
- Profile save
- Need posting
- Identity card save
- Storage upload
- Save user/card/need
- Chat creation/message sending
- Settings persistence
- Report/block

Exact error:

- `Email not confirmed`
- `new row violates row-level security policy`

Likely root cause:

- Supabase Auth requires email confirmation for newly created test users.
- The anon client cannot create a confirmed test user.
- RLS policies require `auth.uid()`, so all post-login writes fail after login fails.

Severity: critical

Recommended fix:

1. For QA only, either disable email confirmation temporarily in Supabase Auth settings, or manually confirm the generated QA user.
2. Re-run `scripts/qa-mvp-smoke.mjs`.
3. For long-term automated QA, add a service-role-only local script or SQL seed that creates confirmed test users. Do not expose the service key in frontend code.

### Major: Simulation seed must be run before social stress testing

Affected flow:

- Discover/matching density
- Public profile exploration
- Saved item testing across many users
- Sample conversation testing

Exact current observation:

- Database currently had only 4 visible profiles during QA.

Likely root cause:

- The new 50-user seed has not been run yet in Supabase SQL Editor.

Severity: major

Recommended fix:

1. Run `supabase/seed_gemini_ai_simulation.sql` in Supabase SQL Editor.
2. Refresh app and re-run QA.

### Major: Existing older seed script is obsolete

Affected file:

- `supabase/seed_ai_simulation.sql`

Issues:

- Creates 40 users, not 50.
- Uses old `needs.status = 'matching'`, now invalid.
- Uses old `bookmarks` and `user_reports` behavior.
- Does not populate structured identity card fields or portfolio depth.

Severity: major

Recommended fix:

- Use `supabase/seed_gemini_ai_simulation.sql` for the current MVP instead.

### Minor: Build CSS warning

Affected file:

- CSS import order in generated bundle/source styles.

Exact warning:

- `@import rules must precede all rules aside from @charset and @layer statements`

Severity: minor

Recommended fix:

- Move Google Fonts `@import` before other CSS rules in the source stylesheet later. This does not block MVP testing.

## Recommended Fix Order

1. Run `supabase/seed_gemini_ai_simulation.sql` in Supabase SQL Editor.
2. Temporarily disable email confirmation for QA or manually confirm the QA test account.
3. Re-run `scripts/qa-mvp-smoke.mjs`.
4. If chat/save/profile writes still fail after login succeeds, inspect the exact RLS error per table.
5. Add a service-role-only QA seed flow later for repeatable automated user creation.

