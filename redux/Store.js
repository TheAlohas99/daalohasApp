import { configureStore } from '@reduxjs/toolkit';
import PropertySlice from './slice/PropertySlice';
import ReservationSlice from './slice/ReservationSlice';
import LoginSlice from "./slice/LoginSlice"
import dashboardReservationSlice from "./slice/DashboardReservationSlice"

export const store = configureStore({
  reducer: {
    property: PropertySlice,
    reservation: ReservationSlice,
    dashboardreservation: dashboardReservationSlice,
    auth: LoginSlice
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
