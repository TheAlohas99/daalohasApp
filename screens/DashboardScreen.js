import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.month}>September 2025</Text>
      <View style={styles.circles}>
        <View style={styles.circle}>
          <Text style={styles.circleNumber}>2</Text>
          <Text style={styles.circleLabel}>Arrivals</Text>
        </View>
        <View style={styles.circle}>
          <Text style={styles.circleNumber}>2</Text>
          <Text style={styles.circleLabel}>Departures</Text>
        </View>
        <View style={styles.circle}>
          <Text style={styles.circleNumber}>10</Text>
          <Text style={styles.circleLabel}>Stay</Text>
        </View>
      </View>
      <View style={styles.list}>
        <View style={styles.listRow}>
          <Text style={styles.listLabel}>NEW</Text>
          <Text style={styles.listValue}>72,500.00 INR</Text>
        </View>
        <View style={styles.listRow}>
          <Text style={styles.listLabel}>MODIFIED</Text>
          <Text style={styles.listValue}>0.00 INR</Text>
        </View>
        <View style={styles.listRow}>
          <Text style={styles.listLabel}>CANCELLED</Text>
          <Text style={styles.listValue}>0.00 INR</Text>
        </View>
      </View>
      <View style={styles.occupancy}>
        <Text style={styles.occHeading}>LOW OCCUPANCY</Text>
        <View style={styles.progressBar}>
          <View style={styles.progress} />
        </View>
        <Text style={styles.occPercent}>26%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  month: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 24 },
  circles: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  circle: { alignItems: 'center' },
  circleNumber: { fontSize: 24, fontWeight: '700' },
  circleLabel: { fontSize: 12, color: '#555' },
  list: { marginTop: 8 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
  listLabel: { fontWeight: '600', color: '#007AFF' },
  listValue: { fontWeight: '500' },
  occupancy: { marginTop: 32, alignItems: 'center' },
  occHeading: { fontWeight: '600', marginBottom: 8 },
  progressBar: { width: '60%', height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
  progress: { width: '26%', height: '100%', backgroundColor: '#007AFF' },
  occPercent: { marginTop: 8, fontWeight: '500' },
});

