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
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Play, Pause, Square, Clock, Target, CheckCircle, Coffee, BookOpen, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '@/store/useStore';
import { Task, Priority } from '@/types';
import { useAppTheme } from '@/hooks/use-app-theme';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export default function StudyScreen() {
  const router = useRouter();
  const { tasks, subjects, loadTasks, loadSubjects, addSession, updateTask } = useStore();
  const theme = useAppTheme();

  const [pomodoroConfig, setPomodoroConfig] = useState({ focus: 25, shortBreak: 5, longBreak: 15, autoBreak: true });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ focus: '25', shortBreak: '5', longBreak: '15', autoBreak: true });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerMode, setTimerMode] = useState<TimerMode>('focus');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadTasks();
    loadSubjects();
    AsyncStorage.getItem('pomodoroConfig').then(data => {
      if (data) {
        const cfg = JSON.parse(data);
        setPomodoroConfig(cfg);
        setSettingsForm({ focus: cfg.focus.toString(), shortBreak: cfg.shortBreak.toString(), longBreak: cfg.longBreak.toString(), autoBreak: cfg.autoBreak });
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('pomodoroConfig', JSON.stringify(pomodoroConfig));
  }, [pomodoroConfig]);

  useEffect(() => {
    if (selectedTask) {
      const duration = selectedTask.duration || pomodoroConfig.focus;
      setTotalTime(duration * 60);
      setTimeLeft(duration * 60);
      setElapsedTime(0);
      setTimerMode('focus');
    }
  }, [selectedTask, pomodoroConfig.focus]);

  useEffect(() => {
    const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [timeLeft, totalTime]);

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

      if (selectedTask && actualMinutes > 0) {
        if (completed) {
          updateTask(selectedTask.id, {
            status: 'completed',
            completedAt: new Date().toISOString(),
          });
          setPomodoroCount(prev => prev + 1);
        } else {
          updateTask(selectedTask.id, {
            status: 'in-progress',
          });
        }

        const today = new Date().toISOString().split('T')[0];
        addSession({
          subjectId: selectedTask.subjectId,
          duration: actualMinutes,
          date: today,
          notes: sessionNotes || (completed ? 'Pomodoro session completed' : 'Session partially completed'),
        });

        setSessionNotes('');
      }

      if (completed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowNotesModal(true);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Session Ended', `Logged ${actualMinutes} minutes`, [
          { text: 'OK', onPress: () => resetToStart() },
        ]);
      }

      setIsRunning(false);
      setIsPaused(false);
    },
    [selectedTask, elapsedTime, updateTask, addSession, sessionNotes]
  );

  const handleNotesSave = () => {
    setShowNotesModal(false);
    resetToStart();
  };

  const startBreak = (mode: 'shortBreak' | 'longBreak') => {
    const duration = mode === 'shortBreak' ? pomodoroConfig.shortBreak : pomodoroConfig.longBreak;
    setTimerMode(mode);
    setTotalTime(duration * 60);
    setTimeLeft(duration * 60);
    setElapsedTime(0);
    startTimer();
  };

  const resetToStart = () => {
    setSelectedTask(null);
    setTimeLeft(pomodoroConfig.focus * 60);
    setTotalTime(pomodoroConfig.focus * 60);
    setElapsedTime(0);
    setIsRunning(false);
    setIsPaused(false);
    setTimerMode('focus');
    setPomodoroCount(0);
    setSessionNotes('');
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
      high: theme.danger,
      medium: theme.warning,
      low: theme.success,
    };
    return priority ? colors[priority] : theme.primary;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  const getModeColor = () => {
    switch (timerMode) {
      case 'focus': return theme.primary;
      case 'shortBreak': return theme.success;
      case 'longBreak': return theme.info;
    }
  };

  const getModeLabel = () => {
    switch (timerMode) {
      case 'focus': return 'Focus Time';
      case 'shortBreak': return 'Short Break';
      case 'longBreak': return 'Long Break';
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const subject = getSubject(item.subjectId);
    const isActive = selectedTask?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.taskItem, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }, isActive && { borderColor: theme.success, backgroundColor: theme.successLight }]}
        onPress={() => handleTaskSelect(item)}
      >
        {isActive && <CheckCircle size={16} color={theme.success} style={styles.checkIcon} />}
        <View style={[styles.subjectDot, { backgroundColor: subject?.color || getPriorityColor(item.priority) }]} />
        <View style={styles.taskItemInfo}>
          <Text style={[styles.taskItemTitle, { color: theme.text }, isActive && { color: theme.success }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.taskItemMeta, { color: theme.textSecondary }]}>
            {item.duration} min • {item.priority}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const availableTasks = tasks.filter(
    (t) => t.status !== 'completed' && (!selectedTask || t.id === selectedTask.id)
  );

  const showBreakOptions = !isRunning && pomodoroCount > 0;

  const openSettings = () => {
    setSettingsForm({
      focus: pomodoroConfig.focus.toString(),
      shortBreak: pomodoroConfig.shortBreak.toString(),
      longBreak: pomodoroConfig.longBreak.toString(),
      autoBreak: pomodoroConfig.autoBreak,
    });
    setShowSettingsModal(true);
  };

  const saveSettings = () => {
    const focus = parseInt(settingsForm.focus) || 25;
    const shortBreak = parseInt(settingsForm.shortBreak) || 5;
    const longBreak = parseInt(settingsForm.longBreak) || 15;
    setPomodoroConfig({ focus, shortBreak, longBreak, autoBreak: settingsForm.autoBreak });
    setShowSettingsModal(false);
    if (!isRunning && timerMode === 'focus') {
      setTimeLeft(focus * 60);
      setTotalTime(focus * 60);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Study Timer</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.settingsBtn} onPress={openSettings}>
            <Settings size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          {pomodoroCount > 0 && (
            <View style={[styles.pomodoroBadge, { backgroundColor: theme.primaryLight }]}>
              <BookOpen size={14} color={theme.primary} />
              <Text style={[styles.pomodoroCount, { color: theme.primary }]}>{pomodoroCount}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.taskPickerBtn, { backgroundColor: theme.primaryLight, borderColor: `${theme.primary}30` }]}
            onPress={() => setShowTaskPicker(true)}
          >
            <Target size={18} color={theme.primary} />
            <Text style={[styles.taskPickerBtnText, { color: theme.primary }]}>
              {selectedTask ? selectedTask.title : 'Select Task'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.modeSelector}>
        {(['focus', 'shortBreak', 'longBreak'] as TimerMode[]).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeBtn,
              timerMode === mode && { backgroundColor: getModeColor() + '20', borderColor: getModeColor() }
            ]}
            onPress={() => {
              if (!isRunning) {
                const duration = mode === 'focus' ? pomodoroConfig.focus : mode === 'shortBreak' ? pomodoroConfig.shortBreak : pomodoroConfig.longBreak;
                setTimerMode(mode);
                setTotalTime(duration * 60);
                setTimeLeft(duration * 60);
                setElapsedTime(0);
              }
            }}
          >
            {mode === 'focus' && <Target size={16} color={timerMode === mode ? getModeColor() : theme.textTertiary} />}
            {(mode === 'shortBreak' || mode === 'longBreak') && <Coffee size={16} color={timerMode === mode ? getModeColor() : theme.textTertiary} />}
            <Text style={[styles.modeText, { color: timerMode === mode ? getModeColor() : theme.textTertiary }]}>
              {mode === 'focus' ? 'Focus' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.timerSection}>
        <View style={styles.timerRingContainer}>
          <Animated.View
            style={[
              styles.timerRing,
              {
                borderColor: getModeColor(),
                transform: [{
                  rotate: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0deg', '360deg'],
                  }),
                }],
                opacity: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          />
          <View style={[styles.timerCircle, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, shadowColor: theme.cardShadow }]}>
            <Text style={[styles.timerLabel, { color: getModeColor() }]}>{getModeLabel()}</Text>
            <Text style={[styles.timerText, { color: theme.text }]}>{formatTime(timeLeft)}</Text>
            <Text style={[styles.timerSubtext, { color: theme.textSecondary }]}>
              {isRunning ? (isPaused ? 'Paused' : 'Studying...') : 'Ready to focus'}
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundTertiary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: selectedTask ? getPriorityColor(selectedTask.priority) : getModeColor(),
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>{Math.round(progress)}%</Text>
        </View>

        {selectedTask && (
          <View style={styles.selectedTaskInfo}>
            <Text style={[styles.selectedTaskTitle, { color: theme.text }]}>{selectedTask.title}</Text>
            <Text style={[styles.selectedTaskDuration, { color: theme.textSecondary }]}>{selectedTask.duration} minutes</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        {!isRunning ? (
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: timerMode === 'focus' ? theme.success : theme.info }]} onPress={handleStart}>
            <Play size={24} color="#fff" fill="#fff" />
            <Text style={styles.btnText}>Start</Text>
          </TouchableOpacity>
        ) : isPaused ? (
          <TouchableOpacity style={[styles.resumeBtn, { backgroundColor: theme.success }]} onPress={handleResume}>
            <Play size={24} color="#fff" fill="#fff" />
            <Text style={styles.btnText}>Resume</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.pauseBtn, { backgroundColor: theme.warning }]} onPress={handlePause}>
            <Pause size={24} color="#fff" fill="#fff" />
            <Text style={styles.btnText}>Pause</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.endBtn, { backgroundColor: theme.dangerLight, borderColor: `${theme.danger}30` }, (!isRunning && timeLeft === totalTime) && { opacity: 0.4 }]}
          onPress={handleEnd}
          disabled={!isRunning && timeLeft === totalTime}
        >
          <Square size={24} color={isRunning || timeLeft < totalTime ? theme.danger : theme.textTertiary} />
          <Text style={[styles.endBtnText, { color: isRunning ? theme.danger : theme.textTertiary }]}>
            {isRunning ? 'End Now' : 'End'}
          </Text>
        </TouchableOpacity>
      </View>

      {showBreakOptions && (
        <View style={styles.breakOptions}>
          <Text style={[styles.breakOptionsTitle, { color: theme.text }]}>Start a break?</Text>
          <View style={styles.breakBtns}>
            <TouchableOpacity
              style={[styles.breakBtn, { backgroundColor: theme.successLight, borderColor: theme.success }]}
              onPress={() => startBreak('shortBreak')}
            >
              <Coffee size={16} color={theme.success} />
              <Text style={[styles.breakBtnText, { color: theme.success }]}>{pomodoroConfig.shortBreak} min</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.breakBtn, { backgroundColor: theme.infoLight, borderColor: theme.info }]}
              onPress={() => startBreak('longBreak')}
            >
              <Coffee size={16} color={theme.info} />
              <Text style={[styles.breakBtnText, { color: theme.info }]}>{pomodoroConfig.longBreak} min</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Clock size={16} color={theme.textSecondary} />
          <Text style={[styles.statText, { color: theme.textSecondary }]}>
            {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
          </Text>
        </View>
        <View style={styles.statItem}>
          <Target size={16} color={theme.textSecondary} />
          <Text style={[styles.statText, { color: theme.textSecondary }]}>{availableTasks.length} tasks</Text>
        </View>
      </View>

      <Modal visible={showTaskPicker} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modal, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Task</Text>
              <TouchableOpacity onPress={() => setShowTaskPicker(false)}>
                <Text style={[styles.closeBtn, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={availableTasks}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.taskList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Target size={48} color={theme.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No pending tasks</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    Complete existing tasks or create a new one.
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showNotesModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modal, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Session Notes</Text>
              <TouchableOpacity onPress={handleNotesSave}>
                <Text style={[styles.closeBtn, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.notesPrompt, { color: theme.textSecondary }]}>
                What did you accomplish in this session?
              </Text>
              <TextInput
                style={[styles.notesInput, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border, color: theme.text }]}
                placeholder="e.g., Completed chapter 5, reviewed formulas..."
                placeholderTextColor={theme.textTertiary}
                value={sessionNotes}
                onChangeText={setSessionNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.notesSaveBtn, { backgroundColor: theme.primary }]}
                onPress={handleNotesSave}
              >
                <Text style={styles.notesSaveText}>Save & Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modal, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Pomodoro Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Text style={[styles.closeBtn, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Focus Duration (min)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border, color: theme.text }]}
                  value={settingsForm.focus}
                  onChangeText={(t) => setSettingsForm({ ...settingsForm, focus: t })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Short Break (min)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border, color: theme.text }]}
                  value={settingsForm.shortBreak}
                  onChangeText={(t) => setSettingsForm({ ...settingsForm, shortBreak: t })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Long Break (min)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border, color: theme.text }]}
                  value={settingsForm.longBreak}
                  onChangeText={(t) => setSettingsForm({ ...settingsForm, longBreak: t })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={[styles.label, { color: theme.text }]}>Auto-start break</Text>
                <TouchableOpacity
                  style={[styles.toggle, { backgroundColor: settingsForm.autoBreak ? theme.success : theme.backgroundTertiary }]}
                  onPress={() => setSettingsForm({ ...settingsForm, autoBreak: !settingsForm.autoBreak })}
                >
                  <View style={[styles.toggleKnob, { transform: [{ translateX: settingsForm.autoBreak ? 18 : 0 }] }]} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setShowSettingsModal(false)}>
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={saveSettings}>
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  settingsBtn: { padding: 8 },
  pomodoroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pomodoroCount: { fontSize: 12, fontWeight: '600' },
  taskPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1 },
  taskPickerBtnText: { fontSize: 14, fontWeight: '600' },

  modeSelector: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  modeText: { fontSize: 13, fontWeight: '500' },

  timerSection: { alignItems: 'center', marginBottom: 32 },
  timerRingContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  timerRing: { position: 'absolute', width: 270, height: 270, borderRadius: 135, borderWidth: 5, borderColor: 'transparent', borderTopColor: 'transparent', borderRightColor: 'transparent' },
  timerCircle: { width: 260, height: 260, borderRadius: 130, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8, borderWidth: 4 },
  timerText: { fontSize: 64, fontWeight: '300', fontVariant: ['tabular-nums'] },
  timerLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  timerSubtext: { fontSize: 16, marginTop: 8, fontWeight: '500' },

  progressContainer: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  progressBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: '600', minWidth: 40, textAlign: 'right' },

  selectedTaskInfo: { alignItems: 'center', paddingVertical: 12 },
  selectedTaskTitle: { fontSize: 16, fontWeight: '600' },
  selectedTaskDuration: { fontSize: 14, marginTop: 4 },

  controls: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  startBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, borderRadius: 16 },
  pauseBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, borderRadius: 16 },
  resumeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, borderRadius: 16 },
  endBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 20, borderRadius: 16, borderWidth: 1 },
  btnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  endBtnText: { fontSize: 12, fontWeight: '600' },

  breakOptions: { alignItems: 'center', marginBottom: 24 },
  breakOptionsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  breakBtns: { flexDirection: 'row', gap: 12 },
  breakBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  breakBtnText: { fontSize: 14, fontWeight: '600' },

  stats: { flexDirection: 'row', justifyContent: 'center', gap: 32 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 14, fontWeight: '500' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70vh' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeBtn: { fontSize: 24, padding: 4 },
  taskList: { padding: 16 },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 2 },
  checkIcon: { marginRight: 8 },
  subjectDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  taskItemInfo: { flex: 1 },
  taskItemTitle: { fontSize: 16, fontWeight: '600' },
  taskItemMeta: { fontSize: 13, marginTop: 4 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },

  modalBody: { padding: 20 },
  notesPrompt: { fontSize: 14, marginBottom: 12 },
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 100, textAlignVertical: 'top' },
  notesSaveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  notesSaveText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  toggle: { width: 44, height: 24, borderRadius: 12, padding: 2 },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 2, alignItems: 'center', backgroundColor: '#fff' },
  cancelText: { fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
