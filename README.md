# Scanner Transcripts

AI-transcribed police dispatch radio calls for Menlo Park, Atherton, and East Palo Alto.

**Live site: [rayhe.github.io/scanner-transcripts](https://rayhe.github.io/scanner-transcripts)**

## What is this?

A searchable archive of police scanner transcripts from three Bay Area departments, generated using [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (large-v3) running on a local GPU. Audio is captured via [trunk-recorder](https://github.com/robotastic/trunk-recorder) monitoring conventional analog frequencies with an RTL-SDR, and also uploaded to [OpenMHz](https://openmhz.com/system/mpka) for audio playback.

Each transcript links directly to the corresponding audio on OpenMHz.

## How it works

1. **trunk-recorder** captures radio calls from 3 conventional analog channels
2. Completed calls trigger **faster-whisper** transcription via uploadScript hook
3. Transcripts are saved as JSON files organized by date (`YYYY/M/D/`)
4. A cron job aggregates transcripts into `data/` and pushes to this repo every 15 minutes
5. GitHub Pages serves the static site

## Site features

- Shows last 7 days of calls, newest first
- Real-time search filtering across transcript text and talkgroup tags
- Department filter buttons (All / Menlo Park / Atherton / E. Palo Alto)
- Direct OpenMHz links to listen to the original audio
- Dark theme, mobile-friendly

## Data format

Each `data/YYYY/M/D/calls.json` contains an array of call objects:

```json
{
  "talkgroup": 100,
  "talkgroup_tag": "MPPD Dispatch",
  "talkgroup_group": "Menlo Park",
  "freq": 488337500,
  "start_time": 1739847123,
  "call_length": 12,
  "transcript": "10-4 responding code 3...",
  "openmhz_url": "https://openmhz.com/system/mpka?..."
}
```
