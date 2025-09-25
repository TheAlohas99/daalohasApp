// AvailabilityScreen — composed from split components (multi-picker)
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';

import styles from '../styles/availabilityStyles';
import SText from '../components/SText';
import WeekHeader from '../components/WeekHeader';
import PropertyRow from '../components/PropertyRow';
import MultiPropertyPicker from '../components/MultiPropertyPicker';

import { getProperty } from '../redux/slice/PropertySlice';
import { fetchReservationsByDate } from '../redux/slice/ReservationSlice';
import ReservationDetailsModal from '../components/ReservationDetailsModal';

import {
  INITIAL_DAYS,
  CHUNK_DAYS,
  MAX_DAYS,
  MAX_NIGHTS_PER_RES,
} from '../constants/availability';
import {
  displayString,
  isMongoId,
  normalizeId,
  getGuestName,
} from '../utils/display';
import { addDays, clampDate, isoOf } from '../utils/date';
import useDebounced from '../hooks/useDebounced';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AvailabilityScreen() {
  const dispatch = useDispatch();

  const { properties, propertiesLoading } = useSelector(
    s => ({
      properties: (s.property && s.property.data) || [],
      propertiesLoading: (s.property && s.property.loading) || false,
    }),
    shallowEqual,
  );

  console.log(properties);

  const { reservationsArray, reservationsLoading, reservationsError } =
    useSelector(
      s => ({
        reservationsArray: (s.reservation && s.reservation.reservations) || [],
        reservationsLoading: (s.reservation && s.reservation.loading) || false,
        reservationsError: (s.reservation && s.reservation.error) || null,
      }),
      shallowEqual,
    );

  // layout
  const { width: screenWidth } = useWindowDimensions();
  const dayWidth = Math.max(64, Math.floor(screenWidth / 7));

  // state
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([]); // [] => All
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [daysCount, setDaysCount] = useState(INITIAL_DAYS);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  // dates window
  const dates = useMemo(() => {
    const list = [];
    for (let i = 0; i < daysCount; i++) {
      const d = addDays(startDate, i);
      d._iso = d.toISOString().slice(0, 10);
      list.push(d);
    }
    return list;
  }, [startDate, daysCount]);

  const windowStart = useMemo(
    () => dates[0] ?? addDays(startDate, 0),
    [dates, startDate],
  );
  const windowEnd = useMemo(
    () => dates[dates.length - 1] ?? addDays(startDate, INITIAL_DAYS - 1),
    [dates, startDate],
  );
  const windowEndPlus1 = useMemo(() => addDays(windowEnd, 1), [windowEnd]);
  const windowStartISO = useMemo(() => isoOf(windowStart), [windowStart]);
  const windowEndISO = useMemo(() => isoOf(windowEnd), [windowEnd]);

  // fetch boot
  // useEffect(() => {
  //     dispatch(getProperty({ email:"ankush@thealohas.com", mobile:"917282088791" }));
  // }, [dispatch]);
  useEffect(() => {
    (async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          const { email, mobile } = user;
          dispatch(getProperty({ email, mobile: mobile.replace(/^\+/, '') }));
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
      }
    })();
  }, [dispatch]);

  const fetchWindow = useCallback(
    (propertyId, start, end) => {
      const params = { start, end };
      if (propertyId && isMongoId(propertyId)) params.propertyId = propertyId;
      dispatch(fetchReservationsByDate(params));
    },
    [dispatch],
  );

  // dedupe window fetches — always fetch ALL; filter client-side
  const lastFetchRef = useRef({ pid: null, s: null, e: null });
  useEffect(() => {
    if (!dates.length) return;
    const pid = 'all';
    if (
      lastFetchRef.current.pid === pid &&
      lastFetchRef.current.s === windowStartISO &&
      lastFetchRef.current.e === windowEndISO
    )
      return;
    lastFetchRef.current = { pid, s: windowStartISO, e: windowEndISO };
    fetchWindow('all', windowStartISO, windowEndISO);
  }, [dates.length, windowStartISO, windowEndISO, fetchWindow]);

  // property filtering
  const getId = useCallback(
    p => normalizeId(p?._id ?? p?.propertyId ?? p?.id ?? p),
    [],
  );
  const propertyList = useMemo(
    () => (Array.isArray(properties) ? properties : []),
    [properties],
  );
  const filteredProperties = useMemo(() => {
    if (!selectedPropertyIds?.length) return propertyList.filter(p => getId(p)); // ALL
    const set = new Set(selectedPropertyIds);
    return propertyList.filter(p => set.has(getId(p)));
  }, [propertyList, selectedPropertyIds, getId]);

  // pre-index reservations
  const { byPropDate, spansByProp } = useMemo(() => {
    const byPropDate_ = Object.create(null);
    const spansByProp_ = Object.create(null);
    const wStart = new Date(windowStart);
    const wEndExcl = new Date(windowEndPlus1);

    const addDate = (pid, dateKey, r) => {
      if (!byPropDate_[pid]) byPropDate_[pid] = Object.create(null);
      if (!byPropDate_[pid][dateKey]) byPropDate_[pid][dateKey] = [];
      byPropDate_[pid][dateKey].push(r);
    };

    reservationsArray?.forEach(r => {
      const propId = normalizeId(
        r.propertyId?._id ??
          r.property_id?._id ??
          r.property?._id ??
          r.propertyId ??
          r.property_id ??
          r.property,
      );
      if (!propId) return;

      const rawStart =
        r.check_in_date || r.checkin_date || r.checkInDate || r.start_date;
      const rawEnd =
        r.check_out_date || r.checkout_date || r.checkOutDate || r.end_date;
      if (!rawStart || !rawEnd) return;

      const sAll = addDays(rawStart, 0);
      const eAll = addDays(rawEnd, 0);
      if (!(sAll < wEndExcl && eAll > wStart)) return;

      const s = clampDate(sAll, wStart, wEndExcl);
      const e = clampDate(eAll, wStart, wEndExcl);

      const nights = Math.min(
        Math.max(0, Math.round((e - s) / (1000 * 60 * 60 * 24))),
        MAX_NIGHTS_PER_RES,
      );
      if (!nights) return;

      const d = new Date(s);
      for (let i = 0; i < nights; i++) {
        addDate(propId, isoOf(d), r);
        d.setDate(d.getDate() + 1);
      }

      const startIndex = Math.max(
        0,
        Math.round((s - wStart) / (1000 * 60 * 60 * 24)),
      );
      if (!spansByProp_[propId]) spansByProp_[propId] = [];
      spansByProp_[propId].push({
        key: `${normalizeId(
          r._id ?? r.id ?? r.reference ?? Math.random(),
        )}-${startIndex}`,
        name: getGuestName(r),
        startIndex,
        nights,
        dateKey: isoOf(s),
      });
    });

    Object.keys(spansByProp_).forEach(pid => {
      spansByProp_[pid].sort((a, b) => a.startIndex - b.startIndex);
    });

    return { byPropDate: byPropDate_, spansByProp: spansByProp_ };
  }, [reservationsArray, windowStart, windowEndPlus1]);

  // month label
  const getMonthLabel = React.useCallback(
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
  const debouncedSetMonth = useDebounced(
    idx => setCurrentMonth(getMonthLabel(idx)),
    80,
  );
  useEffect(() => {
    setCurrentMonth(getMonthLabel(0));
  }, [dates, getMonthLabel]);

  // scroll sync
  const headerRef = useRef(null);
  const rowRefsRef = useRef({});
  const syncingRef = useRef(false);
  const scrollXRef = useRef(0);

  const contentWidth = useMemo(
    () => dayWidth * dates.length,
    [dayWidth, dates.length],
  );

  const syncTo = useCallback(
    (x, sourceKey) => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      const xr = Math.max(0, Math.round(x));
      scrollXRef.current = xr;

      const firstIndex = Math.max(0, Math.floor(xr / dayWidth));
      debouncedSetMonth(firstIndex);

      if (sourceKey !== 'header' && headerRef.current?.scrollTo) {
        headerRef.current.scrollTo({ x: xr, animated: false });
      }
      Object.entries(rowRefsRef.current).forEach(([key, ref]) => {
        if (key !== sourceKey && ref?.scrollTo)
          ref.scrollTo({ x: xr, animated: false });
      });

      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    },
    [dayWidth, debouncedSetMonth],
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const x = scrollXRef.current;
      headerRef.current?.scrollTo?.({ x, animated: false });
      Object.values(rowRefsRef.current).forEach(ref =>
        ref?.scrollTo?.({ x, animated: false }),
      );
    });
    return () => cancelAnimationFrame(id);
  }, [contentWidth]);

  // modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const openCellModal = React.useCallback((propId, dateKey) => {
    setSelectedCell({ propId, dateKey });
    setModalVisible(true);
  }, []);
  const closeModal = React.useCallback(() => setModalVisible(false), []);
  const cellReservations = useMemo(() => {
    if (!selectedCell) return [];
    const { propId, dateKey } = selectedCell;
    return byPropDate[propId]?.[dateKey] ?? [];
  }, [selectedCell, byPropDate]);

  // loading / error
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
      {/* Multi property picker (ALL by default) */}
      <MultiPropertyPicker
        items={propertyList}
        selectedIds={selectedPropertyIds}
        onChange={setSelectedPropertyIds}
        getId={getId}
      />

      {/* Month header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={() => setStartDate(prev => addDays(prev, -7))}
          style={styles.monthNav}
        >
          <Icon name="chevron-left" size={24} color="#0b486b" />
        </TouchableOpacity>

        <View style={styles.monthCenter}>
          <SText style={styles.monthTitle}>{currentMonth}</SText>
        </View>

        <TouchableOpacity
          onPress={() => setStartDate(prev => addDays(prev, 7))}
          style={styles.monthNav}
        >
          <Icon name="chevron-right" size={24} color="#0b486b" />
        </TouchableOpacity>
      </View>

      {/* Week header (scroll-synced) */}
      <WeekHeader
        headerRef={headerRef}
        dates={dates}
        dayWidth={dayWidth}
        selectedDateIndex={selectedDateIndex}
        setSelectedDateIndex={setSelectedDateIndex}
        syncTo={syncTo}
        contentWidth={contentWidth}
      />

      {/* Properties list */}
      <FlatList
        data={filteredProperties}
        keyExtractor={p => getId(p)}
        renderItem={({ item }) => (
          <PropertyRow
            property={item}
            getId={getId}
            dates={dates}
            dayWidth={dayWidth}
            contentWidth={contentWidth}
            rowRefsRef={rowRefsRef}
            byPropDate={byPropDate}
            spansByProp={spansByProp}
            selectedDateIndex={selectedDateIndex}
            openCellModal={openCellModal}
            syncTo={syncTo}
          />
        )}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        getItemLayout={(_, index) => ({
          length: 72 + 10 + 10,
          offset: (72 + 20) * index,
          index,
        })}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* Load more days */}
      {daysCount < MAX_DAYS && (
        <TouchableOpacity
          style={{ alignSelf: 'center', marginVertical: 8, padding: 8 }}
          onPress={() =>
            setDaysCount(prev => Math.min(prev + CHUNK_DAYS, MAX_DAYS))
          }
        >
          <Text style={{ color: '#0b86d0', fontWeight: '800' }}>
            Load 30 more days
          </Text>
        </TouchableOpacity>
      )}

      {/* Details Modal */}
      <ReservationDetailsModal
        visible={modalVisible}
        isVisible={modalVisible}
        open={modalVisible}
        onClose={closeModal}
        onRequestClose={closeModal}
        reservations={cellReservations}
      />
    </View>
  );
}
