import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, BookOpen, Edit, Trash2, Palette as PaletteIcon } from 'lucide-react-native';
import { useStore } from '@/store/useStore';
import { Subject } from '@/types';

const COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6',
];

export default function SubjectsScreen() {
  const router = useRouter();
  const { subjects, loadSubjects, addSubject, updateSubject, deleteSubject } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [targetHours, setTargetHours] = useState('10');
  const [studyGuide, setStudyGuide] = useState('');

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Subject name is required');
      return;
    }

    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, {
          name: name.trim(),
          color,
          targetHours: parseInt(targetHours) || 10,
          studyGuide: studyGuide.trim() || undefined,
        });
        Alert.alert('Success', 'Subject updated!');
      } else {
        await addSubject({
          name: name.trim(),
          color,
          targetHours: parseInt(targetHours) || 10,
          studyGuide: studyGuide.trim() || undefined,
        });
        Alert.alert('Success', 'Subject created!');
      }
      resetForm();
    } catch (error) {
      console.error('Error saving subject:', error);
      Alert.alert('Error', 'Failed to save subject');
    }
  };

  const handleDelete = (subject: Subject) => {
    Alert.alert(
      'Delete Subject',
      `Are you sure you want to delete "${subject.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSubject(subject.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete subject');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setName(subject.name);
    setColor(subject.color);
    setTargetHours(subject.targetHours.toString());
    setStudyGuide(subject.studyGuide || '');
    setShowModal(true);
  };

  const resetForm = () => {
    setName('');
    setColor(COLORS[0]);
    setTargetHours('10');
    setStudyGuide('');
    setEditingSubject(null);
    setShowModal(false);
  };

  const getProgress = (subjectId: number) => {
    const store = useStore.getState();
    const subjectSessions = store.sessions.filter(s => s.subjectId === subjectId);
    const totalMinutes = subjectSessions.reduce((acc, s) => acc + s.duration, 0);
    const subject = subjects.find(s => s.id === subjectId);
    const targetMinutes = (subject?.targetHours || 10) * 60;
    return targetMinutes > 0 ? Math.min(100, Math.round((totalMinutes / targetMinutes) * 100)) : 0;
  };

  if (subjects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <BookOpen size={64} color="#94a3b8" />
        <Text style={styles.emptyTitle}>No subjects yet</Text>
        <Text style={styles.emptyText}>
          Create subjects to organize your study tasks and track progress per topic.
        </Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowModal(true)}>
          <Plus size={20} color="#fff" />
          <Text style={styles.emptyBtnText}>Add First Subject</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Subjects</Text>
          <Text style={styles.subtitle}>{subjects.length} active subjects</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {subjects.map((subject) => {
          const progress = getProgress(subject.id);

          return (
            <View key={subject.id} style={styles.card}>
              <View style={[styles.cardHeader, { backgroundColor: subject.color }]}>
                <View style={styles.colorInfo}>
                  <PaletteIcon size={20} color="#fff" />
                  <Text style={styles.colorName}>{subject.name.slice(0, 10)}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{subject.name}</Text>

                <View style={styles.cardMeta}>
                  <Text style={styles.metaItem}>Goal: {subject.targetHours}h/week</Text>
                  <Text style={styles.metaItem}>{progress}% complete</Text>
                </View>

                {subject.studyGuide && (
                  <Text style={styles.guideText} numberOfLines={2}>
                    📝 {subject.studyGuide}
                  </Text>
                )}

                <View style={styles.progressContainer}>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress}%`, backgroundColor: subject.color },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(subject)}>
                    <Edit size={16} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(subject)}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSubject ? 'Edit Subject' : 'New Subject'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mathematics"
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Weekly Goal (hours)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  value={targetHours}
                  onChangeText={setTargetHours}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Color</Text>
                <View style={styles.colorGrid}>
                  {COLORS.map((c) => (
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
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Study Guide (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add study notes, resources, tips..."
                  value={studyGuide}
                  onChangeText={setStudyGuide}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, !name && styles.saveBtnDisabled]}
                  onPress={handleCreate}
                  disabled={!name}
                >
                  <Text style={styles.saveBtnText}>{editingSubject ? 'Update' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0f172a', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '600' },

  grid: { padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  cardHeader: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  colorInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorName: { fontSize: 12, fontWeight: '600', color: '#fff' },

  cardBody: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metaItem: { fontSize: 12, color: '#64748b' },
  guideText: { fontSize: 12, color: '#64748b', marginBottom: 12, fontStyle: 'italic' },

  progressContainer: { marginTop: 8 },
  progressBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  editBtn: { padding: 6, borderRadius: 4, backgroundColor: '#dbeafe' },
  deleteBtn: { padding: 6, borderRadius: 4, backgroundColor: '#fee2e2' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f172a', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90vh' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  closeBtn: { fontSize: 24, color: '#64748b' },

  modalBody: { padding: 20 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'transparent' },
  colorBtnActive: { borderColor: '#0f172a' },

  modalActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#fff' },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#0f172a', alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#94a3b8' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
