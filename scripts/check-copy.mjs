import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["apps/web/src", "apps/mobile"];
const banned = [
  /Published to (Facebook|Instagram|LinkedIn|TikTok)/,
  /Posted to (Facebook|Instagram|LinkedIn|TikTok)/,
  /Successfully published/,
  /Live on (Facebook|Instagram|LinkedIn|TikTok)/,
];

function files(dir, acc = []) {
  if (!statSafe(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === ".expo") continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files(path, acc);
    else if (/\.(jsx?|tsx?|html|css)$/.test(entry)) acc.push(path);
  }
  return acc;
}

function statSafe(dir) {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

const hits = [];
for (const root of roots) {
  for (const path of files(root)) {
    const text = readFileSync(path, "utf8");
    for (const pattern of banned) {
      if (pattern.test(text)) hits.push(`${path} matches ${pattern}`);
    }
  }
}

if (hits.length) {
  console.error(hits.join("\n"));
  process.exit(1);
}

console.log("Publishing copy stays explicit about simulation.");
