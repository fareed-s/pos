# POS Management System

**Multi-Tenant SaaS Point of Sale System** for Shops, Retailers & Wholesalers.
MERN Stack (MongoDB, Express, React 18, Node.js).

---

## Local Development

```bash
# Install
cd backend  && npm install
cd ../frontend && npm install

# Configure secrets
cp .env.example .env   # at repo root, used by docker-compose
# AND a per-service backend/.env for `npm run dev` mode

# Seed demo data
cd backend && npm run seed

# Run (two terminals)
cd backend  && npm run dev
cd frontend && npm run dev
```

Open **http://localhost:5173**.

### Demo logins (after `npm run seed`)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@possystem.com | SuperAdmin@123 |
| Business Admin | admin@store.com | Admin@123 |
| Manager | manager@store.com | Manager@123 |
| Cashier | cashier@store.com | Cashier@123 |

---

## Production Deployment (VPS)

The stack ships as three Docker containers — `frontend` (nginx), `backend` (node), `mongo` — orchestrated by `docker compose`. Only port 80 is exposed publicly; the database and API live on an internal Docker network and are reached via the nginx reverse proxy.

### 1. One-time VPS bootstrap

SSH into the box as root and run the setup script. It installs Docker, opens the firewall, clones the repo to `/opt/pos-system`, and writes a `.env` stub.

```bash
ssh root@<vps-ip>
curl -fsSL https://raw.githubusercontent.com/fareed-s/pos/main/scripts/vps-setup.sh | bash
```

### 2. Fill in `.env`

```bash
nano /opt/pos-system/.env
```

At minimum set:
- `MONGO_ROOT_PASSWORD` — `openssl rand -base64 32`
- `JWT_SECRET` — `openssl rand -base64 64`
- `CLIENT_URL` — `http://<vps-ip>` or your domain
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — change immediately after first login

Cloudinary keys are optional — leave empty to keep khata proof uploads in a local Docker volume.

### 3. Start the stack

```bash
cd /opt/pos-system
docker compose up -d --build
docker compose logs -f         # tail until services are healthy
```

The app is now on `http://<vps-ip>`.

### 4. CI/CD — automatic deploy on push to main

The workflow at `.github/workflows/deploy.yml`:
1. Builds backend + frontend images on a GitHub-hosted runner
2. Pushes them to GHCR (`ghcr.io/<owner>/pos-backend:<sha>` etc.)
3. SSHs into the VPS and runs `scripts/deploy.sh`, which pulls the new images and runs `docker compose up -d` with a health-check

Configure these **GitHub repo secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `VPS_HOST` | `31.97.119.223` (or your hostname) |
| `VPS_USER` | `root` |
| `VPS_SSH_PRIVATE_KEY` | the *private* SSH key whose public half is in `/root/.ssh/authorized_keys` on the VPS |
| `VPS_SSH_PORT` | optional, defaults to `22` |

If your GHCR images are private, the VPS also needs to be logged in once:

```bash
echo $GHCR_TOKEN | docker login ghcr.io -u <your-github-username> --password-stdin
```

(Generate `GHCR_TOKEN` at github.com/settings/tokens with `read:packages` scope.)

### 5. Manual redeploy from the VPS

```bash
cd /opt/pos-system
bash scripts/deploy.sh
```

Idempotent — safe to re-run any time. Pulls latest `main`, rebuilds / pulls images, restarts only services whose config changed, and runs a health check.

### 6. HTTPS (recommended)

Put Caddy or nginx-proxy-manager in front of port 80 for automatic Let's Encrypt. Quick Caddy example on the same box:

```bash
docker run -d --name caddy --network host \
  -v caddy_data:/data -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  caddy:2
```

```Caddyfile
pos.yourdomain.com {
  reverse_proxy localhost:80
}
```

Then change `HOST_HTTP_PORT=8080` in `.env` so Caddy owns :80/:443.

---

## Tech

Backend: Node.js · Express · MongoDB · Mongoose · JWT · Zod · Helmet · bcrypt · Multer · Cloudinary
Frontend: React 18 · Vite · Tailwind CSS · Recharts · React Router v6 · react-select · html5-qrcode · papaparse · xlsx
DevOps: Docker (multi-stage, non-root, healthchecks) · Nginx · GHCR · GitHub Actions
