import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';

const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

export default function StudyScreen({ params }) {
  const router = useRouter();
  const task = params?.task || null;
  const [timeLeft, setTimeLeft] = useState(task ? task.duration * 60 : 25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (task) {
      setTimeLeft(task.duration * 60);
    }
  }, [task]);

  useEffect(() => {
    let interval;
    if (isRunning && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      Alert.alert('🎉 Great job!', 'Session complete!', [
        { text: 'Done', onPress: () => router.back() }
      ]);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused, timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleEnd = () => {
    Alert.alert('End Session', 'Are you sure you want to end this session?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'End', 
        style: 'destructive',
        onPress: () => {
          if (task) {
            const tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
            const newTasks = tasks.map(t => {
              if (t.id === task.id) {
                return { ...t, completed: true };
              }
              return t;
            });
            localStorage.setItem('studyTasks', JSON.stringify(newTasks));
          }
          router.back();
        }
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {task && (
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={[styles.subjectBadge, { backgroundColor: PRIORITY_COLORS[task.priority] + '20' }]}>
            <Text style={[styles.subjectText, { color: PRIORITY_COLORS[task.priority] }]}>
              {task.subject}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.timerContainer}>
        <Text style={styles.timer}>
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </Text>
        <Text style={styles.timerLabel}>
          {isRunning ? (isPaused ? 'Paused' : 'Focus Time') : 'Ready'}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${((task?.duration * 60 || 25 * 60 - timeLeft) / (task?.duration * 60 || 25 * 60)) * 100}%`,
                backgroundColor: task ? PRIORITY_COLORS[task.priority] : '#6366F1'
              }
            ]} 
          />
        </View>
      </View>

      <View style={styles.controls}>
        {!isRunning ? (
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>▶ Start</Text>
          </TouchableOpacity>
        ) : isPaused ? (
          <TouchableOpacity style={styles.resumeBtn} onPress={handleResume}>
            <Text style={styles.btnText}>▶ Resume</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.pauseBtn} onPress={handlePause}>
            <Text style={styles.btnText}>⏸ Pause</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.endBtn} 
          onPress={handleEnd}
          disabled={!isRunning && timeLeft === (task?.duration * 60 || 25 * 60)}
        >
          <Text style={styles.endBtnText}>End Session</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.motivation}>🔥 Stay focused!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 24, paddingTop: 60, alignItems: 'center', justifyContent: 'center' },
  taskInfo: { alignItems: 'center', marginBottom: 40 },
  taskTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
  subjectBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  subjectText: { fontSize: 14, fontWeight: '600' },
  timerContainer: { alignItems: 'center', marginBottom: 24 },
  timer: { fontSize: 72, fontWeight: 'bold', color: '#1E293B', fontVariant: ['tabular-nums'] },
  timerLabel: { fontSize: 18, color: '#64748B', marginTop: 8 },
  progressContainer: { width: '100%', marginBottom: 40 },
  progressBar: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  controls: { width: '100%', gap: 12 },
  startBtn: { backgroundColor: '#22C55E', padding: 18, borderRadius: 16, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  pauseBtn: { backgroundColor: '#F59E0B', padding: 18, borderRadius: 16, alignItems: 'center' },
  resumeBtn: { backgroundColor: '#22C55E', padding: 18, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  endBtn: { backgroundColor: '#FEE2E2', padding: 18, borderRadius: 16, alignItems: 'center' },
  endBtnText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  motivation: { fontSize: 18, color: '#6366F1', marginTop: 40 },
});