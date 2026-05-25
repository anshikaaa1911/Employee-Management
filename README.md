# Employee Goal Portal

A modern MERN-style employee goal platform with a React frontend and Express API backend.

## Features

- React SPA for a responsive, polished user experience
- Role-based employee, manager, and admin workflows
- Goal creation, submission, approval, and achievement tracking
- Live reports, audit history, and export support
- MongoDB backend with fallback in-memory demo mode
- JWT authentication with a mobile-friendly UI

## Tech Stack

- React SPA served by Express
- Express.js API
- MongoDB + Mongoose
- JWT authentication
- Modern responsive CSS

## Setup

1. Install backend dependencies:

```bash
npm install
```

2. Build the frontend:

```bash
npm run build
```

3. Copy `.env.example` to `.env` and update values if needed:

```bash
copy .env.example .env
```

Use a strong unique `JWT_SECRET` before deploying. Demo seed data and the in-memory MongoDB fallback are development conveniences; production only enables them when `ALLOW_DEMO_SEED=true` or `ALLOW_MEMORY_DB=true`.

4. Verify the database connection:

```bash
npm run db:check
```

On Windows PowerShell, use `npm.cmd run db:check` if script execution policy blocks `npm`.

5. Seed the database with demo users and a sample goal:

```bash
npm run seed
```

6. Start the app in development mode:

```bash
npm run dev
```

7. Open the app on the port in `.env`, for example `http://localhost:3001`.

The app runs through Node/Express only. If you change files in `client/src`, run `npm run build` again so Express can serve the updated frontend from `client/dist`.

## Troubleshooting

If Nodemon prints `app crashed - waiting for file changes before starting`, check the line above it. For `Port 3000 is already in use`, either stop the other Node process or change `PORT` in `.env` to another free port such as `3001`.

PowerShell commands to find and stop the process:

```powershell
netstat -ano | Select-String ':3000'
Stop-Process -Id <PID>
```

If MongoDB is not installed locally, keep `ALLOW_MEMORY_DB=true` for demo mode. The app will first try `MONGO_URI`, then start an in-memory MongoDB instance and print `Connected to in-memory MongoDB server`. For a persistent database, install MongoDB locally or use MongoDB Atlas, set `MONGO_URI`, and change `ALLOW_MEMORY_DB=false`.

## Production

Build the frontend and start the server:

```bash
npm run build
npm start
```

Then visit the port configured in `.env` or by your hosting provider.

## Demo Accounts

- Employee: `employee@test.com` / `123456`
- Manager: `manager@test.com` / `123456`
- Admin: `admin@test.com` / `123456`
