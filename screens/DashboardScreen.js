// ReservationsDashboardScreen.js
// Dashboard from reservations API for a single selected date

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { getProperty } from '../redux/slice/PropertySlice';
import { fetchReservationsByDate } from '../redux/slice/ReservationSlice';

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

const normalizeId = v =>
  typeof v === 'string' ? v : displayString(v?._id ?? v?.id ?? v?.$oid ?? '');

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
const isoDate = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
};

/** 👉 Days from TODAY to a given YYYY-MM-DD arrival date.
 *  returns negative if the date already passed, 0 if today, positive if upcoming.
 */
const daysUntilFromToday = yyyyMmDd => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(yyyyMmDd);
  target.setHours(0, 0, 0, 0);
  const diffMs = target - today;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();

  // slices
  const { data: properties = [], loading: propertiesLoading } = useSelector(
    s => s.property || {},
  );
  const {
    reservations: reservationsArray = [],
    loading: reservationsLoading = false,
    error: reservationsError = null,
  } = useSelector(s => s.reservation);

  // state
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // fetch properties once
  useEffect(() => {
    dispatch(getProperty());
  }, [dispatch]);

  // fetch reservations for a 1-day window around selectedDate (inclusive)
  const refresh = useCallback(() => {
    const start = isoDate(selectedDate);
    const end = isoDate(selectedDate);
    // Let the thunk decide whether to include propertyId (it filters out "all")
    dispatch(
      fetchReservationsByDate({ start, end, propertyId: selectedProperty }),
    );
  }, [dispatch, selectedDate, selectedProperty]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const propertyList = useMemo(
    () => (Array.isArray(properties) ? properties : []),
    [properties],
  );

  // derive month title
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

  // Quick week strip (centered on selectedDate)
  const weekDates = useMemo(() => {
    const arr = [];
    for (let i = -2; i <= 4; i++) arr.push(addDays(selectedDate, i));
    return arr;
  }, [selectedDate]);

  // filter by selected property (or all)
  const getPropId = p => normalizeId(p?._id ?? p?.propertyId ?? p?.id ?? p);
  const selectedPropExists =
    selectedProperty === 'all' ||
    propertyList.some(p => getPropId(p) === selectedProperty);

  useEffect(() => {
    if (!selectedPropExists) setSelectedProperty('all');
  }, [selectedPropExists]);

  // compute for the selected date
  const dateKey = isoDate(selectedDate);

  const filteredReservations = useMemo(() => {
    const list = Array.isArray(reservationsArray) ? reservationsArray : [];
    const inProp =
      selectedProperty === 'all'
        ? () => true
        : r => {
            const pid = normalizeId(
              r.propertyId?._id ??
                r.property_id?._id ??
                r.property?._id ??
                r.propertyId ??
                r.property_id ??
                r.property,
            );
            return pid === selectedProperty;
          };

    return list.filter(r => {
      const ci = displayString(
        r.check_in_date || r.checkin_date || r.checkInDate || r.start_date,
      );
      const co = displayString(
        r.check_out_date || r.checkout_date || r.checkOutDate || r.end_date,
      );
      // half-open day occupancy: ci <= dateKey && co > dateKey
      return inProp(r) && ci <= dateKey && co > dateKey;
    });
  }, [reservationsArray, selectedProperty, dateKey]);

  // Arrivals = check_in_date === dateKey (respect property filter)
  const arrivals = useMemo(() => {
    const list = Array.isArray(reservationsArray) ? reservationsArray : [];
    return list.filter(r => {
      const ci = displayString(
        r.check_in_date || r.checkin_date || r.checkInDate || r.start_date,
      );
      if (ci !== dateKey) return false;
      if (selectedProperty === 'all') return true;
      const pid = normalizeId(
        r.propertyId?._id ??
          r.property_id?._id ??
          r.property?._id ??
          r.propertyId ??
          r.property_id ??
          r.property,
      );
      return pid === selectedProperty;
    });
  }, [reservationsArray, selectedProperty, dateKey]);

  // Departures = check_out_date === dateKey
  const departures = useMemo(() => {
    const list = Array.isArray(reservationsArray) ? reservationsArray : [];
    return list.filter(r => {
      const co = displayString(
        r.check_out_date || r.checkout_date || r.checkOutDate || r.end_date,
      );
      if (co !== dateKey) return false;
      if (selectedProperty === 'all') return true;
      const pid = normalizeId(
        r.propertyId?._id ??
          r.property_id?._id ??
          r.property?._id ??
          r.propertyId ??
          r.property_id ??
          r.property,
      );
      return pid === selectedProperty;
    });
  }, [reservationsArray, selectedProperty, dateKey]);

  // Stay = filteredReservations (overnights on that date)
  const stay = filteredReservations;

  // Totals by reservation_status for the selected date window (we’ll consider arrivals+stays+departures union)
  const windowReservations = useMemo(() => {
    const list = Array.isArray(reservationsArray) ? reservationsArray : [];
    // Include any reservation overlapping selected date
    return list.filter(r => {
      const ci = displayString(
        r.check_in_date || r.checkin_date || r.checkInDate || r.start_date,
      );
      const co = displayString(
        r.check_out_date || r.checkout_date || r.checkOutDate || r.end_date,
      );
      const overlaps = ci <= dateKey && co > dateKey;
      if (!overlaps) return false;
      if (selectedProperty === 'all') return true;
      const pid = normalizeId(
        r.propertyId?._id ??
          r.property_id?._id ??
          r.property?._id ??
          r.propertyId ??
          r.property_id ??
          r.property,
      );
      return pid === selectedProperty;
    });
  }, [reservationsArray, selectedProperty, dateKey]);

  const sumByStatus = statusName => {
    let total = 0;
    windowReservations.forEach(r => {
      const st = displayString(
        r.reservation_status || r.status || '',
      ).toUpperCase();
      if (st === statusName) {
        const amt =
          r.total_amount ??
          r.amount_total ??
          r.grand_total ??
          r.base_amount ??
          r.per_night_amount;
        total += toNumber(amt);
      }
    });
    return total;
  };

  const totalNew = sumByStatus('NEW');
  const totalModified = sumByStatus('MODIFIED');
  const totalCancelled = sumByStatus('CANCELLED');

  // Occupancy: booked properties / total properties (for the chosen scope)
  const totalProps = useMemo(() => {
    if (selectedProperty !== 'all') return 1;
    return propertyList.filter(p => getPropId(p)).length || 0;
  }, [propertyList, selectedProperty]);

  const occupiedPropIds = useMemo(() => {
    const ids = new Set();
    stay.forEach(r => {
      const pid = normalizeId(
        r.propertyId?._id ??
          r.property_id?._id ??
          r.property?._id ??
          r.propertyId ??
          r.property_id ??
          r.property,
      );
      if (pid) ids.add(pid);
    });
    if (selectedProperty !== 'all')
      return new Set(stay.length ? [selectedProperty] : []);
    return ids;
  }, [stay, selectedProperty]);

  const occupancyPct = totalProps
    ? Math.round((occupiedPropIds.size / totalProps) * 100)
    : 0;

  const overallLoading = propertiesLoading || reservationsLoading;

  // UI
  return (
    <View style={styles.container}>
      {/* Top property picker (uncomment if you want the dropdown) */}
      {/* <View style={styles.topBar}>
        <Picker
          selectedValue={selectedProperty}
          onValueChange={val => setSelectedProperty(val)}
          mode="dropdown"
          style={styles.picker}
        >
          <Picker.Item label="All Properties" value="all" />
          {propertyList.map(p => {
            const id = getPropId(p);
            const title = displayString(p.title ?? p.name ?? p.internal_name ?? p.property_title ?? id);
            return <Picker.Item key={id || title} label={title} value={id} />;
          })}
        </Picker>
      </View> */}

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

      {/* Date row (like screenshot) */}
      <View style={styles.dateStripWrap}>
        <FlatList
          horizontal
          data={weekDates}
          keyExtractor={d => d.toISOString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStripContent}
          renderItem={({ item }) => {
            const isSelected = isoDate(item) === dateKey;
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

      {/* Loading / Error */}
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
        <>
          {/* Big counters row */}
          <View style={styles.countersRow}>
            <Counter title="ARRIVALS" value={arrivals.length} />
            <Counter title="DEPARTURES" value={departures.length} />
            <Counter title="STAY" value={stay.length} highlight />
          </View>

          {/* Example: days until the selected date from today (remove if not needed) */}
          <View style={styles.untilWrap}>
            <Text style={styles.untilText}>
              {(() => {
                const d = daysUntilFromToday(dateKey);
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
              count={countStatus(windowReservations, 'NEW')}
              amount={totalNew}
            />
            <RowItem
              label="MODIFIED"
              count={countStatus(windowReservations, 'MODIFIED')}
              amount={totalModified}
            />
            <RowItem
              label="CANCELLED"
              count={countStatus(windowReservations, 'CANCELLED')}
              amount={totalCancelled}
            />
          </View>

          {/* Occupancy card */}
          <View style={styles.occCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.occTitle}>CRUSHING IT!</Text>
              <Text style={styles.occSub}>Your occupancy is</Text>
            </View>
            <View style={styles.ringWrap}>
              <View style={styles.ring}>
                <Text style={styles.ringPct}>{occupancyPct}%</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

/* ---------- Small components ---------- */

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

function RowItem({ label, count, amount }) {
  return (
    <View style={styles.rowItem}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={styles.rowCount}>{count}</Text>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={styles.rowAmount}>{fmtINR(amount)}</Text>
        <Icon name="chevron-right" size={18} color="#96a4b0" />
      </View>
    </View>
  );
}

function countStatus(list, statusName) {
  const s = String(statusName || '').toUpperCase();
  return list.reduce((acc, r) => {
    const st = (r?.reservation_status || r?.status || '')
      .toString()
      .toUpperCase();
    return acc + (st === s ? 1 : 0);
  }, 0);
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  topBar: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2 },
  picker: { color: '#17364a' },

  monthHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  monthTitle: { fontSize: 20, fontWeight: '800', color: '#17364a' },
  navBtn: { padding: 6 },

  // ✅ Fix: constrain the date strip's height so FlatList doesn't eat vertical space
  dateStrip: { height: 60 }, // adjust to your pill size
  dateStripContent: { paddingHorizontal: 12, alignItems: 'center' },

  dateStripWrap: {
    height: 60, // 👈 matches pill size, prevents extra blank space
    justifyContent: 'center', // vertically center pills
  },
  dateStripContent: {
    alignItems: 'center', // keep pills aligned
    paddingHorizontal: 12,
  },
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

  // optional "days until" chip
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
