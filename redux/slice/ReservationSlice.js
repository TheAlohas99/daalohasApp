import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setOnUnauthorized } from '../../utils/api';

const baseUrl = 'https://api.daalohas.com';

const pickNotes = obj =>
  obj?.reservationId?.notes ??
  obj?.data?.reservationId?.notes ??
  obj?.notes ??
  obj?.data?.notes ??
  '';

/* ---------------------------
   LIST BY DATE
--------------------------- */
export const fetchReservationsByDate = createAsyncThunk(
  'reservations/fetchReservationsByDate',
  async ({ start, end, propertyId = 'all' }, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return rejectWithValue('SESSION_EXPIRED');
      }

      const params = new URLSearchParams();
      params.set('start', start);
      params.set('end', end);
      if (propertyId) params.set('propertyId', propertyId);

      const { data } = await axios.get(
        `${baseUrl}/api/v1/reservations/by-date?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        reservations: data?.reservations || [],
        count: data?.count || 0,
      };
    } catch (error) {
      const status = error?.response?.status;

      if (status === 401) {
        return rejectWithValue('SESSION_EXPIRED');
      }

      return rejectWithValue(
        error?.response?.data?.message ||
          'Failed to fetch reservations by date',
      );
    }
  },
);

/* ---------------------------
   GET BY ID
--------------------------- */
export const fetchReservationById = createAsyncThunk(
  'reservations/fetchReservationById',
  async ({ reservationId }, { rejectWithValue }) => {
    try {
      const id = String(reservationId || '').trim();
      if (!id) return rejectWithValue('reservationId is required');

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return rejectWithValue('SESSION_EXPIRED');
      }

      const { data } = await axios.get(
        `${baseUrl}/api/v1/reservation/${encodeURIComponent(id)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const reservationObj =
        data?.reservationId || data?.data?.reservationId || {};

      const notes = reservationObj?.notes ?? pickNotes(data) ?? '';

      return {
        reservationId: id,
        notes,
        reservation: reservationObj,
      };
    } catch (error) {
      const status = error?.response?.status;

      if (status === 401) {
        return rejectWithValue('SESSION_EXPIRED');
      }

      return rejectWithValue(
        error?.response?.data?.message || 'Failed to fetch reservation',
      );
    }
  },
);

/* ---------------------------
   UPDATE NOTES
--------------------------- */
export const updateReservationNotes = createAsyncThunk(
  'reservations/updateReservationNotes',
  async (payload, { rejectWithValue }) => {
    try {
      const {
        reservationId,
        notes,
        booker_first_name,
        booker_last_name,
        booker_email,
        booker_mobile,
        service,
      } = payload || {};

      const id = String(reservationId || '').trim();
      if (!id) return rejectWithValue('reservationId is required');

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return rejectWithValue('SESSION_EXPIRED');
      }

      const body = {};

      if (notes !== undefined) body.notes = String(notes || '').trim();
      if (booker_first_name !== undefined)
        body.booker_first_name = String(booker_first_name).trim();
      if (booker_last_name !== undefined)
        body.booker_last_name = String(booker_last_name).trim();
      if (booker_email !== undefined)
        body.booker_email = String(booker_email).trim();

      if (booker_mobile !== undefined) {
        const n = Number(booker_mobile);
        if (!Number.isFinite(n)) {
          return rejectWithValue('booker_mobile must be a valid number');
        }
        body.booker_mobile = n;
      }

      if (Array.isArray(service)) {
        body.service = Array.from(new Set(service.filter(Boolean)));
      }

      const { data } = await axios.put(
        `${baseUrl}/api/v1/reservations/${encodeURIComponent(id)}`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!data?.success) {
        return rejectWithValue(
          data?.message || 'Failed to update reservation',
        );
      }

      const reservationObj = data?.data || {};
      const savedNotes = reservationObj?.notes ?? notes ?? '';

      return {
        reservationId: id,
        notes: savedNotes,
        reservation: reservationObj,
      };
    } catch (error) {
      const status = error?.response?.status;

      if (status === 401) {
        return rejectWithValue('SESSION_EXPIRED');
      }

      return rejectWithValue(
        error?.response?.data?.message ||
          'Failed to update reservation',
      );
    }
  },
);

/* ---------------------------
   SLICE
--------------------------- */
const reservationSlice = createSlice({
  name: 'reservations',
  initialState: {
    reservations: [],
    total: 0,
    loading: false,
    error: null,
    byId: {},
    loadingById: {},
    errorById: {},
    updatingById: {},
    updateErrorById: {},
  },
  reducers: {
    resetReservations: state => {
      state.reservations = [];
      state.total = 0;
      state.error = null;
    },
    setReservationNotesLocal: (state, action) => {
      const id = String(action?.payload?.reservationId || '');
      if (!id) return;
      state.byId[id] = {
        ...(state.byId[id] || {}),
        notes: action.payload?.notes || '',
      };
    },
  },

  extraReducers: builder => {
    builder
      .addCase(fetchReservationsByDate.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReservationsByDate.fulfilled, (state, action) => {
        state.loading = false;
        state.reservations = action.payload.reservations;
        state.total = action.payload.count;
      })
      .addCase(fetchReservationsByDate.rejected, (state, action) => {
        state.loading = false;

        if (action.payload === 'SESSION_EXPIRED') {
          state.error = null;
        } else {
          state.error = action.payload || action.error.message;
        }
      })

      .addCase(fetchReservationById.rejected, (state, action) => {
        const id = String(action.meta.arg?.reservationId || '');
        if (id) {
          state.errorById[id] = action.payload || 'Fetch failed';
        }
      })

      .addCase(updateReservationNotes.rejected, (state, action) => {
        const id = String(action.meta.arg?.reservationId || '');
        if (id) {
          state.updateErrorById[id] =
            action.payload || 'Update failed';
        }
      });
  },
});

export const {
  resetReservations,
  setReservationNotesLocal,
} = reservationSlice.actions;

export default reservationSlice.reducer;