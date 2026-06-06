import { configureStore, combineReducers } from '@reduxjs/toolkit';
import PropertySlice from './slice/PropertySlice';
import ReservationSlice from './slice/ReservationSlice';
import LoginSlice from "./slice/LoginSlice";
import dashboardReservationSlice from "./slice/DashboardReservationSlice";

// 1. Combine your existing reducers into a single appReducer mapping
const appReducer = combineReducers({
  property: PropertySlice,
  reservation: ReservationSlice,
  dashboardreservation: dashboardReservationSlice,
  auth: LoginSlice
});

// 2. Create a master root reducer that intercepts a 'RESET_APP' action string
const rootReducer = (state, action) => {
  if (action.type === 'RESET_APP') {
    console.log('💥 PURGING ALL PERSISTED REDUX STATE ENGINE MEMORY');
    // Passing 'undefined' forces Redux Toolkit to reset all slices back to their initial default states instantly
    state = undefined; 
  }
  return appReducer(state, action);
};

// 3. Export the store tracking configuration utilizing the master rootReducer
export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});