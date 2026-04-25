import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, Target, Edit2, Save, X } from 'lucide-react-native';
import { useStore } from '@/store/useStore';
import { dbService } from '@/services/database';
import { Subject } from '@/types';

export default function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { subjects, sessions, loadSubjects, loadSessions, updateSubject } = useStore();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [studyGuide, setStudyGuide] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const subjectId = parseInt(id);

  useEffect(() => {
    loadData();
  }, [subjectId]);

  const loadData = async () => {
    // Find subject from store
    const found = subjects.find((s) => s.id === subjectId);
    if (found) {
      setSubject(found);
      setStudyGuide(found.studyGuide || '');
    }

    // Also load sessions for this subject
    await loadSessions({ subjectId });
  };

  const handleSaveGuide = async () => {
    if (!subject) return;

    try {
      await updateSubject(subject.id, { studyGuide: studyGuide.trim() || undefined });
      Alert.alert('Success', 'Study guide saved!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving guide:', error);
      Alert.alert('Error', 'Failed to save study guide');
    }
  };

  const getSessionsForSubject = () => {
    return sessions.filter((s) => s.subjectId === subjectId);
  };

  const totalMinutes = getSessionsForSubject().reduce((acc, s) => acc + s.duration, 0);
  const targetMinutes = subject ? subject.targetHours * 60 : 0;
  const progress = targetMinutes > 0 ? Math.min(100, Math.round((totalMinutes / targetMinutes) * 100)) : 0;

  if (!subject) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>Subject Details</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => (isEditing ? handleSaveGuide() : setIsEditing(true))}
        >
          {isEditing ? <Save size={20} color="#0f172a" /> : <Edit2 size={20} color="#0f172a" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Subject Card */}
        <View style={styles.card}>
          <View style={[styles.colorBar, { backgroundColor: subject.color }]} />
          <View style={styles.cardHeader}>
            <Text style={styles.subjectName}>{subject.name}</Text>
            <View style={[styles.badge, { backgroundColor: subject.color + '20', borderColor: subject.color }]}>
              <Target size={14} color={subject.color} />
              <Text style={[styles.badgeText, { color: subject.color }]}>
                {subject.targetHours}h/week
              </Text>
            </View>
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Progress This Week</Text>
              <Text style={styles.progressValue}>{progress}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%`, backgroundColor: subject.color },
                ]}
              />
            </View>
            <Text style={styles.progressMeta}>
              {Math.round(totalMinutes / 60)}h / {subject.targetHours}h
            </Text>
          </View>
        </View>

        {/* Study Guide */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Study Guide</Text>
          {isEditing ? (
            <>
              <TextInput
                style={[styles.textArea, styles.guideInput]}
                placeholder="Add your study notes, resources, tips..."
                value={studyGuide}
                onChangeText={setStudyGuide}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
              <View style={styles.guideActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setStudyGuide(subject.studyGuide || '');
                    setIsEditing(false);
                  }}
                >
                  <X size={16} color="#64748b" />
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.guideText}>
              {subject.studyGuide || 'No study guide yet. Tap edit to add one.'}
            </Text>
          )}
        </View>

        {/* Recent Sessions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Sessions</Text>
          {getSessionsForSubject().length > 0 ? (
            getSessionsForSubject()
              .slice(0, 10)
              .map((session) => (
                <View key={session.id} style={styles.sessionItem}>
                  <View style={[styles.sessionDot, { backgroundColor: subject.color }]} />
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDate}>
                      {new Date(session.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.sessionDuration}>{session.duration} minutes</Text>
                    {session.notes && <Text style={styles.sessionNotes}>{session.notes}</Text>}
                  </View>
                </View>
              ))
          ) : (
            <Text style={styles.emptyText}>No sessions recorded yet. Start studying!</Text>
          )}
        </View>

        {/* Quick Actions */}
        <TouchableOpacity
          style={styles.dangerBtn}
          onPress={() => {
            Alert.alert('Delete Subject', `Delete "${subject.name}"? This will delete all related data.`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await updateSubject(subject.id, { name: `[DELETED] ${subject.name}` });
                  // Or fully delete from DB if needed
                  router.back();
                },
              },
            ]);
          }}
        >
          <Text style={styles.dangerBtnText}>Delete Subject</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  editBtn: { padding: 4 },

  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  colorBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  subjectName: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },

  progressSection: { marginTop: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressTitle: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  progressValue: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  progressBar: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressMeta: { fontSize: 13, color: '#64748b', marginTop: 6, textAlign: 'center' },

  cardTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  guideInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  guideText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  guideActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
  cancelBtnText: { color: '#64748b', fontWeight: '500' },

  sessionItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sessionDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, marginTop: 4 },
  sessionInfo: { flex: 1 },
  sessionDate: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  sessionDuration: { fontSize: 13, color: '#64748b' },
  sessionNotes: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },

  dangerBtn: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerBtnText: { color: '#ef4444', fontWeight: '600' },
});
