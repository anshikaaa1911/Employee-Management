# GoalFlow – Employee Goal Portal

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-Backend-000000?style=flat&logo=express&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange?style=flat)
![Render](https://img.shields.io/badge/Deployed_on-Render-46E3B7?style=flat&logo=render&logoColor=white)

GoalFlow is a full-stack employee performance and goal management app built with the MERN stack. It lets employees create and track goals, managers review and approve them, and admins get an overview of how teams are performing.

---

## Live Demo

[employee-management-0cu9.onrender.com](https://employee-management-0cu9.onrender.com/)

---

## Overview

GoalFlow gives employees a place to set and track their goals, gives managers a way to review and approve what their team submits, and gives admins visibility into overall performance through reports. It supports authentication, team management, reporting, audit logs, and exporting data.

---

## Features

**Auth**
- JWT-based login
- Role-based access (Employee / Manager / Admin)
- Separate dashboards per role
- Protected routes and API endpoints

**Goals**
- Create, edit, and submit goals
- Managers approve or reject submissions
- Track progress and completion status
- View past achievements

**Teams**
- Manager-led team setup
- Team activity tracking
- Basic performance oversight

**Reports**
- Dashboard with goal performance data
- Audit logs / activity history
- Export to CSV or Excel

**Frontend**
- Built with React, responsive layout
- Works fine on mobile
- Single-page app, no full page reloads

**Backend/DB**
- MongoDB Atlas
- Mongoose models
- In-memory fallback mode for demo purposes
- Deployed on Render

---

## Tech Stack

- **Frontend:** React, Vite, plain CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas + Mongoose
- **Auth:** JWT, bcryptjs
- **Exports:** ExcelJS, json2csv
- **Hosting:** Render

---

## Architecture

Backend is split into a few modules:
- Auth
- Goals
- Manager operations
- Admin operations
- Teams
- Reporting

Database models: User, Goal, Team, Notification, AuditLog, JoinRequest, TeamActivity

Passwords are hashed with bcrypt, routes are protected with JWT, and access is gated by role.


## Running Locally

git clone https://github.com/your-username/goalflow.git
cd goalflow

Install deps for both sides:

cd server && npm install
cd ../client && npm install


Add a `.env` file inside `/server`:

MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000

Then run both:

# server
npm run dev

# client (separate terminal)
npm run dev

App runs on `http://localhost:5173` by default.


## Folder Structure


├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
├── server/          # Express backend
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── package.json
└── README.md


## What I learned building this

- Building a full app end to end with MERN
- Designing REST APIs
- Auth and role-based permissions
- Structuring a MongoDB schema for a real app
- Deploying to Render

---

## Things I'd add later

- Goal recommendations
- A better analytics dashboard
- Email notifications
- Team productivity stats
- Better charts/reporting
- A proper signup/onboarding flow
