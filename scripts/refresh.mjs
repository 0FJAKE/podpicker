#!/usr/bin/env node
// Refresh the episode list from the live Pod of Jake RSS feed, then push.
//
//   npm run refresh
//
// It re-fetches the feed, re-cleans every bio (stripping promo/chapter
// boilerplate), adds any new episodes, and preserves the curated guest names
// already in app/data/episodes.ts. New episodes get a title-cased name derived
// from the feed (you can hand-correct those later). If nothing changed, it's a
// no-op. On changes: commits and pushes, which triggers a Vercel deploy.

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FEED = "https://anchor.fm/s/2da69154/podcast/rss";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "app", "data", "episodes.ts");

// --- Load existing curated guest names (num -> guest) ---
const existingNames = new Map();
try {
  const src = readFileSync(dataPath, "utf8");
  const arr = JSON.parse(src.slice(src.indexOf("Episode[] = ") + 12, src.lastIndexOf("]") + 1));
  for (const e of arr) existingNames.set(e.num, e.guest);
} catch {
  console.log("No existing episodes.ts found — building fresh.");
}

// --- Fetch + parse the feed ---
console.log("Fetching feed…");
const res = await fetch(FEED);
if (!res.ok) {
  console.error(`Feed fetch failed: HTTP ${res.status}`);
  process.exit(1);
}
const xml = await res.text();
const items = xml.split("<item>").slice(1);

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
const grab = (s, tag) => {
  const m = s.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">"));
  return m ? decode(m[1]) : "";
};

const cutMarkers = [
  /--\s*Thank you for listening/i,
  /Thank you for listening to Pod of Jake/i,
  /If you enjoy this podcast/i,
  /Website:\s*podofjake/i,
  /For more episodes/i,
  /Previous guests include/i,
  /\bFollow\s+[^.]{0,60}?\bon\s+(Twitter|X|Warpcast|Instagram|Farcaster)\b/i,
];

function cleanDesc(raw) {
  let s = raw.replace(/<[^>]+>/g, " ");
  s = s.replace(/Mint this episode for free onchain on Base at\s+\S+/gi, " ");
  let cut = s.length;
  for (const m of cutMarkers) {
    const i = s.search(m);
    if (i >= 0 && i < cut) cut = i;
  }
  s = s.slice(0, cut);
  const ts = s.search(/\[?\d{1,2}:\d{2}\]?/);
  if (ts >= 0) s = s.slice(0, ts);
  s = s
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/(?:[a-z0-9-]+\.)+(?:com|media|xyz|io|co|org|fm|net|eth|app|gg|tv)\b\S*/gi, " ")
    .replace(/\b[A-Za-z0-9]{26,}\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/[\s|\-–—•]+$/g, "")
    .trim();
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  return letters < 10 ? "" : s;
}

const titleCase = (s) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

let added = 0;
const episodes = items
  .map((it) => {
    const title = grab(it, "title");
    const m = title.match(/^#\s*(\d+)\s*[-–]\s*(.+)$/);
    if (!m) return null;
    const num = parseInt(m[1], 10);
    const link = grab(it, "link");
    if (!link) return null;
    const desc = cleanDesc(grab(it, "description") || grab(it, "itunes:summary"));
    let guest = existingNames.get(num);
    if (!guest) {
      guest = titleCase(m[2].trim());
      added++;
    }
    return { num, guest, desc, link };
  })
  .filter(Boolean)
  .sort((a, b) => a.num - b.num);

const out =
  "// Auto-generated from the Pod of Jake RSS feed via `npm run refresh`. " +
  episodes.length +
  " episodes.\n" +
  "export type Episode = { num: number; guest: string; desc: string; link: string };\n\n" +
  "export const episodes: Episode[] = " +
  JSON.stringify(episodes, null, 2) +
  ";\n";

const prev = (() => {
  try {
    return readFileSync(dataPath, "utf8");
  } catch {
    return "";
  }
})();

if (out === prev) {
  console.log(`No changes — already current (${episodes.length} episodes).`);
  process.exit(0);
}

writeFileSync(dataPath, out);
console.log(`Updated: ${episodes.length} episodes${added ? `, ${added} new` : ""}.`);

const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "inherit" });
git("add", "app/data/episodes.ts");
git("commit", "-m", `Refresh episodes from feed (${episodes.length} total${added ? `, +${added}` : ""})`);
git("push");
console.log("\n✅ Pushed. Vercel is redeploying with the latest episodes.");
