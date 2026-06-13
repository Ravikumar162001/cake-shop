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
