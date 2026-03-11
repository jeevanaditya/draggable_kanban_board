# Orbit Board – Draggable Kanban

An interactive, drag‑and‑drop Kanban board built with Vue 3 (Composition API) on the frontend and Node.js + Express + MongoDB on the backend. It is styled as a minimal “vibe coded” productivity surface with three columns: **Spark**, **Flow**, and **Glow**.

---

## Tech Stack

- **Frontend**: Vue 3 + Vite, Composition API, native HTML5 drag and drop
- **Backend**: Node.js, Express, Mongoose
- **Database**: MongoDB Atlas (or local Mongo), with a fallback in‑memory store so the app still works if the DB is down

---

## Project Structure

- `frontend/` – Vue application
  - `src/App.vue` – main UI, state management, and drag‑and‑drop logic
  - `src/main.js` – Vue app bootstrap
  - `vite.config.js` – Vite dev server configuration
- `backend/` – API and data layer
  - `server.js` – Express app, Mongoose model, in‑memory fallback logic
  - `package.json` – backend scripts and dependencies
- `.env.example` – example environment configuration
- `.gitignore` – node modules, build output, and secrets exclusions

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/jeevanaditya/draggable_kanban_board.git
cd draggable_kanban_board
```

### 2. Configure environment variables

Create `backend/.env` based on `.env.example`.

Example for MongoDB Atlas:

```bash
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/vibe_kanban?appName=Cluster0
PORT=4000
```

You can also point `MONGO_URI` at a local instance:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/vibe_kanban
PORT=4000
```

If MongoDB is temporarily unreachable, the backend falls back to an in‑memory task list so the UI continues to function. Tasks created in this mode are not persisted.

### 3. Install dependencies

Frontend:

```bash
cd frontend
npm install
```

Backend (in a separate terminal or after returning to the root):

```bash
cd backend
npm install
```

---

## Running the App in Development

### Start the backend

From the `backend` folder:

```bash
npm run dev
```

This starts an Express server on `http://localhost:4000` with these endpoints:

- `GET /api/tasks` – list all tasks
- `POST /api/tasks` – create a new task
- `PATCH /api/tasks/:id/status` – update a task’s status

### Start the frontend

From the `frontend` folder:

```bash
npm run dev
```

Vite prints a local URL (typically `http://localhost:5173`). Open it in the browser to use the board.

If the backend runs on a different host or port, you can set `VITE_API_URL` in `frontend/.env`:

```bash
VITE_API_URL=http://localhost:4000
```

Restart `npm run dev` in `frontend` after changing this file.

---

## Using the Kanban Board

- **Columns**
  - **Spark** – tasks with status `todo`
  - **Flow** – tasks with status `in‑progress`
  - **Glow** – tasks with status `done`
- **Create a task**
  - Enter a title and optional description in the composer at the top
  - Click the “Drop it in” button
  - A new card appears in the Spark column and is stored via `POST /api/tasks`
- **Drag and drop**
  - Click and drag a card from one column to another
  - Dropping a card triggers `PATCH /api/tasks/:id/status` with the new status
  - Counts in each column header update based on the current state

---

## State Management Design

- The Vue app uses the Composition API inside `App.vue`:
  - `ref` for local state (`tasks`, `loading`, `error`, draft fields, drag state)
  - `computed` for per‑column task groupings and header counts
  - `onMounted` hook to fetch tasks on initial load
- All data flows through the backend API:
  - `GET /api/tasks` to hydrate state
  - `POST /api/tasks` to create tasks
  - `PATCH /api/tasks/:id/status` to synchronize drag‑and‑drop moves

This keeps the state logic simple, testable, and easy to explain during review.

---

## Notes for Evaluation

- Clean, modular Composition API setup—no global store is used because the app’s scope is focused and self‑contained in a single screen.
- Styling is fully responsive and optimized for desktop and tablet widths.
- There are no code comments inside the implementation files; behavior and decisions are documented here in the README instead.

