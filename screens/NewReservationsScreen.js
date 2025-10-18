// screens/NewReservationsScreen.js
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ReservationDetailsModal from '../components/ReservationDetailsModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProperty } from '../redux/slice/PropertySlice';

/* -------------------- channel color -------------------- */
const getChannelColor = name => {
  const n = String(name || '').toLowerCase();
  if (n.includes('airbnb')) return '#FF5A5F';
  if (n.includes('alohas')) return '#7EC8FF';
  if (n.includes('make') || n.includes('makemytrip')) return '#2ECC71';
  if (n.includes('direct')) return '#FF8A80';
  if (n.includes('agoda')) return '#FFA500';
  if (n.includes('booking')) return '#003580';
  if (n) return '#9B59B6';
  return '#9B59B6';
};

/* -------------------- helpers -------------------- */
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
const monthShort = i =>
  [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][i] || '';
const parseDateParts = yyyyMmDd => {
  const [y, m, d] = (yyyyMmDd || '').split('-').map(Number);
  if (!y || !m || !d) return { d: '', mon: '', y: '' };
  return { d: String(d), mon: monthShort(m - 1), y: String(y) };
};
const daysBetween = (start, end) => {
  try {
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((e - s) / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
};
const nnum = v => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }
  if (v && typeof v === 'object') {
    if (v.$numberInt) return Number(v.$numberInt);
    if (v.$numberDouble) return Number(v.$numberDouble);
  }
  return 0;
};
const firstName = name => {
  if (!name) return '—';
  const s = String(name).trim();
  const [first] = s.split(/\s+/);
  return first || s;
};
const keyFor = (item, index) =>
  String(item?._id ?? item?.id ?? item?.reservation_id ?? `row-${index}`);

// Try to match what your modal's pick.reference(r) will return.
// Adjust the priority order if your data shape differs.
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
    s => ({
      role: s.property.role,
    }),
    shallowEqual,
  );
  console.log(role);

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
          dispatch(
            getProperty({ email, mobile: (mobile || '').replace(/^\+/, '') }),
          );
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
      {role === 'owner' ? (
        ''
      ) : (
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

/* -------------------- card -------------------- */
function ReservationCard({ item, onPress }) {
  // Dates
  const ci = toYmd(
    item?.check_in_date ||
      item?.checkin_date ||
      item?.checkInDate ||
      item?.start_date,
  );
  const co = toYmd(
    item?.check_out_date ||
      item?.checkout_date ||
      item?.checkOutDate ||
      item?.end_date,
  );
  const { d: d1, mon: m1, y: y1 } = parseDateParts(ci);
  const { d: d2, mon: m2, y: y2 } = parseDateParts(co);

  // Counts
  const adults = nnum(item?.adults ?? item?.adult_count);
  const children = nnum(item?.children ?? item?.child_count);
  const persons = Math.max(1, adults + children);
  const nights = daysBetween(ci, co);

  // Labels
  const property =
    item?.property_title ||
    item?.property?.name ||
    item?.propertyTitle ||
    item?.property ||
    'Property';
  const booker = firstName(
    item?.booker_first_name ||
      item?.guestName ||
      item?.primary_guest ||
      item?.customer_name,
  );
  const channel = item?.channel_name || item?.channel || item?.source || '';

  // Channel chip color
  const chipColor = getChannelColor(channel);

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#eef3f7' }}
      style={styles.card}
    >
      {/* Left date rail */}
      <View style={styles.dateRail}>
        <Text style={styles.dateBig}>
          {d1} <Text style={styles.dateMon}>{m1}</Text>
        </Text>
        <View style={styles.dateDivider} />
        <Text style={styles.dateSmall}>
          {d2} <Text style={styles.dateMon}>{m2}</Text>
        </Text>
        <Text style={styles.dateYear}>{y2 || y1}</Text>

        <View style={{ height: 8 }} />
        <View style={styles.iconRow}>
          <Icon name="account-outline" size={16} color="#0b86d0" />
          <Text style={styles.iconTxt}>{persons}</Text>
          <Icon
            name="moon-waning-crescent"
            size={16}
            color="#0b86d0"
            style={{ marginLeft: 8 }}
          />
          <Text style={styles.iconTxt}>{nights}</Text>
        </View>
      </View>

      {/* Right content */}
      <View style={styles.cardBody}>
        {!!channel && (
          <View style={[styles.channelChip, { backgroundColor: chipColor }]}>
            <Text style={styles.channelChipText}>{channel}</Text>
          </View>
        )}

        {/* Property title */}
        <Text style={styles.unitTitle}>{property}</Text>

        {/* Booker first name */}
        <Text style={styles.booker}>Booked by: {booker}</Text>

        {/* Check-in → Check-out inline */}
        <View style={styles.datesRow}>
          <Icon name="calendar-arrow-right" size={16} color="#6b7a87" />
          <Text style={styles.datesText}>
            {ci} → {co}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/* -------------------- styles -------------------- */
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#17364a',
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0b86d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6b7a87',
    fontWeight: '700',
    marginTop: 4,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ebf1f6',
    overflow: 'hidden',
  },

  // Left rail
  dateRail: {
    width: 88,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#f2f5f8',
    alignItems: 'flex-start',
  },
  dateBig: { fontSize: 16, fontWeight: '900', color: '#17364a' },
  dateSmall: {
    fontSize: 16,
    fontWeight: '900',
    color: '#17364a',
    marginTop: 6,
  },
  dateMon: { color: '#17364a', fontWeight: '700' },
  dateYear: { marginTop: 2, color: '#6b7a87', fontWeight: '700' },
  dateDivider: {
    width: 12,
    height: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#0b86d0',
    marginVertical: 4,
    marginLeft: 6,
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  iconTxt: { color: '#0b86d0', fontWeight: '800', marginLeft: 4 },

  // Right body
  cardBody: { flex: 1, padding: 12 },

  channelChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  channelChipText: { color: '#ffffff', fontWeight: '800' },

  unitTitle: { fontSize: 16, fontWeight: '900', color: '#17364a' },
  booker: { marginTop: 2, color: '#6b7a87', fontWeight: '700' },

  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  datesText: { color: '#17364a', fontWeight: '700' },
});
