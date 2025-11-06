import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const baseUrl = 'https://api.daalohas.com';

// Load user
export const loadUser = createAsyncThunk(
  "auth/loadUser",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${baseUrl}/api/v1/me`, {
        withCredentials: true,
      });
      console.log(data)
      return data.user;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || err.message || "Failed to load user"
      );
    }
  }
);

// Update user
export const updateUserDetails = createAsyncThunk(
  "auth/updateUserDetails",
  async ({ id, updateDetails }, { rejectWithValue }) => {
    console.log(updateDetails)
    try {
      const { data } = await axios.put(
        `${baseUrl}/api/v1/update/${id}`,
        updateDetails,
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      console.log("data",data)
      return data.user || data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to update user"
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
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
  extraReducers: (builder) => {
    builder
      .addCase(loadUser.pending, (state) => {
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
      })
      .addCase(updateUserDetails.pending, (state) => {
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
        state.error = action.payload || action.error.message;
      });
  },
});

export const { setUser, clearAuthError, logoutLocal } = authSlice.actions;
export default authSlice.reducer;
