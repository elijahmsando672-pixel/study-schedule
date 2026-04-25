import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';

export default function ProfileScreen() {
  const handleClearData = () => {
    Alert.alert('Clear All Data', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Clear', 
        style: 'destructive',
        onPress: () => {
          localStorage.removeItem('studyTasks');
          Alert.alert('Done', 'All data cleared!');
        }
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.name}>Emoh</Text>
        <Text style={styles.email}>Student</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>🔔 Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>🎨 Theme</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>⏰ Study Reminders</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleClearData}>
          <Text style={[styles.menuText, { color: '#EF4444' }]}>🗑️ Clear All Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>StudyMasterApp v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 36 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  email: { fontSize: 14, color: '#64748B', marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, color: '#64748B', marginBottom: 12, marginLeft: 4 },
  menuItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12,
    marginBottom: 8,
  },
  menuText: { fontSize: 16, color: '#1E293B' },
  menuArrow: { fontSize: 20, color: '#94A3B8' },
  footer: { alignItems: 'center', marginTop: 20 },
  version: { fontSize: 12, color: '#94A3B8' },
});