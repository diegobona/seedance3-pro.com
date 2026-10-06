# AnyPoses and Pixal3D referral statistics

Double-click `start-referral-admin.bat` in the project directory to start the local Blog CMS on port 4319 and open `http://127.0.0.1:4319/admin/referrals`. The launcher reuses an already running dashboard. Run it again after restarting the computer; the dashboard process runs in the background without a terminal window. Statistics load automatically; there is no viewing token to enter. The loopback-only CMS uses its configured service credential to read the private Worker endpoint. That credential remains in the ignored `.env.local` file and the Worker secrets, never in public assets or the browser request.

The dashboard defaults to AnyPoses and has a separate Pixal3D tab. Both sources
count referrals entering `/app/image/gpt-image-2`, including its Chinese version.
Partner links should include their source marker so links using `noreferrer`
can still be attributed:
`https://seedance3-pro.com/app/image/gpt-image-2?ref=anyposes`.
`https://seedance3-pro.com/app/image/gpt-image-2?ref=pixal3d`.
Actual referrers from anyposes.com, pixal3d.net and their subdomains also work
when the source site sends them. Pixal3D tracking does not hide Pose Studio.
Source sessions are independent, while the anonymous browser ID is shared.

Pose entry visibility is scoped to an AnyPoses browsing journey. Its flag continues
across internal navigation and page reloads. A fresh direct entry or an external
entry from Pixal3D or another site restores Pose entries and clears the flag.
Legacy unscoped flags are automatically removed. The Worker serves the shared
guard for static Pages as well as embedding it in React workspaces, so these rules
remain consistent across the site.

- Visitors are distinct anonymous browser IDs, retained in a first-party cookie for a year. They are not registered account counts. Different devices, cleared cookies and blocked cookies affect this measurement.
- Visits are referral sessions with a rolling 30-minute inactivity expiry. Refreshes, site navigation and another tab reuse the visit; the database ignores duplicate visit IDs. Old Pose visibility flags alone never create a referral visit.
- Counts include only visits recorded after this feature was enabled. Periods include today and use Asia/Shanghai calendar dates. Distinct visitor totals are calculated across each period, not by adding daily counts.
- Each record contains the anonymous visitor ID, visit ID, fixed source, entry pathname and server timestamp. Prompt query strings, email, IP and browser user agents are not stored in this table.

Deployment uses `npm run db:migrate`, `npm run build`, and `wrangler deploy --secrets-file .env.local`, along with the normal Pages deployment for the static dashboard and shared browser script. A successful collection response is only acknowledged in the browser after database insertion; failures retry on subsequent page navigation without blocking the app.
