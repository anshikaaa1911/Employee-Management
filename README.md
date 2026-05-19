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

- React + Vite
- Express.js API
- MongoDB + Mongoose
- JWT authentication
- Modern responsive CSS

## Setup

1. Install backend dependencies:

```bash
npm install
```

2. Install client dependencies:

```bash
cd client && npm install
```

3. Copy `.env.example` to `.env` and update values if needed:

```bash
copy .env.example .env
```

Use a strong unique `JWT_SECRET` before deploying. Demo seed data and the in-memory MongoDB fallback are development conveniences; production only enables them when `ALLOW_DEMO_SEED=true` or `ALLOW_MEMORY_DB=true`.

4. Seed the database with demo users and a sample goal:

```bash
npm run seed
```

5. Start the app in development mode:

```bash
npm run dev
```

6. Open the React app at `http://localhost:5173`. The API runs on `http://localhost:3000`.

## Production

Build the frontend and start the server:

```bash
npm run build
npm start
```

Then visit `http://localhost:3000`.

## Demo Accounts

- Employee: `employee@test.com` / `123456`
- Manager: `manager@test.com` / `123456`
- Admin: `admin@test.com` / `123456`
