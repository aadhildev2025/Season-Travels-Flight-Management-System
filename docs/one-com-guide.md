# Season Travels — one.com Domain & Database Setup Guide

This guide walks you through purchasing/configuring a domain and MySQL database on **one.com**, then connecting them to the Season Travels Flight Management System (Node.js + Express + Prisma + MySQL, deployed on Vercel).

---

## Project Overview

| Component       | Current Config / Tech                             |
|-----------------|---------------------------------------------------|
| Frontend        | React + Vite                                      |
| Backend         | Node.js + Express                                 |
| Database        | MySQL / MariaDB (Prisma ORM, `mysql2` driver)    |
| Auth            | JWT                                               |
| Email           | Nodemailer → `send.one.com` SMTP                  |
| Deployment      | Vercel                                            |
| DB (local)      | `mysql://root:@localhost:3306/season_travels`    |

---

## Part 1: Domain Setup on one.com

### Step 1 — Buy / Log in to one.com

1. Go to [https://www.one.com](https://www.one.com).
2. Log in to your **one.com Control Panel** (or create an account).
3. If you don't already own a domain:
   - Click **Domains** → **Buy domain**.
   - Search for your desired domain (e.g., `seasontravels.com`).
   - Complete purchase and DNS setup.

### Step 2 — Access DNS Settings

1. In the one.com Control Panel, go to **Domains** → **Your domain** → **DNS settings** (or **Advanced settings** → **DNS**).
2. You will see the existing DNS records (A, CNAME, MX, TXT, etc.).

### Step 3 — Point Domain to Vercel

Since the app is deployed on Vercel, you need a **CNAME** record that points your domain to Vercel's servers.

#### If using a `www` subdomain (recommended):

Add a **CNAME** record:

| Type   | Host    | Value                          | TTL   |
|--------|---------|--------------------------------|-------|
| CNAME  | www     | `<your-project>.vercel.app`    | Auto  |

Replace `<your-project>` with your actual Vercel project name (find it in your Vercel dashboard URL, e.g., `season-travels.vercel.app`).

#### If using the root domain (apex / naked domain):

one.com does **not** support ALIAS/ANAME records natively. You have two options:

**Option A — Use `www` only (simplest):**
- Set `www.seasontravels.com` as your primary domain URL.
- Redirect the root domain to `www` using one.com's built-in redirect (see below).

**Option B — Use one.com's URL Redirect:**
1. Go to **Domains** → **Your domain** → **Domain settings** or **Forwarding**.
2. Add a **URL redirect** from `seasontravels.com` → `https://www.seasontravels.com`.

#### Verify Vercel Configuration

1. In your Vercel project dashboard, go to **Settings** → **Domains**.
2. Add your domain (e.g., `www.seasontravels.com`).
3. Vercel will show you the DNS records you need to add — they should match what you added in one.com.
4. Wait for the verification status to show **"Pending"** → **"Active"** (this can take minutes to hours).

### Step 4 — Set up HTTPS (Automatic on Vercel)

- Vercel automatically provisions an SSL certificate once the domain is verified.
- No manual steps needed.

### Step 5 — Update one.com SMTP (already configured)

Your `.env` already uses one.com's SMTP. Verify these values:

```
SMTP_HOST=send.one.com
SMTP_PORT=587
SMTP_USER=eu@seasontravels.com
SMTP_PASS=Nord@scandic
```

If you're using a different email domain, update `SMTP_USER` and `SMTP_PASS` accordingly. one.com's SMTP relay works for any domain hosted on their platform.

---

## Part 2: Database Setup on one.com

### Step 1 — Determine your one.com hosting plan type

one.com offers MySQL databases primarily through their **Web hosting** and **Managed Cloud Hosting** plans. There are two scenarios:

#### Scenario A — You have a one.com **Web Hosting** plan (shared hosting)

Your MySQL database runs on the same infrastructure as your web hosting.

**1. Log in to the one.com Control Panel.**

**2. Go to Databases:**
- Navigate to **Web hosting** → **Your hosting package** → **Databases** (or **MySQL databases**).

**3. Create a new MySQL database:**
- Click **Create database**.
- Database name: `season_travels` (match your existing name).
- Username: create a dedicated user (e.g., `season_travels_user`). **Do not reuse `root`.**
- Password: generate a strong password. Save it — you'll need it for `DATABASE_URL`.
- Host: typically `localhost` or `mysqlXX.one.com` (one.com provides the hostname — check your panel).
- Port: `3306` (default MySQL).

**4. Note down the connection details:**
- Hostname: e.g., `mysql123.one.com` or `localhost`
- Port: `3306`
- Database name: `season_travels`
- Username: `season_travels_user`
- Password: `<your-strong-password>`

#### Scenario B — You have a **Managed Cloud Hosting** or **VPS** plan

The process is similar but you have more control:

1. In the **one.com Control Panel**, go to **Cloud hosting** or **VPS** → your server.
2. Use the server's control panel or SSH into the server.
3. Log in to MySQL: `mysql -u root -p`
4. Run:
   ```sql
   CREATE DATABASE season_travels CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'season_travels_user'@'%' IDENTIFIED BY '<strong-password>';
   GRANT ALL PRIVILEGES ON season_travels.* TO 'season_travels_user'@'%';
   FLUSH PRIVILEGES;
   ```
5. Note the hostname (usually `localhost` or the server's public IP).

### Step 2 — Get the Connection String Format

One.com uses the standard MySQL connection string format. For Prisma, it must be:

```
mysql://<username>:<password>@<host>:3306/season_travels
```

**Examples:**

- If host is `localhost` (shared hosting, SSH access):
  ```
  mysql://season_travels_user:MyStr0ngP@ss@localhost:3306/season_travels
  ```

- If host is a remote MySQL server (e.g., `mysql123.one.com`):
  ```
  mysql://season_travels_user:MyStr0ngP@ss@mssql123.one.com:3306/season_travels
  ```

**Important:** If the password contains special characters (`@`, `:`, `/`, `#`, etc.), URL-encode them. For example, `P@ss` becomes `P%40ss`.

### Step 3 — Allow Remote MySQL Connections (if needed)

If your Vercel serverless functions need to connect to a MySQL database on one.com's shared hosting, `localhost` won't work — Vercel runs on external servers.

You must:

1. **Use a remote MySQL host** (not `localhost`). one.com provides this — look for a hostname like `mysqlXX.one.com` in your hosting panel.
2. **Whitelist Vercel IP ranges** in one.com's firewall, or set the MySQL user's host to `%` (any host) when creating the user.
3. **Verify** the remote MySQL host is accessible from the internet (some one.com plans bind MySQL to `localhost` only — contact one.com support if needed).

---

## Part 3: Connect Domain & Database to the Project

### Step 1 — Update the `.env` (Server)

Edit `server/.env` on your local machine (and in your Vercel environment variables):

```env
# === Database ===
DATABASE_URL="mysql://season_travels_user:MyStr0ngP%40ss@mssql123.one.com:3306/season_travels"

# === Domain ===
CLIENT_URL=https://www.seasontravels.com

# === JWT ===
JWT_SECRET=change-this-to-a-secure-random-string

# === Server ===
PORT=5000

# === SMTP (one.com email) ===
SMTP_HOST=send.one.com
SMTP_PORT=587
SMTP_USER=eu@seasontravels.com
SMTP_PASS=Nord@scandic
```

**Critical notes for `DATABASE_URL`:**
- Use `https` for `CLIENT_URL` (not `http://localhost:3000`).
- URL-encode any special characters in the password.
- The host should be the **remote** MySQL hostname provided by one.com (not `localhost`).

### Step 2 — Run Prisma Migrate on the Remote Database

Locally (or from a machine that can reach the one.com MySQL server):

```bash
cd server
npx prisma migrate deploy
```

This applies your existing Prisma schema (including all tables, indexes, and the initial migration from `20260724134459_init`) to the one.com MySQL database.

To seed the database with initial data (roles, admin user, etc.):

```bash
npm run seed
```

### Step 3 — Update one.com DNS for SSL (if hosting backend elsewhere)

If you ever move the backend off Vercel (e.g., to one.com's hosting):

1. In one.com DNS settings, add an **A record**:
   | Type | Host | Value | TTL |
   |------|------|-------|-----|
   | A    | @    | `<server-IP>` | Auto |
   | A    | www  | `<server-IP>` | Auto |
2. SSL — one.com provides free Let's Encrypt SSL for all hosted domains.

### Step 4 — Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com) → your project → **Settings** → **Environment Variables**.
2. Add or update:
   - `DATABASE_URL` — the one.com MySQL connection string
   - `CLIENT_URL` — `https://www.seasontravels.com`
   - `JWT_SECRET` — a strong random string
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — one.com email SMTP
   - `PORT` — `5000` (Vercel auto-generates a port; this is informational)
3. **Redeploy** the project for changes to take effect.

### Step 5 — Update CORS Allowance for the one.com Domain

The backend (`server/src/index.js:26-33`) already allows CORS for origins ending in `.one.com` and `.vercel.app`, plus the `CLIENT_URL`. With your domain set to `https://www.seasontravels.com`, this will be automatically matched by the `.one.com` check **only if** your domain is hosted on one.com's nameservers. If your domain uses different DNS hosting, add the origin explicitly:

```js
const allowedOrigins = [
  process.env.CLIENT_URL,       // https://www.seasontravels.com
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://www.seasontravels.com',  // add explicitly if needed
].filter(Boolean);
```

---

## Part 4: Verification

### Verify Domain Points to Vercel

```bash
dig www.seasontravels.com CNAME
# Expected: <your-project>.vercel.app
```

### Verify Database Connection

```bash
cd server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect().then(() => console.log('DB connected!')).catch(e => console.error(e));
"
```

### Verify Health Endpoint

After deployment, visit:
```
https://www.seasontravels.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-07-25T...",
  "db": "connected"
}
```

### Verify Email Sending

Trigger a password reset or email notification and check that emails are delivered via one.com's SMTP (`send.one.com`).

---

## Summary Checklist

- [ ] Domain purchased/added on one.com
- [ ] CNAME record (`www` → Vercel) added in one.com DNS
- [ ] Domain verified in Vercel dashboard
- [ ] MySQL database created on one.com with dedicated user
- [ ] Remote MySQL hostname obtained from one.com
- [ ] `DATABASE_URL` updated with one.com credentials
- [ ] `CLIENT_URL` set to production domain
- [ ] Prisma migrations applied to one.com database
- [ ] Seed data imported (if needed)
- [ ] Vercel environment variables set for production
- [ ] Project redeployed on Vercel
- [ ] `/api/health` returns `"db": "connected"`
- [ ] Email sending works via one.com SMTP

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Vercel domain verification fails | Wait 24h for DNS propagation; double-check CNAME value |
| `ECONNREFUSED` on database | Confirm the MySQL host allows remote connections; check one.com firewall |
| `Access denied for user` | Verify username/password; ensure host is `%` or includes Vercel IPs |
| CORS errors in browser | Check `CLIENT_URL` matches the browser's origin exactly |
| Emails not sending | Verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` are correct |
| Prisma migrate fails | Ensure the remote MySQL version is compatible with the Prisma connector (MySQL 5.7+ / 8.x) |
| Special chars in password break DATABASE_URL | URL-encode them (e.g., `@` → `%40`, `:` → `%3A`, `/` → `%2F`) |

---

## one.com Support

If you get stuck with one.com-specific settings:
- **one.com Help Center**: [https://www.one.com/help/](https://www.one.com/help/)
- **one.com Live Chat**: Available in the Control Panel
- **one.com Phone**: Check their contact page for your region
