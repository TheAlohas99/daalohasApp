// navigation/StackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/Login';
import TabNavigator from './TabNavigator';
import GuestScreen from '../screens/GuestScreen';
import MessageTemplate from '../screens/MessageTemplate';



type StackNavigatorProps = {
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
};

const Stack = createStackNavigator();

export default function StackNavigator({
  isLoggedIn,
  setIsLoggedIn,
}: StackNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="HomeTabs">
            {props => <TabNavigator {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
          <Stack.Screen name="GuestScreen" component={GuestScreen} />
          <Stack.Screen name="MessageTemplate" component={MessageTemplate} />

        </>
      ) : (
        <Stack.Screen name="Login">
          {props => <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}
