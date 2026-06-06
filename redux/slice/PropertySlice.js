import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../utils/api';

const baseUrl = 'https://api.daalohas.com';

export const getProperty = createAsyncThunk(
  'property/getAccessibleProperties',
  async ({ email, mobile } = {}, { rejectWithValue }) => {
    try {
      // ✅ FIX 1: prevent API call if no token
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return rejectWithValue('SESSION_EXPIRED');
      }

      const queryParams = new URLSearchParams();

      if (email) queryParams.append('email', String(email).trim());

      if (mobile) {
        const cleanMobile = String(mobile).replace(/[\s\-()]/g, '');
        queryParams.append('mobile', cleanMobile);
      }

      const url = `${baseUrl}/api/v1/property-access/properties?${queryParams.toString()}`;

      console.log('[DEBUG] getProperty hitting URL:', url);

      const response = await apiFetch(url, {
        method: 'GET',
      });

      // ❌ FIX 2: remove duplicate 401 handling (apiFetch already does it)
      if (!response) {
        return rejectWithValue('NETWORK_ERROR');
      }

      if (response.status === 401) {
        return rejectWithValue('SESSION_EXPIRED');
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        return rejectWithValue('Invalid server response');
      }

      if (!response.ok) {
        return rejectWithValue(
          data?.message || `HTTP error! status: ${response.status}`,
        );
      }

      return {
        role: data?.role || null,
        properties: data?.properties || [],
      };
    } catch (error) {
      console.error('[DEBUG] getProperty caught exception:', error);
      return rejectWithValue(error.message || 'Failed to fetch properties');
    }
  },
);

/* -------------------- SLICE -------------------- */
const propertySlice = createSlice({
  name: 'property',
  initialState: {
    role: null,
    data: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearPropertyError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(getProperty.pending, state => {
        state.loading = true;
        state.error = null;
      })

      .addCase(getProperty.fulfilled, (state, action) => {
        state.loading = false;
        state.role = action.payload.role;
        state.data = action.payload.properties;
      })

      .addCase(getProperty.rejected, (state, action) => {
        state.loading = false;

        if (action.payload === 'SESSION_EXPIRED') {
          state.error = null;
        } else {
          state.error =
            action.payload || action.error?.message || 'Rejected';
        }
      });
  },
});

export const { clearPropertyError } = propertySlice.actions;
export default propertySlice.reducer;