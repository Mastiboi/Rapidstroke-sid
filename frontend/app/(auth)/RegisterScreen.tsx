import { Ionicons } from "@expo/vector-icons";
import RNDateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import axios from "axios";
import { useRouter } from "expo-router"; // <-- CHANGED BACK TO useRouter
import React, { useState } from "react";
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
import { Button, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

// Define the possible roles for clearer typing
type UserRole = "emo" | "clinician" | "radiologist";

// --- PLACEHOLDER AUTH SERVICE (Adapting from previous axios structure) ---
// NOTE: In a real app, this would live in a separate file (e.g., ../services/authService.ts)
// Replace 192.168.1.100 with your computer's actual IP address
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://13.53.218.254/api";

const authService = {
  register: async (data: any) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, data);

      // Simulate backend response structure (success field)
      if (response.status === 200 || response.status === 201) {
        const userData = response.data?.data || null;
        console.log("Registration response data:", response.data);

        if (userData.role === "emo") {
          console.log("User role identified as EMO.");
        } else if (userData.role === "clinician") {
          console.log("User role identified as clinician.");
        } else if (userData.role === "radiologist") {
          console.log("User role identified as radiologist.");
        }

        return {
          success: true,
          message: response.data?.message || "Registration successful",
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: response.data?.message || "Registration failed",
        };
      }
      // return {
      //   success: response.status === 200 || response.status === 201,
      //   message: response.data?.message || "Registration successful",
      //   data: response.data,
      // };
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

// Component now uses internal router hook
const RegisterScreen: React.FC<{}> = () => {
  const router = useRouter(); // <-- INITIALIZED EXPO ROUTER HOOK

  // --- State Management ---
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    dob: "", // Formatted date string (YYYY-MM-DD)
    role: "emo" as UserRole, // Default role
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State for Date Picker
  const [selectedDate, setSelectedDate] = useState(new Date()); // Date object for picker
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- Handlers ---

  const handleInputChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const onChangeDate = (event: DateTimePickerEvent, date?: Date) => {
    // 1. Hide the picker immediately after an action (dismissal or selection)
    setShowDatePicker(false);

    // 2. CRITICAL CONFIRMATION CHECK: Only process the date if event.type is 'set' (OK/Done was pressed).
    if (event.type === "set" && date) {
      setSelectedDate(date);
      // Format the date to YYYY-MM-DD string for form submission
      const formattedDate = date.toISOString().split("T")[0];
      setFormData((prev) => ({ ...prev, dob: formattedDate }));
    }
    // If event.type is 'dismissed' (user tapped outside/canceled), we do nothing with the state.
  };

  const validateForm = () => {
    const { name, email, password, dob } = formData;

    if (!name || !email || !password || !dob) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return false;
    }

    // Email Validation: Check if the email format is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log("Starting registration process...");
      const response = await authService.register(formData);
      console.log("Registration response:", response);

      if (response.success) {
        const userData = response.data?.user || {
          email: formData.email,
          role: formData.role,
        }; // Use form data if server response is minimal

        console.log("User registered:", userData.email, "Role:", userData.role);

        Alert.alert("Success", "Account created successfully!");

        // Use router.replace to prevent going back to the registration screen
        if (userData.role === "emo") {
          router.replace("./EMODashboard");
        } else if (userData.role === "clinician") {
          router.replace("./ClinicianDashboard");
        } else if (userData.role === "radiologist") {
          router.replace("./RadiologistDashboard");
        } else {
          router.replace("./EMODashboard"); // Default fallback
        }
      } else {
        Alert.alert(
          "Registration Failed",
          response.message || "Unable to create account. Please try again."
        );
      }
    } catch (error) {
      // Error handling is inside authService, but catch generic network errors here
      Alert.alert(
        "Connection Error",
        "Unable to connect to server or unexpected network issue."
      );
      console.error("Registration exception:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- JSX Render ---

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()} // <-- UPDATED to router.back()
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <Text style={styles.title}>Create New Account</Text>
          <Text style={styles.subtitle}>
            Already Registered?{" "}
            <Text
              style={styles.linkText}
              onPress={() => router.replace("/(auth)/LoginScreen")} // <-- UPDATED to router.push('Login')
            >
              Log in here.
            </Text>
          </Text>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <TextInput
              label="Name"
              value={formData.name}
              onChangeText={(v) => handleInputChange("name", v)}
              mode="flat"
              style={styles.input}
              underlineColor="transparent"
              activeUnderlineColor="#00B050"
              left={
                <TextInput.Icon
                  icon={() => (
                    <Ionicons name="person-outline" size={20} color="#000" />
                  )}
                />
              }
            />
            <TextInput
              label="Email"
              value={formData.email}
              onChangeText={(v) => handleInputChange("email", v)}
              mode="flat"
              style={styles.input}
              underlineColor="transparent"
              activeUnderlineColor="#00B050"
              keyboardType="email-address"
              autoCapitalize="none"
              left={
                <TextInput.Icon
                  icon={() => (
                    <Ionicons name="at-circle-outline" size={20} color="#000" />
                  )}
                />
              }
            />
            <TextInput
              label="Password"
              value={formData.password}
              onChangeText={(v) => handleInputChange("password", v)}
              mode="flat"
              style={styles.input}
              underlineColor="transparent"
              activeUnderlineColor="#00B050"
              secureTextEntry={!showPassword}
              left={
                <TextInput.Icon
                  icon={() => (
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#000"
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

            {/* Date of Birth Picker Input */}
            <TextInput
              label="Date of Birth"
              placeholder="YYYY-MM-DD"
              value={formData.dob}
              // Set onPressIn to show the picker, and prevent keyboard
              onPressIn={() => setShowDatePicker(true)}
              showSoftInputOnFocus={false}
              mode="flat"
              style={styles.input}
              underlineColor="transparent"
              activeUnderlineColor="#00B050"
              left={
                <TextInput.Icon
                  icon={() => (
                    <Ionicons name="calendar-outline" size={20} color="#000" />
                  )}
                />
              }
            />

            {/* Conditional Date Picker Component */}
            {showDatePicker && (
              <RNDateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onChangeDate}
                maximumDate={new Date()} // Prevent selecting a future date
              />
            )}
          </View>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            {(["emo", "clinician", "radiologist"] as UserRole[]).map(
              (role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButton,
                    formData.role === role && styles.roleButtonActive,
                  ]}
                  onPress={() => handleInputChange("role", role)}
                >
                  <Text
                    style={[
                      styles.roleText,
                      formData.role === role && styles.roleTextActive,
                    ]}
                  >
                    {role.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.signUpButton}
            contentStyle={styles.signUpButtonContent}
            labelStyle={styles.signUpButtonLabel}
          >
            {loading ? "Signing up..." : "SIGN UP"}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  backButton: {
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    color: "#00B050", // Green title
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: {
    textAlign: "center",
    color: "#555",
    marginBottom: 25,
    fontSize: 13,
  },
  linkText: {
    color: "#00B050",
    fontWeight: "bold",
  },
  formContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#F5F5F5",
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 30,
  },
  roleButton: {
    flex: 1,
    backgroundColor: "#E0F7FA", // Light blue background
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#00BCD4",
    alignItems: "center",
  },
  roleButtonActive: {
    backgroundColor: "#00BCD4", // Active blue background
    borderColor: "#00BCD4",
  },
  roleText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 11,
    paddingHorizontal: 3,
  },
  roleTextActive: {
    color: "#FFFFFF",
  },
  signUpButton: {
    backgroundColor: "#00B050", // Changed to green for contained mode
    borderRadius: 10,
    marginBottom: 30,
    elevation: 4,
  },
  signUpButtonContent: {
    paddingVertical: 8,
  },
  signUpButtonLabel: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
