// src/redux/slice/PropertySlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const baseUrl = 'https://api.daalohas.com';



// GET /api/v1/property-access/properties?email=...&mobile=...
export const getProperty = createAsyncThunk(
  'property/getAccessibleProperties',
  async ({ email, mobile } = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${baseUrl}/api/v1/property-access/properties`,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
          params: {
            ...(email ? { email } : {}),
            ...(mobile ? { mobile } : {}),
          },
        },
      );
      return {
        role: data.role,
        properties: data.properties || [],
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch properties',
      );
    }
  },
);

const propertySlice = createSlice({
  name: 'property',
  initialState: {
    role: null,
    data: [], // properties list
    loading: false,
    error: null,
  },
  reducers: {},
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
        state.error = action.payload || action.error.message;
      });
  },
});

export default propertySlice.reducer;
