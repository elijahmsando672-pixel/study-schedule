import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

const calculateStreak = (tasks) => {
  if (!tasks || tasks.filter(t => t.completed).length === 0) return 0;
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasTask = tasks.some(t => t.date === dateStr && t.completed);
    if (hasTask) streak++;
    else if (i > 0) break;
  }
  return streak;
};

const getWeeklyHours = (tasks) => {
  if (!tasks) return 0;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeek = new Date().getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  let totalHours = 0;
  for (let i = 0; i < 7; i++) {
    const date = new Date(new Date());
    date.setDate(date.getDate() - diff + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayHours = tasks
      .filter(t => t.date === dateStr && t.completed)
      .reduce((acc, t) => acc + t.duration, 0) / 60;
    totalHours += dayHours;
  }
  return totalHours.toFixed(1);
};

export default function HomeScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [streak, setStreak] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      const saved = JSON.parse(localStorage.getItem('studyTasks') || '[]');
      setTasks(saved);
      setStreak(calculateStreak(saved));
      setWeeklyHours(getWeeklyHours(saved));
    }, [])
  );

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.date === today);
  const pendingTasks = todayTasks.filter(t => !t.completed);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}, Emoh</Text>
        <Text style={styles.subtitle}>Ready to learn?</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>🔥 {streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>📊 {weeklyHours}h</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Today's Tasks</Text>
        {pendingTasks.length === 0 ? (
          <Text style={styles.emptyText}>No tasks for today</Text>
        ) : (
          pendingTasks.slice(0, 3).map(task => (
            <TouchableOpacity 
              key={task.id} 
              style={styles.taskItem}
              onPress={() => navigation.navigate('Study', { task })}
            >
              <Text style={styles.taskCheck}>⏳</Text>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskTime}>{task.time || 'No time set'}</Text>
              </View>
              <Text style={styles.playBtn}>▶</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity 
        style={styles.startButton}
        onPress={() => navigation.navigate('Tasks')}
      >
        <Text style={styles.startButtonText}>View All Tasks →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  header: { marginBottom: 24, marginTop: 40 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 16, color: '#64748B', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { 
    flex: 1, 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#6366F1' },
  statLabel: { fontSize: 14, color: '#64748B', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginBottom: 12 },
  emptyText: { color: '#94A3B8', fontSize: 14 },
  taskItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  taskCheck: { fontSize: 18, marginRight: 12 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, color: '#1E293B' },
  taskTime: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  playBtn: { fontSize: 16, color: '#6366F1' },
  startButton: { 
    backgroundColor: '#6366F1', 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center',
    marginBottom: 40,
  },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});