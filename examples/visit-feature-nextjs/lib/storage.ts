/**
 * Browser-side visit store (localStorage). Same surface as the Expo
 * example's storage.ts so a hospital running both web + mobile can
 * keep the screens identical and just swap the store.
 *
 * In production: replace this whole file with calls to your EMR's
 * REST/GraphQL backend. The function signatures don't change.
 */
"use client";

import type { SavedVisit } from "./types";

const KEY = "ohm.visits.v1";

export function listVisits(): SavedVisit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedVisit[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveVisit(v: SavedVisit): void {
  if (typeof window === "undefined") return;
  const all = listVisits();
  const next = [v, ...all.filter((x) => x.id !== v.id)];
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function deleteVisit(id: string): void {
  if (typeof window === "undefined") return;
  const all = listVisits();
  localStorage.setItem(
    KEY,
    JSON.stringify(all.filter((v) => v.id !== id)),
  );
}

export function getVisit(id: string): SavedVisit | null {
  return listVisits().find((v) => v.id === id) ?? null;
}
