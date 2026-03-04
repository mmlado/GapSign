#!/usr/bin/env node
// Usage: node scripts/bump-version.js <major|minor|patch|x.y.z>

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Parse new version
// ---------------------------------------------------------------------------

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/bump-version.js <major|minor|patch|x.y.z>');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const [curMajor, curMinor, curPatch] = pkg.version.split('.').map(Number);

let newVersion;
if (arg === 'major') { newVersion = `${curMajor + 1}.0.0`; }
else if (arg === 'minor') { newVersion = `${curMajor}.${curMinor + 1}.0`; }
else if (arg === 'patch') { newVersion = `${curMajor}.${curMinor}.${curPatch + 1}`; }
else if (/^\d+\.\d+\.\d+$/.test(arg)) { newVersion = arg; }
else {
  console.error(`Invalid argument: ${arg}`);
  process.exit(1);
}

const [MAJOR, MINOR, PATCH] = newVersion.split('.').map(Number);
const versionCode = MAJOR * 10000 + MINOR * 100 + PATCH;
const today = new Date().toISOString().slice(0, 10);
const repo = 'https://github.com/mmlado/GapSign';

console.log(`Bumping ${pkg.version} → ${newVersion} (code: ${versionCode})`);

// ---------------------------------------------------------------------------
// package.json
// ---------------------------------------------------------------------------

pkg.version = newVersion;
fs.writeFileSync(
  path.join(ROOT, 'package.json'),
  JSON.stringify(pkg, null, 2) + '\n',
);

// ---------------------------------------------------------------------------
// android/app/build.gradle
// ---------------------------------------------------------------------------

const gradlePath = path.join(ROOT, 'android/app/build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle
  .replace(/versionCode \d+/, `versionCode ${versionCode}`)
  .replace(/versionName "[^"]*"/, `versionName "${newVersion}"`);
fs.writeFileSync(gradlePath, gradle);

// ---------------------------------------------------------------------------
// ios/GapSign.xcodeproj/project.pbxproj
// ---------------------------------------------------------------------------

const pbxPath = path.join(ROOT, 'ios/GapSign.xcodeproj/project.pbxproj');
let pbx = fs.readFileSync(pbxPath, 'utf8');
pbx = pbx
  .replace(/CURRENT_PROJECT_VERSION = [^;]*/g, `CURRENT_PROJECT_VERSION = ${versionCode}`)
  .replace(/MARKETING_VERSION = [^;]*/g, `MARKETING_VERSION = ${newVersion}`);
fs.writeFileSync(pbxPath, pbx);

// ---------------------------------------------------------------------------
// CHANGELOG.md
// ---------------------------------------------------------------------------

const changelogPath = path.join(ROOT, 'CHANGELOG.md');
let changelog = fs.readFileSync(changelogPath, 'utf8');

const prevMatch = changelog.match(/## \[(\d+\.\d+\.\d+)\]/);
const prev = prevMatch ? prevMatch[1] : null;

changelog = changelog.replace(
  /^## \[Unreleased\]\n/m,
  `## [Unreleased]\n\n## [${newVersion}] - ${today}\n`,
);

if (prev) {
  changelog = changelog.replace(
    `[Unreleased]: ${repo}/compare/v${prev}...HEAD`,
    `[Unreleased]: ${repo}/compare/v${newVersion}...HEAD\n[${newVersion}]: ${repo}/compare/v${prev}...v${newVersion}`,
  );
}

fs.writeFileSync(changelogPath, changelog);

// ---------------------------------------------------------------------------
// Commit and push branch
// ---------------------------------------------------------------------------

const branch = `release/v${newVersion}`;
execSync(`git checkout -b ${branch}`, {stdio: 'inherit'});
execSync(
  'git add package.json android/app/build.gradle ios/GapSign.xcodeproj/project.pbxproj CHANGELOG.md',
  {stdio: 'inherit'},
);
execSync(`git commit -m "chore: bump version to ${newVersion}"`, {stdio: 'inherit'});
execSync(`git push -u origin ${branch}`, {stdio: 'inherit'});

console.log(`\nDone. Open a PR for branch: ${branch}`);
console.log(`After merging, tag main:\n  git tag v${newVersion} && git push origin v${newVersion}`);
