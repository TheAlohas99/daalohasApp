import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseUrl = "https://dabackend-z7p2s.ondigitalocean.app";


export const getProperty = createAsyncThunk(
  "property/getAllProperty",
  async (_, { rejectWithValue }) => {
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      };

      const { data } = await axios.get(
        `${baseUrl}/api/v1/all-property-list`,
        config
      );

      console.log(data)
      return data.allProperty;
    } catch (error) {
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
