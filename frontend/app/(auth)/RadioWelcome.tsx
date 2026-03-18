import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router"; // <-- Expo Router Imports
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface UserData {
  name: string;
  role: "clinician" | "radiologist";
}

const RadioWelcome: React.FC<{}> = () => {
  const router = useRouter();
  // Use useLocalSearchParams to read data passed via router.replace({ params: { ... } })
  const { name, role } = useLocalSearchParams();

  // Type casting and providing default values if params are missing
  const userData: UserData = {
    name: (name as string) || "Specialist",
    role: (role as UserData["role"]) || "clinician",
  };

  const handlePreviousRecords = () => {
    // Navigate to the patient records screen (adjust 'AllPatientRecords' path as needed)
    router.push("./AllPatientsRecords");
  };

  // --- Handlers for future features ---
  const handleLogout = () => {
    // Implement logout logic (clear tokens, etc.)
    router.replace("/LoginScreen"); // Redirect to login screen
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Welcome {" "}
            {userData.role === "radiologist" ? "Radiologist" : "Clinician"}
          </Text>
          <Text style={styles.subtitle}>{userData.name}</Text>

          {/* Logout Button */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Card style={styles.card}>
            <TouchableOpacity
              style={styles.button}
              onPress={handlePreviousRecords}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#2196F3", "#1976D2"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>All Patient Records</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Government Medical College & Hospital, Chandigarh
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: 50, // Reduced top margin to account for title and button
    paddingBottom: 20,
  },
  logoutButton: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 10,
  },
  logoutText: {
    fontSize: 16,
    color: "#FF0000",
    fontWeight: "bold",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    textAlign: "center",
    marginTop: 30, // Pushes title down below the logout button area
  },
  subtitle: {
    fontSize: 18,
    color: "#666666",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  mainContent: {
    flex: 1,
    justifyContent: "flex-start", // Align to the top of the content area
    alignItems: "center",
    paddingTop: 40,
  },
  card: {
    width: "100%",
    maxWidth: 350,
    borderRadius: 15,
    elevation: 6,
    marginBottom: 20,
  },
  button: {
    borderRadius: 15,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
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
});

export default RadioWelcome;
