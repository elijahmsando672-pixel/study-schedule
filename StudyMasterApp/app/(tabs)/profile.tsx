import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, Mail, Lock, LogOut, Edit3, Shield, Database, RefreshCw, Wifi, WifiOff, Sun, Moon, Smartphone } from 'lucide-react-native';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import { dbService } from '@/services/database';
import { syncService } from '@/services/sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as UserType } from '@/types';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, setUser, isAuthenticated, setAuthenticated, dashboardSummary, sessions, loadDashboardData } = useStore();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isServerAvailable, setIsServerAvailable] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingSyncs, setPendingSyncs] = useState(0);
const [themePref, setThemePref] = useState<'auto' | 'light' | 'dark'>('auto');
const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkServerAndDB();
    checkPendingSyncs();

    // Check status every 5 seconds
    const interval = setInterval(() => {
      checkServerAndDB();
      checkPendingSyncs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('themePreference').then(val => {
      if (val) setThemePref(val as 'auto' | 'light' | 'dark');
    });
  }, []);

  const checkServerAndDB = async () => {
    try {
      const isServerUp = await api.ping();
      setIsServerAvailable(isServerUp);
    } catch (error) {
      setIsServerAvailable(false);
    }
  };

  const checkPendingSyncs = async () => {
    try {
      const syncs = await dbService.getPendingSyncs();
      setPendingSyncs(syncs.length);
    } catch (error) {
      console.error('Error checking pending syncs:', error);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && !name) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setIsLoading(true);

    try {
      let response;

      if (isLogin) {
        response = await api.login(email, password);
      } else {
        response = await api.register({ email, password, name });
      }

      await api.setToken(response.token);
      setUser(response.user);
      setAuthenticated(true);
      setShowAuthModal(false);
      resetForm();

      Alert.alert('Success', `Welcome ${response.user.name}!`);

      // Trigger initial sync
      await performSync();
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await api.clearToken();
          setUser(null);
          setAuthenticated(false);
        },
      },
    ]);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  const performSync = async () => {
    if (!(await api.isAuthenticated())) {
      Alert.alert('Not Connected', 'Please login to sync with the cloud.');
      return;
    }

    setIsSyncing(true);
    try {
      const success = await syncService.forceSync();
      if (success) {
        setLastSyncTime(new Date());
        setPendingSyncs(0);
        Alert.alert('Success', 'All changes synced to cloud!');
      } else {
        Alert.alert('Info', 'No changes to sync or offline.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Error', 'Failed to sync. Check your connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  const getConnectionStatus = () => {
    if (isServerAvailable && isAuthenticated) {
      return { color: '#22c55e', text: 'Synced', icon: Wifi };
    }
    if (isServerAvailable) {
      return { color: '#f59e0b', text: 'Online (Login)', icon: Wifi };
    }
    return { color: '#ef4444', text: 'Offline', icon: WifiOff };
  };

  const toggleTheme = () => {
    const order: ('auto' | 'light' | 'dark')[] = ['auto', 'light', 'dark'];
    const nextIndex = (order.indexOf(themePref) + 1) % 3;
    const next = order[nextIndex];
    setThemePref(next);
    AsyncStorage.setItem('themePreference', next);
  };

  const status = getConnectionStatus();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              Promise.all([checkServerAndDB(), checkPendingSyncs()]).then(() => setRefreshing(false));
            }}
          />
        }
      >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: user?.avatar ? 'transparent' : '#eef2ff' }]}>
          {user?.avatar ? (
            <Text style={styles.avatarEmoji}>{user.avatar}</Text>
          ) : (
            <User size={48} color="#6366F1" />
          )}
        </View>
        <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'Not logged in'}</Text>

        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <status.icon size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{`${Math.round((dashboardSummary?.minutesToday || 0) / 60)}h`}</Text>
          <Text style={styles.statLabel}>Productivity</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{`${dashboardSummary?.currentStreakDays || 0}d`}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{`${Math.round(sessions.reduce((a, s) => a + s.duration, 0) / 60)}h`}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Sync Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cloud Sync</Text>
        <View style={styles.card}>
          <View style={styles.syncRow}>
            <View>
              <Text style={styles.syncLabel}>Last synced</Text>
              <Text style={styles.syncValue}>
                {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
              </Text>
              {pendingSyncs > 0 && (
                <Text style={styles.pendingText}>
                  {pendingSyncs} pending change{pendingSyncs > 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
              onPress={performSync}
              disabled={isSyncing}
            >
              <RefreshCw size={20} color={isSyncing ? '#94a3b8' : '#6366F1'} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Database</Text>
            <View style={styles.statusItem}>
              <Database size={14} color={'#22c55e'} />
              <Text style={[styles.infoValue, { color: '#22c55e' }]}>
                Connected
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Server</Text>
            <View style={styles.statusItem}>
              <Wifi size={14} color={isServerAvailable ? '#22c55e' : '#ef4444'} />
              <Text style={[styles.infoValue, { color: isServerAvailable ? '#22c55e' : '#ef4444' }]}>
                {isServerAvailable ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem}>
            <Edit3 size={20} color="#64748b" />
            <Text style={styles.menuText}>Edit Profile</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <Shield size={20} color="#64748b" />
            <Text style={styles.menuText}>Privacy & Security</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
            {themePref === 'auto' ? <Smartphone size={20} color="#64748b" /> : themePref === 'dark' ? <Moon size={20} color="#64748b" /> : <Sun size={20} color="#64748b" />}
            <Text style={styles.menuText}>Theme: {themePref.charAt(0).toUpperCase() + themePref.slice(1)}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Data Management', 'Clear local data? This will delete all offline data.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: async () => {
                    // Note: This would need a clearAll method in dbService
                    Alert.alert('Not Implemented', 'Clear all functionality coming soon.');
                  },
                },
              ]);
            }}
          >
            <Database size={20} color="#64748b" />
            <Text style={styles.menuText}>Clear Local Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </Text>
          <View style={styles.divider} />
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Database</Text>
            <Text style={[styles.infoValue, { color: status.color }]}>SQLite</Text>
          </Text>
          <View style={styles.divider} />
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sync Status</Text>
            <Text style={[styles.infoValue, { color: status.color }]}>{status.text}</Text>
          </Text>
        </View>
      </View>

      {/* Auth Button */}
      {isAuthenticated ? (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.loginBtn} onPress={() => setShowAuthModal(true)}>
          <Text style={styles.loginBtnText}>Login / Register</Text>
        </TouchableOpacity>
      )}

      {/* Auth Modal */}
      <Modal
        visible={showAuthModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowAuthModal(false); resetForm(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
              <TouchableOpacity onPress={() => { setShowAuthModal(false); resetForm(); }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {!isLogin && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#64748b" />
                    <TextInput
                      style={styles.input}
                      placeholder="John Doe"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.authBtn, (!email || !password || (!isLogin && !name)) && styles.authBtnDisabled]}
                onPress={handleAuth}
                disabled={isLoading || !email || !password || (!isLogin && !name)}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.authBtnText}>{isLogin ? 'Login' : 'Register'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchModeBtn} onPress={toggleAuthMode}>
                <Text style={styles.switchModeText}>
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <Text style={styles.switchModeLink}>
                    {isLogin ? 'Register' : 'Login'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    alignItems: 'center',
    padding: 30,
    paddingTop: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#eef2ff',
  },
  avatarEmoji: { fontSize: 48 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  userEmail: { fontSize: 15, color: '#64748b', marginBottom: 16 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginTop: -20,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },

  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  syncLabel: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  syncValue: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  pendingText: { fontSize: 12, color: '#f59e0b', marginTop: 2 },
  syncBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncBtnDisabled: { opacity: 0.6 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  menuText: { fontSize: 16, color: '#0f172a' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 48 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  infoLabel: { fontSize: 15, color: '#64748b' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  loginBtn: {
    backgroundColor: '#0f172a',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    margin: 20,
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
  },
  logoutBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90vh',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  closeBtn: { fontSize: 24, color: '#64748b' },

  modalBody: { padding: 20 },
  formGroup: { marginBottom: 20 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#0f172a' },
  authBtn: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  authBtnDisabled: { backgroundColor: '#94a3b8' },
  authBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switchModeBtn: { marginTop: 16, alignItems: 'center' },
  switchModeText: { fontSize: 14, color: '#64748b' },
  switchModeLink: { color: '#6366F1', fontWeight: '600' },
});
