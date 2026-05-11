/**
 * Probe — verify the 3 inpatient-station schemas extract cleanly against
 * realistic Indian-English clinical dictation. Useful as a sanity check
 * after editing the schemas in Studio.
 *
 * Usage:
 *   1. Publish all three schemas in Studio.
 *   2. Mint a test-mode key (`ohms_test_*`).
 *   3. Set the env vars (or fill `.env` and `npm run probe`):
 *
 *        OHM_API_KEY=ohms_test_xxx
 *        OHM_VITALS_SLUG=inpatient-vital              # if you used a different slug
 *        OHM_DOCTOR_NOTE_SLUG=inpatient-doctor-note   # default — override if needed
 *        OHM_NURSE_SHIFT_SLUG=nurse-shift-handover    # default — override if needed
 *
 *   4. Run:
 *
 *        npx tsx probe.ts
 *
 * The probe hits the LIVE OHM API via @ohm_studio/sdk. It is read-only
 * w.r.t. your data — no rows are persisted on your side. Each run
 * costs a few cents in LLM tokens.
 */
import {
  OHM,
  OHMAuthError,
  OHMError,
  OHMNotFoundError,
  OHMRateLimitError,
  OHMValidationError,
} from "@ohm_studio/sdk";

// Validate up-front so a fresh clone gets a clear error instead of a
// stack trace from `apiKey: undefined`.
const apiKey = process.env.OHM_API_KEY;
if (!apiKey) {
  console.error("");
  console.error("✗ OHM_API_KEY is not set.");
  console.error("");
  console.error("  1. cp .env.example .env");
  console.error("  2. Edit .env: OHM_API_KEY=ohms_test_xxx (mint at studio.ohm.doctor)");
  console.error("  3. npm run probe");
  console.error("");
  process.exit(1);
}
if (!apiKey.startsWith("ohms_")) {
  console.error(
    `✗ OHM_API_KEY does not start with "ohms_" — looks invalid.`,
  );
  process.exit(1);
}

const ohm = new OHM({
  apiKey,
  baseUrl: process.env.OHM_BASE_URL || "https://api.ohm.doctor",
});

// Production-realistic input — OHM's STT translate-mode normalises spoken
// numbers ("one oh four" → "104") before the extractor ever sees them, so
// these probes use the post-STT digit form on purpose.
const VITALS_DICTATION = `Bed 12, Mr Rajesh, 11 AM check.
Temperature 99.1 Fahrenheit, pulse 104, respiratory rate 22, BP 130/85,
saturation 96 on room air, pain score 4 out of 10.`;

const DOCTOR_NOTE_DICTATION = `Day 2 post-op, Mr Rajesh. Patient is feeling
significantly better today, pain has reduced from six to three out of ten
overall. Mild ankle swelling on the left, no fresh chest pain, breathing
comfortable. Wound looks clean, dry dressing.

Plan — continue Augmentin one twenty five milligrams BD for two more days,
restart Aspirin seventy five milligrams once daily from tomorrow,
Pantoprazole forty milligrams before breakfast continues. Order repeat CBC
and serum creatinine tomorrow morning. If saturation drops below ninety two
percent or new chest pain comes, call resident immediately. Follow up
review tomorrow at ten AM.`;

const NURSE_SHIFT_DICTATION = `Morning shift handover for Bed 12, Mr Rajesh
Sharma, Day 2 post CABG.

Subjective — patient reports feeling tired and weak, mild abdominal
discomfort. Slept reasonably last night, four hours stretches. No nausea,
no vomiting. Bowel motion not yet today.

Objective — pallor noted, mild epigastric tenderness on palpation. Vitals
have been stable through the shift. Drain output one twenty mils serous,
chest tube intact, wound site clean and dry. Intake nine hundred mils,
output six fifty.

Goal for next shift — keep pain at or below three out of ten, mobilise
twice evening, maintain SpO2 ninety five and above.

Timeline.
Seven thirty AM, vitals taken, IV cannula site checked clean and patent.
Eight fifteen, Inj Pantoprazole forty milligrams IV given. Breakfast,
seventy percent eaten.
Nine AM, educated patient on warning signs of bleeding.
Eleven AM, patient ambulated to washroom unassisted.
One PM, Inj Augmentin one point two grams IV given.

ISBARR handover.
Situation — day two post CABG, vitals stable, recovering well.
Background — admitted eighteenth February with chest pain, CABG done
twentieth February. Type two diabetes, hypertension, ex smoker.
Assessment — recovering well, no fresh issues, pain controlled.
Recommendation — continue current orders, dressing change at eight PM,
escalate if chest tube output greater than one hundred mils per hour or
saturation drops below ninety two.
Reassessment — vitals every four hours, pain score every four hours,
neuro check at ten PM.`;

async function run(label: string, slug: string, dictation: string) {
  const t0 = Date.now();
  const r = await ohm.extract({ apiSlug: slug, text: dictation });
  const ms = Date.now() - t0;
  console.log(`\n→ ${label}  (${ms}ms)`);
  console.log(JSON.stringify(r.data, null, 2));
}

async function main() {
  // Read slugs from env — defaults to the names in this example, but
  // override per-deployment if you Published with a different slug
  // (e.g. `inpatient-vital` singular, or `ward-vitals`).
  const VITALS_SLUG =
    process.env.OHM_VITALS_SLUG || "inpatient-vitals";
  const DOCTOR_NOTE_SLUG =
    process.env.OHM_DOCTOR_NOTE_SLUG || "inpatient-doctor-note";
  const NURSE_SHIFT_SLUG =
    process.env.OHM_NURSE_SHIFT_SLUG || "nurse-shift-handover";

  console.log(
    `Probing slugs: ${VITALS_SLUG}, ${DOCTOR_NOTE_SLUG}, ${NURSE_SHIFT_SLUG}\n`,
  );

  await run("vitals", VITALS_SLUG, VITALS_DICTATION);
  await run("doctor note", DOCTOR_NOTE_SLUG, DOCTOR_NOTE_DICTATION);
  await run("nurse shift", NURSE_SHIFT_SLUG, NURSE_SHIFT_DICTATION);
}

main().catch((e) => {
  // Friendly typed-error mapping so failures point to the fix.
  if (e instanceof OHMAuthError) {
    console.error("\n✗ Auth failed — your OHM_API_KEY is wrong/expired/revoked.");
    process.exit(2);
  }
  if (e instanceof OHMNotFoundError) {
    console.error(
      `\n✗ Not found: ${e.message}. The slugs may not match what's Published in Studio. Set OHM_VITALS_SLUG / OHM_DOCTOR_NOTE_SLUG / OHM_NURSE_SHIFT_SLUG to the right names.`,
    );
    process.exit(2);
  }
  if (e instanceof OHMRateLimitError) {
    console.error(`\n✗ Rate limited — retry in ${e.retryAfterSec ?? 60}s.`);
    process.exit(2);
  }
  if (e instanceof OHMValidationError) {
    console.error(
      `\n✗ Validation failed: ${e.message}${e.fields?.length ? ` — fields: ${e.fields.join(", ")}` : ""}`,
    );
    process.exit(2);
  }
  if (e instanceof OHMError) {
    console.error(`\n✗ ${e.code}: ${e.message}`);
    process.exit(2);
  }
  console.error("\n✗", e?.message || e);
  process.exit(1);
});
