/**
 * OHM SDK example — Node CLI showcasing the full surface area.
 *
 * Subcommands (idiot-proof: pick one, run, see output):
 *
 *   summarize  <file.txt> [--style patient|handover|executive|progress-note]
 *   extract    <file.txt> --apiSlug <slug>
 *   transcribe <file.{m4a,wav,mp3}> [--language auto|en|hi|...]
 *   async      <file.{m4a,wav,mp3}> --apiSlug <slug>          (extractAsync — submit + poll)
 *   list                                                       (apis.list)
 *   show       <slug>                                          (apis.get)
 *
 * Setup:
 *   echo "OHM_API_KEY=ohms_test_xxx" > .env
 *   npm install
 *   npx tsx run.ts summarize ./consult.txt
 *
 * The script never crashes on a missing key — it prints what to do
 * instead.
 */
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import {
  OHM,
  OHMAuthError,
  OHMError,
  OHMNetworkError,
  OHMNotFoundError,
  OHMRateLimitError,
  OHMServerError,
  OHMTimeoutError,
  OHMValidationError,
} from "@ohm_studio/sdk";

const HELP = `OHM CLI — usage:

  summarize  <file.txt>             — summarise free text (default)
    --style patient|handover|executive|progress-note  (default: patient)
    --maxLines N                                       (default: 6)

  extract    <file.txt>             — text → structured JSON
    --apiSlug <slug>                                   (required)

  transcribe <file.audio>           — audio → English transcript
    --language auto|en|hi|ta|...                       (default: auto)

  async      <file.audio>           — submit async job + poll until done
    --apiSlug <slug>                                   (required)

  list                              — list published APIs on this key
  show       <slug>                 — show schema/prompt/inputs for an API

Environment variables:
  OHM_API_KEY                       — required (mint at studio.ohm.doctor)
  OHM_BASE_URL                      — optional, default https://api.ohm.doctor
`;

async function main() {
  const apiKey = process.env.OHM_API_KEY;
  if (!apiKey) {
    console.error("ERROR: OHM_API_KEY not set.");
    console.error("");
    console.error("  1. Mint a key at studio.ohm.doctor → Keys → New key.");
    console.error("  2. Add it to your shell or .env:");
    console.error('       export OHM_API_KEY="ohms_test_xxx"');
    console.error("  3. Re-run this command.");
    process.exit(1);
  }
  if (!apiKey.startsWith("ohms_")) {
    console.error(
      `ERROR: OHM_API_KEY does not look like a valid OHM key (must start with "ohms_test_" or "ohms_live_").`,
    );
    process.exit(1);
  }

  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log(HELP);
    return;
  }

  const ohm = new OHM({
    apiKey,
    baseUrl: process.env.OHM_BASE_URL ?? "https://api.ohm.doctor",
    onUsage: (e) =>
      console.error(
        `[ohm] ${e.method} ${e.endpoint} → ${e.status} (${e.latencyMs}ms, ${e.retries} retries)`,
      ),
  });

  try {
    switch (cmd) {
      case "summarize":
        await runSummarize(ohm, argv);
        break;
      case "extract":
        await runExtract(ohm, argv);
        break;
      case "transcribe":
        await runTranscribe(ohm, argv);
        break;
      case "async":
        await runAsync(ohm, argv);
        break;
      case "list":
        await runList(ohm);
        break;
      case "show":
        await runShow(ohm, argv);
        break;
      default:
        console.error(`Unknown subcommand: ${cmd}\n`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (e) {
    handleError(e);
  }
}

// ─── subcommands ───────────────────────────────────────────────────────

async function runSummarize(ohm: OHM, argv: string[]) {
  const file = argv[1];
  if (!file) die("summarize needs <file.txt>");
  const style = (flag(argv, "--style") ?? "patient") as
    | "patient"
    | "handover"
    | "executive"
    | "progress-note";
  const maxLines = Number(flag(argv, "--maxLines") ?? 6);
  const text = await readFile(file, "utf8");
  const { summary } = await ohm.summarize({ text, style, maxLines });
  console.log(summary);
}

async function runExtract(ohm: OHM, argv: string[]) {
  const file = argv[1];
  const apiSlug = flag(argv, "--apiSlug");
  if (!file || !apiSlug) {
    die("extract needs <file.txt> --apiSlug <slug>");
  }
  const text = await readFile(file, "utf8");
  const { data, version } = await ohm.extract({ apiSlug, text });
  console.error(`[ohm] extracted from "${apiSlug}" v${version ?? "?"}`);
  console.log(JSON.stringify(data, null, 2));
}

async function runTranscribe(ohm: OHM, argv: string[]) {
  const file = argv[1];
  if (!file) die("transcribe needs <file.audio>");
  const language = flag(argv, "--language") ?? "auto";
  const buffer = await readFile(file);
  const ext = extname(file).slice(1) || "m4a";
  const { transcript, language: detected, durationSec } =
    await ohm.audio.transcribe({
      file: { buffer, name: basename(file), type: `audio/${ext}` },
      language,
    });
  console.error(
    `[ohm] transcribed ${durationSec?.toFixed(1) ?? "?"}s of ${detected ?? language}`,
  );
  console.log(transcript);
}

async function runAsync(ohm: OHM, argv: string[]) {
  const file = argv[1];
  const apiSlug = flag(argv, "--apiSlug");
  if (!file || !apiSlug) {
    die("async needs <file.audio> --apiSlug <slug>");
  }
  const buffer = await readFile(file);
  const ext = extname(file).slice(1) || "m4a";
  console.error("[ohm] submitting async job…");
  const final = await ohm.audio.extractAsync({
    apiSlug,
    file: { buffer, name: basename(file), type: `audio/${ext}` },
    language: "auto",
    intervalMs: 2000,
    onProgress: (snap) => {
      // extractAsync wires onProgress for both phases:
      //   • upload phase  → { loaded, total, percent }
      //   • polling phase → { status, workerProgress, ... }  (JobDetail)
      // Discriminate on a property unique to JobDetail.
      if ("status" in snap) {
        process.stderr.write(
          `\r[ohm] ${snap.status.padEnd(10)} ${(snap.workerProgress ?? 0)
            .toString()
            .padStart(3)}%`,
        );
      } else {
        process.stderr.write(
          `\r[ohm] uploading  ${snap.percent.toFixed(0).padStart(3)}%`,
        );
      }
    },
  });
  process.stderr.write("\n");
  console.error(
    `[ohm] job ${final.id} → ${final.status} (${final.totalTokens ?? "?"} tokens, ${final.audioSeconds ?? "?"}s audio)`,
  );
  if (final.status !== "COMPLETED") {
    console.error(`[ohm] error: ${final.errorMessage ?? final.errorCode ?? "?"}`);
    process.exit(2);
  }
  console.log(JSON.stringify(final.resultData ?? {}, null, 2));
}

async function runList(ohm: OHM) {
  const apis = await ohm.apis.list();
  if (apis.length === 0) {
    console.log(
      "No published APIs on this key. Open Studio → clone a starter → click Publish.",
    );
    return;
  }
  console.log("Published APIs:");
  for (const a of apis) {
    console.log(
      `  ${(a.slug ?? "?").padEnd(28)} v${a.version ?? "?"}  ${a.name ?? ""}`,
    );
  }
}

async function runShow(ohm: OHM, argv: string[]) {
  const slug = argv[1];
  if (!slug) die("show needs <slug>");
  const detail = await ohm.apis.get(slug);
  console.log(JSON.stringify(detail, null, 2));
}

// ─── helpers ───────────────────────────────────────────────────────────

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  return argv[i + 1];
}

function die(msg: string): never {
  console.error(`ERROR: ${msg}`);
  console.error("");
  console.error(HELP);
  process.exit(1);
}

function handleError(err: unknown): never {
  if (err instanceof OHMAuthError) {
    console.error(
      "[ohm] auth failed — your OHM_API_KEY is missing, expired, or revoked. Mint a fresh one.",
    );
    process.exit(2);
  }
  if (err instanceof OHMNotFoundError) {
    console.error(
      `[ohm] not found (${err.message}). Run "list" to see what slugs exist on this key.`,
    );
    process.exit(2);
  }
  if (err instanceof OHMRateLimitError) {
    console.error(
      `[ohm] rate limited — retry in ${err.retryAfterSec ?? 60}s.`,
    );
    process.exit(2);
  }
  if (err instanceof OHMValidationError) {
    console.error(
      `[ohm] validation failed: ${err.message}${err.fields?.length ? ` — fields: ${err.fields.join(", ")}` : ""}`,
    );
    process.exit(2);
  }
  if (err instanceof OHMTimeoutError) {
    console.error(
      "[ohm] request timed out — for long audio, switch to the `async` subcommand.",
    );
    process.exit(2);
  }
  if (err instanceof OHMNetworkError) {
    console.error(`[ohm] network error: ${err.message}. Check connectivity.`);
    process.exit(2);
  }
  if (err instanceof OHMServerError) {
    console.error(
      `[ohm] server error ${err.status}: ${err.message} (req ${err.requestId ?? "?"})`,
    );
    process.exit(2);
  }
  if (err instanceof OHMError) {
    console.error(`[ohm] ${err.code}: ${err.message}`);
    process.exit(2);
  }
  throw err;
}

main().catch(handleError);
