# Deploy to Vercel — 5 minutes

The fastest path to a public URL. The app boots with the **in-memory data
store** by default, so you don't need a Supabase project to deploy.

## Prerequisites

- A GitHub account with this repo pushed to it
- A Vercel account (free Hobby plan is enough) — sign up with GitHub OAuth
  in one click at https://vercel.com/signup

## Step 1 — Push to GitHub

The repo is already a local git repo on the `main` branch. Push it to your
GitHub:

```powershell
# If you haven't already added a remote:
git remote add origin https://github.com/orhanucok/builder-clans.git
git push -u origin main
```

If `gh` is installed and authenticated (as it is in this environment), you
can also create the repo and push in one go:

```powershell
gh repo create builder-clans --public --source=. --remote=origin --push
```

## Step 2 — Connect Vercel to GitHub

1. Go to https://vercel.com/dashboard
2. Click **Add New → Project**
3. Click **Import** next to your `builder-clans` repo
4. (One-time) Authorize Vercel to access your GitHub repos

## Step 3 — Configure the project

Vercel auto-detects Next.js. The defaults are correct:

| Setting    | Value          |
| ---------- | -------------- |
| Framework  | Next.js        |
| Build cmd  | `next build`   |
| Output dir | `.next`        |
| Node       | 20.x (default) |

**No environment variables are required** — the in-memory store is the
default. If you later wire Supabase, add the vars from `.env.example` in
the Vercel project settings → Environment Variables.

## Step 4 — Deploy

Click **Deploy**. The first build takes ~2 minutes (Next.js + 17 routes +
middleware). When it finishes, you get a URL like:

```
https://builder-clans-orhanucok.vercel.app
```

Click it. The landing page loads. The dev-login API still works
(`/api/dev/login?email=defne@builderclans.dev`) so the demo personas are
all reachable.

## Step 5 — Make it look real

The URL above is auto-generated. To pick a cleaner one:

1. Project Settings → Domains
2. Type the name you want, e.g. `builder-clans-demo`
3. Vercel gives you `https://builder-clans-demo.vercel.app`
4. Save. SSL is automatic.

## Optional — Custom domain (e.g. `builderclans.dev`)

1. Buy the domain from any registrar (Cloudflare Registrar, Porkbun,
   Namecheap — all $10–15/yr for `.dev`)
2. In Vercel: Project Settings → Domains → Add → enter your domain
3. Vercel shows the DNS records to add at your registrar
4. Add them. Wait ~5 min for DNS propagation. SSL is automatic.

## Sharing the URL

Once you have the URL, anyone can:

- Land on the public landing page (`/`)
- Sign in as one of the 13 seeded personas via the login page
- Browse 20 projects, run a Trial Sprint, ship work
- The whole end-to-end story is demonstrable without a backend

The `SetupBanner` on every page tells visitors this is the in-memory demo
build. The `bc_demo_session` cookie is httpOnly and scoped to the domain,
so it works the same in production.

## What's running on Vercel

- Next.js 14 production build (`next start` after `next build`)
- In-memory data store (auto-seeded on first request)
- Cookie-based demo auth (`bc_demo_session`, `bc_demo_user`)
- All 17 routes server-rendered
- Security headers (CSP, HSTS, Permissions-Policy) via `vercel.json`
- Free tier: 100 GB bandwidth, unlimited requests, 6s serverless function
  timeout (we don't use serverless functions, so this is moot)

## When you outgrow the in-memory store

- The `lib/db/store/` module is the only seam. Add a Supabase adapter that
  exposes the same `db.projects.all() / db.profiles.get(id)` API
- All 30+ call-sites switch automatically
- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env
  vars in Vercel, redeploy
- The in-memory store drops out of the way

That's it. No other code changes needed.
