// navigation/StackNavigator.tsx
import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

import LoginScreen from '../screens/Login';
import TabNavigator from './TabNavigator';
import GuestScreen from '../screens/GuestScreen';
import MessageTemplate from '../screens/MessageTemplate';
import NewReservationsScreen from '../screens/NewReservationsScreen';
import CancelledReservationsScreen from '../screens/CancelledReservationsScreen';
import UpdateBooker from '../screens/UpdateBooker';

type StackNavigatorProps = {
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
};

const Stack = createStackNavigator();

export default function StackNavigator({
  isLoggedIn,
  setIsLoggedIn,
}: StackNavigatorProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token');

        if (!token) {
          setIsLoggedIn(false);
          setLoading(false);
          return;
        }

        const decoded: any = jwtDecode(token);

        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          console.log('Token expired');
          await AsyncStorage.multiRemove(['token', 'user']);
          setIsLoggedIn(false);
        } else {
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.log('Invalid token', err);
        await AsyncStorage.multiRemove(['token', 'user']);
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  // Optional: show nothing while verifying token
  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="HomeTabs">
            {props => <TabNavigator {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
          <Stack.Screen name="GuestScreen" component={GuestScreen} />
          <Stack.Screen name="MessageTemplate" component={MessageTemplate} />
          <Stack.Screen
            name="NewReservations"
            component={NewReservationsScreen}
          />
          <Stack.Screen
            name="CancelledReservations"
            component={CancelledReservationsScreen}
          />
          <Stack.Screen name="UpdateBooker" component={UpdateBooker} />
        </>
      ) : (
        <Stack.Screen name="Login">
          {props => <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}
