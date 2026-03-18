import { Stack } from "expo-router";
import { StyleSheet } from "react-native";
import NotificationSetup from "../components/NotificationSetup";

const _layout = () => {
  return (
    <NotificationSetup>
      <Stack screenOptions={{ headerShown: false }} />
    </NotificationSetup>
  );
};

export default _layout;

const styles = StyleSheet.create({});
