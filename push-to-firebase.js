#!/usr/bin/env node
/**
 * push-to-firebase.js — Push a transcript JSON to Firebase RTDB
 *
 * Usage (called from transcribe.sh after writing transcript JSON):
 *   node push-to-firebase.js /path/to/transcript.json
 *
 * Or pipe JSON:
 *   echo '{"start_time":123,...}' | node push-to-firebase.js
 *
 * Requires: npm install firebase-admin (one-time on WSL)
 *
 * Firebase RTDB structure:
 *   scanner/calls/{auto-id} -> { start_time, talkgroup, talkgroup_tag, transcript, ... }
 *
 * Calls older than 7 days are auto-cleaned on each push to keep DB small.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const fs = require('fs');
const path = require('path');

// Service account key — generate at:
// Firebase Console → Project Settings → Service Accounts → Generate New Private Key
// Save to ~/.firebase-service-account.json
const SA_PATH = path.join(process.env.HOME || '/root', '.firebase-service-account.json');

if (!fs.existsSync(SA_PATH)) {
  console.error(`Missing service account key at ${SA_PATH}`);
  console.error('Generate one at: Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(JSON.parse(fs.readFileSync(SA_PATH, 'utf8'))),
  databaseURL: 'https://rayhenet-default-rtdb.firebaseio.com'
});

const db = getDatabase(app);

async function main() {
  let data;
  const arg = process.argv[2];

  if (arg && fs.existsSync(arg)) {
    data = JSON.parse(fs.readFileSync(arg, 'utf8'));
  } else {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    data = JSON.parse(Buffer.concat(chunks).toString());
  }

  // Support single call or array of calls
  const calls = Array.isArray(data) ? data : [data];

  const ref = db.ref('scanner/calls');
  for (const call of calls) {
    if (!call.start_time) continue;
    await ref.push(call);
  }
  console.log(`Pushed ${calls.length} call(s) to Firebase`);

  // Clean up calls older than 7 days
  const cutoff = Math.floor(Date.now() / 1000) - 7 * 86400;
  const old = await ref.orderByChild('start_time').endAt(cutoff).once('value');
  const deletes = {};
  old.forEach(snap => { deletes[snap.key] = null; });
  if (Object.keys(deletes).length > 0) {
    await ref.update(deletes);
    console.log(`Cleaned ${Object.keys(deletes).length} old calls`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Push failed:', err.message);
  process.exit(1);
});
