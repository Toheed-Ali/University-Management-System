# University Course Management System (CMS)
A full-stack University Course Management System (CMS) built with React, Node.js, and CSS to manage academic operations in a higher education environment. It enables administrators, faculty, and students to efficiently handle courses, enrollments, schedules, and academic records through a secure, scalable web platform.

# Phase 1: Database Design & Implementation

## ER Diagram
![ERD](ER_Diagram.jpeg)

# Phase 2: Backend API Development

## Architecture & Framework
- **Backend:** Node.js with Express
- **Database:** MySQL
- **ORM:** Sequelize (Note: Critical transactions use explicitly managed Raw SQL queries)
- **Authentication:** JSON Web Tokens (JWT) using `bcryptjs`
- **Frontend:** React with Vite (TailwindCSS)

## Setup Instructions

### Prerequisites
1. Node.js installed (v16+)
2. MySQL Server running locally

### 1. Database Setup
1. Create a MySQL database named `universityPortalDB`
2. Navigate to `backend/` and copy `.env.example` to `.env`
3. Update `.env` with your `DB_USER` and `DB_PASS`.

### 2. Backend Initialization
Run these commands in the `backend` directory:
```bash
cd backend
npm install
npm run dev
```

## Verification
You can view the interactive Swagger documentation by starting the backend and navigating to:
`http://localhost:3002/api-docs`
