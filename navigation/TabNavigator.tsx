import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DashboardScreen from '../screens/DashboardScreen';
import OwnerDashboardScreen from '../screens/OwnerDashboardScreen';
import AvailabilityScreen from '../screens/AvailabilityScreen';
import ProfileScreen from '../screens/ProfileScreen';
import JobsScreen from '../screens/JobsScreen';
import GuestManagementApp from '../screens/GuestManagementApp';

const Tab = createBottomTabNavigator();

type TabNavProps = {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
};
export default function TabNavigator({ setIsLoggedIn }: TabNavProps) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setRole(parsedUser.role || 'user');
        } else {
          setRole('user');
        }
      } catch (error) {
        console.log('Error fetching user role:', error);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    getUserRole();
  }, []);

  // ✅ FIX: prevent blank screen
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Tab.Navigator
      initialRouteName={role === 'owner' ? 'OwnerDashboard' : 'Dashboard'}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: string = 'home-outline';

          if (route.name === 'Dashboard' || route.name === 'OwnerDashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Availability') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Guests') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Jobs') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ff6347',
        tabBarInactiveTintColor: '#777',
        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: '#ffffff',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      {/* OWNER DASHBOARD */}
      {role === 'owner' ? (
        <Tab.Screen
          name="OwnerDashboard"
          component={OwnerDashboardScreen}
          options={{ title: 'Dashboard' }}
        />
      ) : (
        /* STANDARD DASHBOARD */
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'Dashboard' }}
        />
      )}

      {/* AVAILABILITY */}
      <Tab.Screen
        name="Availability"
        component={AvailabilityScreen}
        options={{ title: 'Availability' }}
      />

      {/* GUEST MANAGEMENT */}
      <Tab.Screen
        name="Guests"
        component={GuestManagementApp}
        options={{ title: 'Guests' }}
      />

      {/* JOBS */}
      <Tab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{ title: 'Jobs' }}
      />

      {/* PROFILE */}
      <Tab.Screen name="Profile" options={{ title: 'Profile' }}>
        {props => <ProfileScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
