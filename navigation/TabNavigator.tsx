import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import DashboardScreen from "../screens/DashboardScreen";
import AvailabilityScreen from "../screens/AvailabilityScreen";
import ProfileScreen from "../screens/ProfileScreen";
// import {TeamWebViewScreen} from "../screens/TeamWebViewScreen";

const Tab = createBottomTabNavigator();

type TabNavProps = {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function TabNavigator({ setIsLoggedIn }: TabNavProps) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: string = "home-outline";
          if (route.name === "Availability") iconName = "calendar-outline";
          // else if (route.name === "Team") iconName = "people-outline"; // ⬅️ NEW
          else if (route.name === "Profile") iconName = "person-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "tomato",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Availability" component={AvailabilityScreen} />
      {/* <Tab.Screen
        name="Team"
        component={TeamWebViewScreen}
        options={{ title: "Our Team" }} 
      /> */}
      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
