// AvailabilityScreen.js — 0/1 availability, seamless range color, safe property filter
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getProperty } from '../redux/slice/PropertySlice';
import { fetchReservationsByDate } from '../redux/slice/ReservationSlice';

// ===== Tunables =====
const ROW_HEIGHT = 72;
const DAY_HEADER_HEIGHT = 58;
const MONTH_HEADER_HEIGHT = 56;

const INITIAL_DAYS = 60;
const CHUNK_DAYS   = 30;
const MAX_DAYS     = 240;

// Range-bar visuals (booked color)
const RANGE_COLOR = '#0b9bf0';
const RANGE_BAR_HEIGHT = 6;

// ===== Utils =====
const displayString = v => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (!v.length) return '';
    const f = v[0];
    if (typeof f === 'string' || typeof f === 'number') return v.join(', ');
    if (f?.url) return String(f.url);
    if (f?.title) return String(f.title);
    try { const js = JSON.stringify(v); if (js.length < 120) return js; } catch {}
    return '';
  }
  if (typeof v === 'object') {
    if (v._id) return displayString(v._id);
    if (v.$oid) return String(v.$oid);
    if (v.$numberInt) return String(v.$numberInt);
    if (v.$numberDouble) return String(v.$numberDouble);
    if (v.title) return String(v.title);
    if (v.name) return String(v.name);
    if (v.city) return displayString(v.city);
    if (v.url) return String(v.url);
    try { const js = JSON.stringify(v); if (js && js !== '{}' && js.length < 120) return js; } catch {}
    return '';
  }
  return String(v);
};

const isMongoId = v => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

const normalizeId = v => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    if (v._id) return displayString(v._id);
    if (v.id) return displayString(v.id);
    if (v.$oid) return displayString(v.$oid);
  }
  return displayString(v);
};

function SText({ children, style, numberOfLines, ...rest }) {
  const content =
    children == null
      ? ''
      : typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : displayString(children);
  return (
    <Text style={style} numberOfLines={numberOfLines} {...rest}>
      {content}
    </Text>
  );
}

const formatRate = v => {
  if (v == null) return '-';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    if (v.$numberInt) return String(v.$numberInt);
    if (v.$numberDouble) return String(v.$numberDouble);
    if (v.per_night_amount) return formatRate(v.per_night_amount);
    if (v.base_amount) return formatRate(v.base_amount);
  }
  return '-';
};

const useDebounced = (fn, delay = 80) => {
  const r = useRef({ t: null, fn });
  r.current.fn = fn;
  return useCallback((...args) => {
    if (r.current.t) clearTimeout(r.current.t);
    r.current.t = setTimeout(() => r.current.fn(...args), delay);
  }, [delay]);
};

// Date helpers
const isoOf = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  x.setHours(0, 0, 0, 0);
  return x;
};

// For modal details
const diffNights = (start, end) =>
  Math.max(0, Math.round((addDays(end,0) - addDays(start,0)) / (1000*60*60*24)));
const extract = {
  name: r =>
    r?.booker_name ??
    r?.guest_name ??
    r?.guestName ??
    r?.guest?.name ??
    r?.primary_guest_name ??
    r?.name ??
    'Guest',
  phone: r => r?.phone ?? r?.guest_phone ?? r?.guest?.phone ?? r?.contact ?? '',
  email: r => r?.email ?? r?.guest_email ?? r?.guest?.email ?? '',
  status: r => (r?.reservation_status ?? r?.status ?? r?.booking_status ?? '').toString(),
  amount: r =>
    r?.total_amount ??
    r?.amount_total ??
    r?.grand_total ??
    r?.base_amount ??
    r?.per_night_amount ??
    '—',
  id: r => r?._id ?? r?.id ?? r?.reservation_id ?? r?.booking_id ?? r?.reference ?? null,
};
const fmtDate = d => {
  try {
    const x = new Date(d);
    return x.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return displayString(d); }
};

// ===== Screen =====
export default function AvailabilityScreen() {
  const dispatch = useDispatch();

  // property slice
  const { data: properties = [], loading: propertiesLoading } =
    useSelector(s => s.property || {});

  // reservations slice
  const {
    reservations: reservationsArray = [],
    loading: reservationsLoading = false,
    error: reservationsError = null,
  } = useSelector(s => s.reservation);

  const { width: screenWidth } = useWindowDimensions();
  const dayWidth = Math.max(64, Math.floor(screenWidth / 7)); // full-width rows

  const [selectedProperty, setSelectedProperty] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [daysCount, setDaysCount] = useState(INITIAL_DAYS);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  // dates in window
  const dates = useMemo(() => {
    const list = [];
    for (let i = 0; i < daysCount; i++) {
      const d = addDays(startDate, i);
      d._iso = d.toISOString().slice(0, 10);
      list.push(d);
    }
    return list;
  }, [startDate, daysCount]);

  // fetch property list
  useEffect(() => { dispatch(getProperty()); }, [dispatch]);

  // fetch reservations for current window (SAFE propertyId)
  const fetchWindow = useCallback(
    (propertyId, start, end) => {
      // Send propertyId ONLY if it's a valid 24-hex id; never send "all"
      const params = { start, end };
      if (propertyId && isMongoId(propertyId)) {
        params.propertyId = propertyId;
      }
      dispatch(fetchReservationsByDate(params));
    },
    [dispatch],
  );

  useEffect(() => {
    if (!dates.length) return;
    const startIso = dates[0]._iso;
    const endIso = dates[dates.length - 1]._iso;
    fetchWindow(selectedProperty, startIso, endIso);
  }, [dates, selectedProperty, fetchWindow]);

  // Normalize
  const propertyList = useMemo(
    () => (Array.isArray(properties) ? properties : []),
    [properties],
  );
  const reservationList = useMemo(
    () => (Array.isArray(reservationsArray) ? reservationsArray : []),
    [reservationsArray],
  );

  const getId = useCallback(p => normalizeId(p?._id ?? p?.propertyId ?? p?.id ?? p), []);

  const filteredProperties = useMemo(() => {
    if (selectedProperty === 'all') return propertyList.filter(p => getId(p));
    return propertyList.filter(p => getId(p) === selectedProperty);
  }, [propertyList, selectedProperty, getId]);

  // If selected property disappears, fallback to "all"
  useEffect(() => {
    if (
      selectedProperty !== 'all' &&
      !propertyList.some(p => getId(p) === selectedProperty)
    ) {
      setSelectedProperty('all');
    }
  }, [propertyList, selectedProperty, getId]);

  // propertyId -> dateISO -> [reservations including that night]
  const reservationsByPropertyDate = useMemo(() => {
    const map = Object.create(null);
    const add = (pid, dateKey, r) => {
      if (!map[pid]) map[pid] = Object.create(null);
      if (!map[pid][dateKey]) map[pid][dateKey] = [];
      map[pid][dateKey].push(r);
    };
    reservationList.forEach(r => {
      const propId = normalizeId(
        r.propertyId?._id ??
        r.property_id?._id ??
        r.property?._id ??
        r.propertyId ??
        r.property_id ??
        r.property
      );
      if (!propId) return;

      const start =
        r.check_in_date || r.checkin_date || r.checkInDate || r.start_date;
      const end =
        r.check_out_date || r.checkout_date || r.checkOutDate || r.end_date;
      if (!start || !end) return;

      // Occupied nights: [checkIn .. checkOut)
      const s = addDays(start, 0);
      const e = addDays(end, 0);
      for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
        add(propId, isoOf(d), r);
      }
    });
    return map;
  }, [reservationList]);

  // start / middle / end / single for a cell (for the seamless top bar)
  const getRangeType = (dateObj, reservationsForNight) => {
    if (!reservationsForNight || !reservationsForNight.length) return null;
    const r = reservationsForNight[0];
    const start =
      r.check_in_date || r.checkin_date || r.checkInDate || r.start_date;
    const end =
      r.check_out_date || r.checkout_date || r.checkOutDate || r.end_date;
    if (!start || !end) return null;

    const s = addDays(start, 0);
    const e = addDays(end, 0);
    const lastOccupied = addDays(e, -1);
    const isStart = isoOf(dateObj) === isoOf(s);
    const isLast = isoOf(dateObj) === isoOf(lastOccupied);

    if (isStart && isLast) return 'single';
    if (isStart) return 'start';
    if (isLast) return 'end';
    return 'middle';
  };

  // Month label
  const getMonthLabel = useCallback(
    firstIndex => {
      const start = dates[firstIndex] || dates[0];
      const end =
        dates[Math.min(firstIndex + 6, dates.length - 1)] ||
        dates[dates.length - 1];
      if (!start || !end) return '';
      const sM = start.toLocaleDateString(undefined, { month: 'long' });
      const sY = start.getFullYear();
      const eM = end.toLocaleDateString(undefined, { month: 'long' });
      const eY = end.getFullYear();
      if (sM === eM && sY === eY) return `${sM} ${sY}`;
      if (sY === eY) return `${sM} / ${eM} ${sY}`;
      return `${sM} ${sY} / ${eM} ${eY}`;
    },
    [dates],
  );
  const [currentMonth, setCurrentMonth] = useState(() => getMonthLabel(0));
  const debouncedSetMonth = useDebounced((idx) => setCurrentMonth(getMonthLabel(idx)), 80);

  // When date window changes (e.g., via arrows), recompute header immediately
  useEffect(() => {
    setCurrentMonth(getMonthLabel(0));
  }, [dates, getMonthLabel]);

  // Shared viewability config for consistent month updates
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 50 });

  // ===== Modal state (details) =====
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null); // { propId, dateKey }
  const openCellModal = useCallback((propId, dateKey) => {
    setSelectedCell({ propId, dateKey });
    setModalVisible(true);
  }, []);
  const closeModal = useCallback(() => setModalVisible(false), []);
  const cellReservations = useMemo(() => {
    if (!selectedCell) return [];
    const { propId, dateKey } = selectedCell;
    return reservationsByPropertyDate[propId]?.[dateKey] ?? [];
  }, [selectedCell, reservationsByPropertyDate]);

  // ===== Header: weekdays (horizontal) =====
  const WeekHeader = React.memo(function WeekHeader({ viewabilityConfig }) {
    return (
      <FlatList
        horizontal
        data={dates}
        keyExtractor={d => d._iso}
        showsHorizontalScrollIndicator
        initialNumToRender={7}
        maxToRenderPerBatch={7}
        windowSize={7}
        removeClippedSubviews
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: dayWidth,
          offset: dayWidth * index,
          index,
        })}
        onViewableItemsChanged={({ viewableItems }) => {
          if (!viewableItems?.length) return;
          const first = viewableItems[0];
          if (first?.index != null) debouncedSetMonth(first.index);
        }}
        renderItem={({ item, index }) => {
          const selected = index === selectedDateIndex;
          return (
            <TouchableOpacity
              onPress={() => setSelectedDateIndex(index)}
              activeOpacity={0.8}
              style={[
                styles.dayHeaderCell,
                { width: dayWidth },
                selected && styles.dayHeaderCellSelected,
              ]}
            >
              <SText style={[styles.weekdayText, selected && { color: '#fff' }]}>
                {item.toLocaleDateString(undefined, { weekday: 'short' })}
              </SText>
              <View style={[styles.dateBadge, selected && styles.dateBadgeSelected]}>
                <SText style={[
                  styles.dateBadgeText,
                  selected && styles.dateBadgeTextSelected
                ]}>
                  {item.getDate()}
                </SText>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    );
  });

  // ===== Property row =====
  const PropertyRow = React.memo(function PropertyRow({ property, onFirstVisibleIndex, viewabilityConfig }) {
    const propId = getId(property);

    // One horizontal list of cells for this property
    const renderCell = useCallback(
      ({ item: date, index }) => {
        const dateKey = date._iso;
        const reservations = reservationsByPropertyDate[propId]?.[dateKey] ?? [];
        const hasBooked = reservations.length > 0;

        const displayRate =
          hasBooked
            ? formatRate(reservations[0].per_night_amount ?? reservations[0].base_amount)
            : formatRate(property.baseRate ?? property.base_amount ?? property.starting_from_price);

        // 0/1 availability as requested
        const availabilityText = hasBooked ? '0' : '1';

        // Range bar for continuous booked color
        const rangeType = hasBooked ? getRangeType(date, reservations) : null;

        const Wrapper = hasBooked ? TouchableOpacity : View;
        const props = hasBooked
          ? { activeOpacity: 0.85, onPress: () => openCellModal(propId, dateKey) }
          : {};

        return (
          <Wrapper
            style={[
              styles.cell,
              { width: dayWidth },
              index === selectedDateIndex && styles.cellSelected,
            ]}
            {...props}
          >
            {/* Seamless top range bar (only when booked) */}
            {rangeType && (
              <View
                style={[
                  styles.rangeBarBase,
                  rangeType === 'start'  && styles.rangeStart,
                  rangeType === 'middle' && styles.rangeMiddle,
                  rangeType === 'end'    && styles.rangeEnd,
                  rangeType === 'single' && styles.rangeSingle,
                ]}
              />
            )}

            {/* availability small number on top (0 or 1) */}
            <SText
              style={[
                styles.smallAvail,
                hasBooked ? styles.smallAvailBooked : styles.smallAvailFree,
              ]}
            >
              {availabilityText}
            </SText>

            {/* rate */}
            <SText style={styles.rateText}>
              {displayString(displayRate)}
            </SText>
          </Wrapper>
        );
      },
      [dayWidth, openCellModal, propId, property, reservationsByPropertyDate, selectedDateIndex],
    );

    return (
      <View style={styles.propertyGroup}>
        {/* Title band like your screenshot */}
        <View style={styles.propertyBand}>
          <SText style={styles.propertyBandText} numberOfLines={2}>
            {displayString(
              property.title ??
              property.name ??
              property.internal_name ??
              property.property_title
            )}
          </SText>
        </View>

        {/* Row: calendar cells for this property */}
        <FlatList
          horizontal
          data={dates}
          keyExtractor={d => `${propId}-${d._iso}`}
          renderItem={renderCell}
          showsHorizontalScrollIndicator={false}
          initialNumToRender={7}
          maxToRenderPerBatch={7}
          windowSize={7}
          removeClippedSubviews
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={({ viewableItems }) => {
            if (!viewableItems?.length) return;
            const first = viewableItems[0];
            if (first?.index != null && typeof onFirstVisibleIndex === 'function') {
              onFirstVisibleIndex(first.index);
            }
          }}
          getItemLayout={(_, index) => ({
            length: dayWidth,
            offset: dayWidth * index,
            index,
          })}
        />

        {/* Caption like screenshot */}
        <View style={styles.captionRow}>
          <View style={styles.dot} />
          <SText style={styles.captionText} numberOfLines={1}>
            {displayString(
              (property.title ??
                property.name ??
                property.internal_name ??
                property.property_title) +
              (property.city ? `, ${displayString(property.city)}` : '')
            )}
          </SText>
        </View>
      </View>
    );
  });

  // Loading / Error
  const overallLoading =
    propertiesLoading ||
    reservationsLoading ||
    (!propertyList.length && !reservationsError);

  if (overallLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0b486b" />
      </View>
    );
  }

  if (reservationsError) {
    return (
      <View style={styles.loader}>
        <SText style={{ color: '#b00020', padding: 16 }}>
          {displayString(reservationsError)}
        </SText>
      </View>
    );
  }

  // UI
  return (
    <View style={styles.container}>
      {/* Property picker */}
      <View>
        <Picker
          selectedValue={selectedProperty}
          onValueChange={val => setSelectedProperty(val)}
          mode="dropdown"
        >
          <Picker.Item label="All properties" value="all" />
          {propertyList.map(p => {
            const id = getId(p);
            return (
              <Picker.Item
                key={id || Math.random().toString()}
                label={displayString(
                  p.title ?? p.name ?? p.internal_name ?? p.property_title,
                )}
                value={id}
              />
            );
          })}
        </Picker>
      </View>

      {/* Month header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={() => {
            setStartDate(prev => addDays(prev, -7)); // move window back by a week
          }}
          style={styles.monthNav}
        >
          <Icon name="chevron-left" size={24} color="#0b486b" />
        </TouchableOpacity>

        <View style={styles.monthCenter}>
          <SText style={styles.monthTitle}>{currentMonth}</SText>
        </View>

        <TouchableOpacity
          onPress={() => {
            setStartDate(prev => addDays(prev, 7)); // move window forward by a week
          }}
          style={styles.monthNav}
        >
          <Icon name="chevron-right" size={24} color="#0b486b" />
        </TouchableOpacity>
      </View>

      {/* Weekdays strip */}
      <WeekHeader viewabilityConfig={viewabilityConfigRef.current} />

      {/* Properties list */}
      <FlatList
        data={filteredProperties}
        keyExtractor={p => getId(p) || Math.random().toString()}
        renderItem={({ item }) => (
          <PropertyRow
            property={item}
            onFirstVisibleIndex={(idx) => debouncedSetMonth(idx)}
            viewabilityConfig={viewabilityConfigRef.current}
          />
        )}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT + 84,
          offset: (ROW_HEIGHT + 84) * index,
          index,
        })}
        onEndReachedThreshold={0.2}
        onEndReached={() =>
          setDaysCount(prev => (prev >= MAX_DAYS ? prev : Math.min(prev + CHUNK_DAYS, MAX_DAYS)))
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* Details Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <SText style={styles.modalTitle}>Reservation Details</SText>
              <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
                <Icon name="close" size={22} color="#0b486b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              {cellReservations.length === 0 ? (
                <SText style={{ color: '#333' }}>No reservations for this date.</SText>
              ) : (
                cellReservations.map((r, idx) => {
                  const name = extract.name(r);
                  const phone = extract.phone(r);
                  const email = extract.email(r);
                  const status = extract.status(r);
                  const checkIn =
                    r.check_in_date || r.checkin_date || r.checkInDate || r.start_date;
                  const checkOut =
                    r.check_out_date || r.checkout_date || r.checkOutDate || r.end_date;
                  const nights = checkIn && checkOut ? diffNights(checkIn, checkOut) : '—';
                  const amount = extract.amount(r);
                  const resId = extract.id(r) || `res-${idx}`;

                  return (
                    <View key={String(resId)} style={styles.card}>
                      <SText style={styles.cardTitle}>{name}</SText>

                      <View style={styles.cardRow}>
                        <SText style={styles.cardLabel}>Status</SText>
                        <SText style={styles.cardValue}>{displayString(status)}</SText>
                      </View>

                      <View style={styles.cardRow}>
                        <SText style={styles.cardLabel}>Check-in</SText>
                        <SText style={styles.cardValue}>{fmtDate(checkIn)}</SText>
                      </View>

                      <View style={styles.cardRow}>
                        <SText style={styles.cardLabel}>Check-out</SText>
                        <SText style={styles.cardValue}>{fmtDate(checkOut)}</SText>
                      </View>

                      <View style={styles.cardRow}>
                        <SText style={styles.cardLabel}>Nights</SText>
                        <SText style={styles.cardValue}>{String(nights)}</SText>
                      </View>

                      <View style={styles.cardRow}>
                        <SText style={styles.cardLabel}>Amount</SText>
                        <SText style={styles.cardValue}>{displayString(amount)}</SText>
                      </View>

                      {phone ? (
                        <View style={styles.cardRow}>
                          <SText style={styles.cardLabel}>Phone</SText>
                          <SText style={styles.cardValue}>{displayString(phone)}</SText>
                        </View>
                      ) : null}

                      {email ? (
                        <View style={styles.cardRow}>
                          <SText style={styles.cardLabel}>Email</SText>
                          <SText style={styles.cardValue}>{displayString(email)}</SText>
                        </View>
                      ) : null}

                      {extract.id(r) ? (
                        <View style={styles.cardRow}>
                          <SText style={styles.cardLabel}>Reference</SText>
                          <SText style={styles.cardValue}>{displayString(extract.id(r))}</SText>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  monthHeader: {
    height: MONTH_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#e6eef3',
    paddingHorizontal: 4,
  },
  monthNav: { width: 56, alignItems: 'center', justifyContent: 'center' },
  monthCenter: { flex: 1, alignItems: 'center' },
  monthTitle: { fontSize: 20, fontWeight: '700', color: '#0b486b' },

  // Week header
  dayHeaderCell: {
    height: DAY_HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#eef6fb',
    backgroundColor: '#fff',
  },
  dayHeaderCellSelected: { backgroundColor: '#0b86d0' },
  weekdayText: { fontSize: 12, fontWeight: '700', color: '#51616e' },
  dateBadge: {
    marginTop: 4, width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f1f4f7',
  },
  dateBadgeSelected: { backgroundColor: '#fff' },
  dateBadgeText: { fontSize: 13, color: '#111', fontWeight: '800' },
  dateBadgeTextSelected: { color: '#0b486b' },

  // Property section
  propertyGroup: {
    marginTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#e9f1f6',
  },
  propertyBand: {
    backgroundColor: '#0b486b',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  propertyBandText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    textTransform: 'uppercase',
  },

  // Cells
  cell: {
    height: ROW_HEIGHT,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#e9f1f6',
    paddingTop: 6,
    paddingHorizontal: 6,
    justifyContent: 'flex-start',
    backgroundColor: '#f8fcff',
    overflow: 'hidden',
  },
  cellSelected: {
    backgroundColor: '#d9efff',
    borderColor: '#0b86d0',
    borderWidth: 1,
  },
  smallAvail: { position: 'absolute', top: 6, left: 8, fontSize: 14, fontWeight: '800' },
  smallAvailBooked: { color: '#d43f3f' }, // red "0"
  smallAvailFree: { color: '#19a464' },   // green "1"

  rateText: { marginTop: 20, fontSize: 18, fontWeight: '800', color: '#0b486b' },

  // Seamless range bar (covers borders with slight overlap)
  rangeBarBase: {
    position: 'absolute',
    top: 0,
    height: RANGE_BAR_HEIGHT,
    backgroundColor: RANGE_COLOR,
    zIndex: 3,
  },
  // start night: right half, overlap right border
  rangeStart: {
    left: '50%',
    right: -1, // overlap to hide border gap
    borderTopRightRadius: RANGE_BAR_HEIGHT,
    borderBottomRightRadius: RANGE_BAR_HEIGHT,
  },
  // middle night: full width with slight overlap both sides
  rangeMiddle: {
    left: -1,
    right: -1,
  },
  // end night: left half, overlap left border
  rangeEnd: {
    left: -1,
    right: '50%',
    borderTopLeftRadius: RANGE_BAR_HEIGHT,
    borderBottomLeftRadius: RANGE_BAR_HEIGHT,
  },
  // one-night stay
  rangeSingle: {
    left: -1,
    right: -1,
    borderRadius: RANGE_BAR_HEIGHT,
  },

  // Caption
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#cc2836', marginRight: 8,
  },
  captionText: { fontWeight: '800', color: '#17364a' },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    maxHeight: '75%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e7eef3',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0b486b', flex: 1 },
  modalClose: { padding: 6 },
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e7eef3',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fafcfe',
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0b486b', marginBottom: 8 },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cardLabel: { fontWeight: '700', color: '#506070' },
  cardValue: { fontWeight: '600', color: '#17364a' },
});
