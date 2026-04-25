import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, BookOpen } from 'lucide-react';

const COLORS = ['#c2410c', '#b45309', '#65a30d', '#0e7490', '#7c3aed', '#be185d', '#1f2937', '#0891b2'];

export default function Subjects() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [goal, setGoal] = useState('120');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/subjects');
      const data = await res.json();
      setSubjects(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = () => {
    if (!name) return Alert.alert('Error', 'Name is required');

    fetch('http://localhost:3001/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        color,
        targetHours: parseInt(goal) || 0,
      }),
    })
      .then(() => {
        fetchSubjects();
        setShowModal(false);
        setName('');
        setColor(COLORS[0]);
        setGoal('120');
      })
      .catch(() => Alert.alert('Error', 'Failed to create subject'));
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Subject', 'Are you sure? This will also delete all sessions for this subject.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          fetch(`http://localhost:3001/api/subjects/${id}`, { method: 'DELETE' })
            .then(fetchSubjects)
            .catch(() => Alert.alert('Error', 'Failed to delete subject'));
        },
      },
    ]);
  };

  if (subjects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <BookOpen size={48} style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>No subjects yet</Text>
        <Text style={styles.emptyText}>
          Create a subject to start tracking your study sessions and setting weekly goals.
        </Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.emptyBtnText}>Add your first subject</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Subjects</Text>
          <Text style={styles.subtitle}>Manage your learning tracks</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Plus size={18} /> <Text style={styles.addBtnText}>New Subject</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {subjects.map(subject => (
          <TouchableOpacity
            key={subject.id}
            style={styles.card}
            onPress={() => router.push(`/subjects/${subject.id}`)}
          >
            <View style={[styles.cardTop, { backgroundColor: subject.color }]} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{subject.name}</Text>
              <Text style={styles.cardGoal}>Goal: {subject.targetHours} mins/week</Text>
              <Text style={styles.cardGuide} numberOfLines={3}>
                {subject.studyGuide || 'No study guide notes yet.'}
              </Text>
              <TouchableOpacity
                style={styles.openBtn}
                onPress={() => router.push(`/subjects/${subject.id}`)}
              >
                <Text style={styles.openBtnText}>Open Subject</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Create New Subject</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Calculus"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Color</Text>
            <View style={styles.colorPicker}>
              {COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorBtn,
                    { backgroundColor: c },
                    color === c && styles.colorBtnActive,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <Text style={styles.label}>Weekly goal (minutes)</Text>
            <TextInput
              style={styles.input}
              placeholder="120"
              value={goal}
              onChangeText={setGoal}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.saveBtn, !name && styles.saveBtnDisabled]}
              onPress={handleCreate}
              disabled={!name}
            >
              <Text style={styles.saveBtnText}>Create Subject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#f8fafc', minHeight: '100vh' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f172a', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { width: '31%', minWidth: 200, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  cardTop: { height: 8 },
  cardContent: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  cardGoal: { fontSize: 14, color: '#64748b', fontWeight: '500', marginBottom: 8 },
  cardGuide: { fontSize: 14, color: '#64748b', marginBottom: 12, lineHeight: 20 },
  openBtn: { backgroundColor: '#f1f5f9', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  openBtnText: { color: '#0f172a', fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { color: '#94a3b8', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20, maxWidth: 300 },
  emptyBtn: { borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  emptyBtnText: { color: '#0f172a', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8, marginTop: 12 },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  colorBtn: { width: 32, height: 32, borderRadius: 16 },
  colorBtnActive: { borderWidth: 3, borderColor: '#0f172a' },
  input: { height: 40, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, paddingHorizontal: 12, backgroundColor: '#fff' },
  saveBtn: { backgroundColor: '#0f172a', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { backgroundColor: '#94a3b8' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  cancelBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
});