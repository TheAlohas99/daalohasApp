import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const properties = [
  { name: 'Tranquil Peaks Penthouse', rates: [7100, 6480, 6480] },
  { name: 'Hibiscus Oasis - EL REINO L2', rates: [7500, 7500, 5200] },
  { name: 'El Reino L2 - 2 BHK', rates: [7500, 5200, 5200] },
];

export default function AvailabilityScreen() {
  const days = ['M', 'T', 'W'];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aug / Sep 2025</Text>
      <ScrollView horizontal>
        <View>
          <View style={styles.headerRow}>
            <View style={styles.propCell} />
            {days.map((d) => (
              <View key={d} style={styles.dayCell}>
                <Text style={styles.dayText}>{d}</Text>
              </View>
            ))}
          </View>
          {properties.map((p) => (
            <View key={p.name} style={styles.row}>
              <View style={styles.propCell}>
                <Text style={styles.propText}>{p.name}</Text>
              </View>
              {p.rates.map((r, idx) => (
                <View key={idx} style={styles.dayCell}>
                  <Text>{r}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ccc' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' },
  propCell: { width: 160, padding: 8, borderRightWidth: 1, borderColor: '#eee' },
  dayCell: { width: 60, padding: 8, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderColor: '#eee' },
  dayText: { fontWeight: '600' },
  propText: { fontWeight: '500' },
});

