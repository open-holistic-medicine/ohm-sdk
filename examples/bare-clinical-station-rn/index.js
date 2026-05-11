/**
 * Bare-RN entry point.
 * React Native CLI registers the root component via AppRegistry; the
 * `appName` here must match the `name` field in app.json (and the iOS
 * `RCT_MAIN_COMPONENT_NAME` / Android `MainActivity.getMainComponentName()`).
 */
import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);
