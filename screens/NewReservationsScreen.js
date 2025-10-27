// screens/NewReservationsScreen.js
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { useRoute } from '@react-navigation/native';
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
const toYmd = v => {
  if (!v) return '';
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const t = new Date(v);
    return isNaN(t) ? '' : ymdLocal(t);
  }
  return ymdLocal(v);
};
const keyFor = (item, index) =>
  String(item?._id ?? item?.id ?? item?.reservation_id ?? `row-${index}`);

// Match your modal reference logic
const refId = r =>
  r?.reservation_id ??
  r?.reference ??
  r?._id ??
  r?.id ??
  r?.booking_id ??
  r?.pnr ??
  null;

/* -------------------- screen -------------------- */
export default function NewReservationsScreen() {
  const route = useRoute();
  const dispatch = useDispatch();
  const selectedDate = route.params?.date || ymdLocal(new Date());

  const { role } = useSelector(
    s => ({ role: s.property.role }),
    shallowEqual,
  );

  const { data } = useSelector(s => s.dashboardreservation || {}, shallowEqual);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialId, setModalInitialId] = useState(null);

  // All new reservations already fetched on the dashboard
  const listAll = useMemo(() => data?.newReservations?.data || [], [data]);

  // Filter by selected date defensively (createdAt bucket)
  const list = useMemo(() => {
    return listAll.filter(r => {
      const created = toYmd(r?.createdAt || r?.created_at || r?.created_on);
      return created === selectedDate;
    });
  }, [listAll, selectedDate]);

  const headerDateLabel = (() => {
    const d = new Date(selectedDate);
    const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
    const month = d.toLocaleDateString(undefined, { month: 'short' });
    return `${weekday}, ${month} ${d.getDate()}`;
  })();

  const onCardPress = useCallback(item => {
    const id = refId(item);
    setModalInitialId(id || null);
    setModalOpen(true);
  }, []);

  useEffect(() => {
    (async () => {
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
    })();
  }, [dispatch]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.title}>New</Text>
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
            No new reservations.
          </Text>
        }
        renderItem={({ item }) => (
          <ReservationCard item={item} onPress={() => onCardPress(item)} />
        )}
      />

      {/* Details modal */}
      {role === 'owner' ? null : (
        <ReservationDetailsModal
          visible={modalOpen}
          onClose={() => setModalOpen(false)}
          onRequestClose={() => setModalOpen(false)}
          reservations={list}
          initialReservationId={modalInitialId}
        />
      )}
    </View>
  );
}

/* -------------------- styles (screen-only) -------------------- */
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
