# 🐛 BugFixer API

A robust Node.js TypeScript backend for the BugFixer bug tracking system.

## Features

- 🔐 **Cookie-based JWT Authentication** - Secure, httpOnly cookies
- 📧 **Email Notifications** - Beautiful HTML email templates via Nodemailer
- 🗄️ **PostgreSQL Database** - Full schema with auto-initialization
- ✅ **Input Validation** - Zod schemas for all endpoints
- 🛡️ **Role-based Access Control** - Owner, Admin, Member, Viewer roles
- 🌐 **CORS Configured** - Ready for frontend integration

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (pg)
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **Validation**: Zod
- **Email**: Nodemailer

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
```

### Environment Variables

```env
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bugfixer
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bugfixer
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
COOKIE_MAX_AGE=604800000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=BugFixer <noreply@bugfixer.com>
```

### Development

```bash
# Run in development mode (with hot reload)
npm run dev
```

### Production

```bash
# Build
npm run build

# Start
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Projects
- `GET /api/projects` - Get my projects
- `GET /api/projects/public` - Get public projects
- `GET /api/projects/:slug` - Get project by slug
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Bugs
- `GET /api/bugs/project/:projectId` - Get bugs for project
- `GET /api/bugs/:id` - Get single bug
- `POST /api/bugs` - Create bug
- `PUT /api/bugs/:id` - Update bug
- `PATCH /api/bugs/:id/status` - Update bug status
- `DELETE /api/bugs/:id` - Delete bug

### Members
- `GET /api/members/:projectId` - Get project members
- `POST /api/members/:projectId` - Add member
- `PUT /api/members/:projectId/:memberId` - Update role
- `DELETE /api/members/:projectId/:memberId` - Remove member
- `POST /api/members/:projectId/request` - Request access
- `GET /api/members/:projectId/requests` - Get access requests
- `POST /api/members/requests/:requestId/approve` - Approve request
- `POST /api/members/requests/:requestId/reject` - Reject request

## Project Structure

```
src/
├── config/         # Configuration
├── controllers/    # Route handlers
├── db/             # Database connection & queries
├── middleware/     # Auth, validation, error handling
├── routes/         # API routes
├── services/       # Email service
├── types/          # TypeScript type definitions
└── validators/     # Zod schemas
```

## License

MIT