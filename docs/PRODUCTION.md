# Production setup — Supabase, env, deploy, auth

Step-by-step checklist to go live safely.

---

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy  
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`  
   - `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   - `service_role` **secret** → `SUPABASE_SERVICE_ROLE_KEY` (server only, never in client code).
3. **Authentication → Providers**: enable **Email** (and optionally others).
4. **SQL Editor** or **Supabase CLI**: run every file in `supabase/migrations/` in order (001, 002, …).  
   See `docs/SQL-README.md` for what each migration does.
5. Optional: run `supabase/seed.sql` only on non-production if you use it.

---

## 2. Local env (development)

```bash
cp .env.local.example .env.local
```

Fill at minimum:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_*` | Browser Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server admin APIs |
| `ADMIN_SETUP_KEY` | Secret for `/register` (first admin only) |

```bash
npm install
npm run dev
```

---

## 3. First admin (register)

1. Set `ADMIN_SETUP_KEY` to a long random value (8+ characters).
2. Restart `npm run dev`.
3. Open **`/register`**, enter email, password, display name, and the **same** value as `ADMIN_SETUP_KEY`.
4. Sign in at **`/login`** or **`/admin-login`** → **`/admin`**.
5. Add further users under **Admin → Staff** (recommended for everyone after the first).

Errors you might see:

| Message | Fix |
|---------|-----|
| Admin registration is not configured | Set `ADMIN_SETUP_KEY`, restart |
| Setup key does not match | Typo; must equal env exactly |
| Profile update failed | Run migrations; ensure `handle_new_user` trigger exists |
| Server misconfiguration | Set `SUPABASE_SERVICE_ROLE_KEY` |
| That email is already in use | Sign in or use another email |

---

## 4. Disable public register (production)

After the first admin exists, **close** `/register` so strangers cannot create admins.

**Option A — Env (recommended)**  
In production (and locally if you want):

```env
DISABLE_ADMIN_REGISTER=1
NEXT_PUBLIC_DISABLE_ADMIN_REGISTER=1
```

- **`DISABLE_ADMIN_REGISTER`**: API `/api/auth/register-admin` returns 403.  
- **`NEXT_PUBLIC_DISABLE_ADMIN_REGISTER`**: `/register` shows “Registration closed”; `/login` no longer links to register.

Rebuild/redeploy after changing `NEXT_PUBLIC_*`.

**Option B — Remove route (harder)**  
Delete or stop serving `src/app/(auth)/register/page.tsx` and remove links to `/register`. You’d need another way to bootstrap a fresh env (e.g. Supabase SQL to promote a user to `admin`). Option A is simpler.

---

## 5. Production build

```bash
npm run lint
npm run build
npm run start
```

Fix any build errors before deploy. Set all env vars on the host (Vercel, etc.) to match `.env.local.example`.

---

## 6. Deploy checklist

- [ ] All migrations applied on production Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only on server
- [ ] `ADMIN_SETUP_KEY` strong and private
- [ ] `DISABLE_ADMIN_REGISTER=1` + `NEXT_PUBLIC_DISABLE_ADMIN_REGISTER=1` after first admin
- [ ] `NEXT_PUBLIC_APP_URL` set to real domain if you use absolute links
- [ ] HTTPS on production domain
- [ ] Supabase Auth redirect URLs include your production URL (Auth → URL configuration)

---

## 7. Maintenance mode

```env
NEXT_PUBLIC_MAINTENANCE_MODE=1
```

Public site shows maintenance; staff still use **`/admin-login`**.

---

## 8. Docs index

| Doc | Content |
|-----|---------|
| `README.md` | Quick start, scripts |
| `docs/SQL-README.md` | Migrations |
| `docs/ACCOUNTS.md` | Roles, login, register |
| `docs/SECURITY.md` | RLS / security notes |
| `CHANGELOG.md` | Release notes |
