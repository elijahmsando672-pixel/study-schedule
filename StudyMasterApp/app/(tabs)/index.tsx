import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Flame, Calendar, Target, PlusCircle } from 'lucide-react-native';
import { useStore } from '@/store/useStore';

const WEEKLY_DATA = [
  { day: 'Sun', min: 0 }, { day: 'Mon', min: 25 }, { day: 'Tue', min: 50 },
  { day: 'Wed', min: 75 }, { day: 'Thu', min: 100 }, { day: 'Fri', min: 75 },
  { day: 'Sat', min: 75 }
];

type StatCardProps = {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  value: string | number;
  color: string;
};

const StatCard = ({ icon: Icon, label, value, color }: StatCardProps) => (
  <View style={styles.statCard}>
    <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
      <Icon size={24} color={color} />
    </View>
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  </View>
);

type ProgressBarProps = {
  progress: number;
};

const ProgressBar = ({ progress }: ProgressBarProps) => (
  <View style={styles.progressBg}>
    <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progress))}%` }]} />
  </View>
);

export default function DashboardScreen() {
  const router = useRouter();
  const {
    subjects,
    dashboardSummary,
    weeklyProgress,
    subjectProgress,
    todaySchedule,
    addTask,
    loadSubjects,
    loadDashboardData,
  } = useStore();

  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState('');

  useEffect(() => {
    loadSubjects();
    loadDashboardData();
  }, []);

  const handleLogSession = async () => {
    if (!subjectId || !duration) {
      Alert.alert('Error', 'Please select a subject and enter duration');
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Error', 'Please enter a valid duration');
      return;
    }

    try {
      await addTask({
        title: `Study Session - ${new Date().toLocaleTimeString()}`,
        subjectId: parseInt(subjectId),
        duration: durationNum,
        priority: 'medium',
        status: 'completed',
        date: new Date().toISOString().split('T')[0],
        notes: 'Logged from dashboard',
      });
      Alert.alert('Success', `${durationNum} minute session logged!`);
      setDuration('');
    } catch (error) {
      console.error('Error logging session:', error);
      Alert.alert('Error', 'Failed to log session');
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

  const weeklyData = weeklyProgress.length > 0
    ? weeklyProgress.map(d => ({ day: d.dayLabel, min: d.minutes }))
    : WEEKLY_DATA;

  const maxMin = Math.max(...weeklyData.map(d => (d as any).min || 0));

  const subjectsData = subjectProgress.length > 0
    ? subjectProgress
    : subjects.map(s => ({
        subjectId: s.id,
        subjectName: s.name,
        color: s.color,
        minutesThisWeek: 0,
        goalMinutesPerWeek: s.targetHours * 60,
        percent: 0,
      }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.date}>{formatDate()}</Text>

      <View style={styles.statsGrid}>
        <StatCard
          icon={Clock}
          label="Today"
          value={`${dashboardSummary?.minutesToday || 0} min`}
          color="#3b82f6"
        />
        <StatCard
          icon={Flame}
          label="Streak"
          value={`${dashboardSummary?.currentStreakDays || 0} days`}
          color="#f97316"
        />
        <StatCard
          icon={Calendar}
          label="This Week"
          value={`${dashboardSummary?.sessionsThisWeek || 0} sessions`}
          color="#8b5cf6"
        />
        <StatCard
          icon={Target}
          label="Goal"
          value={`${calculateGoalPercent(dashboardSummary)}%`}
          color="#10b981"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.leftCol}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly Progress</Text>
            <View style={styles.chart}>
              {weeklyData.map((item, i) => {
                const minutes = (item as any).min || 0;
                const barHeight = maxMin > 0 ? (minutes / maxMin) * 140 : 0;
                return (
                  <View key={i} style={styles.barCol}>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(barHeight, 4),
                            backgroundColor: i === 6 ? '#10b981' : '#3b82f6',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{item.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Subject Progress</Text>
            {subjectsData.map((sub: any) => (
              <View key={sub.subjectId} style={styles.subjectItem}>
                <View style={styles.subjectRow}>
                  <View style={[styles.dot, { backgroundColor: sub.color }]} />
                  <Text style={styles.subjectName}>{sub.subjectName}</Text>
                  <Text style={styles.subjectMeta}>
                    {Math.round(sub.minutesThisWeek / 60)}h / {Math.round(sub.goalMinutesPerWeek / 60)}h
                  </Text>
                </View>
                <ProgressBar progress={sub.percent} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.rightCol}>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.cardTitle}>Quick Log</Text>
            <View style={styles.form}>
              <Text style={styles.label}>Subject</Text>
              <View style={styles.select}>
                {subjects.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.selectOption,
                      subjectId === s.id.toString() && styles.selectOptionActive,
                    ]}
                    onPress={() => setSubjectId(s.id.toString())}
                  >
                    <View style={[styles.colorDot, { backgroundColor: s.color }]} />
                    <Text
                      style={[
                        styles.selectText,
                        subjectId === s.id.toString() && styles.selectTextActive,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
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
                <PlusCircle size={16} color="#fff" />
                <Text style={styles.logBtnText}>Log Session</Text>
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
                  <Text style={styles.scheduleTime}>
                    {slot.startTime} - {slot.endTime}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </ScrollView>
    </SafeAreaView>

function calculateGoalPercent(summary: any): number {
  if (!summary) return 0;
  const { minutesThisWeek, weeklyGoalMinutes } = summary;
  if (weeklyGoalMinutes <= 0) return 0;
  return Math.min(100, Math.round((minutesThisWeek / weeklyGoalMinutes) * 100));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', padding: 20, paddingTop: 20 },
  date: { fontSize: 14, color: '#64748b', marginBottom: 20, paddingHorizontal: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center' as const,
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
  select: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#f1f5f9' },
  selectOptionActive: { backgroundColor: '#0f172a' },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  selectText: { fontSize: 14, color: '#374151' },
  selectTextActive: { color: '#fff' },
  input: { height: 40, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, paddingHorizontal: 12, backgroundColor: '#fff' },
  logBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 8 },
  logBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  scheduleItem: { padding: 12, borderLeftWidth: 4, borderLeftColor: '#10b981', backgroundColor: '#ecfdf5', borderRadius: 4, marginBottom: 8 },
  scheduleSubject: { fontWeight: '600', color: '#064e3b' },
  scheduleTime: { fontSize: 14, color: '#047857' },
  emptySchedule: { color: '#94a3b8', fontSize: 14 },
});
