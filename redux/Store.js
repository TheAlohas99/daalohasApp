import { configureStore } from '@reduxjs/toolkit';
import PropertySlice from './slice/PropertySlice';

export const store = configureStore({
  reducer: {
    property: PropertySlice,
  },
});
