import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Share } from 'react-native';
import { BarChart3, Target, Trophy, TrendingUp, Calendar, Clock, Flame, Download, Award, Lock } from 'lucide-react-native';
import { useStore } from '@/store/useStore';
import { useAppTheme } from '@/hooks/use-app-theme';

const BADGES = [
  { id: 'first_session', name: 'First Steps', desc: 'Complete your first study session', icon: '1', check: (sessions: any[]) => sessions.length >= 1 },
  { id: 'five_sessions', name: 'Getting Started', desc: 'Complete 5 study sessions', icon: '5', check: (sessions: any[]) => sessions.length >= 5 },
  { id: 'ten_hours', name: 'Dedicated', desc: 'Study for 10 hours total', icon: '10', check: (_: any[], totalHours: number) => totalHours >= 10 },
  { id: 'streak_3', name: 'On Fire', desc: '3-day study streak', icon: '3', check: (_: any[], __: number, streak: number) => streak >= 3 },
  { id: 'streak_7', name: 'Week Warrior', desc: '7-day study streak', icon: '7', check: (_: any[], __: number, streak: number) => streak >= 7 },
  { id: 'streak_30', name: 'Monthly Master', desc: '30-day study streak', icon: '30', check: (_: any[], __: number, streak: number) => streak >= 30 },
  { id: 'perfect_day', name: 'Perfect Day', desc: 'Complete all tasks in a day', icon: '*', check: (sessions: any[], _: number, __: number, tasks: any[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter((t: any) => t.date === today);
    return todayTasks.length > 0 && todayTasks.every((t: any) => t.status === 'completed');
  }},
  { id: 'five_subjects', name: 'Scholar', desc: 'Add 5 subjects', icon: 'S', check: (_: any[], __: number, ___: number, ___: any[], subjects: any[]) => subjects.length >= 5 },
  { id: 'hundred_hours', name: 'Century', desc: 'Study for 100 hours total', icon: '100', check: (_: any[], totalHours: number) => totalHours >= 100 },
];

function getEarnedBadges(sessions: any[], totalHours: number, streak: number, tasks: any[], subjects: any[]) {
  return BADGES.map(badge => ({
    ...badge,
    earned: badge.check(sessions, totalHours, streak, tasks, subjects),
  }));
}

async function exportCSV(sessions: any[], totalHours: number, completionRate: number, streak: number) {
  const headers = 'Date,Subject,Duration (min),Notes';
  const rows = sessions.map(s => `${s.date},${s.subjectName || 'Unknown'},${s.duration},"${(s.notes || '').replace(/"/g, '""')}"`);
  const summary = [
    '',
    'Summary',
    `Total Hours,${totalHours}`,
    `Completion Rate,${completionRate}%`,
    `Streak,${streak} days`,
  ];

  const csv = [headers, ...rows, ...summary].join('\n');

  try {
    await Share.share({
      message: csv,
      title: 'Study Stats Export',
    });
  } catch (error) {
    console.error('Error sharing CSV:', error);
  }
}

export default function StatsScreen() {
  const theme = useAppTheme();
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

  const earnedBadges = getEarnedBadges(sessions, totalHours, streak, tasks, useStore.getState().subjects);

  const handleExport = () => {
    exportCSV(sessions, totalHours, completionRate, streak);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Statistics</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Your learning journey</Text>
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Download size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.info}20` }]}>
              <Target size={24} color={theme.info} />
            </View>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{tasks.length}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Tasks</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.success}20` }]}>
              <Trophy size={24} color={theme.success} />
            </View>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{completedTasks.length}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Completed</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.warning}20` }]}>
              <Clock size={24} color={theme.warning} />
            </View>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{totalHours}h</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Time Studied</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.danger}20` }]}>
              <Flame size={24} color={theme.danger} />
            </View>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{streak}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Day Streak</Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Overall Progress</Text>
            <Text style={[styles.cardValue, { color: theme.primary }]}>{completionRate}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundTertiary }]}>
            <View style={[styles.progressFill, { width: `${completionRate}%`, backgroundColor: theme.primary }]} />
          </View>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            {completedTasks.length} of {tasks.length} tasks completed
          </Text>
        </View>

        {/* Weekly Progress */}
        <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.cardHeader}>
            <BarChart3 size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Weekly Activity</Text>
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
                            backgroundColor: index === 6 ? theme.success : theme.info,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.chartLabel, { color: theme.textSecondary }]}>{day.dayLabel}</Text>
                    <Text style={[styles.chartValue, { color: theme.textTertiary }]}>{Math.round(day.minutes / 60)}h</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.noDataText, { color: theme.textTertiary }]}>No activity this week</Text>
          )}
        </View>

        {/* Subject Breakdown */}
        <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.cardHeader}>
            <TrendingUp size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>By Subject</Text>
          </View>
          {subjectProgress.length > 0 ? (
            <View style={styles.subjectList}>
              {subjectProgress.map((subject, index) => (
                <View key={index} style={styles.subjectItem}>
                  <View style={styles.subjectInfo}>
                    <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
                    <Text style={[styles.subjectName, { color: theme.text }]}>{subject.subjectName}</Text>
                  </View>
                  <View style={styles.subjectStats}>
                    <Text style={[styles.subjectHours, { color: theme.textSecondary }]}>
                      {Math.round(subject.minutesThisWeek / 60)}h / {Math.round(subject.goalMinutesPerWeek / 60)}h
                    </Text>
                    <Text style={[styles.subjectPercent, { color: theme.text }]}>{subject.percent}%</Text>
                  </View>
                  <View style={[styles.progressBarSmall, { backgroundColor: theme.backgroundTertiary }]}>
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
            <Text style={[styles.noDataText, { color: theme.textTertiary }]}>No subjects yet</Text>
          )}
        </View>

        {/* Goals Progress */}
        <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.cardHeader}>
            <Target size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Goals</Text>
          </View>
          {goals.length > 0 ? (
            <View style={styles.goalList}>
              {goals.map((goal) => {
                const percent = goal.targetHours > 0
                  ? Math.min(100, Math.round((goal.currentHours / goal.targetHours) * 100))
                  : 0;

                return (
                  <View key={goal.id} style={[styles.goalItem, { backgroundColor: theme.backgroundTertiary }]}>
                    <View style={styles.goalInfo}>
                      <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
                      <Text style={[styles.goalMeta, { color: theme.textSecondary }]}>
                        {goal.currentHours}h / {goal.targetHours}h
                      </Text>
                    </View>
                    <View style={[styles.goalStatus, { backgroundColor: getStatusColor(goal.status, theme) }]}>
                      <Text style={[styles.goalStatusText, { color: theme.text }]}>{goal.status}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.noDataText, { color: theme.textTertiary }]}>No goals set</Text>
          )}
        </View>

        {/* Achievements Section */}
        <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.cardHeader}>
            <Award size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Achievements</Text>
          </View>
          <View style={styles.badgeGrid}>
            {earnedBadges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeItem,
                  { backgroundColor: badge.earned ? theme.backgroundTertiary : `${theme.backgroundTertiary}50` }
                ]}
              >
                <Text style={[styles.badgeIcon, !badge.earned && styles.badgeIconLocked]}>
                  {badge.earned ? badge.icon : <Lock size={24} color={theme.textTertiary} />}
                </Text>
                <Text style={[styles.badgeName, { color: badge.earned ? theme.text : theme.textTertiary }]}>
                  {badge.name}
                </Text>
                <Text style={[styles.badgeDesc, { color: badge.earned ? theme.textSecondary : theme.textTertiary }]}>
                  {badge.desc}
                </Text>
                {badge.earned && (
                  <View style={[styles.badgeEarned, { backgroundColor: `${theme.success}30` }]}>
                    <Text style={[styles.badgeEarnedText, { color: theme.success }]}>✓</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Recent Sessions */}
        <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.cardHeader}>
            <Calendar size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Recent Sessions</Text>
          </View>
          {sessions.length > 0 ? (
            <View style={styles.sessionList}>
              {sessions.slice(0, 5).map((session) => (
                <View key={session.id} style={[styles.sessionItem, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.sessionDate, { color: theme.textSecondary }]}>
                    {new Date(session.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={[styles.sessionDuration, { color: theme.text }]}>{session.duration} min</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noDataText, { color: theme.textTertiary }]}>No sessions recorded</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStatusColor(status: string, theme: any): string {
  switch (status) {
    case 'completed':
      return `${theme.success}30`;
    case 'active':
      return `${theme.info}30`;
    case 'paused':
      return `${theme.warning}30`;
    default:
      return theme.backgroundTertiary;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  exportBtn: { padding: 8, borderRadius: 8, backgroundColor: '#eef2ff' },

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

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeItem: { width: '47%', padding: 12, borderRadius: 12, alignItems: 'center', position: 'relative' },
  badgeIcon: { fontSize: 32, marginBottom: 8, textAlign: 'center' },
  badgeIconLocked: { opacity: 0.4 },
  badgeName: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  badgeDesc: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  badgeEarned: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  badgeEarnedText: { fontSize: 12, fontWeight: 'bold' },
});
