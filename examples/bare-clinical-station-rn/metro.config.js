/**
 * Metro config — bare RN flavour.
 * Wraps @react-native/metro-config's getDefaultConfig() and merges any
 * project-specific overrides on top.
 */
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
