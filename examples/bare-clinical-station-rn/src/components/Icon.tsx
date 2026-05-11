/**
 * Icon — single entry point for every glyph in the app.
 *
 * Wraps @expo/vector-icons (Ionicons) behind a stable app-level name
 * so screens don't reach for raw library names. Adding an icon =
 * adding one row to the map below.
 *
 * Why Ionicons:
 *   • bundled with Expo SDK 54, zero extra install
 *   • full-set outline + filled variants
 *   • crisp on every density (1×/2×/3×)
 */
import Ionicons from "react-native-vector-icons/Ionicons";
import { type ComponentProps } from "react";
import { theme } from "../lib/theme";

type IonName = ComponentProps<typeof Ionicons>["name"];

/** App-level semantic icon names → Ionicons glyph names. */
const MAP = {
  // Tab bar
  home: "home-outline",
  homeFilled: "home",
  async: "time-outline",
  asyncFilled: "time",
  catalog: "library-outline",
  catalogFilled: "library",
  tools: "construct-outline",
  toolsFilled: "construct",

  // Recorder states
  mic: "mic",
  stop: "stop",
  pause: "pause",
  resume: "play",
  reRecord: "refresh",

  // Capture-flow action cards
  vitals: "pulse",
  doctorNote: "create",
  shiftHandover: "swap-horizontal",

  // Status / semantics
  check: "checkmark-circle",
  error: "alert-circle",
  warn: "warning",
  info: "information-circle",
  online: "cloud-done",
  offline: "cloud-offline",

  // Affordances
  close: "close",
  back: "chevron-back",
  forward: "chevron-forward",
  copy: "copy-outline",
  download: "download-outline",
  upload: "cloud-upload-outline",
  expand: "chevron-down",
  collapse: "chevron-up",

  // Domain
  patient: "person-circle-outline",
  hospital: "medkit-outline",
  bed: "bed-outline",
  search: "search",
  filter: "options-outline",
  refresh: "refresh-outline",
  edit: "pencil",
  trash: "trash",
  add: "add",
  external: "open-outline",
  key: "key-outline",
  shield: "shield-checkmark-outline",
  language: "language-outline",
  link: "link-outline",
  database: "server-outline",
  code: "code-slash",
  webhook: "swap-vertical",
  spark: "sparkles",
  doc: "document-text-outline",
  audit: "list-circle-outline",
  queue: "list",
  globe: "globe-outline",
} satisfies Record<string, IonName>;

export type IconName = keyof typeof MAP;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color = theme.color.icon }: IconProps) {
  return <Ionicons name={MAP[name]} size={size} color={color} />;
}
