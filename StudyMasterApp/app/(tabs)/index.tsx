import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, useColorScheme, Animated, Easing, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Flame, Calendar, Target, PlusCircle } from 'lucide-react-native';
import { useStore } from '@/store/useStore';
import { useAppTheme } from '@/hooks/use-app-theme';

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
  backgroundColor: string;
};

const StatCard = ({ icon: Icon, label, value, color, backgroundColor }: StatCardProps) => (
  <View style={[styles.statCard, { backgroundColor }]}>
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
  fillColor: string;
  bgColor: string;
};

const ProgressBar = ({ progress, fillColor, bgColor }: ProgressBarProps) => (
  <View style={[styles.progressBg, { backgroundColor: bgColor }]}>
    <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: fillColor }]} />
  </View>
);

export default function DashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = useAppTheme();
  const {
    subjects,
    dashboardSummary,
    weeklyProgress,
    subjectProgress,
    todaySchedule,
    addSession,
    loadSubjects,
    loadDashboardData,
    isLoading,
  } = useStore();

  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState('');
const [refreshing, setRefreshing] = useState(false);

  const weeklyData = weeklyProgress.length > 0
    ? weeklyProgress.map(d => ({ day: d.dayLabel, min: d.minutes }))
    : WEEKLY_DATA;

  const maxMin = Math.max(...weeklyData.map(d => (d as any).min || 0));

  const barAnims = useRef(weeklyData.map(() => new Animated.Value(0))).current;

  React.useEffect(() => {
    weeklyData.forEach((_, i) => {
      Animated.timing(barAnims[i] || barAnims[0], {
        toValue: 1,
        duration: 600,
        delay: i * 80,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });
  }, []);

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
      await addSession({
        subjectId: parseInt(subjectId),
        duration: durationNum,
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

  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              Promise.all([loadDashboardData(), loadSubjects()]).then(() => setRefreshing(false));
            }}
          />
        }
      >
      {isLoading && !dashboardSummary ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.greeting, { color: theme.text }]}>{greeting}</Text>
          <Text style={[styles.date, { color: theme.textSecondary }]}>{formatDate()}</Text>
        </>
      )}

      <View style={styles.statsGrid}>
        <StatCard
          icon={Clock}
          label="Today"
          value={`${dashboardSummary?.minutesToday || 0} min`}
          color={theme.info}
          backgroundColor={theme.backgroundSecondary}
        />
        <StatCard
          icon={Flame}
          label="Streak"
          value={`${dashboardSummary?.currentStreakDays || 0} days`}
          color={theme.warning}
          backgroundColor={theme.backgroundSecondary}
        />
        <StatCard
          icon={Calendar}
          label="This Week"
          value={`${dashboardSummary?.sessionsThisWeek || 0} sessions`}
          color={theme.purple}
          backgroundColor={theme.backgroundSecondary}
        />
        <StatCard
          icon={Target}
          label="Goal"
          value={`${calculateGoalPercent(dashboardSummary)}%`}
          color={theme.success}
          backgroundColor={theme.backgroundSecondary}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.leftCol}>
          <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Weekly Progress</Text>
              <View style={styles.chart}>
                {weeklyData.map((item, i) => {
                  const minutes = (item as any).min || 0;
                  const barHeight = maxMin > 0 ? (minutes / maxMin) * 140 : 0;
                  const isToday = item.day === ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
                  const animVal = barAnims[i];
                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={[styles.barValue, { color: theme.textSecondary }]}>{minutes > 0 ? minutes : ''}</Text>
                      <View style={[styles.barContainer, { backgroundColor: theme.backgroundTertiary }]}>
                        <Animated.View
                          style={[
                            styles.bar,
                            {
                              height: animVal ? animVal.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, Math.max(barHeight, 4)],
                              }) : Math.max(barHeight, 4),
                              backgroundColor: isToday ? theme.success : theme.info,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.barLabel, { color: theme.textSecondary }, isToday && { color: theme.success, fontWeight: '700' }]}>{item.day}</Text>
                    </View>
                  );
                })}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Subject Progress</Text>
            {subjectsData.map((sub: any) => (
              <View key={sub.subjectId} style={styles.subjectItem}>
                <View style={styles.subjectRow}>
                  <View style={[styles.dot, { backgroundColor: sub.color }]} />
                  <Text style={[styles.subjectName, { color: theme.text }]}>{sub.subjectName}</Text>
                  <Text style={[styles.subjectMeta, { color: theme.textSecondary }]}>
                    {Math.round(sub.minutesThisWeek / 60)}h / {Math.round(sub.goalMinutesPerWeek / 60)}h
                  </Text>
                </View>
                <ProgressBar progress={sub.percent} fillColor={sub.color} bgColor={theme.backgroundTertiary} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.rightCol}>
          <View style={[styles.card, { backgroundColor: theme.backgroundSecondary, flex: 1 }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Quick Log</Text>
            <View style={styles.form}>
              <Text style={[styles.label, { color: theme.text }]}>Subject</Text>
              <View style={styles.select}>
                {subjects.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.selectOption,
                      { backgroundColor: theme.backgroundTertiary },
                      subjectId === s.id.toString() && [styles.selectOptionActive, { backgroundColor: theme.text }],
                    ]}
                    onPress={() => setSubjectId(s.id.toString())}
                  >
                    <View style={[styles.colorDot, { backgroundColor: s.color }]} />
                    <Text
                      style={[
                        styles.selectText,
                        { color: theme.text },
                        subjectId === s.id.toString() && [styles.selectTextActive, { color: theme.background }],
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.label, { color: theme.text }]}>Duration (min)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border, color: theme.text }]}
                placeholder="e.g. 45"
                placeholderTextColor={theme.textTertiary}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />
              <TouchableOpacity style={[styles.logBtn, { backgroundColor: theme.info }]} onPress={handleLogSession}>
                <PlusCircle size={16} color="#fff" />
                <Text style={styles.logBtnText}>Log Session</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Today's Schedule</Text>
            {todaySchedule.length === 0 ? (
              <Text style={[styles.emptySchedule, { color: theme.textTertiary }]}>No sessions scheduled</Text>
            ) : (
              todaySchedule.map((slot, i) => (
                <View key={i} style={[styles.scheduleItem, { backgroundColor: theme.successLight, borderLeftColor: theme.success }]}>
                  <Text style={[styles.scheduleSubject, { color: isDark ? theme.success : '#064e3b' }]}>{slot.subjectName}</Text>
                  <Text style={[styles.scheduleTime, { color: isDark ? theme.success : '#047857' }]}>
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
  );
}

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
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 16 },
  chart: { flexDirection: 'row', height: 180, justifyContent: 'space-between' },
  barCol: { alignItems: 'center', flex: 1 },
  barContainer: { height: 140, width: 24, borderRadius: 12, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 12 },
  barLabel: { fontSize: 12, marginTop: 8 },
  barValue: { fontSize: 10, marginBottom: 4 },
  subjectItem: { marginBottom: 16 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  subjectName: { flex: 1, fontSize: 14, fontWeight: '500' },
  subjectMeta: { fontSize: 14 },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: '500' },
  select: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  selectOptionActive: {},
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  selectText: { fontSize: 14 },
  selectTextActive: {},
  input: { height: 40, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12 },
  logBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  logBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  scheduleItem: { padding: 12, borderLeftWidth: 4, borderRadius: 4, marginBottom: 8 },
  scheduleSubject: { fontWeight: '600' },
  scheduleTime: { fontSize: 14 },
  emptySchedule: { fontSize: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { fontSize: 14, color: '#64748b', marginTop: 12 },
});
