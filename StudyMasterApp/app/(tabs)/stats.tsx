import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { BarChart3, Target, Trophy, TrendingUp, Calendar, Clock, Flame } from 'lucide-react-native';
import { useStore } from '@/store/useStore';

export default function StatsScreen() {
  const { tasks, sessions, goals, weeklyProgress, subjectProgress, loadTasks, loadSessions, loadGoals, loadDashboardData } = useStore();

  useEffect(() => {
    refreshStats();
  }, []);

  const refreshStats = async () => {
    await Promise.all([
      loadTasks(),
      loadSessions(),
      loadGoals(),
      loadDashboardData(),
    ]);
  };

  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const totalMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);
  const totalHours = Math.round(totalMinutes / 60);
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const streak = calculateStreak(tasks);

  function calculateStreak(tasks: any[]): number {
    if (completedTasks.length === 0) return 0;

    const completedDates = new Set(
      completedTasks
        .filter((t) => t.completedAt)
        .map((t) => new Date(t.completedAt!).toISOString().split('T')[0])
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      if (completedDates.has(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }

  const getSubjectColor = (color?: string) => color || '#6366F1';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
        <Text style={styles.subtitle}>Your learning journey</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <View style={[styles.iconBox, { backgroundColor: '#dbeafe' }]}>
            <Target size={24} color="#3b82f6" />
          </View>
          <Text style={styles.summaryValue}>{tasks.length}</Text>
          <Text style={styles.summaryLabel}>Total Tasks</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
            <Trophy size={24} color="#22c55e" />
          </View>
          <Text style={styles.summaryValue}>{completedTasks.length}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
            <Clock size={24} color="#f59e0b" />
          </View>
          <Text style={styles.summaryValue}>{totalHours}h</Text>
          <Text style={styles.summaryLabel}>Time Studied</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
            <Flame size={24} color="#ef4444" />
          </View>
          <Text style={styles.summaryValue}>{streak}</Text>
          <Text style={styles.summaryLabel}>Day Streak</Text>
        </View>
      </View>

      {/* Progress Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Overall Progress</Text>
          <Text style={styles.cardValue}>{completionRate}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
        </View>
        <Text style={styles.cardSubtitle}>
          {completedTasks.length} of {tasks.length} tasks completed
        </Text>
      </View>

      {/* Weekly Progress */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <BarChart3 size={20} color="#6366F1" />
          <Text style={styles.cardTitle}>Weekly Activity</Text>
        </View>
        {weeklyProgress.length > 0 ? (
          <View style={styles.chartContainer}>
            {weeklyProgress.map((day, index) => {
              const maxMinutes = Math.max(...weeklyProgress.map((d) => d.minutes), 1);
              const height = (day.minutes / maxMinutes) * 120;

              return (
                <View key={index} style={styles.chartBarContainer}>
                  <View style={styles.chartBarWrapper}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: Math.max(height, 4),
                          backgroundColor: index === 6 ? '#10b981' : '#6366F1',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{day.dayLabel}</Text>
                  <Text style={styles.chartValue}>{Math.round(day.minutes / 60)}h</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noDataText}>No activity this week</Text>
        )}
      </View>

      {/* Subject Breakdown */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <TrendingUp size={20} color="#6366F1" />
          <Text style={styles.cardTitle}>By Subject</Text>
        </View>
        {subjectProgress.length > 0 ? (
          <View style={styles.subjectList}>
            {subjectProgress.map((subject, index) => (
              <View key={index} style={styles.subjectItem}>
                <View style={styles.subjectInfo}>
                  <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
                  <Text style={styles.subjectName}>{subject.subjectName}</Text>
                </View>
                <View style={styles.subjectStats}>
                  <Text style={styles.subjectHours}>
                    {Math.round(subject.minutesThisWeek / 60)}h / {Math.round(subject.goalMinutesPerWeek / 60)}h
                  </Text>
                  <Text style={styles.subjectPercent}>{subject.percent}%</Text>
                </View>
                <View style={styles.progressBarSmall}>
                  <View
                    style={[
                      styles.progressFillSmall,
                      {
                        width: `${subject.percent}%`,
                        backgroundColor: subject.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>No subjects yet</Text>
        )}
      </View>

      {/* Goals Progress */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Target size={20} color="#6366F1" />
          <Text style={styles.cardTitle}>Goals</Text>
        </View>
        {goals.length > 0 ? (
          <View style={styles.goalList}>
            {goals.map((goal) => {
              const percent = goal.targetHours > 0
                ? Math.min(100, Math.round((goal.currentHours / goal.targetHours) * 100))
                : 0;

              return (
                <View key={goal.id} style={styles.goalItem}>
                  <View style={styles.goalInfo}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalMeta}>
                      {goal.currentHours}h / {goal.targetHours}h
                    </Text>
                  </View>
                  <View style={[styles.goalStatus, { backgroundColor: getStatusColor(goal.status) }]}>
                    <Text style={styles.goalStatusText}>{goal.status}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noDataText}>No goals set</Text>
        )}
      </View>

      {/* Recent Sessions */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Calendar size={20} color="#6366F1" />
          <Text style={styles.cardTitle}>Recent Sessions</Text>
        </View>
        {sessions.length > 0 ? (
          <View style={styles.sessionList}>
            {sessions.slice(0, 5).map((session) => (
              <View key={session.id} style={styles.sessionItem}>
                <Text style={styles.sessionDate}>
                  {new Date(session.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.sessionDuration}>{session.duration} min</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>No sessions recorded</Text>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#dcfce7';
    case 'active':
      return '#dbeafe';
    case 'paused':
      return '#fef3c7';
    default:
      return '#e2e8f0';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 20,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  summaryLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  cardValue: { fontSize: 24, fontWeight: 'bold', color: '#6366F1', marginLeft: 'auto' },

  progressBar: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#6366F1' },
  cardSubtitle: { fontSize: 13, color: '#64748b', marginTop: 12, textAlign: 'center' },

  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, paddingTop: 20 },
  chartBarContainer: { alignItems: 'center', flex: 1 },
  chartBarWrapper: { height: 120, justifyContent: 'flex-end' },
  chartBar: { width: 24, borderRadius: 6 },
  chartLabel: { fontSize: 12, color: '#64748b', marginTop: 8 },
  chartValue: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  subjectList: { gap: 12 },
  subjectItem: { marginBottom: 12 },
  subjectInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  subjectDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  subjectName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  subjectStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  subjectHours: { fontSize: 13, color: '#64748b' },
  subjectPercent: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  progressBarSmall: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressFillSmall: { height: '100%', borderRadius: 3 },

  goalList: { gap: 8 },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  goalInfo: { flex: 1 },
  goalTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  goalMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  goalStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  goalStatusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  sessionList: { gap: 8 },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sessionDate: { fontSize: 14, color: '#64748b' },
  sessionDuration: { fontSize: 14, fontWeight: '600', color: '#0f172a' },

  noDataText: { textAlign: 'center', color: '#94a3b8', fontSize: 14, paddingVertical: 20 },
});
