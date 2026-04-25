import NetInfo from '@react-native-community/netinfo';
import { dbService } from './database';
import { api } from './api';

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor() {
    this.startPeriodicSync();
  }

  startPeriodicSync(intervalMs: number = 30000): void {
    // Sync every 30 seconds when app is active
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMs);
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async performSync(): Promise<boolean> {
    if (this.isSyncing) return false;

    this.isSyncing = true;

    try {
      // Check if we're online
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        return false;
      }

      // Check if user is authenticated
      const isAuth = await api.isAuthenticated();
      if (!isAuth) {
        return false;
      }

      // Get pending syncs
      const pendingSyncs = await dbService.getPendingSyncs();

      if (pendingSyncs.length === 0) {
        return true;
      }

      // Prepare changes for server
      const changes = pendingSyncs.map((sync) => ({
        table: sync.tableName,
        recordId: sync.recordId,
        operation: sync.operation,
        data: JSON.parse(sync.data),
      }));

      // Send to server
      await api.syncPendingChanges(changes);

      // Mark as synced
      for (const sync of pendingSyncs) {
        await dbService.markSyncComplete(sync.id);
      }

      // Clean old synced entries periodically
      await dbService.clearSynced();

      console.log(`✅ Synced ${pendingSyncs.length} changes`);
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  async forceSync(): Promise<boolean> {
    return this.performSync();
  }
}

export const syncService = new SyncService();
