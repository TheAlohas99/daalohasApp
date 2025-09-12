import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseUrl = 'https://dabackend-z7p2s.ondigitalocean.app';

// small helper to check MongoId format
const isMongoId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

// ✅ Only keep date-based API
export const fetchReservationsByDate = createAsyncThunk(
  'reservations/fetchReservationsByDate',
  async ({ start, end, propertyId = 'all' }, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return rejectWithValue('No token found, please log in again');
      }

      // Build query safely
      const params = new URLSearchParams();
      params.set('start', start);
      params.set('end', end);

      if (propertyId && (propertyId)) {
        params.set('propertyId', propertyId);
      }

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
        error.response?.data?.message || 'Failed to fetch reservations by date',
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
  },
  reducers: {
    resetReservations: state => {
      state.reservations = [];
      state.total = 0;
      state.error = null;
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
        state.error = action.payload || action.error.message;
      });
  },
});

export const { resetReservations } = reservationSlice.actions;
export default reservationSlice.reducer;
