import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNBOOKS_DIR = join(__dirname, "../../../runbooks");

function loadRunbooks(): Record<string, string> {
  const runbooks: Record<string, string> = {};
  if (!existsSync(RUNBOOKS_DIR)) return runbooks;
  for (const file of readdirSync(RUNBOOKS_DIR)) {
    if (file.endsWith(".md")) {
      const name = file.replace(/\.md$/, "");
      runbooks[name] = readFileSync(join(RUNBOOKS_DIR, file), "utf-8");
    }
  }
  return runbooks;
}

export interface RunbookResult {
  success: boolean;
  query: string;
  matchedName: string | null;
  available: string[];
  content: string;
  raw: string;
}

export function lookupRunbook(incidentType: string): RunbookResult {
  const runbooks = loadRunbooks();
  const available = Object.keys(runbooks);

  if (available.length === 0) {
    return {
      success: false,
      query: incidentType,
      matchedName: null,
      available: [],
      content: "",
      raw: `ERROR: No runbooks found in ${RUNBOOKS_DIR}.`,
    };
  }

  const query = incidentType.toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");

  if (runbooks[query]) {
    return {
      success: true,
      query: incidentType,
      matchedName: query,
      available,
      content: runbooks[query],
      raw: `Runbook: ${query}\n\n${runbooks[query]}`,
    };
  }

  const partial = available.filter((name) => query.includes(name) || name.includes(query));
  if (partial.length > 0) {
    const best = partial[0];
    return {
      success: true,
      query: incidentType,
      matchedName: best,
      available,
      content: runbooks[best],
      raw: `Runbook: ${best} (matched '${incidentType}')\n\n${runbooks[best]}`,
    };
  }

  const keywords = query.split("-").filter((k) => k.length > 2);
  const contentMatch = available.find((name) => {
    const content = runbooks[name].toLowerCase();
    return keywords.some((kw) => content.includes(kw) || name.includes(kw));
  });

  if (contentMatch) {
    return {
      success: true,
      query: incidentType,
      matchedName: contentMatch,
      available,
      content: runbooks[contentMatch],
      raw: `Runbook: ${contentMatch} (keyword match)\n\n${runbooks[contentMatch]}`,
    };
  }

  return {
    success: false,
    query: incidentType,
    matchedName: null,
    available,
    content: "",
    raw: `No runbook for '${incidentType}'. Available: ${available.join(", ")}`,
  };
}
