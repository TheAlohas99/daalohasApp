import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/Login';
import TabNavigator from './TabNavigator';
import MessageTemplate from '../screens/MessageTemplate';
import NewReservationsScreen from '../screens/NewReservationsScreen';
import CancelledReservationsScreen from '../screens/CancelledReservationsScreen';
import UpdateBooker from '../screens/UpdateBooker';
import ArrivalsScreen from '../screens/ArrivalsScreen';
import StayScreen from '../screens/StayScreen';
import DeparturesScreen from '../screens/DeparturesScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

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
          return;
        }

        const decoded: any = jwtDecode(token);

        const now = Date.now() / 1000;

        if (!decoded?.exp || decoded.exp <= now) {
          console.log('Token expired');
          await AsyncStorage.multiRemove(['token', 'user', 'mobile']);
          setIsLoggedIn(false);
        } else {
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.log('Invalid token', err);
        await AsyncStorage.multiRemove(['token', 'user', 'mobile']);
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [isLoggedIn]); // ✅ FIX: re-sync only when needed

  if (loading) return null;
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="HomeTabs">
            {props => <TabNavigator {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>

          <Stack.Screen name="MessageTemplate" component={MessageTemplate} />
          <Stack.Screen
            name="NewReservations"
            component={NewReservationsScreen}
          />
          <Stack.Screen
            name="CancelledReservations"
            component={CancelledReservationsScreen}
          />
          <Stack.Screen name="ArrivalsReservation" component={ArrivalsScreen} />
          <Stack.Screen
            name="DeparturesReservation"
            component={DeparturesScreen}
          />
          <Stack.Screen name="StayReservation" component={StayScreen} />
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
