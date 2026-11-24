# D3-002 verification record

Scope: findings from `qa_bug_report_hrms_d3.pdf` and the supplied screenshot only. No database is changed by this record; the new migration remains unapplied until it is deployed through the normal Supabase migration process.

## Implemented checks

| Ref | Expected result | Implementation |
| --- | --- | --- |
| BUG-D3-004 | One search field filters Attendance History, Audit Trail, and Attendance Closing. | `app/attendance/page.tsx` applies the search term together with date filters in all three views. Audit searches target/actor/action/reason; Closing searches period/status/reason and closer/reopener identity. |
| BUG-D3-005 | An all-numeric Employee Name is rejected and is not saved. | `components/EmployeeEditForm.tsx` rejects a name without a letter; migration `20261124090000_d3_profile_name_phone_validation.sql` repeats the validation in the trusted HR RPC. |
| BUG-D3-006 | Alphabetic/symbol-only telephone input is rejected and is not saved. | The form and HR RPC accept only Indonesian `0…` or `+62…` numbers, with spaces, hyphens, and parentheses allowed as separators. |
| BUG-D3-007 | Original clock-in and clock-out are shown in the correction form. | Source audit confirmed the existing Correction form already renders both original fields. No unrelated change made. |

## Browser test script

Run these checks after applying the migration to a non-production Supabase project and using the existing demo accounts from the Show and Tell runbook.

1. Sign in as HR and open **Attendance Management**.
2. In each tab, search a known employee/HR name such as `Dava`:
   - Attendance History: matching employee rows remain.
   - Audit Trail: matching target or actor rows remain.
   - Attendance Closing: closing/reopening periods made by that HR account remain.
3. With the same active filters, change the date range and confirm search and dates are combined (not mutually exclusive).
4. Open an employee Edit Profile page. Enter `111111` as Employee Name and submit; expect the Indonesian/English validation message and no success notification.
5. Enter `abc` as Phone and submit; expect the phone validation message and no success notification.
6. Enter a valid name and `+62 812-3456-7890`, save, and verify the normal success message plus redirect remains intact. Restore the original safe demo contact value afterward.
7. As the employee demo account, complete the biometric clock-in or clock-out flow and confirm its success message, redirect to history, current record, and correct Employee ID. Do not repeat a completed clock-in/out for the same Jakarta date.

## Execution log

| Check | Result | Notes |
| --- | --- | --- |
| Pure browser-rule test | Passed | Compiled `utils/employee-profile-validation.ts` at the project ES2017 target. `111111` and `abc` were rejected; `0812-3456-7890` and `+62 812 3456 7890` were accepted. |
| Changed TS/TSX parse | Passed | TypeScript transpilation parsed `app/attendance/page.tsx`, `components/EmployeeEditForm.tsx`, and the new validation helper without syntax diagnostics. |
| Supabase RPC migration and assertions | Passed | Loaded into a disposable local Supabase Postgres container. Migration created successfully; numeric-only name and alphabetic phone raised `22023`; a valid `+62` number returned the expected Employee ID. Container was stopped after the test. |
| Static typecheck / ESLint | Blocked by environment | `npm ci` could not finish because the registry connection ended with `EHOSTUNREACH` while downloading Next. No pass result is claimed. |
| Browser E2E | Blocked by environment | The local server could not be built with the incomplete dependency installation. A smoke-test fallback using the older local clone reached a 500 because that clone lacks `@supabase/ssr`; no account credentials or production data were used. Re-run the browser script after `npm ci` succeeds and with the existing safe demo accounts. |
