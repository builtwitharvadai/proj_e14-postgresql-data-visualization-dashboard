# proj_e14-postgresql-data-visualization-dashboard

A web-based dashboard application that connects to a PostgreSQL database and visualizes data through interactive charts and graphs. The dashboard will provide real-time insights into database metrics and business data, enabling users to monitor key performance indicators and trends. The solution will feature a clean, intuitive interface with custom

## Docker Setup

The project ships with a `Dockerfile` and `docker-compose.yml` so the PostgreSQL database and backend API can be run together in isolated containers. This gives every contributor an identical development environment and matches the topology used in deployment.

### Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) 20.10 or newer
- [Docker Compose](https://docs.docker.com/compose/install/) v2 (bundled with recent Docker Desktop installs; on Linux install the `docker-compose-plugin` package)
- At least 2 GB of free RAM and 2 GB of free disk space for the images and PostgreSQL data volume

Verify your installation:

```bash
docker --version
docker compose version
```

### Quick Start

1. **Copy the environment template and fill in values**

   ```bash
   cp .env.example .env
   ```

   Open `.env` and set `DB_PASSWORD` to a strong secret. The other defaults (`DB_HOST=postgres`, `DB_PORT=5432`, `DB_NAME=dashboard_db`, `DB_USER=dashboard_user`, `PORT=3000`) are already wired to the `docker-compose.yml` service names and normally do not need to be changed for local development.

2. **Build the images and start the stack**

   ```bash
   docker compose up --build
   ```

   On first run this downloads the `node:18-alpine` and `postgres:16-alpine` base images, installs npm dependencies inside the backend container, and initializes the PostgreSQL data volume. Subsequent starts skip the download step and are much faster.

3. **Verify the services are reachable**

   - Backend API: <http://localhost:3000>
   - Backend health check: <http://localhost:3000/health>
   - PostgreSQL: `localhost:5432` (credentials from your `.env`)

4. **Shut everything down**

   Press `Ctrl+C` in the terminal running `docker compose up`, then optionally run:

   ```bash
   docker compose down
   ```

### Development Workflow

- **Hot-reload:** The `backend` service is built with the `development` target of the `Dockerfile` and mounts the project directory (`.:/app`) with an anonymous volume for `node_modules`. Edits to any file under `src/` are picked up automatically by `nodemon` and the server restarts inside the container without a rebuild.
- **Installing new npm packages:** Because `node_modules` lives inside the container, run `npm install` from inside the container so the volume stays in sync:

  ```bash
  docker compose exec backend npm install <package>
  ```

- **Viewing logs:** Tail logs from one or more services in real time:

  ```bash
  docker compose logs -f backend      # backend only
  docker compose logs -f postgres     # database only
  docker compose logs -f              # everything
  ```

- **Opening a shell in the backend container:**

  ```bash
  docker compose exec backend sh
  ```

- **Connecting to PostgreSQL with `psql`:**

  ```bash
  docker compose exec postgres psql -U dashboard_user -d dashboard_db
  ```

- **Stopping services:**

  ```bash
  docker compose stop          # stop containers, keep them for a quick restart
  docker compose down          # stop and remove containers and network
  docker compose down -v       # also delete the postgres-data volume (destructive)
  ```

- **Rebuilding after Dockerfile or dependency changes:**

  ```bash
  docker compose up --build
  ```

### Troubleshooting

- **`port is already allocated` on 3000 or 5432** — another process on the host is bound to the same port. Stop the conflicting process, or change the host-side port mapping in `docker-compose.yml` (e.g. `'3001:3000'`) and update your local tooling to match.
- **Backend cannot reach the database** — from inside the container, `DB_HOST` must be the Compose service name `postgres`, not `localhost`. Check the value in your `.env`. Also confirm the database is healthy: `docker compose ps` should show `postgres` as `healthy` before the backend starts.
- **`node_modules` errors after switching branches or editing `package.json`** — the anonymous volume can become stale. Rebuild it:

  ```bash
  docker compose down
  docker compose build --no-cache backend
  docker compose up
  ```

- **Postgres refuses to start with `database files are incompatible`** — this usually happens after bumping the PostgreSQL major version. Back up any data you need, then remove the volume: `docker compose down -v`.
- **Permission denied writing to mounted files on Linux** — the container's `node` user may not match your host UID. Either run `chown -R $USER:$USER .` on the host after container writes, or add a `user: "${UID}:${GID}"` override to the `backend` service.
- **Changes to `.env` are not picked up** — Compose reads `.env` only when containers are (re)created. Run `docker compose up -d --force-recreate backend` after editing it.
- **Health check keeps failing** — inspect the backend logs (`docker compose logs backend`) for startup errors, and confirm the `/health` route is responding on port 3000 from inside the container: `docker compose exec backend wget -qO- http://localhost:3000/health`.

## Environment Variables

Configuration is provided entirely through environment variables loaded from a `.env` file at the project root. A documented template lives at [`.env.example`](./.env.example) — copy it to `.env` and adjust the values for your environment:

```bash
cp .env.example .env
```

| Variable       | Purpose                                                                    | Example                     |
| -------------- | -------------------------------------------------------------------------- | --------------------------- |
| `NODE_ENV`     | Node runtime environment (`development`, `production`, `test`)             | `development`               |
| `PORT`         | HTTP port the backend API listens on                                       | `3000`                      |
| `DB_HOST`      | PostgreSQL host — use `postgres` inside Docker, `localhost` on the host    | `postgres`                  |
| `DB_PORT`      | PostgreSQL port                                                            | `5432`                      |
| `DB_NAME`      | Application database name                                                  | `dashboard_db`              |
| `DB_USER`      | Application database user                                                  | `dashboard_user`            |
| `DB_PASSWORD`  | Password for `DB_USER` — replace with a strong secret before running       | `your_secure_password_here` |
| `DB_POOL_MIN`  | Minimum idle connections held open in the pool                             | `2`                         |
| `DB_POOL_MAX`  | Maximum concurrent connections in the pool                                 | `10`                        |
| `LOG_LEVEL`    | Log verbosity (`error`, `warn`, `info`, `debug`)                           | `info`                      |

Never commit `.env` — it is listed in `.gitignore` because it holds secrets. Only `.env.example` should be tracked in git.
