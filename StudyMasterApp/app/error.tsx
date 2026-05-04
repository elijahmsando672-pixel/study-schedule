import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';

export default function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <AlertTriangle size={64} color="#ef4444" />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{error.message}</Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.retryBtn} onPress={retry}>
          <RefreshCw size={20} color="#fff" />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)')}>
          <Home size={20} color="#6366F1" />
          <Text style={styles.homeText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginTop: 16 },
  message: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 24, maxWidth: 300 },
  buttons: { flexDirection: 'row', gap: 12 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '600' },
  homeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eef2ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  homeText: { color: '#6366F1', fontWeight: '600' },
});
