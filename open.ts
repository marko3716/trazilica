/**
 * Interactive picker for ads stored in state/seen.json.
 *
 *   npm run open                 -> pick a category, then pick ads
 *   npm run open -- 2            -> category #2, then pick ads
 *   npm run open -- 2 1-5,8      -> category #2, open ads 1-5 and 8 directly
 *
 * Ad selection syntax: "all", "top 10", "1,3,5-8", or "q" to quit.
 * seen.json only stores ids, so links are built as .../x-oglas-<id>;
 * Njuskalo redirects that to the real ad page.
 */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, argv, platform, exit } from "node:process";

type Seen = Record<string, Record<string, string>>;

const STATE_PATH = "state/seen.json";
const adUrl = (id: string) => `https://www.njuskalo.hr/nekretnine/x-oglas-${id}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function openUrl(url: string) {
  const [cmd, args] =
    platform === "darwin" ? ["open", [url]]
    : platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : ["xdg-open", [url]];
  const p = spawn(cmd, args as string[], { stdio: "ignore", detached: true });
  p.on("error", () => console.error(`Could not open ${url}`));
  p.unref();
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("hr-HR", { dateStyle: "short", timeStyle: "short" });
}

/** Parses "all", "top N", "1,3,5-8" into 0-based indexes. */
function parseSelection(input: string, total: number): number[] | null {
  const s = input.trim().toLowerCase();
  if (s === "all" || s === "a") return [...Array(total).keys()];
  const top = s.match(/^top\s*(\d+)$/);
  if (top) return [...Array(Math.min(+top[1], total)).keys()];
  const out = new Set<number>();
  for (const part of s.split(/[,\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return null;
    const a = +m[1], b = m[2] ? +m[2] : a;
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
      if (i >= 1 && i <= total) out.add(i - 1);
    }
  }
  return out.size ? [...out].sort((x, y) => x - y) : null;
}

async function main() {
  let seen: Seen;
  try {
    seen = JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    console.error(`Cannot read ${STATE_PATH}. Run "git pull" first?`);
    exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const ask = (q: string) => rl.question(q);
  const cats = Object.keys(seen);
  const [catArg, selArg] = argv.slice(2);

  // 1. Category
  console.log("\nCategories:");
  cats.forEach((c, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${c}  (${Object.keys(seen[c]).length})`);
  });
  let ci = catArg ? +catArg - 1 : -1;
  while (!(ci >= 0 && ci < cats.length)) {
    const a = await ask("\nCategory number (q to quit): ");
    if (a.trim().toLowerCase() === "q") return rl.close();
    ci = +a - 1;
  }
  const cat = cats[ci];

  // 2. Ads, newest first
  const ads = Object.entries(seen[cat])
    .map(([id, at]) => ({ id, at }))
    .sort((a, b) => b.at.localeCompare(a.at));

  console.log(`\n${cat} — ${ads.length} ads, newest first:`);
  ads.forEach((ad, i) => {
    console.log(`  ${String(i + 1).padStart(4)}. ${fmt(ad.at).padEnd(18)} ${adUrl(ad.id)}`);
  });

  let picked: number[] | null = selArg ? parseSelection(selArg, ads.length) : null;
  while (!picked) {
    const a = await ask('\nWhich to open? ("all", "top 10", "1,3,5-8", q to quit): ');
    if (a.trim().toLowerCase() === "q") return rl.close();
    picked = parseSelection(a, ads.length);
    if (!picked) console.log("  Did not understand that, try again.");
  }

  if (picked.length > 20) {
    const ok = await ask(`This opens ${picked.length} tabs. Continue? (y/N): `);
    if (!/^y/i.test(ok.trim())) return rl.close();
  }
  rl.close();

  // 3. Open (small pause so the browser is not flooded)
  for (const i of picked) {
    openUrl(adUrl(ads[i].id));
    await sleep(300);
  }
  console.log(`Opened ${picked.length} ad(s).`);
}

main();
