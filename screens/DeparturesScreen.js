// screens/DeparturesScreen.js
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import ReservationDetailsModal from '../components/ReservationDetailsModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProperty } from '../redux/slice/PropertySlice';
import ReservationCard from '../components/ReservationCard';

const ymdLocal = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const keyFor = (item, index) =>
  String(item?._id ?? item?.id ?? item?.reservation_id ?? `row-${index}`);

const refId = r =>
  r?.reference ??
  r?._id ??
  r?.id ??
  r?.booking_id ??
  r?.pnr ??
  null;

export default function DeparturesScreen() {
  const route = useRoute();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const selectedDate = route.params?.date || ymdLocal(new Date());

  const { role } = useSelector(
    s => ({ role: s.property.role }),
    shallowEqual,
  );

  const { data } = useSelector(s => s.dashboardreservation || {}, shallowEqual);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Use API-provided departure data directly
  const list = useMemo(() => data?.departures?.data || [], [data]);

  const headerDateLabel = (() => {
    const d = new Date(selectedDate);
    const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
    const month = d.toLocaleDateString(undefined, { month: 'short' });
    return `${weekday}, ${month} ${d.getDate()}`;
  })();

  const onCardPress = useCallback(item => {
    const id = refId(item);
    if (!id) return;
    setSelectedReservationId(id);
    setModalOpen(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        const { email, mobile } = user;
        dispatch(getProperty({ email, mobile: (mobile || '').replace(/^\+/, '') }));
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const showModal = role !== 'owner';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.title}>Departures</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{list.length}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{headerDateLabel}</Text>
      </View>

      {/* Scrollable list */}
      <FlatList
        data={list}
        keyExtractor={keyFor}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <Text style={{ color: '#6b7a87', paddingHorizontal: 4 }}>
            No departures for this date.
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <ReservationCard item={item} onPress={() => onCardPress(item)} />
        )}
      />

      {/* Modal now uses reservationId directly */}
      {showModal && selectedReservationId && (
        <ReservationDetailsModal
          key={selectedReservationId}
          visible={modalOpen}
          onClose={() => setModalOpen(false)}
          onRequestClose={() => setModalOpen(false)}
          reservationId={selectedReservationId}
          onCheckInPress={reservationId => {
            console.log('Check-in pressed for reservation ID:', reservationId);
            setModalOpen(false);
            navigation.navigate('GuestScreen', { reservationId });
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#17364a' },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0b86d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  subtitle: { color: '#6b7a87', fontWeight: '700', marginTop: 4 },
});
