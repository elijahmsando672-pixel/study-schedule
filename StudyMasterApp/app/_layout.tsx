import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { dbService } from '@/services/database';
import { syncService } from '@/services/sync';
import { useStore } from '@/store/useStore';

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={styles.loadingText}>Loading Study Master...</Text>
    </View>
  );
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const { loadSubjects, loadTasks, loadSessions, loadGoals, loadScheduleSlots, loadReminders, loadDashboardData } = useStore();

  useEffect(() => {
    const initApp = async () => {
      try {
        await dbService.init();

        await Promise.all([
          loadSubjects(),
          loadTasks(),
          loadSessions(),
          loadGoals(),
          loadScheduleSlots(),
          loadReminders(),
          loadDashboardData(),
        ]);

        setDbInitialized(true);
        syncService.startPeriodicSync();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setDbError('Failed to initialize database');
      }
    };

    initApp();

    return () => {
      syncService.stopPeriodicSync();
    };
  }, []);

  if (dbError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{dbError}</Text>
      </View>
    );
  }

  if (!dbInitialized) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
  },
});
