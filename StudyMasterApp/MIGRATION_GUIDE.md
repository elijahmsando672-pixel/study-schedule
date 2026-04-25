# Migration Guide: From localStorage to SQLite

## Overview
This guide explains how to upgrade from the old localStorage-based implementation to the new SQLite + offline-first architecture.

## What Changed

### Before
- Data stored in `localStorage` (web only)
- No persistence on mobile
- No cloud sync
- Simple serialization

### After
- Data stored in **SQLite** (cross-platform)
- Works offline on mobile and web
- Optional cloud sync with backend
- Real-time statistics
- Background sync queue

## Migration Steps

### For Existing Users (Data Migration)

The app includes automatic migration from localStorage to SQLite on first launch:

1. Open the app
2. The database automatically initializes
3. All localStorage data is migrated to SQLite
4. localStorage is cleared after successful migration

**Location**: `services/database.ts` includes migration logic.

### For Developers

#### Updated Files
- `app/_layout.tsx` - Now initializes database before rendering
- `app/(tabs)/index.tsx` - Uses store instead of localStorage
- `app/(tabs)/tasks.tsx` - Full CRUD with database
- `app/(tabs)/study.tsx` - Timer writes sessions to DB
- `app/(tabs)/stats.tsx` - Reads from store
- `app/(tabs)/profile.tsx` - Auth handling
- `store/useStore.ts` - Zustand store with all actions
- `services/database.ts` - SQLite wrapper
- `services/api.ts` - HTTP client for cloud sync

#### New Dependencies
```json
{
  "expo-sqlite": "~14.0.0",
  "expo-secure-store": "~14.0.0",
  "expo-haptics": "~14.0.0",
  "zustand": "^5.0.0",
  "axios": "^1.6.0",
  "uuid": "^9.0.0"
}
```

#### TypeScript Types
All types defined in `types/index.ts`:
- `Task`, `Subject`, `StudySession`, `Goal`, etc.
- Shared between frontend and backend

#### Database Schema
Matches backend PostgreSQL schema exactly. See `services/database.ts` for CREATE TABLE statements.

### Testing Migration

1. **Clean Install Test**:
   - Delete app from simulator
   - Clear Expo cache: `npx expo start -c`
   - Reinstall - should create fresh DB

2. **Existing Data Test**:
   - Use old version to create some tasks
   - Upgrade to new version
   - Verify data appears in new UI

3. **Offline Mode Test**:
   - Turn off internet
   - Create/edit/delete tasks
   - Re-enable internet
   - Sync should occur automatically

## Breaking Changes

### API Changes
- Old: `localStorage.getItem('studyTasks')`
- New: `useStore.getState().tasks`

### Task Status
- Old: `completed: boolean`
- New: `status: 'pending' | 'in-progress' | 'completed'`

### Session Logging
- Old: In-memory only
- New: Persisted to `sessions` table, synced to backend

## Rollback Instructions

If you need to revert to the old version:

1. **Restore git commit**:
   ```bash
   git checkout <previous-commit>
   ```

2. **Remove new dependencies**:
   ```bash
   npm uninstall expo-sqlite expo-secure-store zustand axios uuid
   ```

3. **Delete database**:
   - The SQLite file is stored in app's document directory
   - Uninstall the app to clear it

## Support

If you encounter issues:
1. Check console logs for errors
2. Verify database initialized successfully
3. Ensure all packages installed correctly
4. Clear cache and rebuild

## Next Steps

After migration:
- Test all features thoroughly
- Report any bugs
- Consider enabling cloud sync by starting the backend
