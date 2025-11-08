# WorkZen HRMS Backend - Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd Backend
   npm install
   ```

2. **Set Up Database**
   ```bash
   # Create PostgreSQL database
   createdb workzen_hrms

   # Or using psql:
   psql -U postgres
   CREATE DATABASE workzen_hrms;
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Initialize Database**
   ```bash
   # Generate Prisma Client
   npm run db:generate

   # Push schema to database
   npm run db:push

   # Seed database with test data
   npm run db:seed
   ```

5. **Start Server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

## Environment Variables

Required environment variables in `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/workzen_hrms?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

## Test Accounts

After seeding, use these accounts:

- **Admin**: `admin@workzen.com` / `password123`
- **HR**: `hr@workzen.com` / `password123`
- **Manager**: `manager@workzen.com` / `password123`
- **Employee**: `employee@workzen.com` / `password123`

## Connecting Frontend

1. Update `Frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_USE_MOCK=false
   ```

2. Start frontend:
   ```bash
   cd Frontend
   npm run dev
   ```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env`
- Verify database exists: `psql -l | grep workzen_hrms`

### Prisma Issues
- Run `npm run db:generate` after schema changes
- Run `npm run db:push` to sync schema
- Check Prisma Studio: `npm run db:studio`

### Port Already in Use
- Change PORT in `.env`
- Or kill process using port 3000

