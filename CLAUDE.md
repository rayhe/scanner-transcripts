# Scanner Transcripts - GitHub Pages Site

Static site served via GitHub Pages at `rayhe.github.io/scanner-transcripts`.

## Architecture

```
trunk-recorder (WSL2) -> transcribe.sh -> DeepFilterNet3 (denoise) -> faster-whisper -> transcript JSONs
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
| `transcribe.py` | Core transcription logic: DeepFilterNet3 denoise + faster-whisper large-v3, CUDA |
| `transcribe.sh` | uploadScript wrapper called by trunk-recorder per call. Sources `/opt/deepfilter-env/bin/activate` |
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

## Audio Denoising (DeepFilterNet3)

Scanner audio has significant RF noise/static. DeepFilterNet3 is used as a pre-processing step before Whisper to improve transcription accuracy.

### How It Works

1. trunk-recorder finishes a call, writes WAV + JSON, invokes `transcribe.sh`
2. `transcribe.py` loads the WAV, runs DeepFilterNet3 to produce a denoised temp file
3. faster-whisper transcribes the denoised audio
4. The denoised temp file is deleted; original WAV/M4A is preserved for OpenMHz

### DeepFilterNet3 Details

- **Package:** `deepfilternet` (pip), installed in `/opt/deepfilter-env/` venv
- **Model:** DeepFilterNet3 (default, auto-downloaded on first use to `~/.cache/DeepFilterNet/`)
- **Internal sample rate:** 48 kHz — auto-resamples from 16 kHz input WAVs
- **GPU:** Auto-detected via PyTorch CUDA. Shares GPU with faster-whisper.
- **Critical:** Must call `torch.cuda.empty_cache()` after denoising, otherwise faster-whisper runs ~10x slower due to GPU memory fragmentation
- **`atten_lim_db` parameter:** Controls max noise suppression in dB. `None` = unlimited. Set to `12`-`15` if voice sounds over-processed. Start with `None` and dial back if needed.
- **`post_filter` parameter:** Extra attenuation on very noisy sections. `False` by default. Can help or hurt — test before enabling.

### Python API (df.enhance)

```python
from df.enhance import enhance, init_df, load_audio, save_audio
import torch

# Load model (once, keep in memory)
model, df_state, _ = init_df()  # Loads DeepFilterNet3 by default

# Denoise a file
audio, _ = load_audio("input.wav", sr=df_state.sr())  # Resamples to 48kHz
enhanced = enhance(model, df_state, audio)  # GPU auto-detected
save_audio("output.wav", enhanced, sr=df_state.sr())  # Saves at 48kHz

# IMPORTANT: free GPU memory before running Whisper
torch.cuda.empty_cache()
```

### Installation (WSL2)

```bash
source /opt/deepfilter-env/bin/activate
pip install deepfilternet
# PyTorch + CUDA should already be installed for faster-whisper
# System dep: sudo apt install libsndfile1
```

### Previous Denoiser Attempts (abandoned)

These approaches were tested and didn't work well for scanner audio:
- **noisereduce** (spectral gating): stationary/non-stationary/reference-based — either killed voice or didn't reduce noise enough
- **RNNoise** (ffmpeg arnndn): full and half strength — similar issues
- **sox noisered**: classical spectral subtraction from noise profile — too aggressive
- **CNN noise classifier + reference denoising**: complex, didn't improve results
- Old test files: `run_scanner_denoiser.py`, `test-denoise.sh`, `convert_samples.sh`, `samples/denoiser/` — all removed

## Important Notes

- `data/` files are auto-generated — don't edit manually, they'll be overwritten
- The cron job pushes from WSL, so pulling from Windows before pushing avoids conflicts
- GitHub Pages deployment is automatic on push to `main`
