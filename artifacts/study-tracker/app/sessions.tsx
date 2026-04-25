import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newSession, setNewSession] = useState({ subjectId: '', duration: '30', date: new Date().toISOString().split('T')[0], notes: '' });

  useEffect(() => {
    fetchSessions();
    fetchSubjects();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/sessions');
      const data = await res.json();
      setSessions(data);
    } catch (e) {
      setSessions([]);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/subjects');
      const data = await res.json();
      setSubjects(data);
    } catch (e) {
      setSubjects([]);
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.subjectId) return Alert.alert('Error', 'Subject is required');
    try {
      await fetch('http://localhost:3001/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: parseInt(newSession.subjectId),
          duration: parseInt(newSession.duration),
          date: newSession.date,
          notes: newSession.notes,
        }),
      });
      fetchSessions();
      setShowModal(false);
      setNewSession({ subjectId: '', duration: '30', date: new Date().toISOString().split('T')[0], notes: '' });
    } catch (e) {
      Alert.alert('Error', 'Failed to create session');
    }
  };

  const handleDeleteSession = async (id: number) => {
    try {
      await fetch(`http://localhost:3001/api/sessions/${id}`, { method: 'DELETE' });
      fetchSessions();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete session');
    }
  };

  const renderSession = ({ item }: any) => (
    <View style={styles.sessionCard}>
      <View style={[styles.colorDot, { backgroundColor: item.subjectColor || '#6366F1' }]} />
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionSubject}>{item.subjectName || `Subject #${item.subjectId}`}</Text>
        <Text style={styles.sessionMeta}>{item.date} • {item.duration} min</Text>
        {item.notes && <Text style={styles.sessionNotes}>{item.notes}</Text>}
      </View>
      <TouchableOpacity onPress={() => handleDeleteSession(item.id)}>
        <Text style={styles.deleteBtn}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sessions</Text>
      <Text style={styles.subtitle}>Your study session log</Text>

      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item: any) => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No sessions yet. Log one!</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Log Session</Text>

            <Text style={styles.label}>Subject</Text>
            <View style={styles.subjectPicker}>
              {subjects.map((subj) => (
                <TouchableOpacity
                  key={subj.id}
                  style={[styles.subjectBtn, newSession.subjectId === subj.id.toString() && styles.subjectBtnActive]}
                  onPress={() => setNewSession({ ...newSession, subjectId: subj.id.toString() })}
                >
                  <Text style={[styles.subjectBtnText, newSession.subjectId === subj.id.toString() && styles.subjectBtnTextActive]}>
                    {subj.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Duration (min)"
              value={newSession.duration}
              onChangeText={(text) => setNewSession({ ...newSession, duration: text })}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              value={newSession.date}
              onChangeText={(text) => setNewSession({ ...newSession, date: text })}
            />
            <TextInput
              style={styles.textArea}
              placeholder="Notes (optional)"
              value={newSession.notes}
              onChangeText={(text) => setNewSession({ ...newSession, notes: text })}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateSession}>
                <Text style={styles.saveText}>Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#f8fafc', minHeight: '100vh' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 20 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  sessionInfo: { flex: 1 },
  sessionSubject: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  sessionMeta: { fontSize: 14, color: '#64748B', marginTop: 2 },
  sessionNotes: { fontSize: 14, color: '#94A3B8', marginTop: 4, fontStyle: 'italic' },
  deleteBtn: { fontSize: 16, padding: 8 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  fabText: { fontSize: 28, color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  label: { fontSize: 14, color: '#64748B', marginBottom: 8 },
  subjectPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  subjectBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9' },
  subjectBtnActive: { backgroundColor: '#6366F1' },
  subjectBtnText: { fontSize: 14, color: '#64748B' },
  subjectBtnTextActive: { color: '#fff' },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12 },
  textArea: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, fontSize: 16, minHeight: 80, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#E2E8F0', alignItems: 'center' },
  cancelText: { color: '#64748B', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});