// redux/slice/DashboardReservation.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseUrl = 'https://api.daalohas.com';

/* -------------------- helpers -------------------- */
const resId = (r) =>
  String(
    r?._id ??
    r?.id ??
    r?.reservation_id ??
    r?.booking_id ??
    r?.invoice_id ??
    `${r?.check_in_date}-${r?.check_out_date}-${r?.guest_name || ''}-${r?.propertyId || ''}`
  );

const dedupeById = (arr = []) => {
  const seen = new Set();
  return arr.filter((r) => {
    const id = resId(r);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/* -------------------- thunk: /by-dates -------------------- */
export const fetchReservationsByDates = createAsyncThunk(
  'dashboardreservation/fetchReservationsByDates',
  async ({ start, end, propertyId = 'all' }, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return rejectWithValue('No token found, please log in again');

      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      if (propertyId && propertyId !== 'all') params.set('propertyId', propertyId);

      const { data } = await axios.get(
        `${baseUrl}/api/v1/reservations/by-dates?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // merge + de-dupe for legacy list
      const merged = [
        ...(data?.arrivals?.data || []),
        ...(data?.departures?.data || []),
        ...(data?.stay?.data || []),
        ...(data?.cancelled?.data || []),
        ...(data?.newReservations?.data || []),
      ];
      const legacyReservations = dedupeById(merged);

      return {
        data,                              // bucketed API object
        reservations: legacyReservations,  // flat list for old UIs
        count: Number(data?.totalReservations ?? legacyReservations.length ?? 0),
        meta: { start, end, propertyId: propertyId || 'all' },
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to fetch reservations by dates'
      );
    }
  }
);

/* -------------------- slice -------------------- */
/** IMPORTANT: we'll mount this reducer under key 'dashboardreservation' in the store */
const dashboardReservationSlice = createSlice({
  name: 'dashboardreservation',
  initialState: {
    data: null,            // full /by-dates response (buckets)
    reservations: [],      // flat, de-duped array (legacy)
    total: 0,

    loading: false,
    error: null,

    lastQuery: null,
  },
  reducers: {
    resetReservations: (state) => {
      state.data = null;
      state.reservations = [];
      state.total = 0;
      state.error = null;
      state.lastQuery = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReservationsByDates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReservationsByDates.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.data || null;
        state.reservations = action.payload.reservations || [];
        state.total = action.payload.count ?? 0;
        state.lastQuery = action.payload.meta || null;
      })
      .addCase(fetchReservationsByDates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Request failed';
      });
  },
});

export const { resetReservations } = dashboardReservationSlice.actions;
export default dashboardReservationSlice.reducer;

/* -------------------- selectors (match screen) -------------------- */
export const selectDashboardApi = (s) => s?.dashboardreservation?.data;
export const selectDashboardLoading = (s) => s?.dashboardreservation?.loading;
export const selectDashboardError = (s) => s?.dashboardreservation?.error;
export const selectDashboardLegacy = (s) => s?.dashboardreservation?.reservations || [];
export const selectDashboardTotals = (s) => ({
  totalBookings: s?.dashboardreservation?.data?.totalBookings ?? 0,
  totalReservations: s?.dashboardreservation?.data?.totalReservations ??
                     s?.dashboardreservation?.total ?? 0,
});
