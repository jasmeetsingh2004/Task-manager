# TaskFlow — Project Management App

A full-stack project management application with role-based access control, built with **Node.js + Express + SQLite** (backend) and **React + Vite + Tailwind CSS** (frontend).

## Features

- 🔐 **Authentication** — JWT-based signup/login, secure password hashing with bcrypt
- 👥 **Role-Based Access Control** — System Admin vs User, Project Admin vs Member
- 📁 **Project Management** — Create projects, invite members by email, manage roles
- ✅ **Task Tracking** — Create, assign, and update tasks with status and priority
- 📊 **Dashboard** — Live stats, charts (by status/priority), overdue tracking, recent tasks
- 🗂️ **Kanban Board** — Visual task view per project (kanban + list view)
- 🛡️ **Admin Panel** — System-wide user management (admin only)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT + bcryptjs |
| Validation | express-validator |
| Frontend | React 18, Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Routing | React Router v6 |

## Data Model

```
users          → id, name, email, password_hash, system_role, avatar_color
projects       → id, name, description, color, owner_id
project_members → project_id, user_id, role (admin/member)
tasks          → id, title, description, project_id, assignee_id, creator_id,
                  status, priority, due_date
```

## REST API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update profile |

### Projects
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/projects` | List user's projects | Any |
| POST | `/api/projects` | Create project | Any |
| GET | `/api/projects/:id` | Get project + tasks + members | Member+ |
| PATCH | `/api/projects/:id` | Update project | Admin |
| DELETE | `/api/projects/:id` | Delete project | Owner |
| POST | `/api/projects/:id/members` | Add member by email | Admin |
| PATCH | `/api/projects/:id/members/:uid` | Change member role | Admin |
| DELETE | `/api/projects/:id/members/:uid` | Remove member | Admin |

### Tasks
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/tasks` | List tasks (filterable) | Member+ |
| GET | `/api/tasks/stats` | Dashboard stats | Any |
| POST | `/api/tasks` | Create task | Member+ |
| GET | `/api/tasks/:id` | Get task | Member+ |
| PATCH | `/api/tasks/:id` | Update task | Member+ |
| DELETE | `/api/tasks/:id` | Delete task | Creator/Admin |

### Users (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| PATCH | `/api/users/:id/role` | Change system role |
| DELETE | `/api/users/:id` | Delete user |

## RBAC Summary

| Action | System Admin | Project Admin | Member |
|--------|:---:|:---:|:---:|
| View all projects | ✅ | — | — |
| Manage all users | ✅ | — | — |
| Delete any project | ✅ | ✅ (own) | ❌ |
| Add/remove members | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ✅ | ❌ |
| Create/edit tasks | ✅ | ✅ | ✅ |
| Delete any task | ✅ | ✅ | own only |

## Local Development

```bash
# 1. Clone and install backend deps
npm install

# 2. Install frontend deps
cd client && npm install && cd ..

# 3. Start backend (port 5000)
npm run dev

# 4. In a new terminal, start frontend (port 5173)
cd client && npm run dev
```

Visit http://localhost:5173 — the Vite dev server proxies API calls to port 5000.

## Deploy to Railway

### Option A: Railway CLI (recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway new

# Deploy
railway up
```

### Option B: GitHub Integration

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway auto-detects the `railway.toml` and builds everything
5. Set environment variable `JWT_SECRET` to a long random string

### Environment Variables (set in Railway dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | Secret key for signing JWTs (use a strong random string) |
| `PORT` | No | Railway sets this automatically |
| `DB_PATH` | No | SQLite file path (defaults to `./taskflow.db`) |
| `NODE_ENV` | No | Set to `production` |

> ⚠️ **Important**: Always set `JWT_SECRET` to a long, random string in production.
> Generate one: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Build Process

Railway runs:
1. `npm install` — installs backend deps
2. `npm run build` — runs `cd client && npm install && npm run build`
3. `npm start` — starts Express which serves the React build

The SQLite database file persists between deploys on Railway's disk.

## First Login

1. Register the first user → they automatically become **System Admin**
2. Create a project → you become **Project Admin**
3. Add teammates by their registered email
4. Create and assign tasks!

## Project Structure

```
taskflow/
├── server.js              # Express entry point
├── package.json
├── railway.toml           # Railway deployment config
├── db/
│   └── database.js        # SQLite schema + init
├── middleware/
│   └── auth.js            # JWT + RBAC middleware
├── routes/
│   ├── auth.js            # /api/auth/*
│   ├── projects.js        # /api/projects/*
│   ├── tasks.js           # /api/tasks/*
│   └── users.js           # /api/users/*
└── client/                # React frontend
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── contexts/
        │   └── AuthContext.jsx   # Auth + API fetch
        ├── components/
        │   ├── Layout.jsx        # Sidebar + shell
        │   ├── TaskCard.jsx      # Task display
        │   └── TaskModal.jsx     # Create/edit modal
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx     # Stats + charts
            ├── Projects.jsx      # Project list
            ├── ProjectDetail.jsx # Kanban + members
            ├── Tasks.jsx         # Filtered task list
            └── AdminPanel.jsx    # User management
```
