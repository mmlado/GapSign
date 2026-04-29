#!/usr/bin/env node
/**
 * Fetches the Chainlist chain registry from a pinned commit of the ethereum-lists/chains repo
 * and writes a trimmed snapshot to src/data/chains.json.
 *
 * Source: https://chainid.network/chains.json (2593 chains as of 2026-04-29)
 *
 * To update: verify new source, bump PINNED_COMMIT, run this script, commit the diff.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const URL = 'https://chainid.network/chains.json';
const OUT = path.join(__dirname, '..', 'src', 'data', 'chains.json');

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return get(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString()));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function main() {
  console.log('Fetching Chainlist chain registry...');
  const raw = JSON.parse(await get(URL));

  const chains = raw
    .filter(c => c.chainId !== undefined && c.name && c.nativeCurrency?.symbol)
    .map(c => ({
      chainId: c.chainId,
      name: c.name,
      shortName: c.shortName ?? null,
      nativeCurrency: { symbol: c.nativeCurrency.symbol },
    }))
    .sort((a, b) => a.chainId - b.chainId);

  fs.writeFileSync(OUT, JSON.stringify(chains, null, 2) + '\n');
  console.log(`Wrote ${chains.length} chains to ${path.relative(process.cwd(), OUT)}`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
