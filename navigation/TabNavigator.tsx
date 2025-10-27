import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import DashboardScreen from "../screens/DashboardScreen";
import OwnerDashboardScreen from "../screens/OwnerDashboardScreen";
import AvailabilityScreen from "../screens/AvailabilityScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

type TabNavProps = {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function TabNavigator({ setIsLoggedIn }: TabNavProps) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setRole(parsedUser.role || null);
        }
      } catch (error) {
        console.log("Error fetching user role:", error);
      }
    };
    getUserRole();
  }, []);

  if (role === null) return null; // Show nothing until user role loads

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: string = "home-outline";
          if (route.name === "Availability") iconName = "calendar-outline";
          else if (route.name === "Profile") iconName = "person-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "tomato",
        tabBarInactiveTintColor: "gray",
      })}
    >
      {/* Conditionally render dashboard */}
      {role === "owner" ? (
        <Tab.Screen
          name="OwnerDashboard"
          component={OwnerDashboardScreen}
          options={{ title: "Dashboard" }}
        />
      ) : (
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: "Dashboard" }}
        />
      )}

      <Tab.Screen name="Availability" component={AvailabilityScreen} />

      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
