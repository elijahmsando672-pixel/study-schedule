import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Switch, Alert } from 'react-native';
import { Plus, Bell, Clock, Trash2 } from 'lucide-react';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Reminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('none');
  const [time, setTime] = useState('18:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [remindersRes, subjectsRes] = await Promise.all([
        fetch('http://localhost:3001/api/reminders'),
        fetch('http://localhost:3001/api/subjects'),
      ]);
      const remindersData = await remindersRes.json();
      const subjectsData = await subjectsRes.json();
      setReminders(remindersData.map((r: any) => ({
        ...r,
        daysOfWeek: typeof r.daysOfWeek === 'string' ? JSON.parse(r.daysOfWeek) : r.daysOfWeek,
      })));
      setSubjects(subjectsData);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setDaysOfWeek(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const handleCreate = () => {
    if (!title || daysOfWeek.length === 0) return Alert.alert('Error', 'Please fill required fields');

    fetch('http://localhost:3001/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        time,
        daysOfWeek,
        isActive: enabled,
        subjectId: subjectId === 'none' ? null : parseInt(subjectId),
      }),
    })
      .then(() => {
        fetchData();
        setShowModal(false);
        setTitle('');
        setSubjectId('none');
        setTime('18:00');
        setDaysOfWeek([1, 2, 3, 4, 5]);
        setEnabled(true);
      })
      .catch(() => Alert.alert('Error', 'Failed to create reminder'));
  };

  const handleToggle = (id: number, currentEnabled: boolean) => {
    fetch(`http://localhost:3001/api/reminders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentEnabled }),
    })
      .then(fetchData)
      .catch(() => Alert.alert('Error', 'Failed to update reminder'));
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Reminder', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          fetch(`http://localhost:3001/api/reminders/${id}`, { method: 'DELETE' })
            .then(fetchData)
            .catch(() => Alert.alert('Error', 'Failed to delete reminder'));
        },
      },
    ]);
  };

  const getSubject = (id: number) => subjects.find((s: any) => s.id === id);

  const formatDays = (days: number[]) => days.map(d => DAYS[d]).join(', ');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Reminders</Text>
          <Text style={styles.subtitle}>Nudges to keep you on track</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Plus size={18} /> <Text style={styles.addBtnText}>New Reminder</Text>
        </TouchableOpacity>
      </View>

      {reminders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={48} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No reminders</Text>
          <Text style={styles.emptyText}>
            Set up reminders to get nudges when it's time to study.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.emptyBtnText}>Create a reminder</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.grid}>
          {reminders.map(reminder => {
            const subject = getSubject(reminder.subjectId);
            return (
              <View
                key={reminder.id}
                style={[styles.card, !reminder.isActive && styles.cardDisabled]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardInfo}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>{reminder.title}</Text>
                      {subject && (
                        <View style={[styles.badge, { borderColor: subject.color, color: subject.color }]}>
                          <Text style={[styles.badgeText, { color: subject.color }]}>{subject.name}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={styles.metaTime}>
                        <Clock size={14} /> {reminder.time}
                      </Text>
                      <Text style={styles.metaDays}>
                        {formatDays(reminder.daysOfWeek)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <Switch
                      value={reminder.isActive}
                      onValueChange={() => handleToggle(reminder.id, reminder.isActive)}
                    />
                    <TouchableOpacity onPress={() => handleDelete(reminder.id)}>
                      <Trash2 size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Create Reminder</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Study Math"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Subject (Optional)</Text>
            <View style={styles.select}>
              <TouchableOpacity
                style={[styles.selectOption, subjectId === 'none' && styles.selectOptionActive]}
                onPress={() => setSubjectId('none')}
              >
                <Text style={[styles.selectText, subjectId === 'none' && styles.selectTextActive]}>None</Text>
              </TouchableOpacity>
              {subjects.map((s: any) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.selectOption, subjectId === s.id.toString() && styles.selectOptionActive]}
                  onPress={() => setSubjectId(s.id.toString())}
                >
                  <Text style={[styles.selectText, subjectId === s.id.toString() && styles.selectTextActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Time</Text>
            <TextInput
              style={styles.input}
              placeholder="18:00"
              value={time}
              onChangeText={setTime}
            />

            <Text style={styles.label}>Days of week</Text>
            <View style={styles.daysPicker}>
              {DAYS.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayBtn,
                    daysOfWeek.includes(i) && styles.dayBtnActive,
                  ]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[styles.dayBtnText, daysOfWeek.includes(i) && styles.dayBtnTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enabled</Text>
              <Switch value={enabled} onValueChange={setEnabled} />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (!title || daysOfWeek.length === 0) && styles.saveBtnDisabled]}
              onPress={handleCreate}
              disabled={!title || daysOfWeek.length === 0}
            >
              <Text style={styles.saveBtnText}>Create Reminder</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
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
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  cardDisabled: { opacity: 0.6 },
  cardContent: { padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  badge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  cardMeta: { flexDirection: 'row', gap: 16 },
  metaTime: { fontSize: 14, color: '#64748b', fontFamily: 'monospace' },
  metaDays: { fontSize: 14, color: '#64748b' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { color: '#94a3b8', marginBottom: 16, opacity: 0.5 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20, maxWidth: 300 },
  emptyBtn: { borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  emptyBtnText: { color: '#0f172a', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8, marginTop: 12 },
  input: { height: 40, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, paddingHorizontal: 12, backgroundColor: '#fff' },
  select: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#f1f5f9' },
  selectOptionActive: { backgroundColor: '#0f172a' },
  selectText: { fontSize: 14, color: '#374151' },
  selectTextActive: { color: '#fff' },
  daysPicker: { flexDirection: 'row', gap: 8 },
  dayBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  dayBtnActive: { backgroundColor: '#0f172a' },
  dayBtnText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  dayBtnTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  switchLabel: { fontSize: 14, fontWeight: '500' },
  saveBtn: { backgroundColor: '#0f172a', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { backgroundColor: '#94a3b8' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  cancelBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
});