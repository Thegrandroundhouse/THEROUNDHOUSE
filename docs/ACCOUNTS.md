# Accounts — Auth, register, roles

## Roles (`profiles.role`)

| Role    | Use |
|---------|-----|
| **admin** | Full admin UI, Staff CRUD, settings |
| **staff** | Bookings, enquiries, calendar, etc. |
| **guest** | Default on signup; no admin (not used for venue staff after promotion) |

RLS uses `current_user_role()` from `profiles`.

---

## Sign in

- **Routes**: `/login`, `/admin-login`
- **Flow**: `signInWithPassword` → redirect `/admin`
- **Errors**: Wrong password, missing env (`NEXT_PUBLIC_SUPABASE_*`), network

---

## First admin (`/register`)

- **API**: `POST /api/auth/register-admin`
- **Requires**: `ADMIN_SETUP_KEY` in server env (8+ chars); same value on the form
- **Creates**: Auth user, `profiles.role = admin`, `staff` row
- **Triggers**: `handle_new_user` must exist so `profiles` row exists before role update

Structured API errors include `code`: `REGISTER_DISABLED`, `SETUP_NOT_CONFIGURED`, `INVALID_SETUP_KEY`, `VALIDATION`, `EMAIL_TAKEN`, `AUTH_ERROR`, `PROFILE_ERROR`, `STAFF_ERROR`, `SERVER_CONFIG`.

---

## Disable register (production)

Set **both**:

```env
DISABLE_ADMIN_REGISTER=1
NEXT_PUBLIC_DISABLE_ADMIN_REGISTER=1
```

- API returns 403 with clear message
- `/register` shows “Registration closed”
- `/login` shows “Ask an admin…” instead of register link

Details: **`docs/PRODUCTION.md`**.

---

## More staff

**Admin → Staff**: create email/password/role. No public register needed.

---

## Promote via SQL (emergency)

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
```

Use only if you locked register and need recovery.
