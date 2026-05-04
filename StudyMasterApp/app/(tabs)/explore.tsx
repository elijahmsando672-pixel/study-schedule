import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { Calendar, Clock, Zap } from 'lucide-react-native';
import { useStore } from '@/store/useStore';
import { useAppTheme } from '@/hooks/use-app-theme';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ScheduleScreen() {
  const { scheduleSlots, subjects, tasks, loadScheduleSlots, loadTasks, isLoading } = useStore();
  const theme = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [showPlan, setShowPlan] = useState(false);
  const [planSuggestions, setPlanSuggestions] = useState<any[]>([]);

  useEffect(() => {
    loadScheduleSlots();
    loadTasks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([loadScheduleSlots(), loadTasks()]).then(() => setRefreshing(false));
  };

  const getSlotsForDay = (day: number) => {
    return scheduleSlots.filter(s => s.dayOfWeek === day && s.isActive);
  };

  const getTodayDate = (dayOffset: number) => {
    const today = new Date().getDay();
    const d = new Date();
    d.setDate(d.getDate() + (dayOffset - today));
    return d.getDate().toString();
  };

  const generatePlan = () => {
    const suggestions: any[] = [];
    const today = new Date();

    // Get pending tasks
    const pendingTasks = tasks.filter(t => t.status === 'pending');

    // Generate suggestions based on pending tasks
    pendingTasks.forEach(task => {
      const subject = subjects.find(s => s.id === task.subjectId) || subjects[0];
      if (!subject) return;

      suggestions.push({
        type: 'task',
        title: task.title,
        subjectName: subject.name || 'Unknown',
        subjectColor: subject.color || theme.primary,
        suggestedTime: task.time || '18:00',
        date: task.date || today.toISOString().split('T')[0],
        reason: `Complete pending task: ${task.title}`,
        duration: task.duration || 60,
      });
    });

    // Find empty slots in schedule for next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];
      const slotsForDay = scheduleSlots.filter(s => s.dayOfWeek === dayOfWeek && s.isActive);

      if (slotsForDay.length === 0 && subjects.length > 0) {
        // Entire day is free - suggest study sessions
        const targetHoursMap: Record<string, number> = {};
        subjects.forEach(s => { targetHoursMap[s.id] = s.targetHours || 10; });

        const currentHoursMap: Record<string, number> = {};
        tasks.filter(t => t.status === 'completed').forEach(t => {
          currentHoursMap[t.subjectId] = (currentHoursMap[t.subjectId] || 0) + (t.duration || 0) / 60;
        });

        let bestSubject = subjects[0];
        let maxGap = 0;
        subjects.forEach(s => {
          const gap = (targetHoursMap[s.id] || 10) - (currentHoursMap[s.id] || 0);
          if (gap > maxGap) { maxGap = gap; bestSubject = s; }
        });

        if (bestSubject && maxGap > 0) {
          suggestions.push({
            type: 'slot',
            subjectName: bestSubject.name || 'Unknown',
            subjectColor: bestSubject.color || theme.primary,
            suggestedTime: '18:00',
            date: dateStr,
            reason: `Fill free ${DAY_NAMES[dayOfWeek]} with ${bestSubject.name} (${Math.round(maxGap)}h remaining)`,
            duration: 60,
          });
        }
      }
    }

    setPlanSuggestions(suggestions);
    setShowPlan(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Calendar size={24} color={theme.primary} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>Weekly Schedule</Text>
        </View>
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: theme.primary }]}
          onPress={generatePlan}
        >
          <Zap size={16} color="#fff" />
          <Text style={styles.generateBtnText}>Generate Plan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector} contentContainerStyle={styles.daySelectorContent}>
        {DAY_NAMES.map((day, i) => {
          const isActive = i === selectedDay;
          const slots = getSlotsForDay(i);
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dayBtn, isActive && { backgroundColor: theme.primary, borderColor: theme.primary }]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[styles.dayName, isActive && { color: '#fff' }]}>{day}</Text>
              <Text style={[styles.dayDate, isActive && { color: '#fff' }]}>{getTodayDate(i)}</Text>
              {slots.length > 0 && (
                <View style={[styles.dot, { backgroundColor: isActive ? '#fff' : theme.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scheduleList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading && scheduleSlots.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ color: theme.textSecondary }}>Loading...</Text>
          </View>
        ) : getSlotsForDay(selectedDay).length === 0 ? (
          <View style={styles.empty}>
            <Clock size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No classes scheduled</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {DAY_NAMES[selectedDay]} is free! Use this time for self-study or rest.
            </Text>
          </View>
        ) : (
          <View style={styles.slotList}>
            {getSlotsForDay(selectedDay).map((slot) => (
              <View
                key={slot.id}
                style={[styles.slotCard, { backgroundColor: theme.backgroundSecondary, borderLeftColor: slot.subjectColor || theme.primary }]}
              >
                <View style={[styles.slotColor, { backgroundColor: slot.subjectColor || theme.primary }]} />
                <View style={styles.slotInfo}>
                  <Text style={[styles.slotSubject, { color: theme.text }]}>{slot.subjectName || 'Unknown'}</Text>
                  <View style={styles.slotTimeRow}>
                    <Clock size={14} color={theme.textSecondary} />
                    <Text style={[styles.slotTime, { color: theme.textSecondary }]}>{slot.startTime} - {slot.endTime}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.overviewSection}>
          <Text style={[styles.overviewTitle, { color: theme.text }]}>Week Overview</Text>
          {DAY_NAMES.map((day, i) => {
            const slots = getSlotsForDay(i);
            if (slots.length === 0) return null;
            return (
              <View key={i} style={styles.overviewRow}>
                <Text style={[styles.overviewDay, { color: theme.textSecondary }]}>{day}</Text>
                <View style={styles.overviewSlots}>
                  {slots.map(slot => (
                    <View key={slot.id} style={[styles.overviewSlot, { backgroundColor: (slot.subjectColor || theme.primary) + '20' }]}>
                      <Text style={[styles.overviewSlotText, { color: slot.subjectColor || theme.primary }]}>
                        {slot.subjectName} ({slot.startTime}-{slot.endTime})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {showPlan && planSuggestions.length > 0 && (
          <View style={styles.planSection}>
            <Text style={[styles.overviewTitle, { color: theme.text }]}>Generated Plan</Text>
            {planSuggestions.map((suggestion, index) => (
              <View key={index} style={[styles.planCard, { backgroundColor: theme.backgroundSecondary, borderLeftColor: suggestion.subjectColor }]}>
                <View style={[styles.planColor, { backgroundColor: suggestion.subjectColor }]} />
                <View style={styles.planInfo}>
                  <Text style={[styles.planTitle, { color: theme.text }]}>{suggestion.title || suggestion.subjectName}</Text>
                  <Text style={[styles.planReason, { color: theme.textSecondary }]}>{suggestion.reason}</Text>
                  <View style={styles.planMeta}>
                    <Text style={[styles.planTime, { color: theme.textTertiary }]}>{suggestion.date} at {suggestion.suggestedTime}</Text>
                    <Text style={[styles.planDuration, { color: theme.textTertiary }]}>{suggestion.duration} min</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 20, paddingTop: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  daySelector: { maxHeight: 80 },
  daySelectorContent: { paddingHorizontal: 16, gap: 8 },
  dayBtn: { width: 52, padding: 8, borderRadius: 12, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  dayName: { fontSize: 12, color: '#64748b', fontWeight: 500 },
  dayDate: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  scheduleList: { flex: 1 },
  slotList: { padding: 16, gap: 12 },
  slotCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderLeftWidth: 4 },
  slotColor: { width: 8, height: 40, borderRadius: 4, marginRight: 12 },
  slotInfo: { flex: 1 },
  slotSubject: { fontSize: 16, fontWeight: 600 },
  slotTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  slotTime: { fontSize: 14 },
  empty: { alignItems: 'center', padding: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 600, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  overviewSection: { padding: 16, paddingTop: 0, gap: 12 },
  overviewTitle: { fontSize: 16, fontWeight: 600, marginBottom: 8 },
  overviewRow: { gap: 6 },
  overviewDay: { fontSize: 13, fontWeight: 600 },
  overviewSlots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 8 },
  overviewSlot: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  overviewSlotText: { fontSize: 12, fontWeight: 500 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  generateBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  planSection: { padding: 16, gap: 12 },
  planCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderLeftWidth: 4 },
  planColor: { width: 8, height: 40, borderRadius: 4, marginRight: 12 },
  planInfo: { flex: 1 },
  planTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  planReason: { fontSize: 12, marginBottom: 4 },
  planMeta: { flexDirection: 'row', gap: 12 },
  planTime: { fontSize: 11 },
  planDuration: { fontSize: 11 },
});
