import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export function Select({ value, onValueChange, placeholder, children }) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const childArray = React.Children.toArray(children);
  const selected = childArray.find(c => c.props.value === value);
  
  return (
    <View>
      <TouchableOpacity 
        style={styles.trigger} 
        onPress={() => setIsOpen(true)}
      >
        <Text style={styles.triggerText}>
          {selected?.props.children || placeholder || 'Select...'}
        </Text>
        <Text>▼</Text>
      </TouchableOpacity>
      
      <Modal visible={isOpen} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={styles.content}>
            <Text style={styles.title}>{placeholder || 'Select'}</Text>
            {childArray.map((child, i) => (
              <TouchableOpacity
                key={i}
                style={styles.option}
                onPress={() => {
                  onValueChange?.(child.props.value);
                  setIsOpen(false);
                }}
              >
                <Text style={[
                  styles.optionText,
                  value === child.props.value && styles.optionTextActive
                ]}>
                  {child.props.children}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export function SelectContent({ children }) {
  return <>{children}</>;
}

export function SelectItem({ value, children }) {
  return <>{children}</>;
}

export function SelectTrigger({ children }) {
  return <>{children}</>;
}

export function SelectValue({ placeholder }) {
  return <Text>{placeholder}</Text>;
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  triggerText: { color: '#64748b' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    padding: 20,
    paddingBottom: 40,
  },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optionText: { fontSize: 16, color: '#1e293b' },
  optionTextActive: { color: '#6366f1', fontWeight: '600' },
});