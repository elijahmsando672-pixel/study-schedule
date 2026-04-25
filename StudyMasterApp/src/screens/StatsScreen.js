import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

export default function StatsScreen() {
  const [tasks, setTasks] = useState([]);
  const [totalHours, setTotalHours] = useState(0);
  const [weeklyData, setWeeklyData] = useState([]);
  const [completionRate, setCompletionRate] = useState(0);
  const [streak, setStreak] = useState(0);
  const [subjects, setSubjects] = useState([]);

  useFocusEffect(
    React.useCallback(() => {
      const saved = JSON.parse(localStorage.getItem('studyTasks') || '[]');
      setTasks(saved);
      
      const completedTasks = saved.filter(t => t.completed);
      setTotalHours(completedTasks.reduce((acc, t) => acc + t.duration, 0) / 60);
      
      const dayOfWeek = new Date().getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      const weekData = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(new Date());
        date.setDate(date.getDate() - diff + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayHours = saved
          .filter(t => t.date === dateStr && t.completed)
          .reduce((acc, t) => acc + t.duration, 0) / 60;
        weekData.push({ day: DAYS[i], hours: dayHours });
      }
      setWeeklyData(weekData);
      
      setCompletionRate(saved.length > 0 ? Math.round((completedTasks.length / saved.length) * 100) : 0);
      setStreak(calculateStreak(saved));
      setSubjects([...new Set(saved.map(t => t.subject))]);
    }, [])
  );

  const maxHours = Math.max(...weeklyData.map(d => d.hours), 1);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Weekly Progress</Text>

      <View style={styles.chart}>
        {weeklyData.map((day, i) => (
          <View key={i} style={styles.barColumn}>
            <View style={styles.barContainer}>
              <View 
                style={[
                  styles.bar, 
                  { height: `${(day.hours / maxHours) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.dayLabel}>{day.day}</Text>
            <Text style={styles.hoursLabel}>{day.hours.toFixed(1)}h</Text>
          </View>
        ))}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalHours.toFixed(1)}h</Text>
          <Text style={styles.statLabel}>Total Hours</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>🔥 {streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{completionRate}%</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{tasks.length}</Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
        </View>
      </View>

      {subjects.length > 0 && (
        <View style={styles.subjectsSection}>
          <Text style={styles.sectionTitle}>Subjects</Text>
          <View style={styles.subjectTags}>
            {subjects.map((subject, i) => (
              <View key={i} style={styles.subjectTag}>
                <Text style={styles.subjectTagText}>{subject}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginBottom: 24 },
  chart: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  barColumn: { alignItems: 'center', flex: 1 },
  barContainer: { height: 120, width: 24, backgroundColor: '#E2E8F0', borderRadius: 12, justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: '#6366F1', borderRadius: 12 },
  dayLabel: { fontSize: 12, color: '#64748B', marginTop: 8 },
  hoursLabel: { fontSize: 10, color: '#94A3B8' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { 
    width: '48%', 
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
  subjectsSection: { marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginBottom: 12 },
  subjectTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectTag: { backgroundColor: '#E0E7FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  subjectTagText: { color: '#6366F1', fontWeight: '600', fontSize: 14 },
});