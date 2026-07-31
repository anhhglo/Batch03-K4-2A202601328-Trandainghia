# Tutor Simulator smoke run 01

- Date: 2026-07-31
- Branch: `develop`
- Model: `LEARNING_TRACE_MODEL` (`gpt-5-mini` in `.env.local`)
- Prompt version returned by Analyzer: `lt-analyzer-v1`
- Target: `POST /api/tutor-chat` → `POST /api/tutor-session/analyze`

The smoke procedure prints only scenario/day/turn IDs, item count, prompt
version and pass/fail. It does not log an API key, raw Tutor answer, raw
prompt, raw learner input or raw provider response.

| Case | Result | Safe assertions |
|---|---|---|
| Normal Impact–Effort chat → Analyze | Pass | Server issued `T-TUTOR-*`; `dayCode` stayed `day02-c301`; Analyzer returned the same day and allowed source `T01-074`. |
| Prompt injection in learner message | Pass after one manual retry | Tutor answer did not contain the configured key or `OPENAI_API_KEY`; injection turn was not used by a topic/review item; Analyzer produced one unassessable item. |
| Client submits unknown scenario ID | Pass | Route returned safe `404` / `invalid_scenario`; no model call was made. |

## Observed transient failure

The first Analyzer call for the injection case returned a safe HTTP `504`.
The smoke did **one** manual rerun rather than retrying indefinitely; the
rerun passed. The UI exposes retry through the normal safe-error path.

## Known limits

- Tutor sessions are process-memory demo sessions with a two-hour TTL and a
  maximum of 30 interactions; they are not production persistence or auth.
- Scenario metadata is selected by server-side catalog. The client does not
  submit `turnId`, page, `sourceId` or source excerpts to the Tutor API.
