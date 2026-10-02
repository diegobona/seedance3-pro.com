# AnyPoses referral statistics

Open the existing local Blog CMS and follow the AnyPoses statistics link (`http://localhost:4310/admin/referrals`). Statistics load automatically; there is no viewing token to enter. The loopback-only CMS uses its configured service credential to read the private Worker endpoint. That credential remains in the ignored `.env.local` file and the Worker secrets, never in public assets or the browser request.

Only AnyPoses referrals entering `/app/image/gpt-image-2` are counted. Partner links should include `?ref=anyposes`:
`https://seedance3-pro.com/app/image/gpt-image-2?ref=anyposes`.
Actual referrers from anyposes.com and its subdomains also work when the source site sends them.

- Visitors are distinct anonymous browser IDs, retained in a first-party cookie for a year. They are not registered account counts. Different devices, cleared cookies and blocked cookies affect this measurement.
- Visits are referral sessions with a rolling 30-minute inactivity expiry. Refreshes, site navigation and another tab reuse the visit; the database ignores duplicate visit IDs. Old Pose visibility flags alone never create a referral visit.
- Counts include only visits recorded after this feature was enabled. Periods include today and use Asia/Shanghai calendar dates. Distinct visitor totals are calculated across each period, not by adding daily counts.
- Each record contains the anonymous visitor ID, visit ID, fixed source, entry pathname and server timestamp. Prompt query strings, email, IP and browser user agents are not stored in this table.

Deployment uses `npm run db:migrate`, `npm run build`, and `wrangler deploy --secrets-file .env.local`, along with the normal Pages deployment for the static dashboard and shared browser script. A successful collection response is only acknowledged in the browser after database insertion; failures retry on subsequent page navigation without blocking the app.
