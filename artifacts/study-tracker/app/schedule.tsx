import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2, Plus, Calendar } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Schedule() {
  const router = useRouter();
  const [slots, setSlots] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('0');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [slotsRes, subjectsRes] = await Promise.all([
        fetch('http://localhost:3001/api/schedule-slots'),
        fetch('http://localhost:3001/api/subjects'),
      ]);
      const slotsData = await slotsRes.json();
      const subjectsData = await subjectsRes.json();
      setSlots(slotsData);
      setSubjects(subjectsData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = () => {
    if (!subjectId || !startTime || !endTime) return Alert.alert('Error', 'Please fill all fields');
    
    fetch('http://localhost:3001/api/schedule-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectId: parseInt(subjectId),
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
      }),
    })
      .then(() => {
        fetchData();
        setShowModal(false);
        setSubjectId('');
        setDayOfWeek('0');
        setStartTime('09:00');
        setEndTime('10:00');
      })
      .catch(() => Alert.alert('Error', 'Failed to add slot'));
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Slot', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          fetch(`http://localhost:3001/api/schedule-slots/${id}`, { method: 'DELETE' })
            .then(fetchData)
            .catch(() => Alert.alert('Error', 'Failed to delete slot'));
        },
      },
    ]);
  };

  const getSubject = (id: number) => subjects.find((s: any) => s.id === id);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (subjects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Calendar size={32} />
        </View>
        <Text style={styles.emptyTitle}>Your Week at a Glance</Text>
        <Text style={styles.emptyText}>
          Before creating a schedule, you need to create some subjects to study.
        </Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/subjects')}>
          <Text style={styles.emptyBtnText}>Create a Subject</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Weekly Schedule</Text>
          <Text style={styles.subtitle}>Plan your study blocks</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Plus size={18} /> <Text style={styles.addBtnText}>Add Slot</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {DAYS.map((day, dayIndex) => {
          const daySlots = slots
            ?.filter((s: any) => s.dayOfWeek === dayIndex)
            .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)) || [];

          return (
            <View key={dayIndex} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{day}</Text>
                <Text style={styles.dayFullName}>{dayNames[dayIndex]}</Text>
              </View>
              <View style={styles.slotsContainer}>
                {daySlots.length === 0 ? (
                  <Text style={styles.emptySlot}>Empty</Text>
                ) : (
                  daySlots.map((slot: any) => {
                    const subject = getSubject(slot.subjectId);
                    return (
                      <View
                        key={slot.id}
                        style={[
                          styles.slotItem,
                          {
                            borderLeftColor: subject?.color || '#e2e8f0',
                            backgroundColor: subject ? subject.color + '15' : '#f8fafc',
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(slot.id)}
                        >
                          <Trash2 size={12} />
                        </TouchableOpacity>
                        <Text style={styles.slotSubject}>
                          {subject?.name || 'Unknown'}
                        </Text>
                        <Text style={styles.slotTime}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          );
        })}
      </View>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Schedule Slot</Text>

            <Text style={styles.label}>Subject</Text>
            <View style={styles.select}>
              {subjects.map((s: any) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.selectOption,
                    subjectId === s.id.toString() && styles.selectOptionActive,
                  ]}
                  onPress={() => setSubjectId(s.id.toString())}
                >
                  <View style={[styles.colorDot, { backgroundColor: s.color }]} />
                  <Text
                    style={[
                      styles.selectText,
                      subjectId === s.id.toString() && styles.selectTextActive,
                    ]}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Day of Week</Text>
            <View style={styles.select}>
              {DAYS.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.selectOption,
                    dayOfWeek === i.toString() && styles.selectOptionActive,
                  ]}
                  onPress={() => setDayOfWeek(i.toString())}
                >
                  <Text
                    style={[
                      styles.selectText,
                      dayOfWeek === i.toString() && styles.selectTextActive,
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  type="time"
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.input}
                  type="time"
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
              <Text style={styles.saveBtnText}>Save Slot</Text>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayCard: { width: '14%', minWidth: 80, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', minHeight: 300 },
  dayHeader: { padding: 12, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  dayName: { fontSize: 14, fontWeight: '600', textAlign: 'center', color: '#0f172a' },
  dayFullName: { fontSize: 10, textAlign: 'center', color: '#64748b' },
  slotsContainer: { flex: 1, padding: 8 },
  emptySlot: { fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingTop: 20, opacity: 0.5 },
  slotItem: { padding: 8, borderRadius: 6, borderLeftWidth: 4, marginBottom: 8, position: 'relative' },
  slotSubject: { fontSize: 12, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  slotTime: { fontSize: 10, color: '#64748b' },
  deleteBtn: { position: 'absolute', top: 4, right: 4, padding: 4, opacity: 0.6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20, maxWidth: 300 },
  emptyBtn: { backgroundColor: '#0f172a', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8, marginTop: 12 },
  select: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectOptionActive: { backgroundColor: '#0f172a' },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  selectText: { fontSize: 14, color: '#374151' },
  selectTextActive: { color: '#fff' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  input: { height: 40, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, paddingHorizontal: 12, backgroundColor: '#fff' },
  saveBtn: { backgroundColor: '#0f172a', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  cancelBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
});