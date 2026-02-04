import { useLocalSearchParams, useRouter } from "expo-router"; // <-- Expo Router Imports
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface UserData {
  name: string;
  // Assuming role is optional here if it's the main patient screen
  role?: "patient";
}

// Converted to Expo Router component structure
const MainScreen: React.FC<{}> = () => {
  const router = useRouter();
  // Use useLocalSearchParams to get data passed during login/registration
  const params = useLocalSearchParams();

  // Extract user data, prioritizing route params, otherwise fallback
  const userData: UserData = {
    name: (params.name as string) || "Patient",
    role: (params.role as UserData["role"]) || "patient",
  };

  const handleNewPatient = () => {
    // Assuming 'PatientDetails' is the file name for the new patient form
    router.push("/PatientDetailsScreen");
  };

  const handlePreviousRecords = () => {
    // Navigate to AllPatientRecords screen (used by clinicians/radiologists)
    router.push("/AllPatientsRecords");
  };

  const handleLogout = () => {
    // Placeholder for logging out and returning to the login screen
    router.replace("/LoginScreen");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Logout Button */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Title Section */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome</Text>
        <Text style={styles.subText}>[{userData.name}]</Text>
        <View style={styles.separator} />
      </View>

      {/* Button Section */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleNewPatient}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>New Patient</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={handlePreviousRecords}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonTextSecondary}>View Records</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoutButton: {
    position: "absolute",
    top: 60, // Adjusted for SafeAreaView/notch padding
    right: 20,
    padding: 10,
  },
  logoutText: {
    fontSize: 16,
    color: "#FF0000",
    fontWeight: "bold",
  },
  header: {
    alignItems: "center",
    marginBottom: 60,
  },
  welcomeText: {
    fontSize: 36,
    color: "#00B050", // bright green title
    fontWeight: "bold",
    textAlign: "center",
  },
  subText: {
    fontSize: 16,
    color: "#666666",
    marginTop: 6,
    textAlign: "center",
  },
  separator: {
    width: 180,
    height: 1,
    backgroundColor: "#CCCCCC",
    marginTop: 12,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  actionButton: {
    backgroundColor: "#00B050", // Primary Green
    borderRadius: 10,
    paddingVertical: 18,
    width: "85%",
    alignItems: "center",
    marginVertical: 10,
    elevation: 4, // subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  actionButtonSecondary: {
    backgroundColor: "#FFD54F", // soft yellow
    borderRadius: 10,
    paddingVertical: 15,
    width: "85%",
    alignItems: "center",
    marginVertical: 10,
    elevation: 2, // subtle shadow
  },
  buttonText: {
    color: "#FFFFFF", // White text for primary button
    fontSize: 18,
    fontWeight: "700",
  },
  buttonTextSecondary: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default MainScreen;
