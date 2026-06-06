import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setOnUnauthorized } from '../../utils/api';

const baseUrl = 'https://api.daalohas.com';

/* -------------------- LOAD USER -------------------- */
export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return rejectWithValue('NO_TOKEN');
      }

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const { data } = await axios.get(`${baseUrl}/api/v1/me`, {
        headers,
        withCredentials: true,
      });

      console.log('[AUTH DEBUG] loadUser success payload:', data);

      return data?.user || data;
    } catch (err) {
      const status = err?.response?.status;

      console.warn(
        '[AUTH DEBUG] loadUser error:',
        status,
        err?.message,
      );

      // ❌ FIX: treat 401 differently
      if (status === 401) {
        return rejectWithValue('SESSION_EXPIRED');
      }

      return rejectWithValue(
        err?.response?.data?.message ||
          err.message ||
          'Failed to load user',
      );
    }
  },
);

/* -------------------- UPDATE USER -------------------- */
export const updateUserDetails = createAsyncThunk(
  'auth/updateUserDetails',
  async ({ id, updateDetails }, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        return rejectWithValue('NO_TOKEN');
      }

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const { data } = await axios.put(
        `${baseUrl}/api/v1/update/${encodeURIComponent(id)}`,
        updateDetails,
        {
          headers,
          withCredentials: true,
        },
      );

      return data?.user || data;
    } catch (error) {
      const status = error?.response?.status;

      if (status === 401) {
        return rejectWithValue('SESSION_EXPIRED');
      }

      return rejectWithValue(
        error?.response?.data?.message || 'Failed to update user',
      );
    }
  },
);

/* -------------------- SLICE -------------------- */
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: false,
    error: null,
    isAuthenticated: false,
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.error = null;
    },

    clearAuthError(state) {
      state.error = null;
    },

    logoutLocal(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },

  extraReducers: builder => {
    builder

      /* ---------------- LOAD USER ---------------- */
      .addCase(loadUser.pending, state => {
        state.loading = true;
        state.error = null;
      })

      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload || null;
        state.isAuthenticated = !!action.payload;
      })

      .addCase(loadUser.rejected, (state, action) => {
        state.loading = false;

        state.user = null;
        state.isAuthenticated = false;

        // ❌ FIX: handle session expiration cleanly
        if (action.payload === 'SESSION_EXPIRED') {
          state.error = null;
        } else {
          state.error = action.payload || action.error.message;
        }
      })

      /* ---------------- UPDATE USER ---------------- */
      .addCase(updateUserDetails.pending, state => {
        state.loading = true;
      })

      .addCase(updateUserDetails.fulfilled, (state, action) => {
        state.loading = false;

        if (action.payload) {
          state.user = { ...state.user, ...action.payload };
        }
      })

      .addCase(updateUserDetails.rejected, (state, action) => {
        state.loading = false;

        if (action.payload === 'SESSION_EXPIRED') {
          state.user = null;
          state.isAuthenticated = false;
          state.error = null;
        } else {
          state.error = action.payload || action.error.message;
        }
      });
  },
}); 

export const { setUser, clearAuthError, logoutLocal } =
  authSlice.actions;

export default authSlice.reducer;

/* -------------------- GLOBAL LOGOUT HOOK -------------------- */
setOnUnauthorized(() => {
  console.log('[AUTH DEBUG] Global logout triggered');

  AsyncStorage.multiRemove(['token', 'user', 'mobile']);
});