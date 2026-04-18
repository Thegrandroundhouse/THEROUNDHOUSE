# How to create your first admin account

You need an **Admin setup key** to create the first admin. You choose this key yourself and put it in two places.

---

## Step-by-step

### 1. Create your env file (if you haven’t)

```bash
cp .env.local.example .env.local
```

### 2. Choose a secret for the setup key

Use any secret string you like, **at least 8 characters**. For example:

- `mySecretRoundhouseKey2024`
- Or a long random password

### 3. Put it in `.env.local`

In `.env.local`, set:

```
ADMIN_SETUP_KEY=mySecretRoundhouseKey2024
```

Use **your own** value instead of `mySecretRoundhouseKey2024`. Don’t share this file or commit it to git.

### 4. Restart the dev server

If the app is already running, stop it (`Ctrl+C`) and start again:

```bash
npm run dev
```

So that it reads the new `ADMIN_SETUP_KEY`.

### 5. Open the register page

In your browser go to:

**http://localhost:3000/register**

### 6. Fill the form

- **Display name** – e.g. your name or “Admin”
- **Email** – the email you want for this admin account
- **Password** – at least 8 characters
- **Admin setup key** – type the **exact same** value you put in `ADMIN_SETUP_KEY` in `.env.local`

If the key doesn’t match exactly, registration will fail.

### 7. Click Register

The first admin account is created. You’ll be redirected to sign in.

### 8. Sign in and open admin

- Sign in at **http://localhost:3000/login** or **http://localhost:3000/admin-login**
- Then go to **http://localhost:3000/admin**

---

## After the first admin

- You can add more staff or admins from **Admin → Staff** in the sidebar. They do **not** need the setup key.
- Keep `ADMIN_SETUP_KEY` in `.env.local` if you might need to run “first admin” again (e.g. new environment). You can change or remove it later; it’s only required for the **first** admin creation.

## Troubleshooting

| Problem | What to check |
|--------|----------------|
| “Invalid setup key” or registration fails | The value in the **Admin setup key** field must match `ADMIN_SETUP_KEY` in `.env.local` exactly (no extra spaces). |
| “ADMIN_SETUP_KEY is not set” | Add `ADMIN_SETUP_KEY=...` to `.env.local` and restart the dev server. |
| Env changes not applied | Restart `npm run dev` after editing `.env.local`. |
