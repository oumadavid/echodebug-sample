#!/usr/bin/env node
/**
 * POST a build error to EchoDebug, print the diagnosis in this terminal,
 * then play the spoken MP3 here (no browser, no data-URL dump).
 *
 * n8n cannot speak on your machine — this client plays the audio it returns.
 *
 * Usage:
 *   npm run build 2>&1 | tee last-build.log
 *   node scripts/echodebug.js --from-file last-build.log
 *
 *   node scripts/echodebug.js --text "Error: DATABASE_URL is not set..."
 *
 * Env:
 *   ECHODEBUG_WEBHOOK  default https://jsninja.app.n8n.cloud/webhook/debug
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const WEBHOOK =
  process.env.ECHODEBUG_WEBHOOK ||
  "https://jsninja.app.n8n.cloud/webhook/debug";

function parseArgs(argv) {
  const out = { fromFile: null, text: null, noPlay: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from-file" && argv[i + 1]) out.fromFile = argv[++i];
    else if (a === "--text" && argv[i + 1]) out.text = argv[++i];
    else if (a === "--no-play") out.noPlay = true;
  }
  return out;
}

function readErrorLog(args) {
  if (args.text) return args.text;
  if (args.fromFile) {
    return fs.readFileSync(args.fromFile, "utf8");
  }
  if (!process.stdin.isTTY) {
    return fs.readFileSync(0, "utf8");
  }
  console.error(
    "Pass --from-file <log>, --text <error>, or pipe the build log on stdin."
  );
  process.exit(1);
}

function formatErrorForDisplay(text) {
  const lines = text.split(/\r?\n/);
  const max = 80;
  if (lines.length <= max) return text;
  return lines.slice(-max).join("\n");
}

function decodeAudioUrl(audioUrl) {
  if (!audioUrl || typeof audioUrl !== "string") {
    throw new Error("No audio_url in webhook response");
  }
  const m = audioUrl.match(/^data:audio\/mpeg;base64,(.+)$/s);
  if (!m) throw new Error("audio_url is not a data:audio/mpeg;base64 URL");
  return Buffer.from(m[1], "base64");
}

function playMp3Windows(mp3Path) {
  const abs = path.resolve(mp3Path).replace(/'/g, "''");
  const ps = `
Add-Type -AssemblyName PresentationCore
$player = New-Object System.Windows.Media.MediaPlayer
$player.Open([Uri]'${abs}')
$n = 0
while (-not $player.NaturalDuration.HasTimeSpan -and $n -lt 80) {
  Start-Sleep -Milliseconds 100
  $n++
}
$player.Volume = 1
$player.Play()
if ($player.NaturalDuration.HasTimeSpan) {
  Start-Sleep -Seconds ([Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalSeconds) + 1)
} else {
  Start-Sleep -Seconds 25
}
$player.Stop()
$player.Close()
`.trim();

  const r = spawnSync(
    "powershell.exe",
    ["-STA", "-NoProfile", "-NonInteractive", "-Command", ps],
    { stdio: "inherit" }
  );
  return r.status === 0;
}

function playMp3(mp3Path) {
  const ffplay = spawnSync(
    "ffplay",
    ["-nodisp", "-autoexit", "-loglevel", "quiet", mp3Path],
    { stdio: "ignore" }
  );
  if (ffplay.status === 0) return;

  if (process.platform === "win32") {
    if (playMp3Windows(mp3Path)) return;
  }

  console.error(
    "Could not play audio in-process. Install ffmpeg (ffplay) or use Windows PowerShell."
  );
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const error_log = readErrorLog(args).trim();
  if (!error_log) {
    console.error("Error log is empty.");
    process.exit(1);
  }

  console.log("");
  console.log("── error ────────────────────────────────────────────");
  console.log(formatErrorForDisplay(error_log));
  console.log("─────────────────────────────────────────────────────");
  console.log("");

  process.stderr.write("EchoDebug: identifying error…\n");

  const res = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error_log }),
  });

  const raw = await res.text();
  if (!res.ok) {
    console.error(`Webhook HTTP ${res.status}: ${raw.slice(0, 500)}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error("Webhook did not return JSON.");
    process.exit(1);
  }

  if (args.noPlay) return;

  const buf = decodeAudioUrl(data.audio_url);
  const mp3Path = path.join(os.tmpdir(), "echodebug-speak.mp3");
  fs.writeFileSync(mp3Path, buf);

  process.stderr.write("EchoDebug: reading it aloud in this terminal…\n");
  playMp3(mp3Path);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
