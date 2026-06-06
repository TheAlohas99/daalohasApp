import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ReservationDetailsModal from '../components/ReservationDetailsModal';
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

export default function NewReservationsScreen() {
  const route = useRoute();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const selectedDate = route.params?.date || ymdLocal(new Date());
  
  // Safe Redux selection mapping configuration
  const { role } = useSelector(s => ({ role: s.property?.role }), shallowEqual);
  const { data } = useSelector(
    s => s.dashboardreservation || {},
    shallowEqual,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Derive pre-filtered dashboard database lists safely
  const list = useMemo(() => data?.newReservations?.data || [], [data]);
  const badgeCount = list.length;

  const headerDateLabel = useMemo(() => {
    const d = new Date(selectedDate);
    if (Number.isNaN(d.getTime())) return '—';
    const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
    const month = d.toLocaleDateString(undefined, { month: 'short' });
    return `${weekday}, ${month} ${d.getDate()}`;
  }, [selectedDate]);

  const onCardPress = useCallback(item => {
    const id = refId(item);
    if (!id) return;
    setSelectedReservationId(id);
    setModalOpen(true);
  }, []);

  const fetchData = useCallback(async (isMounted) => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson && isMounted) {
        const user = JSON.parse(userJson) || {};
        const email = user.email;
        const mobile = user.mobile || '';
        
        dispatch(
          getProperty({ email, mobile: mobile.replace(/^\+/, '') }),
        );
      }
    } catch (error) {
      console.error('Error querying profile data tokens inside dashboard list:', error);
    }
  }, [dispatch]);

  // Combined listener with full clean-up tracking checks
  useEffect(() => {
    let isMounted = true;
    fetchData(isMounted);
    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, [fetchData]);

  const showModal = role !== 'owner';

  return (
    <View style={styles.container}>
      {/* Header Container Area */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.title}>New</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{headerDateLabel}</Text>
      </View>

      {/* Main Reservation Stack Grid */}
      <FlatList
        data={list}
        keyExtractor={keyFor}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <Text style={{ color: '#6b7a87', paddingHorizontal: 4, paddingTop: 8 }}>
            No new reservations.
          </Text>
        }
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#0b86d0"
            colors={['#0b86d0']} 
          />
        }
        renderItem={({ item }) => (
          <ReservationCard item={item} onPress={() => onCardPress(item)} />
        )}
      />

      {/* Conditional Detailed Overlay Modal sheet */}
      {showModal && !!selectedReservationId && (
        <ReservationDetailsModal
          key={selectedReservationId}
          visible={modalOpen}
          onClose={() => setModalOpen(false)}
          onRequestClose={() => setModalOpen(false)}
          reservationId={selectedReservationId}
          onCheckInPress={reservationId => {
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