import { configureStore } from '@reduxjs/toolkit';
import PropertySlice from './slice/PropertySlice';
import ReservationSlice from "./slice/ReservationSlice"

export const store = configureStore({
  reducer: {
    property: PropertySlice,
    reservation: ReservationSlice
  },
  
});
