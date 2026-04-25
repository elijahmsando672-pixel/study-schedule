import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Clock, Flame, Calendar, Target, PlusCircle } from 'lucide-react';

const WEEKLY_DATA = [
  { day: 'Sun', min: 0 }, { day: 'Mon', min: 25 }, { day: 'Tue', min: 50 },
  { day: 'Wed', min: 75 }, { day: 'Thu', min: 100 }, { day: 'Fri', min: 75 },
  { day: 'Sat', min: 75 }
];

const SUBJECTS = [
  { id: 1, name: 'Calculus II', progress: 195, total: 300, color: '#3b82f6' },
  { id: 2, name: 'Spanish', progress: 75, total: 240, color: '#ef4444' },
  { id: 3, name: 'History of Architecture', progress: 80, total: 180, color: '#10b981' },
];

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<any[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, weeklyRes, subjectRes, todayRes] = await Promise.all([
        fetch('http://localhost:3001/api/dashboard/summary'),
        fetch('http://localhost:3001/api/progress/weekly'),
        fetch('http://localhost:3001/api/progress/by-subject'),
        fetch('http://localhost:3001/api/dashboard/today'),
      ]);
      const summaryData = await summaryRes.json();
      const weeklyData = await weeklyRes.json();
      const subjectData = await subjectRes.json();
      const todayData = await todayRes.json();
      
      setSummary(summaryData);
      setWeekly(weeklyData);
      setSubjectProgress(subjectData);
      setTodaySchedule(todayData);
    } catch (e) {
      setSummary({
        minutesToday: 75,
        minutesThisWeek: 450,
        sessionsThisWeek: 9,
        currentStreakDays: 7,
        weeklyGoalMinutes: 600,
        subjectCount: 3,
        upcomingReminderCount: 2,
      });
    }
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const formatDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleLogSession = () => {
    console.log('Log session:', { subjectId, duration });
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );

  const ProgressBar = ({ progress }) => (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
  );

  const weeklyData = weekly.length > 0 ? weekly : WEEKLY_DATA;
  const maxMin = Math.max(...weeklyData.map(d => d.minutes || d.min));

  const subjects = subjectProgress.length > 0 ? subjectProgress : SUBJECTS;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.date}>{formatDate()}</Text>

      <View style={styles.statsGrid}>
        <StatCard icon={Clock} label="Today" value={`${summary?.minutesToday || 75} min`} color="#3b82f6" />
        <StatCard icon={Flame} label="Streak" value={`${summary?.currentStreakDays || 7} days`} color="#f97316" />
        <StatCard icon={Calendar} label="This Week" value={`${summary?.sessionsThisWeek || 9} sessions`} color="#8b5cf6" />
        <StatCard icon={Target} label="Goal" value={`${summary?.minutesThisWeek ? Math.round((summary.minutesThisWeek / summary.weeklyGoalMinutes) * 100) : 49}%`} color="#10b981" />
      </View>

      <View style={styles.row}>
        <View style={styles.leftCol}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly Progress</Text>
            <View style={styles.chart}>
              {weeklyData.map((item, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barContainer}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          height: `${(item.minutes || item.min || 0 / maxMin) * 100}%`,
                          backgroundColor: i === 6 ? '#10b981' : '#3b82f6'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.barLabel}>{item.dayLabel || item.day}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Subject Progress</Text>
            {subjects.map(sub => (
              <View key={sub.subjectId || sub.id} style={styles.subjectItem}>
                <View style={styles.subjectRow}>
                  <View style={[styles.dot, { backgroundColor: sub.color }]} />
                  <Text style={styles.subjectName}>{sub.subjectName || sub.name}</Text>
                  <Text style={styles.subjectMeta}>{sub.minutesThisWeek || sub.progress} / {sub.goalMinutesPerWeek || sub.total} min</Text>
                </View>
                <ProgressBar progress={sub.percent || (sub.progress / sub.total) * 100} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.rightCol}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Log</Text>
            <View style={styles.form}>
              <Text style={styles.label}>Subject</Text>
              <View style={styles.select}>
                <Text style={styles.selectText}>Select subject</Text>
                <Text>▼</Text>
              </View>
              <Text style={styles.label}>Duration (min)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 45"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.logBtn} onPress={handleLogSession}>
                <PlusCircle size={16} /> <Text style={styles.logBtnText}>Log Session</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Schedule</Text>
            {todaySchedule.length === 0 ? (
              <Text style={styles.emptySchedule}>No sessions scheduled</Text>
            ) : (
              todaySchedule.map((slot, i) => (
                <View key={i} style={styles.scheduleItem}>
                  <Text style={styles.scheduleSubject}>{slot.subjectName}</Text>
                  <Text style={styles.scheduleTime}>{slot.startTime} - {slot.endTime}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20, paddingTop: 60, minHeight: '100vh' },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  date: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { 
    width: '48%', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statLabel: { fontSize: 12, color: '#64748b' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 16, flex: 1 },
  leftCol: { flex: 2 },
  rightCol: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 16 },
  chart: { flexDirection: 'row', height: 180, justifyContent: 'space-between' },
  barCol: { alignItems: 'center', flex: 1 },
  barContainer: { height: 140, width: 24, backgroundColor: '#f1f5f9', borderRadius: 12, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 12 },
  barLabel: { fontSize: 12, color: '#64748b', marginTop: 8 },
  subjectItem: { marginBottom: 16 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  subjectName: { flex: 1, fontSize: 14, fontWeight: '500' },
  subjectMeta: { fontSize: 14, color: '#64748b' },
  progressBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0f172a' },
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151' },
  select: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    height: 40, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 6, 
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  selectText: { color: '#64748b' },
  input: { 
    height: 40, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 6, 
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  logBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb', 
    paddingVertical: 12, 
    borderRadius: 8,
  },
  logBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  scheduleItem: { padding: 12, borderLeftWidth: 4, borderLeftColor: '#10b981', backgroundColor: '#ecfdf5', borderRadius: 4, marginBottom: 8 },
  scheduleSubject: { fontWeight: '600', color: '#064e3b' },
  scheduleTime: { fontSize: 14, color: '#047857' },
  emptySchedule: { color: '#94a3b8', fontSize: 14 },
});