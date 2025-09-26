// app/(tabs)/index.tsx
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🥷 Math Ninja</Text>
      <Text style={styles.subtitle}>Slice the correct answer!</Text>

      <Link href="/game" asChild>
        <Pressable style={styles.cta}>
          <Text style={styles.ctaText}>▶ Start Game</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // soft pastel background
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 40,
    color: "#0F172A", // deep slate
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#64748B", // slate gray
    marginBottom: 40,
  },
  cta: {
    backgroundColor: "#34D399", // duolingo green
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999, // pill shape
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  ctaText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
});
