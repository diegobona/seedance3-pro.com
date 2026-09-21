# SEEDANCE account setup

The studio uses TanStack Start, Better Auth, Drizzle, and a Neon PostgreSQL database. The static homepage is not part of this application and remains unchanged.

## 1. Create the Neon database

1. Create one Neon project and database.
2. Copy the pooled connection string from the Neon dashboard. It normally contains `-pooler` in the hostname and ends with `sslmode=require`.
3. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to that connection string.
4. Create the tables:

   ```powershell
   npm run db:migrate
   ```

The migrations create Better Auth's `user`, `session`, `account`, and `verification` tables, plus the `video_generation_task` table used to track AutoDL jobs. The user table already reserves role, plan, generation counters, generation limit, credit balance, payment customer ID, subscription status, and subscription expiry fields. Run `npm run db:migrate` after pulling this change so the new video task migration is applied.

Neon is the simplest fit here because local development and Cloudflare deployment can use the same PostgreSQL URL, and the future quota, credits, billing, and transaction logic can stay in one relational database. Hyperdrive can be added later if production database traffic justifies connection pooling at Cloudflare's edge.

## 2. Configure local secrets

Use only `.env.local`; it is ignored by Git. Keep the existing `TUZI_API_KEY` line and add:

```dotenv
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
TUZI_API_KEY=...
AUTODL_TOKEN=...
```

`BETTER_AUTH_SECRET` must be at least 32 characters. Generate one locally with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Google credentials are optional while testing email/password authentication. If they are absent, email registration and login still work.

## 3. Configure AutoDL video generation

In your AutoDL account, open **Token Management** and create a token in the **ComfyUI** group. Set that value as `AUTODL_TOKEN` in `.env.local`. Authorization is added by the server; never put the token in browser or client code, print or paste it into logs or commands, or commit it.

The selected workflow ID is `minimax_h3_lightx2v_no_pic`. The current free trial is fixed to 480p, with credit costs of 5 credits for 5 seconds, 10 credits for 10 seconds, and 15 credits for 15 seconds.

## 4. Configure Google OAuth

In Google Cloud Console, create a Web application OAuth client and add these authorized redirect URIs:

- Local: `http://localhost:4310/api/auth/callback/google`
- Production: `https://seedance3-pro.com/api/auth/callback/google`
- Production www, if used: `https://www.seedance3-pro.com/api/auth/callback/google`

Set the resulting client ID and client secret in `.env.local`.

## 5. Run locally

```powershell
npm install
npm run db:migrate
npm run dev
```

Open `http://localhost:4310/app?model=minimax-h3`. Registration, login, Google login, session cookies, avatar menu, logout, and the protected generation endpoints all run through the TanStack server.

Do not use `npm run start:cms` for the authenticated studio; that command only starts the older standalone CMS compatibility server.

## 6. Deploy

The existing deployment workflow runs `wrangler secret bulk .env.local` to upload the same values as encrypted Worker secrets before deploying:

```powershell
npm run deploy:worker
```

Do not print or paste the real AutoDL token while deploying.

Before the first deployment, replace the placeholder `CMS_JOBS` KV namespace ID in `wrangler.jsonc` with the real namespace ID. The Worker routes `/app`, `/app/*`, `/app-assets/*`, and `/api/*` to TanStack while delegating the existing CMS API and scheduled job to the legacy handler.

Never commit `.env.local`. Only `.env.example` contains placeholders.
