import { Stack } from "expo-router";
import { UserProvider } from "../src/contexts/UserContext.js";

export default function RootLayout() {
  return (
    <UserProvider>
      
      <Stack screenOptions={{ headerShown: false }} 
      
      />
    </UserProvider>
  );
}
