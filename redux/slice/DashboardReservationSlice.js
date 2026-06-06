import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../utils/api';

/* -------------------- helpers -------------------- */
const resId = r =>
  String(
    r?._id ??
      r?.id ??
      r?.reservation_id ??
      r?.booking_id ??
      r?.invoice_id ??
      `${r?.check_in_date}-${r?.check_out_date}-${r?.guest_name || ''}-${
        r?.propertyId || ''
      }`,
  );

const dedupeById = (arr = []) => {
  const seen = new Set();
  return arr.filter(r => {
    if (!r) return false;
    const id = resId(r);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/* -------------------- thunk -------------------- */
export const fetchReservationsByDates = createAsyncThunk(
  'dashboardreservation/fetchReservationsByDates',
  async ({ start, end, propertyId = 'all' }, { rejectWithValue }) => {
    try {
      // ✅ FIX 1: check token BEFORE API call
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return rejectWithValue('SESSION_EXPIRED');
      }

      const params = new URLSearchParams();

      if (start) params.set('start', start);
      if (end) params.set('end', end);

      if (propertyId && propertyId !== 'all') {
        params.set('propertyId', propertyId);
      }

      const url = `https://api.daalohas.com/api/v1/reservations/by-dates?${params.toString()}`;

      const response = await apiFetch(url, {
        method: 'GET',
      });

      // ✅ FIX 2: only handle response here (no duplicate logout logic)
      if (!response) {
        return rejectWithValue('NETWORK_ERROR');
      }

      if (response.status === 401) {
        return rejectWithValue('SESSION_EXPIRED');
      }

      let data;
      try {
        data = await response.json();
      } catch {
        return rejectWithValue('Invalid server response formatting');
      }

      if (!response.ok) {
        return rejectWithValue(
          data?.message || 'Failed to fetch reservations by dates',
        );
      }

      const arrivals = data?.arrivals?.data || [];
      const departures = data?.departures?.data || [];
      const stay = data?.stay?.data || [];
      const cancelled = data?.cancelled?.data || [];
      const newReservations = data?.newReservations?.data || [];

      const merged = [
        ...arrivals,
        ...departures,
        ...stay,
        ...cancelled,
        ...newReservations,
      ];

      const legacyReservations = dedupeById(merged);

      return {
        data,
        reservations: legacyReservations,
        count: Number(
          data?.totalReservations ?? legacyReservations.length ?? 0,
        ),
        meta: { start, end, propertyId: propertyId || 'all' },
      };
    } catch (error) {
      console.error(
        '[RESERVATION DEBUG] Runtime failure fetching reservations:',
        error,
      );

      return rejectWithValue(
        error?.message || 'Failed to fetch reservations by dates',
      );
    }
  },
);

/* -------------------- slice -------------------- */
const dashboardReservationSlice = createSlice({
  name: 'dashboardreservation',
  initialState: {
    data: null,
    reservations: [],
    total: 0,
    loading: false,
    error: null,
    lastQuery: null,
  },
  reducers: {
    resetReservations: state => {
      state.data = null;
      state.reservations = [];
      state.total = 0;
      state.error = null;
      state.lastQuery = null;
      state.loading = false;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchReservationsByDates.pending, state => {
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

        if (action.payload === 'SESSION_EXPIRED') {
          state.error = null;
        } else {
          state.error =
            action.payload || action.error?.message || 'Request failed';
        }
      });
  },
});

export const { resetReservations } = dashboardReservationSlice.actions;
export default dashboardReservationSlice.reducer;

/* -------------------- selectors -------------------- */
const ns = state => state?.dashboardreservation || {};

export const selectDashboardApi = s => ns(s).data;
export const selectDashboardLoading = s => ns(s).loading;
export const selectDashboardError = s => ns(s).error;
export const selectDashboardLegacy = s => ns(s).reservations || [];
export const selectDashboardTotals = s => ({
  totalBookings: ns(s).data?.totalBookings ?? 0,
  totalReservations: ns(s).data?.totalReservations ?? ns(s).total ?? 0,
});
