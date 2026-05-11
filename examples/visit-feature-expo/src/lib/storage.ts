/**
 * Local visit store — backed by AsyncStorage so visits survive across
 * app launches. In a real EMR this is your backend's REST/GraphQL
 * layer; the demo keeps the shape identical so swapping in the real
 * API is a one-file change.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedVisit } from "./types";

const KEY = "ohm.visits.v1";

export async function listVisits(): Promise<SavedVisit[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as SavedVisit[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveVisit(visit: SavedVisit): Promise<void> {
  const all = await listVisits();
  // Newest first; replace if we somehow get the same id twice.
  const next = [visit, ...all.filter((v) => v.id !== visit.id)];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function deleteVisit(id: string): Promise<void> {
  const all = await listVisits();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(all.filter((v) => v.id !== id)),
  );
}

export async function clearVisits(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
