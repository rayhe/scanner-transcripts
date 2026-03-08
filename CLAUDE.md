# Scanner Transcripts - GitHub Pages Site

Static site served via GitHub Pages at `rayhe.github.io/scanner-transcripts`.

## Architecture

```
trunk-recorder (Mac Mini) -> transcribe.sh -> SpeechAnalyzer (macOS 26+) -> transcript JSONs
                                                  |                              |
                                                  |          push_to_firebase() (REST API, instant)
                                                  |                              |
                                                  |          Firebase RTDB (rayhenet-default-rtdb)
                                                  |                              |
launchd (every 15 min) -> publish-transcripts.sh -> aggregate to data/YYYY/M/D/calls.json -> git push
                                                                                             |
GitHub Pages serves index.html + data/ directory
```

**Dual data path:** Each transcribed call is pushed instantly to Firebase RTDB for realtime display, AND archived to JSON files + git every 15 minutes. The frontend loads JSON archives first, then subscribes to Firebase for live updates.

This repo contains only the **site output** (index.html + aggregated data). The source scripts live in `/Users/rayhe/trunk-recorder-config/`.

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Single-page app — all HTML/CSS/JS in one file |
| `data/YYYY/M/D/calls.json` | Aggregated transcript data per day (auto-generated, do not hand-edit) |

## Related Files (in trunk-recorder-config)

| File | Purpose |
|------|---------|
| `transcribe.py` | Apple SpeechAnalyzer transcription + Firebase RTDB push (macOS 26+) |
| `transcribe.sh` | uploadScript wrapper called by trunk-recorder per call |
| `publish-transcripts.sh` | Launchd loop: aggregates transcripts into site data and pushes every 15 min |

## Data Pipeline

1. trunk-recorder finishes a call, invokes `transcribe.sh`
2. `transcribe.py` transcribes via SpeechAnalyzer, saves JSON to `/Users/rayhe/trunk-recorder-config/transcripts/YYYY/M/D/`, and pushes to Firebase RTDB (instant)
3. `publish-transcripts.sh` (launchd, every 15 min) combines all JSONs in each date directory into a single `calls.json`
4. The combined files + m4a audio are written to `data/` and `audio/` in this repo, committed, and pushed
5. GitHub Pages serves the updated site

## Frontend Details

- **No build step** — pure vanilla HTML/CSS/JS, single file
- Loads last 7 days of `calls.json` files via fetch on page load, then subscribes to Firebase RTDB for realtime new calls
- Client-side search filtering (transcript text + talkgroup tags)
- Department filter buttons map talkgroup IDs: 100=Menlo Park, 200=Atherton, 300=E. Palo Alto
- OpenMHz deep links use pattern: `https://openmhz.com/system/mpka?filter-type=talkgroup&filter-code={tg}&time={start_time_ms}`
- Dark theme using CSS custom properties

## Talkgroups

| TG | Tag | Department | Color |
|----|-----|-----------|-------|
| 100 | MPPD Dispatch | Menlo Park | Blue (`--accent`) |
| 200 | APD Dispatch | Atherton | Green (`--green`) |
| 300 | EPAPD Dispatch | East Palo Alto | Yellow (`--yellow`) |

## Firebase RTDB

- **Project:** `rayhenet` (https://rayhenet-default-rtdb.firebaseio.com)
- **Path:** `scanner/calls/{auto-id}` — each call pushed via REST API from `transcribe.py`
- **Cleanup:** Calls older than 7 days should be periodically pruned (not yet automated)
- **Frontend:** Loads JSON archives first, then subscribes to Firebase `child_added` for realtime
- **Rules:** Read = public, Write = public (REST API, no auth). Consider restricting writes if abused.

## Performance

- Frontend renders max 100 calls initially with "Load more" button
- `annotateText()` results (130 regex patterns) are cached per call
- Search input is debounced (200ms)

## Important Notes

- `data/` files are auto-generated — don't edit manually, they'll be overwritten
- Publish script runs via launchd every 15 min on this Mac Mini
- GitHub Pages deployment is automatic on push to `main`
- Audio files (~1,500/day, ~70MB/day) are committed to git — repo will grow
