// app/_layout.tsx
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false, // default: no headers unless overridden
        }}
      >
        {/* Tabs layout (Home screen) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Game screen: fullscreen, no ugly "(game)" header */}
        <Stack.Screen name="game" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
