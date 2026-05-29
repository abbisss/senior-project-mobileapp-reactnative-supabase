import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#070707",
        tabBarInactiveTintColor: "#ffffff70",
        tabBarStyle: {
          backgroundColor: "#86cc80",
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
        },

        tabBarBackground: () => (
          <BlurView
            intensity={35}
            tint="dark"
            style={{
              flex: 1,
              marginHorizontal: 10,
              borderRadius: 40,
              overflow: "hidden",
              backgroundColor: "rgba(32, 125, 32, 0.25)",
            }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

       <Tabs.Screen
        name="ai_trips"
        options={{
          title: "AI Trips",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
