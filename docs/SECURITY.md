# Security checklist (Supabase + app)

## Leaked password protection (Supabase linter: `auth_leaked_password_protection`)

**Not configurable in SQL or this repo** — turn it on in the Supabase project:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. **Authentication** → **Providers** (or **Policies** / **Attack Protection** depending on UI version).
3. Under **Password** / **Security**, enable **Leaked password protection** (HaveIBeenPwned checks).

Docs: [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

---

## Migrations that address DB linters

| Migration | Lint |
|-----------|------|
| **032** | `auth_rls_initplan`, `multiple_permissive_policies` |
| **033** | `function_search_path_mutable` (`handle_new_user`, `current_user_role`), `rls_policy_always_true` (`enquiries_insert`) |

After applying **033**, re-run **Database Linter** in the Dashboard (Advisors).

---

## Enquiries INSERT policy (033)

Public/anonymous inserts must:

- `status = 'new'`
- Reasonable **name** / **email** length and email shape
- No **notes**, **follow_up_notes**, or **last_contact_at** on insert

The live site still submits via **service role** from `/api/enquiry`, so behaviour there is unchanged; the policy tightens **direct** anon access to the table if the anon key is ever used.
