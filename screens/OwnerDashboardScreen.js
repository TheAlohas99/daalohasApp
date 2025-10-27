// OwnerDashboardScreen.js

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReservationCard from '../components/ReservationCard';
import SixMonthSummaryTable from '../components/ReservationModals/SixMonthSummaryTable'; // Assuming this is imported

// Import DateTimePicker
import DateTimePicker from '@react-native-community/datetimepicker';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { getProperty } from '../redux/slice/PropertySlice';

const BRAND = {
  primary: '#0b86d0',
  primaryDark: '#0b486b',
  bg: '#f3f7fb',
  card: '#ffffff',
  text: '#17364a',
  muted: '#65798a',
  border: '#e2e8f0',
  success: '#19a974',
  danger: '#d64545',
};

const API_BASE = 'https://api.daalohas.com/api/v1';

function toYmd(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${day}`;
}

function moneyINR(n) {
  const num = Number(n || 0);
  return num.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
}

export default function OwnerDashboardScreen() {
  const [mode, setMode] = useState('month'); // 'month', 'range', 'summary'
  const [date, setDate] = useState(new Date());
  const [from, setFrom] = useState(new Date());
  const [to, setTo] = useState(new Date());
  const dispatch = useDispatch();

  const [pickerState, setPickerState] = useState({ show: false, which: null });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({
    totalReservation: 0,
    totalAmount: 0,
    range: null,
  });
  const [list, setList] = useState([]);
  const [lastSixMonth, setLastSixMonths] = useState([]);
  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState(null);
  // ✨ NEW STATE: Tracks if the user is viewing the detailed reservation list for a month
  const [isViewingMonthDetails, setIsViewingMonthDetails] = useState(false);

  // Use properties from Redux and extract IDs
  const { properties } = useSelector(
    s => ({
      properties: (s.property && s.property.data) || [],
      propertiesLoading: (s.property && s.property.loading) || false,
    }),
    shallowEqual,
  );

  // Derive a comma-separated string of property IDs for the API
  const propertyIdsString = useMemo(() => {
    const ids = properties.map(p => p._id).filter(Boolean);
    return ids.join(',');
  }, [properties]);

  const rangeHuman = useMemo(() => {
    if (mode === 'summary' && selectedSummaryMonth) {
      return selectedSummaryMonth.monthLabel;
    }
    if (!summary?.range) return '—';
    return `${summary.range.from} → ${summary.range.to}`;
  }, [summary, mode, selectedSummaryMonth]);

  const buildUrl = useCallback(() => {
    let dateParams;

    if (mode === 'range') {
      dateParams = `date=${encodeURIComponent(
        toYmd(from),
      )}&end=${encodeURIComponent(toYmd(to))}`;
    } else if (mode === 'month') {
      dateParams = `date=${encodeURIComponent(toYmd(date))}`;
    } else if (mode === 'summary' && selectedSummaryMonth) {
      // Use the selected month's date to fetch its detailed reservations
      const monthDate = new Date(
        selectedSummaryMonth.year,
        selectedSummaryMonth.month - 1,
        1,
      );
      dateParams = `date=${encodeURIComponent(toYmd(monthDate))}`;
    } else {
      // Default to current month, which is safe for initial load/summary mode initialization
      dateParams = `date=${encodeURIComponent(toYmd(new Date()))}`;
    }

    let fullQuery = dateParams;
    if (propertyIdsString) {
      fullQuery += `&propertyId=${propertyIdsString}`;
    }

    return `${API_BASE}/reservations/by-month?${fullQuery}`;
  }, [mode, date, from, to, propertyIdsString, selectedSummaryMonth]);

  // Handler to fetch data (used by month/range/refresh)
  const fetchData = useCallback(async () => {
    setError('');
    setLoading(true);

    try {
      const url = buildUrl();
      const token = await AsyncStorage.getItem('AUTH_TOKEN');

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || 'Failed to fetch');

      // Always update the lastSixMonth data if it's present in the response
      const sixMonths = Array.isArray(data?.lastSixMonths)
        ? data.lastSixMonths
        : lastSixMonth;
      setLastSixMonths(sixMonths);

      // Update Summary and List based on the current mode and selection
      if (mode === 'summary' && selectedSummaryMonth) {
        setSummary({
          totalReservation: selectedSummaryMonth.totalReservation || 0,
          totalAmount: selectedSummaryMonth.totalAmount || 0,
          range: data?.range || null,
        });
      } else {
        setSummary({
          totalReservation: Number(data?.totalReservation || 0),
          totalAmount: Number(data?.totalAmount || 0),
          range: data?.range || null,
        });
      }

      // Update the main list with detailed reservations
      setList(Array.isArray(data?.reservations) ? data.reservations : []);
    } catch (e) {
      setError(e?.message || 'Something went wrong');
      setList([]);
      setSummary({ totalReservation: 0, totalAmount: 0, range: null });
    } finally {
      setLoading(false);
    }
  }, [buildUrl, mode, selectedSummaryMonth, lastSixMonth]);

  // Handler for mode change button clicks
  const handleModeChange = useCallback(
    async newMode => {
      setMode(newMode);
      setList([]);
      setSelectedSummaryMonth(null);
      // Reset details view when switching mode
      setIsViewingMonthDetails(false); // ✨ NEW: Reset view state

      if (newMode === 'summary') {
        // 1. Fetch the summary data (initial call)
        await fetchData();

        // 2. After the fetch, automatically select the latest month
        //    *but DO NOT trigger details view yet* (just show the table)
        setLastSixMonths(prevSixMonths => {
          if (prevSixMonths.length > 0) {
            const latestMonth = prevSixMonths[prevSixMonths.length - 1];
            setSelectedSummaryMonth(latestMonth);

            // Set the summary cards to show the latest month's total immediately
            setSummary({
              totalReservation: latestMonth.totalReservation,
              totalAmount: latestMonth.totalAmount,
              range: {
                from: latestMonth.monthLabel,
                to: latestMonth.monthLabel,
              },
            });
          } else {
            setSelectedSummaryMonth(null);
            setSummary({ totalReservation: 0, totalAmount: 0, range: null });
          }
          return prevSixMonths;
        });
      }
    },
    [fetchData],
  );

  // Handler for clicking a month row in the summary table
  const onSelectSummaryMonth = useCallback(monthData => {
    // 1. Set the component to show the details view
    setIsViewingMonthDetails(true); // ✨ NEW: Switch to details view

    // 2. Clear list and set loading
    setList([]);

    // 3. Update selection state (triggers the dedicated useEffect for data fetch)
    setSelectedSummaryMonth(monthData);

    // 4. Update summary cards immediately (to prevent flicker)
    setSummary({
      totalReservation: monthData.totalReservation,
      totalAmount: monthData.totalAmount,
      range: { from: monthData.monthLabel, to: monthData.monthLabel },
    });
  }, []);

  // ✨ NEW: Handler to go back to the summary table
  const handleBackToSummary = useCallback(() => {
    setIsViewingMonthDetails(false);
    setList([]); // Clear the detailed list

    // Optionally reset summary to reflect the last selected month's aggregate
    if (selectedSummaryMonth) {
      setSummary({
        totalReservation: selectedSummaryMonth.totalReservation,
        totalAmount: selectedSummaryMonth.totalAmount,
        range: {
          from: selectedSummaryMonth.monthLabel,
          to: selectedSummaryMonth.monthLabel,
        },
      });
    } else {
      setSummary({ totalReservation: 0, totalAmount: 0, range: null });
    }
  }, [selectedSummaryMonth]);

  // 1. Initial/Month/Range fetch logic
  useEffect(() => {
    if (mode === 'month' || (mode === 'range' && list.length === 0)) {
      fetchData();
    }
  }, [mode, date, propertyIdsString]);

  // 2. Dedicated useEffect for Summary Mode detailed list fetch
  useEffect(() => {
    // This runs *only* when in summary mode AND a month has been selected
    // AND we are switching to the details view.
    if (mode === 'summary' && selectedSummaryMonth && isViewingMonthDetails) {
      fetchData();
    }
  }, [mode, selectedSummaryMonth, propertyIdsString, isViewingMonthDetails]);

  // Fetch properties only once on mount (existing logic)
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const openPicker = which => setPickerState({ show: true, which });

  const onPick = (event, selectedDate) => {
    if (event.type === 'dismissed')
      return setPickerState({ show: false, which: null });

    const d = selectedDate || new Date();
    if (pickerState.which === 'date') setDate(d);
    if (pickerState.which === 'from') setFrom(d);
    if (pickerState.which === 'to') setTo(d);

    setPickerState({ show: false, which: null });
  };

  const navigateMonth = useCallback(
    increment =>
      setDate(
        prev => new Date(prev.getFullYear(), prev.getMonth() + increment, 1),
      ),
    [],
  );

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.switchRow}>
        <TouchableOpacity
          onPress={() => handleModeChange('summary')}
          style={[
            styles.switchBtn,
            mode === 'summary' && styles.switchBtnActive,
          ]}
        >
          <Text
            style={[
              styles.switchText,
              mode === 'summary' && styles.switchTextActive,
            ]}
          >
            Last 6 Months
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleModeChange('month')}
          style={[styles.switchBtn, mode === 'month' && styles.switchBtnActive]}
        >
          <Text
            style={[
              styles.switchText,
              mode === 'month' && styles.switchTextActive,
            ]}
          >
            By Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleModeChange('range')}
          style={[styles.switchBtn, mode === 'range' && styles.switchBtnActive]}
        >
          <Text
            style={[
              styles.switchText,
              mode === 'range' && styles.switchTextActive,
            ]}
          >
            Custom Range
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'month' ? (
        <View style={styles.controlRow}>
          <TouchableOpacity
            onPress={() => navigateMonth(-1)}
            style={styles.navBtn}
          >
            <Text style={styles.navBtnTxt}>{'‹'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => openPicker('date')}
          >
            <Text style={styles.dateBtnTxt}>
              {date?.toLocaleString('en-IN', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigateMonth(1)}
            style={styles.navBtn}
          >
            <Text style={styles.navBtnTxt}>{'›'}</Text>
          </TouchableOpacity>
        </View>
      ) : mode === 'range' ? (
        <View style={styles.rangeRow}>
          <TouchableOpacity
            style={styles.rangeBtn}
            onPress={() => openPicker('from')}
          >
            <Text style={styles.rangeBtnLbl}>From</Text>
            <Text style={styles.rangeBtnVal}>{toYmd(from)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rangeBtn}
            onPress={() => openPicker('to')}
          >
            <Text style={styles.rangeBtnLbl}>To</Text>
            <Text style={styles.rangeBtnVal}>{toYmd(to)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.applyBtn} onPress={fetchData}>
            <Text style={styles.applyBtnTxt}>Apply</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {mode === 'summary' ? (
        null
      ) : (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Range</Text>
            <Text style={styles.summaryValue}>{rangeHuman || '—'}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Reservations</Text>
            <Text style={styles.summaryValue}>{summary.totalReservation}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.summaryValue}>
              {moneyINR(summary.totalAmount)}
            </Text>
          </View>
        </View>
      )}

      {pickerState.show && (
        <DateTimePicker
          value={
            pickerState.which === 'date'
              ? date
              : pickerState.which === 'from'
              ? from
              : to
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPick}
          maximumDate={new Date(2100, 11, 31)}
          minimumDate={new Date(2000, 0, 1)}
        />
      )}
    </View>
  );

  const keyFor = (item, idx) =>
    String(
      item?._id ??
        item?.reservation_id ??
        item?.id ??
        item?.booking_id ??
        item?.pnr ??
        idx,
    );

  // Component to display the main content area (either table or list)
  const MainContent = () => {
    // 1. Show Loading/Error states first
    if (loading && list.length === 0) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.muted}>
            {mode === 'summary'
              ? 'Loading summary...'
              : 'Loading reservations…'}
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 2. Handle Summary Mode Rendering (Table vs List)
    if (mode === 'summary') {
      if (!isViewingMonthDetails && lastSixMonth.length > 0) {
        // Show the summary table
        return (
          <View style={{ paddingHorizontal: 12 }}>
            <SixMonthSummaryTable
              data={lastSixMonth}
              selectedMonth={selectedSummaryMonth}
              onSelectMonth={onSelectSummaryMonth}
            />
          </View>
        );
      }

      if (isViewingMonthDetails) {
        // Show the detailed reservation list with the back button
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.summaryBackRow}>
              <TouchableOpacity
                onPress={handleBackToSummary}
                style={styles.backBtn}
              >
                <Text style={styles.backBtnTxt}>{'‹ Back to Summary'}</Text>
              </TouchableOpacity>
              {loading && (
                <ActivityIndicator
                  size="small"
                  color={BRAND.primary}
                  style={{ marginLeft: 10 }}
                />
              )}
            </View>

            <FlatList
              data={list}
              keyExtractor={keyFor}
              renderItem={({ item }) => <ReservationCard item={item} />}
              contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={BRAND.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.centerPad}>
                  <Text style={styles.muted}>
                    No reservations found for {selectedSummaryMonth?.monthLabel}
                    .
                  </Text>
                </View>
              }
            />
          </View>
        );
      }

      // If summary mode, but no data, show a message
      return (
        <View style={styles.centerPad}>
          <Text style={styles.muted}>No summary data available.</Text>
        </View>
      );
    }

    // 3. Handle Month/Range Mode Rendering (Always shows the list)
    return (
      <FlatList
        data={list}
        keyExtractor={keyFor}
        renderItem={({ item }) => <ReservationCard item={item} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.centerPad}>
            <Text style={styles.muted}>No reservations in this range.</Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <Header />
      <MainContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  header: {
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: BRAND.bg,
  },
  switchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  switchBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  switchBtnActive: { borderColor: BRAND.primary, backgroundColor: '#e7f4fd' },
  switchText: { color: BRAND.muted, fontWeight: '600', textAlign: 'center' },
  switchTextActive: { color: BRAND.primaryDark },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  // ... (Other existing styles like navBtn, dateBtn, rangeRow, applyBtn, etc.)

  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 10,
    padding: 10,
  },
  summaryLabel: { fontSize: 12, color: BRAND.muted, marginBottom: 4 },
  summaryValue: { fontSize: 14, color: BRAND.text, fontWeight: '700' },
  center: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  centerPad: { padding: 32, alignItems: 'center' },
  muted: { color: BRAND.muted },
  errorText: { color: BRAND.danger, marginBottom: 12, textAlign: 'center' },
  retryBtn: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryTxt: { color: '#fff', fontWeight: '700' },

  // ✨ NEW STYLES FOR SUMMARY BACK BUTTON
  summaryBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: BRAND.bg,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  backBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  backBtnTxt: {
    color: BRAND.primary,
    fontWeight: '600',
    fontSize: 15,
  },

  // Re-include placeholder styles that were likely omitted in my previous snippet:
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnTxt: { fontSize: 22, color: BRAND.text, marginTop: -2 },
  dateBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBtnTxt: { fontSize: 16, fontWeight: '700', color: BRAND.primaryDark },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 10,
  },
  rangeBtnLbl: { fontSize: 12, color: BRAND.muted, marginBottom: 2 },
  rangeBtnVal: { fontSize: 15, color: BRAND.text, fontWeight: '600' },
  applyBtn: {
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.primary,
  },
  applyBtnTxt: { color: '#fff', fontWeight: '700' },
});
