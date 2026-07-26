@AGENTS.md

# Season Travels Flight Management System

This is a Vite + React + TypeScript project with an Express + MongoDB backend.

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand
- Backend: Express.js, MongoDB (Mongoose), Nodemailer
- Deployment: Vercel (serverless API functions)

## Project Structure

- `client/` - Vite React frontend
- `server/` - Express backend (local development)
- `api/` - Vercel serverless function entry point
- `server/src/` - Backend source code (routes, models, middleware, services)

## Getting Started

1. Copy `server/.env.example` to `server/.env` and fill in values
2. Run `npm run install:all` to install dependencies
3. Run `npm run dev` to start both frontend and backend
4. Run `npm run seed` to seed the database with default users

## Backend API

The backend runs on port 5000 by default. In development, Vite proxies `/api` requests to the backend.

Key endpoints:
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current session
- `POST /api/auth/logout` - Logout
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create ticket
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket
- `GET /api/staff` - List staff (admin)
- `POST /api/staff` - Create staff (admin)
- `GET /api/audit-logs` - List audit logs (admin)
- `POST /api/email/send-reminder` - Send reminder email
- `POST /api/tickets/send-reminders` - Auto-send reminders
- `POST /api/tickets/expire-departed` - Expire departed tickets
