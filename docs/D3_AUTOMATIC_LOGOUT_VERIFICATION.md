# D3 Automatic Logout verification record

Scope: automatic logout only. The implementation does not change attendance,
primary authentication rules, or device timezone settings.

## Implemented policy

| Item | Result |
| --- | --- |
| Idle rule | 30 minutes without an approved user interaction. |
| Warning | Modal countdown during the final 60 seconds. |
| Activity | Pointer, keyboard, touch, and scroll events; touch calls are throttled to once per 15 seconds. Background polling does not extend a session. |
| Enforcement | Browser guard plus protected-route middleware. A transient status-RPC failure does not force logout. |
| Session scope | Current Supabase browser session only; other devices are not signed out. |
| Timezone source | Trusted `d3_employee.work_location` server mapping; device timezone and user metadata are not used. |
| Initial mapping | `HQ → Asia/Jakarta (WIB)`. The private configuration table supports `Asia/Makassar (WITA)` and `Asia/Jayapura (WIT)` when approved locations are added. |
| Missing mapping | Login is rejected with an HR-facing message; an existing protected session is also ended if its location becomes unmapped. |

## Database verification

Run from `lock-in`:

```bash
npm run test:session-idle
```

The test starts a disposable local Supabase Postgres Docker container and
applies only `scripts/d3-idle-logout-bootstrap.sql` plus the automatic-logout
migration. It never accesses a cloud project.

Latest execution: passed 17 assertions covering HQ/WIB, configured WITA and
WIT locations, 30-minute expiry, 60-second warning configuration, no duplicate
row for repeat start, activity extension, expiry non-reactivation, unmapped
location rejection, anonymous RPC denial, and no direct authenticated read of
private session state.

## Browser verification checklist

After applying the migration to a non-production Supabase environment and
running the app, verify with an active account mapped to `HQ`:

1. Log in; confirm normal redirect to the assigned landing page.
2. Leave the tab inactive for 29 minutes; confirm no early logout.
3. At the final 60 seconds, confirm the warning displays the configured WIB
   deadline. Select **Lanjutkan sesi** and confirm the countdown closes.
4. Repeat and select **Logout sekarang**; confirm redirect to Login and the
   readable session-ended notice.
5. With two tabs in the same browser session, interact in one tab and confirm
   the active deadline is shared with the other tab.
6. In a safe test copy, set the employee work location to a configured WITA or
   WIT mapping and repeat login; confirm the warning shows that server mapping.
7. Set a safe test profile to an unmapped location; confirm login is rejected
   with the HR configuration message. Restore the original work location.

## Environment limitation

Static typecheck, ESLint, and browser E2E remain pending because this workspace
has an incomplete `node_modules` tree: `tsc` and `eslint` binaries are absent.
No browser pass is claimed until dependencies can be installed and the checklist
above is run against a non-production project.
