/**
 * Home tab — wraps three capture screens in a native stack so each
 * flow has its own back-navigation. Patient + provider context lives
 * here as demo state (no auth in the demo).
 */
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "./HomeScreen";
import { VitalsCaptureScreen } from "./VitalsCaptureScreen";
import { DoctorNoteScreen } from "./DoctorNoteScreen";
import { NurseShiftScreen } from "./NurseShiftScreen";
import type { DoctorNote, NurseShiftHandover, VitalsRecord } from "../lib/types";

export const DEMO_PATIENT = {
  id: "p_demo_001",
  name: "Mr Rajesh Sharma",
  bedNumber: "12",
  age: 56,
};
export const DEMO_DOCTOR = { id: "u_doc_001", name: "Dr A Kumar" };
export const DEMO_NURSE = { id: "u_nurse_001", name: "RN B Iyer" };

export type HomeStackParamList = {
  Patient: undefined;
  Vitals: undefined;
  DoctorNote: undefined;
  NurseShift: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  // No-op save handlers for the demo. Replace with your DB write.
  const onSaveVitals = async (v: VitalsRecord) => {
    // eslint-disable-next-line no-console
    console.log("[demo] saved vitals", v);
  };
  const onSaveDoctorNote = async (n: DoctorNote) => {
    // eslint-disable-next-line no-console
    console.log("[demo] saved doctor note", n);
  };
  const onSaveNurseShift = async (h: NurseShiftHandover) => {
    // eslint-disable-next-line no-console
    console.log("[demo] saved nurse shift", h);
  };

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "white" } }}
    >
      <Stack.Screen name="Patient" component={HomeScreen} />
      <Stack.Screen name="Vitals">
        {({ navigation }) => (
          <VitalsCaptureScreen
            patient={DEMO_PATIENT}
            recordedBy={DEMO_NURSE}
            onSave={onSaveVitals}
            onClose={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="DoctorNote">
        {({ navigation }) => (
          <DoctorNoteScreen
            patient={DEMO_PATIENT}
            author={DEMO_DOCTOR}
            onSave={onSaveDoctorNote}
            onClose={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="NurseShift">
        {({ navigation }) => (
          <NurseShiftScreen
            patient={DEMO_PATIENT}
            nurse={DEMO_NURSE}
            shift="Morning"
            shiftDate={new Date().toISOString().slice(0, 10)}
            onSave={onSaveNurseShift}
            onClose={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
