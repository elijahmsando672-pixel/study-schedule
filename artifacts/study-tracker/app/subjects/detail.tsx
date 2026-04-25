import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function SubjectDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [subject, setSubject] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [studyGuide, setStudyGuide] = useState('');

  useEffect(() => {
    fetchSubject();
    fetchSessions();
  }, [id]);

  const fetchSubject = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/subjects/${id}`);
      const data = await res.json();
      setSubject(data);
      setStudyGuide(data.studyGuide || '');
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/sessions?subjectId=${id}`);
      const data = await res.json();
      setSessions(data.slice(0, 5));
    } catch (e) {
      setSessions([]);
    }
  };

  const handleSaveGuide = async () => {
    try {
      await fetch(`http://localhost:3001/api/subjects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyGuide }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (!subject) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.colorBadge, { backgroundColor: subject.color }]} />
        <Text style={styles.title}>{subject.name}</Text>
        <Text style={styles.target}>Target: {subject.targetHours}h</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Study Guide</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Write your study guide here..."
          value={studyGuide}
          onChangeText={setStudyGuide}
          multiline
          numberOfLines={6}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGuide}>
          <Text style={styles.saveBtnText}>Save Guide</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions yet</Text>
        ) : (
          sessions.map((session: any) => (
            <View key={session.id} style={styles.sessionItem}>
              <Text style={styles.sessionDate}>{session.date}</Text>
              <Text style={styles.sessionDuration}>{session.duration} min</Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>← Back to Subjects</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { alignItems: 'center', marginBottom: 24, paddingTop: 20 },
  colorBadge: { width: 60, height: 60, borderRadius: 30, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  target: { fontSize: 16, color: '#64748B' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginBottom: 12 },
  textArea: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, fontSize: 16, minHeight: 120, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#6366F1', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  sessionItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sessionDate: { flex: 1, fontSize: 14, color: '#64748B' },
  sessionDuration: { fontSize: 14, color: '#1E293B' },
  emptyText: { color: '#94A3B8', fontSize: 14 },
  backBtn: { backgroundColor: '#E2E8F0', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  backBtnText: { color: '#64748B', fontWeight: '600' },
});