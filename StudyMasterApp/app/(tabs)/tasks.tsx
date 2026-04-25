import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle, Plus, Clock, Calendar, Target, Flame, BarChart3, Edit, Trash2 } from 'lucide-react-native';
import { useStore } from '@/store/useStore';
import { dbService } from '@/services/database';
import { Priority, TaskStatus } from '@/types';

export default function TasksScreen() {
  const router = useRouter();
  const {
    tasks,
    subjects,
    loadTasks,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
  } = useStore();

  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'high'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    subjectId: '',
    duration: '60',
    priority: 'medium' as Priority,
    date: new Date().toISOString().split('T')[0],
    time: '',
    notes: '',
    reminder: '',
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      await addTask({
        title: newTask.title,
        description: newTask.description,
        subjectId: newTask.subjectId ? parseInt(newTask.subjectId) : undefined,
        duration: parseInt(newTask.duration),
        priority: newTask.priority,
        status: 'pending',
        date: newTask.date,
        time: newTask.time || undefined,
        notes: newTask.notes || undefined,
      });

      resetForm();
      Alert.alert('Success', 'Task created!');
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task');
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      await updateTask(editingTask.id, {
        title: newTask.title,
        description: newTask.description,
        subjectId: newTask.subjectId ? parseInt(newTask.subjectId) : undefined,
        duration: parseInt(newTask.duration),
        priority: newTask.priority,
        date: newTask.date,
        time: newTask.time || undefined,
        notes: newTask.notes || undefined,
      });

      setEditingTask(null);
      resetForm();
      Alert.alert('Success', 'Task updated!');
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await completeTask(id);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(id);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete task');
          }
        },
      },
    ]);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      subjectId: task.subjectId?.toString() || '',
      duration: task.duration.toString(),
      priority: task.priority,
      date: task.date,
      time: task.time || '',
      notes: task.notes || '',
      reminder: task.reminder || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setNewTask({
      title: '',
      description: '',
      subjectId: '',
      duration: '60',
      priority: 'medium',
      date: new Date().toISOString().split('T')[0],
      time: '',
      notes: '',
      reminder: '',
    });
    setShowModal(false);
  };

  const filteredTasks = tasks.filter((task) => {
    switch (filter) {
      case 'pending':
        return task.status === 'pending' || task.status === 'in-progress';
      case 'completed':
        return task.status === 'completed';
      case 'high':
        return task.priority === 'high' && task.status !== 'completed';
      default:
        return true;
    }
  });

  const getSubject = (id?: number) => subjects.find((s) => s.id === id);

  const priorityColors: Record<Priority, string> = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
  };

  const renderTask = ({ item: task }: { item: any }) => {
    const subject = getSubject(task.subjectId);
    const isCompleted = task.status === 'completed';

    return (
      <View style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}>
        <View style={styles.taskMain}>
          <TouchableOpacity
            style={styles.checkBtn}
            onPress={() => handleComplete(task.id)}
          >
            <CheckCircle
              size={24}
              color={isCompleted ? '#22c55e' : '#d1d5db'}
              fill={isCompleted ? '#22c55e' : 'transparent'}
            />
          </TouchableOpacity>

          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}>
              {task.title}
            </Text>
            <View style={styles.taskMeta}>
              {subject && (
                <View style={[styles.subjectBadge, { backgroundColor: subject.color + '20' }]}>
                  <Text style={[styles.subjectBadgeText, { color: subject.color }]}>
                    {subject.name}
                  </Text>
                </View>
              )}
              <View style={[styles.priorityBadge, { backgroundColor: priorityColors[task.priority] }]}>
                <Text style={styles.priorityBadgeText}>{task.priority}</Text>
              </View>
              {task.time && (
                <View style={styles.metaItem}>
                  <Clock size={12} color="#64748b" />
                  <Text style={styles.metaText}>{task.time}</Text>
                </View>
              )}
              {task.date && (
                <View style={styles.metaItem}>
                  <Calendar size={12} color="#64748b" />
                  <Text style={styles.metaText}>{task.date}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.taskDuration}>
            <Clock size={14} color="#64748b" />
            <Text style={styles.durationText}>{task.duration}m</Text>
          </View>

          <View style={styles.taskActions}>
            {!isCompleted && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnStart]}
                onPress={() => handleComplete(task.id)}
                title="Mark as started"
              >
                <Target size={14} color="#22c55e" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnEdit]}
              onPress={() => handleEdit(task)}
            >
              <Edit size={14} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDelete]}
              onPress={() => handleDelete(task.id)}
            >
              <Trash2 size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const totalHours = tasks.reduce((acc, task) => {
    return acc + (task.status === 'completed' ? task.duration : 0);
  }, 0) / 60;

  const completionRate =
    tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tasks</Text>
          <Text style={styles.subtitle}>Manage your study tasks</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>New Task</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{tasks.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{tasks.filter((t) => t.status === 'completed').length}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalHours.toFixed(1)}h</Text>
          <Text style={styles.statLabel}>Studied</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{completionRate}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {(['all', 'pending', 'completed', 'high'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.taskList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Target size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptyText}>
              Create your first task to start tracking your study progress.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={styles.emptyBtnText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Edit Task' : 'New Task'}
              </Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setEditingTask(null); }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What do you want to study?"
                  value={newTask.title}
                  onChangeText={(text) => setNewTask({ ...newTask, title: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add a description..."
                  value={newTask.description}
                  onChangeText={(text) => setNewTask({ ...newTask, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Subject</Text>
                  <View style={styles.subjectList}>
                    {subjects.map((subject) => (
                      <TouchableOpacity
                        key={subject.id}
                        style={[
                          styles.subjectItem,
                          newTask.subjectId === subject.id.toString() && styles.subjectItemActive,
                        ]}
                        onPress={() => setNewTask({ ...newTask, subjectId: subject.id.toString() })}
                      >
                        <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
                        <Text
                          style={[
                            styles.subjectItemText,
                            newTask.subjectId === subject.id.toString() && styles.subjectItemTextActive,
                          ]}
                        >
                          {subject.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Duration (min)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="60"
                    value={newTask.duration}
                    onChangeText={(text) => setNewTask({ ...newTask, duration: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityRow}>
                  {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityBtn,
                        newTask.priority === p && styles.priorityBtnActive,
                        newTask.priority === p && { backgroundColor: priorityColors[p] + '20', borderColor: priorityColors[p] },
                      ]}
                      onPress={() => setNewTask({ ...newTask, priority: p })}
                    >
                      <Text
                        style={[
                          styles.priorityBtnText,
                          newTask.priority === p && { color: priorityColors[p], fontWeight: '600' },
                        ]}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={newTask.date}
                    onChangeText={(text) => setNewTask({ ...newTask, date: text })}
                  />
                </View>

                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="HH:MM"
                    value={newTask.time}
                    onChangeText={(text) => setNewTask({ ...newTask, time: text })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any additional notes..."
                  value={newTask.notes}
                  onChangeText={(text) => setNewTask({ ...newTask, notes: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setShowModal(false); setEditingTask(null); }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, !newTask.title && styles.saveBtnDisabled]}
                  onPress={editingTask ? handleUpdateTask : handleCreateTask}
                  disabled={!newTask.title}
                >
                  <Text style={styles.saveBtnText}>{editingTask ? 'Update' : 'Create'}</Text>
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
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 60,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterBtnActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterBtnText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  filterBtnTextActive: { color: '#fff' },

  taskList: { paddingHorizontal: 20, paddingBottom: 20 },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskCardCompleted: { opacity: 0.6 },
  taskMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  checkBtn: { padding: 4 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 6 },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: '#9ca3af' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  subjectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subjectBadgeText: { fontSize: 12, fontWeight: '500' },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600', textTransform: 'uppercase' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#64748b' },
  taskDuration: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durationText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  taskActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnStart: { backgroundColor: '#dcfce7' },
  actionBtnEdit: { backgroundColor: '#dbeafe' },
  actionBtnDelete: { backgroundColor: '#fee2e2' },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#0f172a', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  emptyBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90vh',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  closeBtn: { fontSize: 24, color: '#64748b', padding: 4 },

  modalBody: { padding: 20 },
  formGroup: { marginBottom: 20 },
  formRow: { flexDirection: 'row', gap: 12 },
  halfWidth: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  subjectList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subjectItemActive: { borderColor: '#0f172a' },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  subjectItemText: { fontSize: 13, color: '#64748b' },
  subjectItemTextActive: { color: '#0f172a', fontWeight: '600' },

  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  priorityBtnActive: { borderWidth: 2 },
  priorityBtnText: { fontSize: 14, fontWeight: '500', color: '#64748b' },

  modalActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#94a3b8' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
