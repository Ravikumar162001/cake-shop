# 🧁 Sweet Bites — Cake Shop

A Node.js + Express + MongoDB cake ordering app with an AngularJS frontend.

## Running locally

### 1. Prerequisites
- **Node.js 18 or newer** (`node -v` to check)
- **A MongoDB database** — either:
  - a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (cloud), or
  - a local MongoDB running at `mongodb://127.0.0.1:27017`

### 2. Install dependencies
```bash
npm install
```

### 3. Create your environment file
Copy the example and fill in your own values:
```bash
cp .env.example .env
```
Then edit `.env`:

| Variable       | Required | What to put                                                                 |
|----------------|----------|------------------------------------------------------------------------------|
| `MONGODB_URI`  | ✅       | Your Atlas connection string, or `mongodb://127.0.0.1:27017/cakeShop` for a local DB |
| `JWT_SECRET`   | ✅       | Any long random string (used to sign login tokens)                          |
| `ADMIN_EMAIL`  | ✅       | The email address that should get admin rights (see note below)             |
| `EMAIL_USER`   | optional | Gmail address for sending emails — **leave blank for local testing**        |
| `EMAIL_PASS`   | optional | Gmail App Password — **leave blank for local testing**                       |
| `PORT`         | optional | Defaults to `3000`                                                           |

> The app will refuse to start if `MONGODB_URI` or `JWT_SECRET` is missing — this is intentional.

### 4. Start the server
```bash
npm run dev    # auto-restarts on file changes (recommended for testing)
# or
npm start      # plain start
```
Open **http://localhost:3000** in your browser.

## Testing the main flows

1. **Become admin:** Sign up with the same email you set as `ADMIN_EMAIL`. That account gets the admin role and can open the admin dashboard.
2. **Add cakes:** Use the admin dashboard to add a few cakes (with images). Orders can only contain cakes that exist in the database, so add at least one before ordering.
3. **Place an order:** Add cakes to the cart, log in as a normal user, and check out. Order totals are recalculated on the server from the database prices.
4. **Email / OTP without Gmail:** If you leave `EMAIL_USER`/`EMAIL_PASS` blank, the app runs in **dev email mode** — order confirmations and password-reset OTPs are printed to the terminal instead of being emailed. Watch the server console for lines starting with `📧 [DEV EMAIL]` to read the OTP.

## Notes
- Uploaded cake images are saved to the `uploads/` folder (ignored by git except for the seed assets).
- `.env` is git-ignored — never commit real credentials.
- To run against the cloud database used in production, paste that Atlas connection string into `MONGODB_URI`.

## Protecting secrets

The three secrets this app uses (MongoDB password, Gmail App Password, JWT secret) must **never** appear in code or commits — only in `.env` locally and in the Render dashboard (Environment tab) in production.

### If a secret ever leaks (or was ever committed), rotate it:
1. **MongoDB Atlas password:** Atlas → Database Access → edit the DB user → Edit Password → Autogenerate → Update User. Put the new password into `MONGODB_URI` in `.env` and on Render.
2. **Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords → delete the old one, create a new one, update `EMAIL_PASS`.
3. **JWT secret:** generate a fresh random string (`openssl rand -base64 48`), update `JWT_SECRET`. All users get logged out — that's expected.

Rotating is mandatory after a leak: removing a secret from the latest commit does **not** remove it from git history.

### Guard rails in this repo
- **CI secret scan:** `.github/workflows/secret-scan.yml` runs [gitleaks](https://github.com/gitleaks/gitleaks) on every push/PR and fails if a secret is present in the tree. Rules live in `.gitleaks.toml`.
- **Pre-commit hook:** blocks commits containing secrets before they ever leave your machine. Enable once per clone:
  ```bash
  git config core.hooksPath .githooks
  ```
  (Requires gitleaks installed locally; the hook skips gracefully if it isn't.)
- **GitHub settings (do this once, in the browser):** Repo → Settings → Advanced Security → enable **Secret scanning** and **Push protection**, and keep the repo **Private**.
- Also recommended in Atlas: give the DB user `readWrite` on the `cakeShop` database only, and restrict **Network Access** to known IPs instead of `0.0.0.0/0`.
