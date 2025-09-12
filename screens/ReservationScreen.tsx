import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { CalendarProvider, ExpandableCalendar } from 'react-native-calendars';

type Reservation = {
  id: number;
  title: string;
};

type Reservations = {
  [date: string]: Reservation[];
};

const reservations: Reservations = {
  '2025-09-01': [{ id: 1, title: 'Room 101 Reserved' }],
  '2025-09-02': [{ id: 2, title: 'Room 202 Reserved' }],
  '2025-09-15': [{ id: 3, title: 'Room 303 Reserved' }],
};

export default function ReservationScreen() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const markedDates: {
    [key: string]: { selected?: boolean; selectedColor?: string };
  } = {
    ...Object.keys(reservations).reduce((acc, date) => {
      acc[date] = {
        selected: true,
        selectedColor: 'red',
      };
      return acc;
    }, {} as Record<string, { selected: boolean; selectedColor: string }>),

    [selectedDate]: {
      ...(reservations[selectedDate]
        ? { selected: true, selectedColor: 'red' }
        : {}),
      selected: true,
      selectedColor: 'blue',
    },
  };

  return (
    <CalendarProvider
      date={today}
      onDateChanged={(date: string) => setSelectedDate(date)}
    >
      {/* Expandable Calendar with marked dates */}
      <ExpandableCalendar firstDay={1} markedDates={markedDates} />

      {/* Reservation List */}
      <View style={styles.listContainer}>
        <Text style={styles.heading}>Reservations on {selectedDate}</Text>
        <FlatList
          data={reservations[selectedDate] || []}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text>{item.title}</Text>
            </View>
          )}
          ListEmptyComponent={<Text>No reservations</Text>}
        />
      </View>
    </CalendarProvider>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  item: {
    padding: 12,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    marginBottom: 8,
  },
});
