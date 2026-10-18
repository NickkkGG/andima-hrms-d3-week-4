# ANDIMA HRMS — Release Notes

Branch: `feature/D3-002-face-biometric-attendance`

## [Unreleased] — 18 October 2026

### Added

- B2 login and registration flow using Supabase Auth and `b2_register`.
- Face Biometric Attendance redirect after successful B2 login.
- Employee/HR operational access provisioning for the active D3 test accounts.
- Attendance location capture with map detail in Attendance History and Attendance & Productivity.
- Global loading, error, and 404 states using the Andima HRMS visual identity.
- Shared pagination for the main D3 data listings.
- Ticket notification badge in the sidebar and a Mark all as read action on the ticket page.

### Changed

- Login and registration UI aligned with the current B2 design.
- Account role rule for the active test accounts: `HR Administrator` is provisioned as `HR`; other positions are provisioned as `EMPLOYEE`.
- Face biometric UI includes realtime clock, liveness checking, identity lock, and clock-in/clock-out action panel.
- D3 navigation, white-page visual style, dark-blue hierarchy, and typography were aligned across the integrated modules.
- Authenticated D3 routes now redirect users without a valid session to login; authenticated users are redirected away from login/register.
- Header account details and menu eligibility read the active B2 profile and role from `b2_register`.
- Indonesian and English language controls are shared across D3 navigation and implemented page copy.

### Fixed

- Ticket creation now resolves the reporter from `d3_employee`, replacing the stale legacy-table reference that blocked new ticket submissions.
- Ticket attachments are restricted to JPG/JPEG, PNG, and WebP images (maximum 5 MB) in both the form and Storage policy.
- Freeze the displayed attendance time when face verification reaches the green identity-lock state.
- Re-enable the realtime clock when a scan is reset or restarted.
- B2 accounts that have been provisioned can now resolve their Employee/HRMS access instead of receiving the unmapped-account message.
- Ticket filters and notification actions were resized and aligned for a more stable responsive layout.
- Employee, HR, and Manager ticket visibility now uses the same unread-notification set for the page and sidebar badge.

### Verification

- `npm run typecheck` passed.
- `npm run build` passed.
- `npm run lint -- --quiet` passed.

### Known Limitations

- B2 registration does not yet auto-provision all legacy operational records required by existing D3 foreign-key relations. New accounts still require an operational provisioning step.
- Attendance, biometric templates/events, tickets, feedback, and rewards retain their existing foreign keys to `d3_employee`.
- Supabase schema, RLS, and `b2_register` access policies are owned by the MID/database team and were not changed in this release.

## [Week 4 Demo] — 29 September 2026

### Delivered

- Employee Report & Ticket workflow: ticket creation, status updates, follow-ups, audit history, and private attachments.
- Attendance History & Correction and Attendance & Productivity pages integrated into the D3 application.
- D3 sidebar and header account presentation.

### Architecture

- Next.js client components use Supabase Auth, Data API, and Storage directly.
- No custom `app/api` endpoint is used for the D3 feature set.

### Documentation

- [Backend documentation](docs/BACKEND.md)
- [Supabase migrations](supabase/migrations/)
