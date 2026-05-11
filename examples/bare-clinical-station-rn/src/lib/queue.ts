/**
 * Singleton OhmQueue + AsyncStorage adapter wired to the app's `ohm`
 * client. Imported wherever a screen wants to enqueue / list / flush.
 *
 *   import { ohmQueue } from "../lib/queue";
 *   await ohmQueue.enqueue("audio.extract", { apiSlug, file: rnFile });
 *
 * The queue is created lazily so a missing `ohm` client (i.e. fresh
 * clone before .env is filled) doesn't crash module load.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OhmQueue, makeAsyncStorageAdapter } from "@ohm_studio/sdk-react-native";
import { ohm } from "./ohm-client";

let _q: OhmQueue | null = null;

export function getQueue(): OhmQueue | null {
  if (!ohm) return null;
  if (!_q) {
    _q = new OhmQueue({
      storage: makeAsyncStorageAdapter(AsyncStorage),
      client: ohm,
    });
  }
  return _q;
}
