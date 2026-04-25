# Study Master App - Modern Architecture

## Overview
Study Master is a comprehensive study tracking application with offline-first architecture, real-time sync, and cross-platform support.

## Architecture

### Tech Stack
- **Frontend**: React Native (Expo) + TypeScript
- **State Management**: Zustand
- **Local Database**: SQLite (expo-sqlite)
- **Backend**: Node.js + Express + PostgreSQL (optional)
- **HTTP Client**: Axios
- **Secure Storage**: Expo SecureStore
- **Haptics**: Expo Haptics

### Data Flow

```
┌─────────────┐
│   UI Layer   │
│ (Screens)    │
└──────┬──────┘
       │
┌──────▼──────┐
│  Zustand    │
│   Store     │ (Global state)
└──────┬──────┘
       │
       ├────────────┐
       │            │
┌──────▼──────┐ ┌──▼──────────┐
│   SQLite    │ │    API      │
│  (Local)    │ │  (Remote)   │
└─────────────┘ └─────────────┘
```

## Project Structure

```
StudyMasterApp/
├── app/                    # Expo Router pages
│   ├── (tabs)/           # Tab screens
│   │   ├── index.tsx     # Dashboard
│   │   ├── tasks.tsx     # Task management
│   │   ├── study.tsx     # Study timer
│   │   ├── subjects/    # Subjects management
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── stats.tsx    # Statistics
│   │   └── profile.tsx  # User profile
│   ├── _layout.tsx      # Root layout with DB init
│   └── modal.tsx        # Modal routes
├── components/           # Reusable UI components
│   ├── themed-text.tsx
│   ├── themed-view.tsx
│   ├── icon.tsx         # Lucide icon wrapper
│   └── ...
├── hooks/               # Custom React hooks
├── services/            # Business logic
│   ├── database.ts      # SQLite operations
│   ├── api.ts           # HTTP client with auth
│   └── index.ts
├── store/               # Zustand store
│   └── useStore.ts
├── types/               # TypeScript definitions
│   └── index.ts
├── constants/           # App constants
├── utils/              # Utility functions
└── assets/             # Images, fonts, etc.
```

## Database Schema

### Local SQLite Tables

```sql
subjects (id, name, color, target_hours, study_guide, created_at)
tasks (id, title, description, subject_id, duration, priority, status, date, time, notes, user_id, created_at, completed_at)
sessions (id, subject_id, duration, date, notes, created_at)
goals (id, title, subject_id, target_hours, current_hours, status, deadline, user_id)
schedule_slots (id, day_of_week, start_time, end_time, subject_id, is_active)
reminders (id, title, subject_id, time, days_of_week, is_active)
sync_queue (id, table_name, record_id, operation, data, created_at, synced)
users (id, email, password, name, avatar, created_at)
```

## Key Features

### 1. Offline-First
- All data stored locally in SQLite
- Works without internet connection
- Changes queued for background sync

### 2. Task Management
- Create, edit, delete tasks
- Priority levels (low/medium/high)
- Status tracking (pending/in-progress/completed)
- Assign to subjects with colors
- Add notes and reminders

### 3. Study Timer
- Pomodoro-style timer
- Select task before starting
- Auto-creates session record on completion
- Tracks actual study time

### 4. Subject Tracking
- Create subjects with custom colors
- Set weekly hour goals
- Add study guides
- View progress per subject

### 5. Statistics Dashboard
- Today's study minutes
- Weekly progress chart
- Completion rate
- Current streak
- Subject breakdown

### 6. Cloud Sync (Optional)
- JWT authentication
- Sync pending changes to backend
- Pull updates from server
- Conflict resolution (last-write-wins)

## Setup Instructions

### 1. Install Dependencies

```bash
cd StudyMasterApp
npm install
```

Required packages are already listed in `package.json`.

### 2. Start the Development Server

```bash
npx expo start
```

Scan the QR code with Expo Go app (iOS/Android) or press:
- `w` for web
- `a` for Android emulator
- `i` for iOS simulator

### 3. (Optional) Start Backend Server

If you want to use cloud sync:

```bash
cd backend
npm install
# Setup PostgreSQL first (see POSTGRES_SETUP.md)
npm start
```

Backend runs on http://localhost:5000

### 4. Configure Environment

The app automatically uses:
- Development API: `http://localhost:5000/api`
- Production API: `https://api.studymaster.app`

To change, edit `services/api.ts`.

## Backend Setup (Optional)

### Prerequisites
- Node.js installed
- PostgreSQL installed and running

### Database Setup

```bash
# Create database (see POSTGRES_SETUP.md)
createdb study_schedule

# Or use the provided script
./setup_postgres.sh
```

Update `backend/.env`:

```env
NODE_ENV=development
PORT=5000
DB_NAME=study_schedule
DB_USER=emoh
DB_PASS=emoh123
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=your-super-secret-key-change-in-production
```

### Start Backend

```bash
cd backend
npm start
```

## Development Notes

### State Management
- All app state lives in `store/useStore.ts`
- Actions handle both local DB and API sync
- Re-renders are automatic via Zustand

### Data Persistence
- SQLite database in `services/database.ts`
- Schema matches backend models
- All writes are immediate and local
- Sync queue tracks unsynced changes

### API Integration
- JWT tokens stored in SecureStore
- Attached via Axios interceptors
- 401 responses auto-logout user
- Failed syncs retry later

### Error Handling
- Network errors show alerts
- Fallback to local data when offline
- Queue operations for later sync

## Future Improvements

- [ ] Push notifications for reminders
- [ ] Real-time collaborative study rooms
- [ ] Advanced analytics and insights
- [ ] Social features (friends, leaderboards)
- [ ] Apple Watch / Wear OS companion app
- [ ] Export data (CSV, PDF)
- [ ] Dark mode support
- [ ] Multi-language support
- [ ] Cloud backup to Google Drive/iCloud
- [ ] Study groups with shared goals

## Troubleshooting

### Database Errors
If you see database errors, try:
1. Uninstall the app from simulator/device
2. Clear Expo cache: `expo start -c`
3. Rebuild the app

### Sync Not Working
1. Ensure backend is running on port 5000
2. Check that PostgreSQL is accessible
3. Verify JWT_SECRET is set

### Icons Not Showing
Install icon fonts:
```bash
npx expo install @expo/vector-icons
```

## License
MIT
