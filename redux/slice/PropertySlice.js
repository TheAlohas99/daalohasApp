import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Read the API base URL from environment variables
const baseUrl = process.env.API_BASE_URL;

export const getProperty = createAsyncThunk(
  "property/getProperty",
  async () => {
    const res = await axios.get(`${baseUrl}/api/v1/getAllProperty`);
    return res.data;
  }
);

const reservationSlice = createSlice({
  name: "property",
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getProperty.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProperty.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(getProperty.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default reservationSlice.reducer;
