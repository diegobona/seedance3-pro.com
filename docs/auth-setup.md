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

The first migration creates Better Auth's `user`, `session`, `account`, and `verification` tables. The user table already reserves role, plan, generation counters, generation limit, credit balance, payment customer ID, subscription status, and subscription expiry fields.

Neon is the simplest fit here because local development and Cloudflare deployment can use the same PostgreSQL URL, and the future quota, credits, billing, and transaction logic can stay in one relational database. Hyperdrive can be added later if production database traffic justifies connection pooling at Cloudflare's edge.

## 2. Configure local secrets

Use only `.env.local`; it is ignored by Git. Keep the existing `TUZI_API_KEY` line and add:

```dotenv
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
TUZI_API_KEY=...
```

`BETTER_AUTH_SECRET` must be at least 32 characters. Generate one locally with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Google credentials are optional while testing email/password authentication. If they are absent, email registration and login still work.

## 3. Configure Google OAuth

In Google Cloud Console, create a Web application OAuth client and add these authorized redirect URIs:

- Local: `http://localhost:4310/api/auth/callback/google`
- Production: `https://seedance3-pro.com/api/auth/callback/google`
- Production www, if used: `https://www.seedance3-pro.com/api/auth/callback/google`

Set the resulting client ID and client secret in `.env.local`.

## 4. Run locally

```powershell
npm install
npm run db:migrate
npm run dev
```

Open `http://localhost:4310/app/?model=gpt-image-2`. Registration, login, Google login, session cookies, avatar menu, logout, and the protected image generation endpoint all run through the TanStack server.

Do not use `npm run start:cms` for the authenticated studio; that command only starts the older standalone CMS compatibility server.

## 5. Deploy

The existing deployment workflow uploads the same `.env.local` values as encrypted Worker secrets before deploying:

```powershell
npm run deploy:worker
```

Before the first deployment, replace the placeholder `CMS_JOBS` KV namespace ID in `wrangler.jsonc` with the real namespace ID. The Worker routes `/app`, `/app/*`, `/app-assets/*`, and `/api/*` to TanStack while delegating the existing CMS API and scheduled job to the legacy handler.

Never commit `.env.local`. Only `.env.example` contains placeholders.
