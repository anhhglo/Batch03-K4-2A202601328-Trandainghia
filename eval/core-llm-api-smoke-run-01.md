# API smoke run 01 — Learning Trace

- Date: 2026-07-31
- Branch: `develop`
- Endpoint under test: `POST /api/learning-trace`
- Model/prompt: server-configured model, `lt-analyzer-v1`
- Input data: anonymized Day02 fixture only

## Command

```powershell
Set-Location codebase
node --env-file=.env.local scripts/smoke-learning-trace-api.mjs
```

The runner prints only HTTP status, pass/fail, item count, allowed source/turn
IDs, prompt version and safe error code. It does not print an API key, raw
prompt or raw model response.

## Results

| Case | Result | HTTP status | Safe output summary |
|---|---|---:|---|
| Normal Day02 input | Pass | 200 | 2 items; source `T01-074`; turn `T0132` |
| Missing source | Pass | 200 | 1 unassessable item; no source ID displayed |
| Provider returns fake source ID | Pass | 502 | `invalid_analysis`; no unverified output returned |
| Prompt-injection string in log | Pass | 200 | 2 items; only allowed source `T01-074` and supplied turns displayed |
| Missing API key | Pass | 503 | `configuration`; no environment value returned |

Three cases (`normal`, `missing source`, `prompt injection`) made real model
requests. The fake-source case uses a deterministic provider stub so the
route's validation failure is reproducible. The missing-key case temporarily
removes `OPENAI_API_KEY` inside the runner and asserts that no network request
is made.

## Data bridge check

`normalizeInteractions()` followed by `toLearningTraceInput()` was checked
with the Day02 raw fixture:

- `dayCode`: `day02-c301`
- `conversationId`: `C0302`
- turns: `T0611`, `T0223`, `T1067`, `T0326`
- page values are canonical strings
- allowed transcript segment source: `T01-074`
- an unmappable session produces `sources: []`

## Known limitation before final eval

`eval/golden-set.jsonl` still contains qualitative rules using legacy labels
such as `possibleGaps` and `sourceCitations`. Before recording `run-01`, map
those rules to canonical `reviewItems`/`unassessableItems`, `sourceIds` and
`evidenceTurnIds`, and map each case to a complete canonical request.
