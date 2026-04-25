#!/usr/bin/env node
// Reads git log for new commits since the previous tag and merges results into
// src/data/contributors.json.  Falls back to full history when no previous tag
// exists (first release).  Safe to re-run: existing entries are never removed.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'data', 'contributors.json');

// ---------------------------------------------------------------------------
// Determine git log range
// ---------------------------------------------------------------------------

let range = '';
try {
  // HEAD^ so we exclude the current tag commit itself when run after tagging
  const prevTag = execSync('git describe --tags --abbrev=0 HEAD^', {
    cwd: ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
    .toString()
    .trim();
  range = `${prevTag}..HEAD`;
  console.log(`Scanning commits ${range}`);
} catch {
  console.log('No previous tag found — scanning full history');
}

const raw = execSync(`git log ${range} --format="%an|%ae"`, { cwd: ROOT })
  .toString()
  .split('\n')
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Parse new commits into a byName map
// ---------------------------------------------------------------------------

const byName = new Map(); // lowercased name -> { name, email, github }

for (const line of raw) {
  const barIdx = line.indexOf('|');
  if (barIdx === -1) continue;
  const name = line.slice(0, barIdx).trim();
  const email = line.slice(barIdx + 1).trim();
  if (!name) continue;

  const key = name.toLowerCase();
  const existing = byName.get(key) || { name, email, github: null };

  const m = email.match(/^(?:\d+\+)?(.+?)@users\.noreply\.github\.com$/);
  if (m && !existing.github) {
    existing.github = m[1];
  }

  byName.set(key, existing);
}

// Pass 2: resolve github usernames via email domain heuristic
const knownUsernames = new Set(
  Array.from(byName.values())
    .map(e => e.github)
    .filter(Boolean),
);
for (const entry of byName.values()) {
  if (entry.github) continue;
  for (const username of knownUsernames) {
    if (entry.email.toLowerCase().includes(username.toLowerCase())) {
      entry.github = username;
      break;
    }
  }
}

// Pass 3: deduplicate within new entries by github username
const byGithub = new Map();
for (const entry of byName.values()) {
  if (!entry.github) continue;
  const existing = byGithub.get(entry.github);
  if (!existing) {
    byGithub.set(entry.github, entry);
  } else {
    const entryIsReal = entry.name.toLowerCase() !== entry.github.toLowerCase();
    const existingIsReal = existing.name.toLowerCase() !== existing.github.toLowerCase();
    if (entryIsReal && !existingIsReal) {
      byGithub.set(entry.github, entry);
    }
  }
}

const representedNames = new Set(
  Array.from(byGithub.values()).map(e => e.name.toLowerCase()),
);
const noGithub = Array.from(byName.values()).filter(
  e => !e.github && !representedNames.has(e.name.toLowerCase()),
);

const newEntries = [...Array.from(byGithub.values()), ...noGithub].map(
  ({ name, github }) => ({ name, github }),
);

// ---------------------------------------------------------------------------
// Merge with existing contributors.json
// ---------------------------------------------------------------------------

let existing = [];
if (fs.existsSync(OUT)) {
  existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));
}

// Index existing by github username (preferred) or lowercased name
const merged = [...existing];
const existingByGithub = new Map(
  existing.filter(e => e.github).map(e => [e.github.toLowerCase(), e]),
);
const existingByName = new Map(existing.map(e => [e.name.toLowerCase(), e]));

let added = 0;
for (const entry of newEntries) {
  const byGh = entry.github && existingByGithub.get(entry.github.toLowerCase());
  const byNm = existingByName.get(entry.name.toLowerCase());

  if (byGh) {
    // Already present — upgrade name if the existing entry used the username as name
    if (
      byGh.name.toLowerCase() === byGh.github?.toLowerCase() &&
      entry.name.toLowerCase() !== entry.github?.toLowerCase()
    ) {
      byGh.name = entry.name;
    }
  } else if (byNm) {
    // Already present by name — attach github if now known
    if (!byNm.github && entry.github) {
      byNm.github = entry.github;
      existingByGithub.set(entry.github.toLowerCase(), byNm);
    }
  } else {
    merged.push(entry);
    if (entry.github) existingByGithub.set(entry.github.toLowerCase(), entry);
    existingByName.set(entry.name.toLowerCase(), entry);
    added++;
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n');

console.log(
  `contributors.json: ${merged.length} total, ${added} new (scanned ${raw.length} commit lines)`,
);
