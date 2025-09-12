import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const data = {
  revenue: 17353756.41,
  nights: 2831,
  months: [
    { name: 'JUL', revenue: 15000000, nights: 2600 },
    { name: 'AUG', revenue: 16000000, nights: 2700 },
    { name: 'SEP', revenue: 17353756.41, nights: 2831 },
    { name: 'OCT', revenue: 14000000, nights: 2500 },
    { name: 'NOV', revenue: 13000000, nights: 2400 },
  ],
};

export default function RevenueScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Revenue</Text>
      <Text style={styles.summary}>Revenue: {formatCurrency(data.revenue)} INR</Text>
      <Text style={styles.summary}>Nights: {data.nights}</Text>
      <View style={styles.chart}>
        {data.months.map((m) => (
          <View key={m.name} style={styles.barGroup}>
            <View style={[styles.revenueBar, { height: m.revenue / 700000 }]} />
            <View style={[styles.nightBar, { height: m.nights / 10 }]} />
            <Text style={styles.barLabel}>{m.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatCurrency(value) {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  summary: { fontSize: 16, fontWeight: '500', textAlign: 'center' },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 32 },
  barGroup: { alignItems: 'center', flex: 1 },
  revenueBar: { width: 12, backgroundColor: '#2196F3', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  nightBar: { width: 12, backgroundColor: '#FF5252', marginTop: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel: { marginTop: 8, fontSize: 12 },
});
