// src/redux/slice/ReservationSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseUrl = 'https://api.daalohas.com';

// Prefer your actual payload shape first, then fallbacks
const pickNotes = obj =>
  obj?.reservationId?.notes ??
  obj?.data?.reservationId?.notes ??
  obj?.notes ??
  obj?.data?.notes ??
  '';

const isMongoId = v => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

// ---------------------------
// List (by date) API
// ---------------------------
export const fetchReservationsByDate = createAsyncThunk(
  'reservations/fetchReservationsByDate',
  async ({ start, end, propertyId = 'all' }, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return rejectWithValue('No token found, please log in again');
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
        reservations: data.reservations,
        count: data.count,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message ||
          'Failed to fetch reservations by date',
      );
    }
  },
);

// ---------------------------
// GET /reservation/:id
// ---------------------------
export const fetchReservationById = createAsyncThunk(
  'reservations/fetchReservationById',
  async ({ reservationId }, { rejectWithValue }) => {
    try {
      const id = String(reservationId || '').trim();
      if (!id) return rejectWithValue('reservationId is required');

      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No token found, please log in again');

      const { data } = await axios.get(
        `${baseUrl}/api/v1/reservation/${encodeURIComponent(id)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      );

      const reservationObj =
        data?.reservationId || data?.data?.reservationId || {};
      const notes = reservationObj?.notes ?? pickNotes(data) ?? '';
      // console.log(reservationObj)
      return {
        reservationId: id,
        notes,
        reservation: reservationObj,
        raw: data,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to fetch reservation',
      );
    }
  },
);

// ---------------------------
// PUT /reservations/:id { notes }
// ---------------------------
// ---------------------------
// PUT /reservations/:id — dynamic update (notes OR booker info)
// ---------------------------
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
      if (!token) throw new Error('No token found, please log in again');

      // ✅ Build the dynamic body safely
      const body = {};
      if (notes !== undefined)
        body.notes =
          typeof notes === 'string' ? notes.trim() : String(notes || '');

      if (booker_first_name !== undefined)
        body.booker_first_name = String(booker_first_name).trim();

      if (booker_last_name !== undefined)
        body.booker_last_name = String(booker_last_name).trim();

      if (booker_email !== undefined)
        body.booker_email = String(booker_email).trim();

      if (booker_mobile !== undefined) {
        const n = Number(booker_mobile);
        if (!Number.isFinite(n)) {
          return rejectWithValue('booker_mobile must be a number');
        }
        body.booker_mobile = n;
      }

      if (Array.isArray(service))
        body.service = Array.from(new Set(service.filter(Boolean)));

      // ✅ If nothing to update, abort
      if (Object.keys(body).length === 0) {
        return rejectWithValue('Nothing to update');
      }

      const { data } = await axios.put(
        `${baseUrl}/api/v1/reservations/${encodeURIComponent(id)}`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      );

      if (!data?.success) {
        throw new Error(data?.message || 'Failed to update reservation');
      }

      const reservationObj = data?.data || {};
      const savedNotes = reservationObj?.notes ?? notes ?? '';

      return {
        reservationId: id,
        notes: savedNotes,
        reservation: reservationObj,
        raw: data,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to update reservation',
      );
    }
  },
);

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
    // Optional optimistic local set
    setReservationNotesLocal: (state, action) => {
      const id = String(action?.payload?.reservationId || '');
      if (!id) return;
      const notes = action?.payload?.notes;
      state.byId[id] = {
        ...(state.byId[id] || {}),
        _id: id,
        notes: typeof notes === 'string' ? notes : notes ?? '',
      };
    },
  },
  extraReducers: builder => {
    // --- list by date
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
        state.error = action.payload || action.error.message;
      });

    // --- fetch by id
    builder
      .addCase(fetchReservationById.pending, (state, action) => {
        const id = String(action.meta.arg?.reservationId || '');
        if (id) {
          state.loadingById[id] = true;
          state.errorById[id] = null;
        }
      })
      .addCase(fetchReservationById.fulfilled, (state, action) => {
        const { reservationId, notes, reservation, raw } = action.payload || {};
        const id = String(reservationId || '');
        if (!id) return;

        state.loadingById[id] = false;
        state.byId[id] = {
          ...(state.byId[id] || {}),
          _id: id,
          ...reservation, // store the full object
          notes: typeof notes === 'string' ? notes : notes ?? '',
          __raw: raw,
        };
      })
      .addCase(fetchReservationById.rejected, (state, action) => {
        const id = String(action.meta.arg?.reservationId || '');
        if (id) {
          state.loadingById[id] = false;
          state.errorById[id] =
            action.payload || action.error.message || 'Fetch failed';
        }
      });

    // --- update notes
    builder
      .addCase(updateReservationNotes.pending, (state, action) => {
        const id = String(action.meta.arg?.reservationId || '');
        if (id) {
          state.updatingById[id] = true;
          state.updateErrorById[id] = null;
        }
      })
      .addCase(updateReservationNotes.fulfilled, (state, action) => {
        const { reservationId, notes, reservation, raw } = action.payload || {};
        const id = String(reservationId || '');
        if (!id) return;

        state.updatingById[id] = false;
        state.byId[id] = {
          ...(state.byId[id] || {}),
          _id: id,
          ...reservation, // keep latest fields
          notes: typeof notes === 'string' ? notes : notes ?? '',
          __raw: raw,
        };
      })
      .addCase(updateReservationNotes.rejected, (state, action) => {
        const id = String(action.meta.arg?.reservationId || '');
        if (id) {
          state.updatingById[id] = false;
          state.updateErrorById[id] =
            action.payload || action.error.message || 'Update failed';
        }
      });
  },
});

export const { resetReservations, setReservationNotesLocal } =
  reservationSlice.actions;

// ---------- selectors (namespace-agnostic: supports state.reservation or state.reservations)
const ns = state => state?.reservations || state?.reservation || {};

export const selectReservationObj = (state, reservationId) => {
  const id = String(reservationId || '');
  return (id && ns(state)?.byId?.[id]) || null;
};

export const selectReservationNotes = (state, reservationId) => {
  const id = String(reservationId || '');
  return (id && ns(state)?.byId?.[id]?.notes) || '';
};

export const selectReservationFetching = (state, reservationId) => {
  const id = String(reservationId || '');
  return !!(id && ns(state)?.loadingById?.[id]);
};

export const selectReservationSaving = (state, reservationId) => {
  const id = String(reservationId || '');
  return !!(id && ns(state)?.updatingById?.[id]);
};

export const selectReservationFetchError = (state, reservationId) => {
  const id = String(reservationId || '');
  return (id && ns(state)?.errorById?.[id]) || null;
};

export const selectReservationSaveError = (state, reservationId) => {
  const id = String(reservationId || '');
  return (id && ns(state)?.updateErrorById?.[id]) || null;
};

export default reservationSlice.reducer;
