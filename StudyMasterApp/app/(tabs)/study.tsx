import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Vibration,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Pause, Square, Clock, Target, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '@/store/useStore';
import { dbService } from '@/services/database';
import { Task, Priority } from '@/types';

export default function StudyScreen() {
  const router = useRouter();
  const { tasks, subjects, loadTasks, loadSubjects, addSession, updateTask } = useStore();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // Track total elapsed time

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Load data on mount
  useEffect(() => {
    loadTasks();
    loadSubjects();
  }, []);

  // Reset timer when task changes
  useEffect(() => {
    if (selectedTask) {
      const duration = selectedTask.duration || 25;
      setTotalTime(duration * 60);
      setTimeLeft(duration * 60);
      setElapsedTime(0);
    }
  }, [selectedTask]);

  const startTimer = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    startTimer();
  }, [startTimer]);

  const stopTimer = useCallback(
    (completed: boolean) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      const actualMinutes = Math.floor(elapsedTime / 60);

      // If task is selected, mark it appropriately
      if (selectedTask && actualMinutes > 0) {
        if (completed) {
          // Mark as completed with actual time
          updateTask(selectedTask.id, {
            status: 'completed',
            completedAt: new Date().toISOString(),
          });
        } else {
          // Mark as in-progress with logged time
          updateTask(selectedTask.id, {
            status: 'in-progress',
          });
        }

        // Create a study session record
        const today = new Date().toISOString().split('T')[0];
        addSession({
          subjectId: selectedTask.subjectId,
          duration: actualMinutes,
          date: today,
          notes: completed ? 'Session completed' : 'Session partially completed',
        });
      }

      // Haptic feedback
      if (completed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('🎉 Great job!', `You studied for ${actualMinutes} minutes!`, [
          { text: 'Continue', onPress: () => resetToStart() },
        ]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Session Ended', `Logged ${actualMinutes} minutes`, [
          { text: 'OK', onPress: () => resetToStart() },
        ]);
      }

      setIsRunning(false);
      setIsPaused(false);
    },
    [selectedTask, elapsedTime, updateTask, addSession]
  );

  const resetToStart = () => {
    setSelectedTask(null);
    setTimeLeft(25 * 60);
    setTotalTime(25 * 60);
    setElapsedTime(0);
    setIsRunning(false);
    setIsPaused(false);
  };

  const handleTaskSelect = (task: Task) => {
    if (isRunning) {
      Alert.alert(
        'Task in Progress',
        'A timer is already running. End the current session first.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSelectedTask(task);
    setShowTaskPicker(false);
  };

  const handleStart = () => {
    if (!selectedTask) {
      setShowTaskPicker(true);
      return;
    }
    startTimer();
  };

  const handlePause = () => {
    pauseTimer();
  };

  const handleResume = () => {
    resumeTimer();
  };

  const handleEnd = () => {
    Alert.alert('End Session', 'Log current progress and end session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Session', style: 'destructive', onPress: () => stopTimer(false) },
    ]);
  };

  const getSubject = (id?: number) => {
    return subjects.find((s) => s.id === id);
  };

  const getPriorityColor = (priority?: Priority) => {
    const colors: Record<Priority, string> = {
      high: '#EF4444',
      medium: '#F59E0B',
      low: '#22C55E',
    };
    return priority ? colors[priority] : '#6366F1';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  const renderTaskItem = ({ item }: { item: Task }) => {
    const subject = getSubject(item.subjectId);
    const isActive = selectedTask?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.taskItem, isActive && styles.taskItemActive]}
        onPress={() => handleTaskSelect(item)}
      >
        {isActive && <CheckCircle size={16} color="#22c55e" style={styles.checkIcon} />}
        <View style={[styles.subjectDot, { backgroundColor: subject?.color || getPriorityColor(item.priority) }]} />
        <View style={styles.taskItemInfo}>
          <Text style={[styles.taskItemTitle, isActive && styles.taskItemTitleActive]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.taskItemMeta}>
            {item.duration} min • {item.priority}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const availableTasks = tasks.filter(
    (t) => t.status !== 'completed' && (!selectedTask || t.id === selectedTask.id)
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Study Timer</Text>
        <TouchableOpacity
          style={styles.taskPickerBtn}
          onPress={() => setShowTaskPicker(true)}
        >
          <Target size={18} color="#6366F1" />
          <Text style={styles.taskPickerBtnText}>
            {selectedTask ? selectedTask.title : 'Select Task'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Timer Display */}
      <View style={styles.timerSection}>
        <View style={styles.timerCircle}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <Text style={styles.timerLabel}>
            {isRunning ? (isPaused ? 'Paused' : 'Studying...') : 'Ready to focus'}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: selectedTask ? getPriorityColor(selectedTask.priority) : '#6366F1',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        {/* Selected Task Info */}
        {selectedTask && (
          <View style={styles.selectedTaskInfo}>
            <Text style={styles.selectedTaskTitle}>{selectedTask.title}</Text>
            <Text style={styles.selectedTaskDuration}>{selectedTask.duration} minutes</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isRunning ? (
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Play size={24} color="#fff" fill="#fff" />
            <Text style={styles.btnText}>Start</Text>
          </TouchableOpacity>
        ) : isPaused ? (
          <TouchableOpacity style={styles.resumeBtn} onPress={handleResume}>
            <Play size={24} color="#fff" fill="#fff" />
            <Text style={styles.btnText}>Resume</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.pauseBtn} onPress={handlePause}>
            <Pause size={24} color="#fff" fill="#fff" />
            <Text style={styles.btnText}>Pause</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.endBtn, (!isRunning && timeLeft === totalTime) && styles.endBtnDisabled]}
          onPress={handleEnd}
          disabled={!isRunning && timeLeft === totalTime}
        >
          <Square size={24} color={isRunning || timeLeft < totalTime ? '#EF4444' : '#94a3b8'} />
          <Text style={[styles.endBtnText, isRunning && styles.endBtnTextActive]}>
            {isRunning ? 'End Now' : 'End'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Clock size={16} color="#64748b" />
          <Text style={styles.statText}>
            {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
          </Text>
        </View>
        <View style={styles.statItem}>
          <Target size={16} color="#64748b" />
          <Text style={styles.statText}>{availableTasks.length} tasks</Text>
        </View>
      </View>

      {/* Task Picker Modal */}
      <Modal visible={showTaskPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Task</Text>
              <TouchableOpacity onPress={() => setShowTaskPicker(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={availableTasks}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.taskList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Target size={48} color="#94a3b8" />
                  <Text style={styles.emptyTitle}>No pending tasks</Text>
                  <Text style={styles.emptyText}>
                    Complete existing tasks or create a new one.
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  taskPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#eef2ff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  taskPickerBtnText: { fontSize: 14, fontWeight: '600', color: '#6366F1' },

  timerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerCircle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#f1f5f9',
    marginBottom: 32,
  },
  timerText: {
    fontSize: 64,
    fontWeight: '300',
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
    fontWeight: '500',
  },

  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    minWidth: 40,
    textAlign: 'right',
  },

  selectedTaskInfo: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  selectedTaskTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  selectedTaskDuration: { fontSize: 14, color: '#64748b', marginTop: 4 },

  controls: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  startBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#22C55E',
    padding: 20,
    borderRadius: 16,
  },
  pauseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    padding: 20,
    borderRadius: 16,
  },
  resumeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    padding: 20,
    borderRadius: 16,
  },
  endBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  endBtnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  endBtnText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  endBtnTextActive: { color: '#EF4444' },

  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: { fontSize: 14, color: '#64748b', fontWeight: '500' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70vh',
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
  closeBtn: { fontSize: 24, color: '#64748b' },

  taskList: { padding: 16 },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  taskItemActive: {
    borderColor: '#22C55E',
    backgroundColor: '#f0fdf4',
  },
  checkIcon: { marginRight: 8 },
  subjectDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  taskItemInfo: { flex: 1 },
  taskItemTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  taskItemTitleActive: { color: '#166534' },
  taskItemMeta: { fontSize: 13, color: '#64748b', marginTop: 4 },

  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center' },
});
