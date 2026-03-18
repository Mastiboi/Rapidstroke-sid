import { ScreenWrapperProps } from "@/types";
import {
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  View
} from "react-native";

const { height } = Dimensions.get("window");

const ScreenWrapper = ({
  children,
  style,
  showPattern = false,
  isModal = false,
  bgOpacity = 1,
}: ScreenWrapperProps) => {
  let paddingTop = Platform.OS === "ios" ? height * 0.06 : 40;
  let paddingBottom = 0;

  if (isModal) {
    paddingTop = Platform.OS === "ios" ? height * 0.02 : 45;
    paddingBottom = height * 0.02;
  }
  return (
    <View style={[style, { paddingTop, paddingBottom, flex: 1 }]}>
      <StatusBar barStyle={"light-content"} backgroundColor={"transparent"} />
      {children}
    </View>
  );
};

export default ScreenWrapper;

const styles = StyleSheet.create({});
