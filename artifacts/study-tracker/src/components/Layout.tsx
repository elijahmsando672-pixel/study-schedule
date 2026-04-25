import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Link, useLocation } from 'expo-router';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/schedule', label: 'Schedule', icon: '📅' },
  { path: '/subjects', label: 'Subjects', icon: '📚' },
  { path: '/sessions', label: 'Sessions', icon: '⏱️' },
  { path: '/reminders', label: 'Reminders', icon: '🔔' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>📖 StudyTracker</Text>
        </View>
        <ScrollView style={styles.nav}>
          {NAV_ITEMS.map(item => (
            <Link key={item.path} href={item.path} asChild>
              <TouchableOpacity
                style={[
                  styles.navItem,
                  location === item.path && styles.navItemActive,
                ]}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.navLabel,
                    location === item.path && styles.navLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            </Link>
          ))}
        </ScrollView>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#F8FAFC' },
  sidebar: { width: 220, backgroundColor: '#1E293B', paddingTop: 50 },
  logo: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' },
  logoText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  nav: { flex: 1, paddingTop: 10 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: { backgroundColor: '#6366F1' },
  navIcon: { fontSize: 18, marginRight: 12 },
  navLabel: { color: '#94A3B8', fontSize: 15 },
  navLabelActive: { color: '#fff', fontWeight: '600' },
  content: { flex: 1, padding: 24 },
});