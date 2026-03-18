import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const LandingScreen = () => {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Rapid Stroke</Text>
          <Text style={styles.subtitle}>Emergency Medical Response</Text>
          <Text style={styles.description}>
            Fast, Reliable Stroke Detection and Emergency Response System
          </Text>
        </View>

        {/* GMCH Logo Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/gmch_logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Card style={styles.card}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/(auth)/RegisterScreen")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#4CAF50", "#45a049"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>New Member</Text>
                <Text style={styles.buttonSubtext}>Create Account</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Card>

          <Card style={styles.card}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/(auth)/LoginScreen")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#2196F3", "#1976D2"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Login</Text>
                <Text style={styles.buttonSubtext}>Existing User</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Government Medical College & Hospital, Chandigarh
          </Text>
          <Text style={styles.footerSubtext}>Version 1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LandingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // White background
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: 60,
  },
  title: {
    fontSize: 30,
    fontWeight: 500,
    color: "#000000",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#555555",
    textAlign: "center",
    marginBottom: 16,
    marginTop: 10,
  },
  description: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginVertical: 40,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  buttonContainer: {
    marginBottom: 40,
  },
  card: {
    marginVertical: 8,
    borderRadius: 15,
    elevation: 6,
  },
  primaryButton: {
    borderRadius: 15,
    overflow: "hidden",
  },
  secondaryButton: {
    borderRadius: 15,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 500,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },
  footer: {
    alignItems: "center",
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
  },
  footerSubtext: {
    fontSize: 10,
    color: "#999999",
    marginTop: 4,
  },
});
