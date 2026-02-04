import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Card, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

// Define the API base URL (Replace with your computer's IP address)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://13.53.218.254/api";

// --- PLACEHOLDER AUTH SERVICE (Matching the structure used in RegisterScreen) ---
const authService = {
  login: async (data: { email: string; password: string }) => {
    try {
      // POST request to the login endpoint
      console.log("API URL:", process.env.EXPO_PUBLIC_API_URL);

      const response = await axios.post(`${API_BASE_URL}/auth/login`, data);


      if (response.status === 200 || response.status === 201) {
        const userData = response.data?.data?.user || null;

        if (userData?.role === "emo") {
          console.log("User role identified as EMO.");
        } else if (userData?.role === "clinician") {
          console.log("User role identified as clinician.");
        } else if (userData?.role === "radiologist") {
          console.log("User role identified as radiologist.");
        } else {
          console.warn("Unknown user role:", userData?.role);
        }

        return {
          success: true,
          message: response.data?.message || "Login successful",
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: response.data?.message || "Registration failed",
        };
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        return {
          success: false,
          message:
            error.response.data?.message ||
            `Server Error: ${error.response.status}`,
        };
      }
      return {
        success: false,
        message: "Network Error: Could not connect to the server.",
      };
    }
  },
};

// --- START COMPONENT ---

const LoginScreen: React.FC<{}> = () => {
  const router = useRouter();

  // --- State Management ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- Handlers ---

  const validateForm = () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return false;
    }
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return false;
    }
    return true;
  };

  const loginInProgress = useRef(false);

  const handleLogin = async () => {
    // 🔒 Hard guard: prevent multiple calls
    if (loginInProgress.current) {
      console.log("Login already in progress, skipping");
      return;
    }

    if (!validateForm()) {
      return;
    }

    loginInProgress.current = true;
    setLoading(true);

    try {
      console.log("Attempting login...");
      console.log("API URL:", process.env.EXPO_PUBLIC_API_URL);

      const response = await authService.login({ email, password });

      if (!response?.success) {
        Alert.alert(
          "Login Failure",
          response?.message || "Invalid credentials. Please try again."
        );
        return;
      }

      const userData = response.data?.data?.user;
      const token = response.data?.data?.token;

      if (!userData || !token) {
        throw new Error("Invalid login response structure");
      }

      // Persist auth
      await AsyncStorage.multiSet([
        ["userToken", token],
        ["userData", JSON.stringify(userData)],
      ]);

      Alert.alert("Success", "Login successful!");

      // ✅ Role-based routing (absolute paths for expo-router)
      switch (userData.role) {
        case "emo":
          router.replace("/EMODashboard");
          break;
        case "clinician":
          router.replace("/ClinicianDashboard");
          break;
        case "radiologist":
          router.replace("/RadiologistDashboard");
          break;
        default:
          console.warn("Unknown role:", userData.role);
          router.replace("/EMODashboard");
      }
    } catch (error) {
      console.error("Login exception:", error);
      Alert.alert(
        "Connection Error",
        "Unable to connect to server or unexpected network issue."
      );
    } finally {
      loginInProgress.current = false;
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.title}>Login</Text>
          </View>

          {/* Login Form */}
          <Card style={styles.formCard}>
            <View style={styles.formContent}>
              <Text style={styles.formTitle}>Sign In</Text>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                  activeOutlineColor="#1976D2"
                  left={
                    <TextInput.Icon
                      icon={() => (
                        <Ionicons name="mail-outline" size={24} color="#555" />
                      )}
                    />
                  }
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  activeOutlineColor="#1976D2"
                  left={
                    <TextInput.Icon
                      icon={() => (
                        <Ionicons
                          name="lock-closed-outline"
                          size={24}
                          color="#555"
                        />
                      )}
                    />
                  }
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
              </View>

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.loginButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.loginButtonLabel}
              >
                {loading ? "Signing In..." : "SIGN IN"}
              </Button>

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{" "}
              <Text
                style={styles.signupLink}
                // Use the correct router path for registration screen
                onPress={() => router.push("/RegisterScreen")}
              >
                Sign Up
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // White background
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
  },
  formCard: {
    borderRadius: 20,
    elevation: 6, // Increased elevation for better shadow
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  formContent: {
    padding: 30,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#F5F5F5", // Slightly off-white input background
    fontSize: 16,
  },
  loginButton: {
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: "#1976D2", // Blue button
    elevation: 4,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loginButtonLabel: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  forgotPassword: {
    alignItems: "center",
    marginTop: 20,
  },
  forgotPasswordText: {
    color: "#1976D2",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  footerText: {
    color: "#000000",
    fontSize: 15,
  },
  signupLink: {
    color: "#1976D2",
    fontWeight: "700",
  },
});
