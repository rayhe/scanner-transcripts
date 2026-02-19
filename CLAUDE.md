# Scanner Transcripts - GitHub Pages Site

Static site served via GitHub Pages at `rayhe.github.io/scanner-transcripts`.

## Architecture

```
trunk-recorder (WSL2) -> transcribe.sh -> faster-whisper -> transcript JSONs
                                                                    |
cron (every 15 min) -> publish-transcripts.sh -> aggregate to data/YYYY/M/D/calls.json -> git push
                                                                    |
GitHub Pages serves index.html + data/ directory
```

This repo contains only the **site output** (index.html + aggregated data). The source scripts live in the `trunk-recorder` repo at `C:\Users\Ray\trunk-recorder\`.

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Single-page app — all HTML/CSS/JS in one file |
| `data/YYYY/M/D/calls.json` | Aggregated transcript data per day (auto-generated, do not hand-edit) |

## Related Files (in trunk-recorder repo)

| File | Purpose |
|------|---------|
| `transcribe.py` | Core transcription logic (faster-whisper large-v3, CUDA) |
| `transcribe.sh` | uploadScript wrapper called by trunk-recorder per call |
| `publish-transcripts.sh` | Cron job: aggregates transcripts into site data and pushes |
| `build-site.sh` | Manual full site rebuild |
| `batch-transcribe.py` | Backfill tool for existing recordings |

## Data Pipeline

1. Individual transcript JSONs are saved to `/root/trunk-recorder-config/transcripts/YYYY/M/D/` by `transcribe.py`
2. `publish-transcripts.sh` (cron, every 15 min) combines all JSONs in each date directory into a single `calls.json`
3. The combined files are written to `data/` in this repo, committed, and pushed
4. GitHub Pages serves the updated site

## Frontend Details

- **No build step** — pure vanilla HTML/CSS/JS, single file
- Loads last 7 days of `calls.json` files via fetch on page load
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

## Editing the Site

- Edit `index.html` on Windows at `C:\Users\Ray\scanner-transcripts\index.html`
- Commit and push from Windows
- The WSL cron job copies `index.html` from `/mnt/c/Users/Ray/scanner-transcripts/` to `/root/scanner-transcripts/` on each run via `publish-transcripts.sh`
- Or manually sync: `cd /root/scanner-transcripts && git pull`

## Important Notes

- `data/` files are auto-generated — don't edit manually, they'll be overwritten
- The cron job pushes from WSL, so pulling from Windows before pushing avoids conflicts
- GitHub Pages deployment is automatic on push to `main`
