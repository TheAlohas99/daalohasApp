// src/redux/slice/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const baseUrl = 'https://api.daalohas.com';

// GET /api/v1/me  (cookie-auth; requires withCredentials)
export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${baseUrl}/api/v1/me`, {
        withCredentials: true,
      });

      console.log(data);
      return data.user;
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to load user';
      return rejectWithValue(msg);
    }
  },
);

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
        state.error = action.payload || action.error.message;
      });
  },
});

export const { setUser, clearAuthError, logoutLocal } = authSlice.actions;
export default authSlice.reducer;
