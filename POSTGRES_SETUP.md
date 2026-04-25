# PostgreSQL Setup Guide

## Option 1: Using terminal (Recommended)

Open a new terminal and run:

```bash
sudo -u postgres psql
```

Then run these commands inside psql:

```sql
-- Create your user (change password as needed)
CREATE USER emoh WITH SUPERUSER PASSWORD 'emoh123';

-- Create database
CREATE DATABASE study_schedule OWNER emoh;

-- Exit
\q
```

## Option 2: If above doesn't work

```bash
# Check PostgreSQL status
sudo service postgresql status

# Start if not running
sudo service postgresql start

# Then connect
sudo -u postgres psql
```

## Option 3: Alternative (if no sudo access)

Let me know and I'll switch to SQLite or MongoDB Atlas instead.

---

## After setup, update backend/.env:

```env
NODE_ENV=development
PORT=5000
DB_NAME=study_schedule
DB_USER=emoh
DB_PASS=emoh123
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=your-super-secret-key
```

Then start:
```bash
cd backend
npm start
```