import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { BASE_URL } from "../config";


export const getProperty = createAsyncThunk(
  "property/getAllProperty",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/v1/all-property-list`);
      console.log("API RESPONSE:", data);   
      return data.allProperty;              
    } catch (error) {
      console.log("API ERROR:", error.message);
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch property"
      );
    }
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
