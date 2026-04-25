import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [newTask, setNewTask] = useState({
    title: '',
    subject: '',
    duration: '60',
    priority: 'medium',
    date: '',
    time: '',
  });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('studyTasks') || '[]');
    setTasks(saved);
  }, []);

  const saveTasks = (newTasks) => {
    setTasks(newTasks);
    localStorage.setItem('studyTasks', JSON.stringify(newTasks));
  };

  const addTask = () => {
    if (!newTask.title.trim()) return Alert.alert('Error', 'Title is required');
    const task = {
      id: Date.now(),
      title: newTask.title,
      subject: newTask.subject || 'General',
      duration: parseInt(newTask.duration),
      priority: newTask.priority,
      date: newTask.date || new Date().toISOString().split('T')[0],
      time: newTask.time || '',
      completed: false,
    };
    saveTasks([...tasks, task]);
    setNewTask({ title: '', subject: '', duration: '60', priority: 'medium', date: '', time: '' });
    setShowModal(false);
  };

  const toggleComplete = (id) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks(newTasks);
  };

  const deleteTask = (id) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => saveTasks(tasks.filter(t => t.id !== id)) },
    ]);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'completed') return task.completed;
    if (filter === 'pending') return !task.completed;
    return true;
  });

  const renderTask = ({ item }) => (
    <View style={[styles.taskCard, { borderLeftColor: PRIORITY_COLORS[item.priority] }]}>
      <TouchableOpacity 
        style={styles.taskMain}
        onPress={() => router.push('/study')}
      >
        <TouchableOpacity onPress={() => toggleComplete(item.id)} style={styles.checkBtn}>
          <Text style={styles.checkIcon}>{item.completed ? '✅' : '⬜'}</Text>
        </TouchableOpacity>
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, item.completed && styles.completedTitle]}>{item.title}</Text>
          <View style={styles.taskMeta}>
            <Text style={[styles.subjectBadge, { color: PRIORITY_COLORS[item.priority] }]}>
              {item.subject}
            </Text>
            <Text style={styles.priorityBadge}>{item.priority}</Text>
            {item.time && <Text style={styles.timeText}>🕒 {item.time}</Text>}
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => deleteTask(item.id)}>
            <Text>🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {['all', 'pending', 'completed'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No tasks yet. Add one!</Text>}
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Add Task</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Task title *"
                value={newTask.title}
                onChangeText={(text) => setNewTask({ ...newTask, title: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Subject (e.g., SQL, Python)"
                value={newTask.subject}
                onChangeText={(text) => setNewTask({ ...newTask, subject: text })}
              />
              
              <View style={styles.selectGroup}>
                <Text style={styles.label}>Duration</Text>
                <View style={styles.selectRow}>
                  {['15', '30', '45', '60', '90', '120'].map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.selectBtn, newTask.duration === d && styles.selectBtnActive]}
                      onPress={() => setNewTask({ ...newTask, duration: d })}
                    >
                      <Text style={[styles.selectText, newTask.duration === d && styles.selectTextActive]}>
                        {d}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.priorityRow}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityBtns}>
                  {['low', 'medium', 'high'].map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.priorityBtn, { borderColor: PRIORITY_COLORS[p] }, newTask.priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]}
                      onPress={() => setNewTask({ ...newTask, priority: p })}
                    >
                      <Text style={[styles.priorityText, newTask.priority === p && styles.priorityTextActive]}>
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Date (YYYY-MM-DD)"
                value={newTask.date}
                onChangeText={(text) => setNewTask({ ...newTask, date: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Time (HH:MM)"
                value={newTask.time}
                onChangeText={(text) => setNewTask({ ...newTask, time: text })}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={addTask}>
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 60, paddingHorizontal: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E2E8F0' },
  filterBtnActive: { backgroundColor: '#6366F1' },
  filterText: { fontSize: 14, color: '#64748B' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingBottom: 100 },
  taskCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginBottom: 12, 
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  taskMain: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  checkBtn: { marginRight: 12 },
  checkIcon: { fontSize: 20 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  completedTitle: { textDecorationLine: 'line-through', color: '#94A3B8' },
  taskMeta: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  subjectBadge: { fontSize: 12, fontWeight: '600' },
  priorityBadge: { fontSize: 12, color: '#94A3B8' },
  timeText: { fontSize: 12, color: '#94A3B8' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 8 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  fab: { 
    position: 'absolute', 
    bottom: 24, 
    right: 24, 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#6366F1', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: { fontSize: 28, color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 20 },
  input: { 
    backgroundColor: '#F1F5F9', 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 16, 
    marginBottom: 12,
  },
  label: { fontSize: 14, color: '#64748B', marginBottom: 8 },
  selectGroup: { marginBottom: 12 },
  selectRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  selectBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9' },
  selectBtnActive: { backgroundColor: '#6366F1' },
  selectText: { fontSize: 14, color: '#64748B' },
  selectTextActive: { color: '#fff' },
  priorityRow: { marginBottom: 12 },
  priorityBtns: { flexDirection: 'row', gap: 8 },
  priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 2, alignItems: 'center' },
  priorityText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  priorityTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#E2E8F0', alignItems: 'center' },
  cancelText: { color: '#64748B', fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});