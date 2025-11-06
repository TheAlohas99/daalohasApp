// screens/ReservationsDashboardScreen.js
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  FlatList,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import { fetchReservationsByDates } from '../redux/slice/DashboardReservationSlice';
import { getProperty } from '../redux/slice/PropertySlice';

/* -------------------- Utilities -------------------- */
const displayString = v => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    if (v.$numberInt) return String(v.$numberInt);
    if (v.$numberDouble) return String(v.$numberDouble);
    if (v.$oid) return String(v.$oid);
  }
  return String(v);
};
const toNumber = v => {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }
  if (typeof v === 'object') {
    if (v.$numberInt) return Number(v.$numberInt);
    if (v.$numberDouble) return Number(v.$numberDouble);
  }
  return 0;
};
const fmtINR = n =>
  n || n === 0
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(n)
    : '—';
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  x.setHours(0, 0, 0, 0);
  return x;
};
const ymdLocal = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const toYmd = v => {
  if (v == null || v === '') return '';
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const t = new Date(v);
    return isNaN(t) ? '' : ymdLocal(t);
  }
  return ymdLocal(v);
};
const daysUntilFromToday = yyyyMmDd => {
  const [y, m, d] = (yyyyMmDd || '').split('-').map(Number);
  if (!y || !m || !d) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};
const getAmount = r =>
  toNumber(
    r?.total_amount ??
      r?.amount_total ??
      r?.grand_total ??
      r?.base_amount ??
      r?.per_night_amount ??
      r?.amount ??
      0,
  );
const normalizeId = v => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    if (v._id) return normalizeId(v._id);
    if (v.id) return normalizeId(v.id);
    if (v.$oid) return String(v.$oid);
  }
  return String(v);
};
const getResPropertyId = r =>
  r?.property_id ??
  r?.propertyId ??
  r?.property?.id ??
  r?.property?._id ??
  r?.property?.$oid ??
  r?.property ??
  '';

/* -------------------- Screen -------------------- */

export default function ReservationsDashboardScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();

  const {
    data: apiObj = null,
    reservations: reservationsArray = [],
    loading: reservationsLoading = false,
    error: reservationsError = null,
  } = useSelector(s => s.dashboardreservation || {}, shallowEqual);

  const { properties } = useSelector(
    s => ({ properties: (s.property && s.property.data) || [] }),
    shallowEqual,
  );

  // Load property data on mount
  useEffect(() => {
    (async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          const { email, mobile } = user || {};
          const mobileNoPlus = (mobile || '').replace(/^\+/, '');
          if (email || mobileNoPlus) {
            dispatch(getProperty({ email, mobile: mobileNoPlus }));
          }
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
      }
    })();
  }, [dispatch]);

  const allowedPropertyIds = useMemo(() => {
    const arr = Array.isArray(properties) ? properties : [];
    return new Set(arr.map(p => normalizeId(p?._id ?? p?.id ?? p)));
  }, [properties]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const dateKey = ymdLocal(selectedDate);

  const lastFetchRef = useRef({ date: null, propertyKey: null });

  const propertyIdParam = useMemo(() => {
    const ids = [...allowedPropertyIds].filter(Boolean);
    return ids.length ? ids.join(',') : undefined;
  }, [allowedPropertyIds]);

  const refresh = useCallback(async () => {
    const start = dateKey;
    const end = dateKey;
    const propKey = propertyIdParam || 'all';
    lastFetchRef.current = { date: start, propertyKey: propKey };
    await dispatch(
      fetchReservationsByDates({
        start,
        end,
        propertyId: propertyIdParam || 'all',
      }),
    );
  }, [dispatch, dateKey, propertyIdParam]);

  useEffect(() => {
    refresh();
  }, [refresh, dispatch]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const monthTitle = useMemo(() => {
    try {
      return selectedDate.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [selectedDate]);

  const weekDates = useMemo(() => {
    const arr = [];
    for (let i = -2; i <= 4; i++) arr.push(addDays(selectedDate, i));
    return arr;
  }, [selectedDate]);

  /* ------------ DATA (API or fallback) ------------ */
  const api = useMemo(() => {
    if (apiObj && apiObj.success) return apiObj;

    const list = Array.isArray(reservationsArray) ? reservationsArray : [];
    const filteredByProp = allowedPropertyIds.size
      ? list.filter(r => {
          const pid = normalizeId(getResPropertyId(r));
          return pid && allowedPropertyIds.has(pid);
        })
      : list;

    const arrivalsData = filteredByProp.filter(
      r =>
        toYmd(r.check_in_date || r.checkin_date || r.checkInDate || r.start_date) ===
        dateKey,
    );
    const departuresData = filteredByProp.filter(
      r =>
        toYmd(r.check_out_date || r.checkout_date || r.checkOutDate || r.end_date) ===
        dateKey,
    );
    const stayData = filteredByProp.filter(r => {
      const ci = toYmd(
        r.check_in_date || r.checkin_date || r.checkInDate || r.start_date,
      );
      const co = toYmd(
        r.check_out_date || r.checkout_date || r.checkOutDate || r.end_date,
      );
      if (!ci || !co) return false;
      return ci <= dateKey && co > dateKey;
    });
    const cancelledData = filteredByProp.filter(r => {
      const status = displayString(
        r.reservation_status || r.status || '',
      ).toUpperCase();
      if (status !== 'CANCELLED') return false;
      const cancelDate =
        toYmd(
          r.cancelledAt ||
            r.cancelled_at ||
            r.cancellation_date ||
            r.cancel_date,
        ) || toYmd(r.updatedAt || r.updated_at);
      return cancelDate === dateKey;
    });
    const newReservationsData = filteredByProp.filter(
      r => toYmd(r.createdAt || r.created_at || r.created_on) === dateKey,
    );

    return {
      success: true,
      date: dateKey,
      arrivals: { count: arrivalsData.length, data: arrivalsData },
      departures: { count: departuresData.length, data: departuresData },
      stay: { count: stayData.length, data: stayData },
      cancelled: { count: cancelledData.length, data: cancelledData },
      newReservations: {
        count: newReservationsData.length,
        data: newReservationsData,
      },
      totalBookings:
        stayData.length + arrivalsData.length + departuresData.length,
      totalReservations: filteredByProp.filter(
        r =>
          displayString(
            r.reservation_status || r.status || '',
          ).toUpperCase() !== 'CANCELLED',
      ).length,
    };
  }, [apiObj, reservationsArray, allowedPropertyIds, dateKey]);

  const newAmount = useMemo(
    () =>
      (api?.newReservations?.data || []).reduce((s, r) => s + getAmount(r), 0),
    [api],
  );
  const cancelledAmount = useMemo(
    () => (api?.cancelled?.data || []).reduce((s, r) => s + getAmount(r), 0),
    [api],
  );

  const overallLoading = reservationsLoading;

  /* -------------------- UI -------------------- */

  return (
    <View style={styles.container}>
      {/* Month header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={() => setSelectedDate(d => addDays(d, -7))}
          style={styles.navBtn}
        >
          <Icon name="chevron-left" size={22} color="#17364a" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthTitle}</Text>
        <TouchableOpacity
          onPress={() => setSelectedDate(d => addDays(d, 7))}
          style={styles.navBtn}
        >
          <Icon name="chevron-right" size={22} color="#17364a" />
        </TouchableOpacity>
      </View>

      {/* Date row */}
      <View style={styles.dateStripWrap}>
        <FlatList
          horizontal
          data={weekDates}
          keyExtractor={(d, index) => `${ymdLocal(d)}-${d.getTime()}-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStripContent}
          renderItem={({ item }) => {
            const isSelected = ymdLocal(item) === dateKey;
            return (
              <TouchableOpacity
                style={[styles.dayPill, isSelected && styles.dayPillSelected]}
                onPress={() => setSelectedDate(item)}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.dayText, isSelected && styles.dayTextSelected]}
                >
                  {item.getDate()}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Loading / Error / Content */}
      {overallLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0b486b" />
        </View>
      ) : reservationsError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {displayString(reservationsError)}
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 80 }}
        >
          {/* Big counters */}
          <View style={styles.countersRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('ArrivalsReservation', {
                  date: api?.date || dateKey,
                })
              }
            >
              <Counter title="ARRIVALS" value={api?.arrivals?.count ?? 0} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('DeparturesReservation', {
                  date: api?.date || dateKey,
                })
              }
            >
              <Counter title="DEPARTURES" value={api?.departures?.count ?? 0} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('StayReservation', {
                  date: api?.date || dateKey,
                })
              }
            >
              <Counter title="STAY" value={api?.stay?.count ?? 0} highlight />
            </TouchableOpacity>
          </View>

          {/* Days until chip */}
          <View style={styles.untilWrap}>
            <Text style={styles.untilText}>
              {(() => {
                const d = daysUntilFromToday(api?.date || dateKey);
                if (d === 0) return 'Today';
                if (d > 0) return `In ${d} day${d === 1 ? '' : 's'}`;
                return `${Math.abs(d)} day${d === -1 ? '' : 's'} ago`;
              })()}
            </Text>
          </View>

          {/* Rows with amounts */}
          <View style={styles.listRow}>
            <RowItem
              label="NEW"
              count={api?.newReservations?.count ?? 0}
              amount={newAmount}
              onPress={() =>
                navigation.navigate('NewReservations', {
                  date: api?.date || dateKey,
                })
              }
            />
            <RowItem
              label="CANCELLED"
              count={api?.cancelled?.count ?? 0}
              amount={cancelledAmount}
              onPress={() =>
                navigation.navigate('CancelledReservations', {
                  date: api?.date || dateKey,
                })
              }
            />
          </View>

          {/* Bookings ring */}
          <View style={styles.occCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.occTitle}>TOTAL BOOKINGS</Text>
              <Text style={styles.occSub}>for the selected day</Text>
            </View>
            <View style={styles.ringWrap}>
              <View style={styles.ring}>
                <Text style={styles.ringPct}>
                  {api?.totalBookings ?? api?.stay?.count ?? 0}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/* -------------------- Small components -------------------- */
function Counter({ title, value, highlight }) {
  return (
    <View style={styles.counterBox}>
      <View
        style={[
          styles.counterCircle,
          highlight && styles.counterCircleHighlight,
        ]}
      >
        <Text
          style={[
            styles.counterValue,
            highlight && styles.counterValueHighlight,
          ]}
        >
          {value}
        </Text>
      </View>
      <Text style={styles.counterLabel}>{title}</Text>
    </View>
  );
}

function RowItem({ label, count, amount, onPress }) {
  return (
    <TouchableOpacity
      style={styles.rowItem}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={styles.rowCount}>{count}</Text>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={styles.rowAmount}>{fmtINR(amount)}</Text>
        <Icon name="chevron-right" size={18} color="#96a4b0" />
      </View>
    </TouchableOpacity>
  );
}

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  monthHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  monthTitle: { fontSize: 20, fontWeight: '800', color: '#17364a' },
  navBtn: { padding: 6 },
  dateStripWrap: { height: 60, justifyContent: 'center' },
  dateStripContent: { alignItems: 'center', paddingHorizontal: 12 },
  dayPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e6eef3',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    backgroundColor: '#fff',
  },
  dayPillSelected: { backgroundColor: '#0b86d0', borderColor: '#0b86d0' },
  dayText: { fontWeight: '800', color: '#17364a' },
  dayTextSelected: { color: '#fff' },
  loader: { paddingTop: 40, alignItems: 'center' },
  errorBox: { padding: 12 },
  errorText: { color: '#b00020' },
  countersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  untilWrap: { alignItems: 'center', paddingTop: 6, paddingBottom: 4 },
  untilText: { color: '#6b7a87', fontWeight: '700' },
  counterBox: { alignItems: 'center', justifyContent: 'center' },
  counterCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#e6eef3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  counterCircleHighlight: { borderColor: '#0b86d0' },
  counterValue: { fontSize: 18, fontWeight: '900', color: '#17364a' },
  counterValueHighlight: { color: '#0b86d0' },
  counterLabel: { fontSize: 12, fontWeight: '700', color: '#6b7a87' },
  listRow: { borderTopWidth: 1, borderColor: '#eef3f7', paddingVertical: 4 },
  rowItem: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#eef3f7',
  },
  rowCount: {
    color: '#0b86d0',
    fontWeight: '900',
    fontSize: 16,
    width: 18,
    textAlign: 'right',
  },
  rowLabel: { color: '#17364a', fontWeight: '800', fontSize: 14 },
  rowAmount: { color: '#17364a', fontWeight: '700' },
  occCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  occTitle: { fontWeight: '900', fontSize: 16, color: '#17364a' },
  occSub: { color: '#6b7a87', fontWeight: '700', marginTop: 2 },
  ringWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 6,
    borderColor: '#e6eef3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: { fontWeight: '900', color: '#17364a' },
});
