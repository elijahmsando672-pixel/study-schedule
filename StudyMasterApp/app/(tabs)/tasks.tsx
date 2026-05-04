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
  SafeAreaView,
  Pressable,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { CheckCircle, Plus, Clock, Calendar, Target, Flame, Edit, Trash2, Repeat, Search, X } from 'lucide-react-native';
import { useStore } from '@/store/useStore';
import { Priority, TaskStatus, RecurrencePattern } from '@/types';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function TasksScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const {
    tasks,
    subjects,
    loadTasks,
    loadSubjects,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    isLoading,
  } = useStore();

const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'high'>('all');
const [searchQuery, setSearchQuery] = useState('');
const [refreshing, setRefreshing] = useState(false);
const [groupedByDate, setGroupedByDate] = useState(false);
const [sortBy, setSortBy] = useState<'date' | 'priority' | 'created'>('date');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
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
    isRecurring: false,
    recurrencePattern: '' as RecurrencePattern | '',
    recurrenceEndDate: '',
  });

  useEffect(() => {
    loadTasks();
    loadSubjects();
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
        isRecurring: newTask.isRecurring,
        recurrencePattern: newTask.isRecurring && newTask.recurrencePattern ? newTask.recurrencePattern : null,
        recurrenceEndDate: newTask.isRecurring && newTask.recurrenceEndDate ? newTask.recurrenceEndDate : null,
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

  const handleEdit = (task: any) => {
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
      isRecurring: task.isRecurring || false,
      recurrencePattern: task.recurrencePattern || '',
      recurrenceEndDate: task.recurrenceEndDate || '',
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
      isRecurring: false,
      recurrencePattern: '',
      recurrenceEndDate: '',
    });
    setShowModal(false);
    setShowRecurrenceOptions(false);
  };

  const handleLongPressDelete = (task: any) => {
    handleDelete(task.id);
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter = (() => {
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
    })();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || task.title.toLowerCase().includes(q) || task.description?.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const filteredSorted = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'date') return (a.date || '').localeCompare(b.date || '');
    if (sortBy === 'priority') {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] || 1) - (order[b.priority] || 1);
    }
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  const today = new Date().toISOString().split('T')[0];
  const groupedTasks = groupedByDate ? {
    today: filteredSorted.filter(t => t.date === today && t.status !== 'completed'),
    upcoming: filteredSorted.filter(t => t.date > today && t.status !== 'completed'),
    overdue: filteredSorted.filter(t => t.date < today && t.status !== 'completed'),
    completed: filteredSorted.filter(t => t.status === 'completed'),
  } : null;

  const getSubject = (id?: number) => subjects.find((s) => s.id === id);

  const priorityColors: Record<Priority, string> = {
    low: theme.success,
    medium: theme.warning,
    high: theme.danger,
  };

  const renderTask = ({ item: task }: { item: any }) => {
    const subject = getSubject(task.subjectId);
    const isCompleted = task.status === 'completed';

    return (
      <Pressable
        style={[styles.taskCard, { backgroundColor: theme.backgroundSecondary }, isCompleted && { opacity: 0.6 }]}
        onLongPress={() => handleLongPressDelete(task)}
        delayLongPress={500}
      >
        <View style={styles.taskMain}>
          <TouchableOpacity
            style={styles.checkBtn}
            onPress={() => handleComplete(task.id)}
          >
            <CheckCircle
              size={24}
              color={isCompleted ? theme.success : theme.border}
              fill={isCompleted ? theme.success : 'transparent'}
            />
          </TouchableOpacity>

          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, { color: theme.text }, isCompleted && { textDecorationLine: 'line-through', color: theme.textTertiary }]}>
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
              {task.isRecurring && (
                <View style={[styles.recurringBadge, { backgroundColor: theme.primaryLight }]}>
                  <Repeat size={12} color={theme.primary} />
                  <Text style={[styles.recurringText, { color: theme.primary }]}>{task.recurrencePattern || 'recurring'}</Text>
                </View>
              )}
              {task.time && (
                <View style={styles.metaItem}>
                  <Clock size={12} color={theme.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>{task.time}</Text>
                </View>
              )}
              {task.date && (
                <View style={styles.metaItem}>
                  <Calendar size={12} color={theme.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>{task.date}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.taskDuration}>
            <Clock size={14} color={theme.textSecondary} />
            <Text style={[styles.durationText, { color: theme.textSecondary }]}>{task.duration}m</Text>
          </View>

          <View style={styles.taskActions}>
            {!isCompleted && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.successLight }]}
                onPress={() => handleComplete(task.id)}
              >
                <Target size={14} color={theme.success} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.infoLight }]}
              onPress={() => handleEdit(task)}
            >
              <Edit size={14} color={theme.info} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.dangerLight }]}
              onPress={() => handleDelete(task.id)}
            >
              <Trash2 size={14} color={theme.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    );
  };

  const totalHours = tasks.reduce((acc, task) => {
    return acc + (task.status === 'completed' ? task.duration : 0);
  }, 0) / 60;

  const completionRate =
    tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
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

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
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
        <TouchableOpacity
          style={[styles.filterBtn, groupedByDate && styles.filterBtnActive]}
          onPress={() => setGroupedByDate(!groupedByDate)}
        >
          <Text style={[styles.filterBtnText, groupedByDate && styles.filterBtnTextActive]}>Group</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sortBtn, { backgroundColor: theme.backgroundSecondary }]} onPress={() => {
          const order: ('date' | 'priority' | 'created')[] = ['date', 'priority', 'created'];
          setSortBy(order[(order.indexOf(sortBy) + 1) % 3]);
        }}>
          <Text style={styles.sortBtnText}>{sortBy === 'date' ? 'By Date' : sortBy === 'priority' ? 'By Priority' : 'By Created'}</Text>
        </TouchableOpacity>
      </View>

      {isLoading && tasks.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      )}

      {/* Task List */}
      {groupedByDate && groupedTasks ? (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks().then(() => setRefreshing(false)); }} } contentContainerStyle={styles.taskList}>
          {Object.entries(groupedTasks).map(([key, tasks]) => tasks.length > 0 && (
            <View key={key}>
              <Text style={styles.sectionHeader}>{key.charAt(0).toUpperCase() + key.slice(1)} ({tasks.length})</Text>
              {tasks.map(task => renderTask({ item: task }))}
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredSorted}
          renderItem={renderTask}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.taskList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks().then(() => setRefreshing(false)); }} />}
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
      )}

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
                  <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                    <Text style={{ color: newTask.date ? '#0f172a' : '#94a3b8' }}>{newTask.date || 'YYYY-MM-DD'}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={newTask.date ? new Date(newTask.date) : new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) setNewTask({ ...newTask, date: date.toISOString().split('T')[0] });
                      }}
                    />
                  )}
                </View>

                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Time</Text>
                  <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
                    <Text style={{ color: newTask.time ? '#0f172a' : '#94a3b8' }}>{newTask.time || 'HH:MM'}</Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <DateTimePicker
                      value={newTask.time ? new Date(`2000-01-01T${newTask.time}`) : new Date()}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, date) => {
                        setShowTimePicker(false);
                        if (date) {
                          const t = date.toTimeString().slice(0, 5);
                          setNewTask({ ...newTask, time: t });
                        }
                      }}
                    />
                  )}
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

              <View style={styles.formGroup}>
                <TouchableOpacity
                  style={styles.recurrenceToggle}
                  onPress={() => setShowRecurrenceOptions(!showRecurrenceOptions)}
                >
                  <Repeat size={18} color={newTask.isRecurring ? theme.primary : theme.textSecondary} />
                  <Text style={[styles.recurrenceToggleText, { color: theme.text }]}>
                    Repeat this task
                  </Text>
                  <View style={[styles.recurrenceSwitch, { backgroundColor: newTask.isRecurring ? theme.primary : theme.backgroundTertiary }]}>
                    <View style={[styles.recurrenceKnob, { backgroundColor: '#fff', transform: [{ translateX: newTask.isRecurring ? 18 : 0 }] }]} />
                  </View>
                </TouchableOpacity>

                {showRecurrenceOptions && (
                  <View style={styles.recurrenceOptions}>
                    {(['daily', 'weekly', 'biweekly', 'monthly'] as RecurrencePattern[]).map((pattern) => (
                      <TouchableOpacity
                        key={pattern}
                        style={[
                          styles.recurrencePatternBtn,
                          { backgroundColor: theme.backgroundTertiary },
                          newTask.recurrencePattern === pattern && { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                        ]}
                        onPress={() => setNewTask({ ...newTask, isRecurring: true, recurrencePattern: pattern })}
                      >
                        <Text style={[styles.recurrencePatternText, { color: theme.text }, newTask.recurrencePattern === pattern && { color: theme.primary, fontWeight: '600' }]}>
                          {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <View style={styles.formRow}>
                       <View style={[styles.formGroup, styles.halfWidth]}>
                         <Text style={styles.label}>End Date (optional)</Text>
                         <TouchableOpacity style={styles.input} onPress={() => setShowEndDatePicker(true)}>
                           <Text style={{ color: newTask.recurrenceEndDate ? '#0f172a' : '#94a3b8' }}>{newTask.recurrenceEndDate || 'YYYY-MM-DD'}</Text>
                         </TouchableOpacity>
                         {showEndDatePicker && (
                           <DateTimePicker
                             value={newTask.recurrenceEndDate ? new Date(newTask.recurrenceEndDate) : new Date()}
                             mode="date"
                             display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                             onChange={(event, date) => {
                               setShowEndDatePicker(false);
                               if (date) setNewTask({ ...newTask, recurrenceEndDate: date.toISOString().split('T')[0] });
                             }}
                           />
                         )}
                       </View>
                     </View>
                  </View>
                )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  searchRow: { paddingHorizontal: 20, marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { fontSize: 14, color: '#64748b', marginTop: 12 },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: '#64748b', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  sortBtnText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
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
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recurringText: { fontSize: 11, fontWeight: '500', textTransform: 'capitalize' },
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

  recurrenceToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  recurrenceToggleText: { flex: 1, fontSize: 14, fontWeight: '500' },
  recurrenceSwitch: { width: 44, height: 24, borderRadius: 12, padding: 2 },
  recurrenceKnob: { width: 20, height: 20, borderRadius: 10 },
  recurrenceOptions: { marginTop: 8, gap: 8 },
  recurrencePatternBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  recurrencePatternText: { fontSize: 14 },
});
