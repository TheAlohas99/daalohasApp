// AvailabilityScreen — with half-day check-in/out visuals & pull-to-refresh
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
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';

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

/* ------------ Channel → Color helpers ------------- */
const getChannelName = r =>
  String(
    r?.channel_name ?? r?.channel ?? r?.source ?? r?.portal ?? r?.origin ?? '',
  )
    .trim()
    .toLowerCase();

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

export default function AvailabilityScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();

  const { role, properties, propertiesLoading } = useSelector(
    s => ({
      role: s.property.role,
      properties: (s.property && s.property.data) || [],
      propertiesLoading: (s.property && s.property.loading) || false,
    }),
    shallowEqual,
  );

  const { reservationsArray, reservationsLoading, reservationsError } =
    useSelector(
      s => ({
        reservationsArray: (s.reservation && s.reservation.reservations) || [],
        reservationsLoading: (s.reservation && s.reservation.loading) || false,
        reservationsError: (s.reservation && s.reservation.error) || null,
      }),
      shallowEqual,
    );

  const { width: screenWidth } = useWindowDimensions();
  const dayWidth = Math.max(64, Math.floor(screenWidth / 7));

  // state
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [daysCount, setDaysCount] = useState(INITIAL_DAYS);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchWindow = useCallback(
    (propertyId, start, end) => {
      const params = { start, end };
      if (propertyId && isMongoId(propertyId)) params.propertyId = propertyId;
      return dispatch(fetchReservationsByDate(params));
    },
    [dispatch],
  );

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

  const getId = useCallback(
    p => normalizeId(p?._id ?? p?.propertyId ?? p?.id ?? p),
    [],
  );
  const propertyList = useMemo(
    () => (Array.isArray(properties) ? properties : []),
    [properties],
  );
  const filteredProperties = useMemo(() => {
    if (!selectedPropertyIds?.length) return propertyList.filter(p => getId(p));
    const set = new Set(selectedPropertyIds);
    return propertyList.filter(p => set.has(getId(p)));
  }, [propertyList, selectedPropertyIds, getId]);

  const { byPropDate, byPropCheckout, spansByProp } = useMemo(() => {
    const byPropDate_ = Object.create(null);
    const byPropCheckout_ = Object.create(null);
    const spansByProp_ = Object.create(null);
    const wStart = new Date(windowStart);
    const wEndExcl = new Date(windowEndPlus1);

    const addDate = (pid, dateKey, r) => {
      if (!byPropDate_[pid]) byPropDate_[pid] = Object.create(null);
      if (!byPropDate_[pid][dateKey]) byPropDate_[pid][dateKey] = [];
      byPropDate_[pid][dateKey].push(r);
    };
    const addCheckout = (pid, dateKey, r) => {
      if (!byPropCheckout_[pid]) byPropCheckout_[pid] = Object.create(null);
      if (!byPropCheckout_[pid][dateKey]) byPropCheckout_[pid][dateKey] = [];
      byPropCheckout_[pid][dateKey].push(r);
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

      if (eAll >= wStart && eAll <= wEndExcl)
        addCheckout(propId, isoOf(eAll), r);

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

      const channelName = getChannelName(r);
      const color = getChannelColor(channelName);

      spansByProp_[propId].push({
        key: `${normalizeId(
          r._id ?? r.id ?? r.reference ?? Math.random(),
        )}-${startIndex}`,
        name: getGuestName(r),
        startIndex,
        nights,
        dateKey: isoOf(s),
        color,
      });
    });

    Object.keys(spansByProp_).forEach(pid => {
      spansByProp_[pid].sort((a, b) => a.startIndex - b.startIndex);
    });

    return {
      byPropDate: byPropDate_,
      byPropCheckout: byPropCheckout_,
      spansByProp: spansByProp_,
    };
  }, [reservationsArray, windowStart, windowEndPlus1]);

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
  const debouncedSetMonth = useDebounced(
    idx => setCurrentMonth(getMonthLabel(idx)),
    80,
  );
  useEffect(() => {
    setCurrentMonth(getMonthLabel(0));
  }, [dates, getMonthLabel]);

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

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [reopenRid, setReopenRid] = useState(null);
  const [resumeOnFocus, setResumeOnFocus] = useState(false);

  const openCellModal = useCallback((propId, dateKey) => {
    setSelectedCell({ propId, dateKey });
    setReopenRid(null);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setReopenRid(null);
    setResumeOnFocus(false);
  }, []);

  const cellReservations = useMemo(() => {
    if (!selectedCell) return [];
    const { propId, dateKey } = selectedCell;
    return byPropDate[propId]?.[dateKey] ?? [];
  }, [selectedCell, byPropDate]);

  const getResId = useCallback(
    r =>
      normalizeId(
        r?._id ??
          r?.id ??
          r?.reservation_id ??
          r?.booking_id ??
          r?.reference ??
          r,
      ),
    [],
  );

  const cellReservationsOrdered = useMemo(() => {
    if (!reopenRid) return cellReservations;
    const arr = [...cellReservations];
    const i = arr.findIndex(rr => String(getResId(rr)) === String(reopenRid));
    if (i > 0) {
      const [chosen] = arr.splice(i, 1);
      arr.unshift(chosen);
    }
    return arr;
  }, [cellReservations, reopenRid, getResId]);

  const handleCheckInPressFromModal = useCallback(
    reservationId => {
      setReopenRid(String(reservationId));
      setResumeOnFocus(true);
      setModalVisible(false);
      navigation.navigate('GuestScreen', { reservationId });
    },
    [navigation],
  );

  useFocusEffect(
    useCallback(() => {
      if (resumeOnFocus) {
        setModalVisible(true);
        setResumeOnFocus(false);
      }
    }, [resumeOnFocus]),
  );

  const overallLoading =
    propertiesLoading ||
    reservationsLoading ||
    (!propertyList.length && !reservationsError);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        const { email, mobile } = user;
        await dispatch(
          getProperty({ email, mobile: (mobile || '').replace(/^\+/, '') }),
        );
      }
      await fetchWindow('all', windowStartISO, windowEndISO);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, fetchWindow, windowStartISO, windowEndISO]);

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

  return (
    <View style={styles.container}>
      <MultiPropertyPicker
        items={propertyList}
        selectedIds={selectedPropertyIds}
        onChange={setSelectedPropertyIds}
        getId={getId}
      />

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

      <WeekHeader
        headerRef={headerRef}
        dates={dates}
        dayWidth={dayWidth}
        selectedDateIndex={selectedDateIndex}
        setSelectedDateIndex={setSelectedDateIndex}
        syncTo={syncTo}
        contentWidth={contentWidth}
      />

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
            byPropCheckout={byPropCheckout}
            spansByProp={spansByProp}
            selectedDateIndex={selectedDateIndex}
            openCellModal={openCellModal}
            syncTo={syncTo}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0b486b"
            colors={['#0b486b']}
          />
        }
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

      {role === 'owner' ? null : (
        <ReservationDetailsModal
          visible={modalVisible}
          isVisible={modalVisible}
          open={modalVisible}
          onClose={closeModal}
          onRequestClose={closeModal}
          reservations={cellReservationsOrdered}
          initialReservationId={reopenRid}
          onCheckInPress={handleCheckInPressFromModal}
        />
      )}
    </View>
  );
}
