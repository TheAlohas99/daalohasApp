import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseUrl = "https://dabackend-z7p2s.ondigitalocean.app";


// Async thunk to fetch data from Node.js API
export const fetchReservations = createAsyncThunk(
  "reservations/fetchReservations",
  async () => {
    const res = await axios.get(`${baseUrl}/api/v1/all-reservation`);
    return res.data;
  }
);

const reservationSlice = createSlice({
  name: "reservations",
  initialState: {
    AllReservation: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReservations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReservations.fulfilled, (state, action) => {
        state.loading = false;
        state.AllReservation = action.payload;
      })
      .addCase(fetchReservations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default reservationSlice.reducer;
