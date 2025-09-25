import { configureStore } from '@reduxjs/toolkit';
import PropertySlice from './slice/PropertySlice';
import ReservationSlice from './slice/ReservationSlice';
import LoginSlice from "./slice/LoginSlice"

export const store = configureStore({
  reducer: {
    property: PropertySlice,
    reservation: ReservationSlice,
    auth: LoginSlice
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
