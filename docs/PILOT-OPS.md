# MerchDesk pilot operations runbook

Everything a founder-operator needs to run the creator pilot: configuration, storage, backups,
operator access, and creator credential recovery. This is pilot-grade, single-operator
documentation — re-read it before any second operator or public launch.

## 1. Required configuration

Copy `.env.example` to `.env` (or `.env.local`) and set:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLite file, e.g. `file:../db/custom.db` (repo-relative paths resolve against the project root). |
| `OPERATOR_KEY` | Yes for the queue | Shared secret for the operator queue. **Unset = queue disabled (503)** — it never falls back to open access. Use a long random value; it is not an account system. |
| `MERCHDESK_DATA_MODE` | No | `fixtures` / `live` / `auto`. |
| `QLOO_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `CF_ACCOUNT_ID`+`CF_API_TOKEN` | No | Optional audience-research and generation providers. |

There is no separate configuration for creator credentials: each submitted request generates a
256-bit creator key at submission time (stored only as a SHA-256 hash). No e-mail or delivery
channel exists — the key is shown once in the browser and the creator saves it.

## 2. Database and migrations

- Engine: SQLite through Prisma (`prisma/schema.prisma`), file at `db/custom.db` by default.
- Schema changes: `npm run db:generate && npm run db:push` (`--accept-data-loss` is included in
  the script — never point it at the production file blindly).
- Pilot migration note (2026-10): `LaunchRequest` gained `creatorKeyHash`, `payloadHash`,
  `version`, and a unique index on `clientRequestId`. The change is additive; existing rows
  migrate in place with `creatorKeyHash = NULL`, which marks them as **legacy** (see §5).
- `prisma migrate dev` is available if you want auditable migration files instead of `db push`.

## 3. Durable storage and backup/restore

State that must survive lives in exactly two places:

1. `db/custom.db` — submitted quote requests, operator events, quotes, creator decisions.
2. Browser storage on the creator's device — drafts and the creator key (localStorage).
   Drafts and keys do **not** sync across devices; there is no server-side draft copy.

Backup (cron-friendly):

```bash
sqlite3 db/custom.db ".backup '/backups/custom-$(date +%F).db'"
```

Restore: stop the server, replace `db/custom.db` with the backup, start the server. Verify with a
look-up of a known reference in the operator queue. Test the restore once before the pilot starts —
an untested backup is not a backup.

Guardrails added in the 2026-10 hardening pass:

- Server tests never touch `db/custom.db`: each run creates a unique temporary database under the OS
  temp directory and **fails closed** before any destructive setup unless the resolved database path
  belongs to that run's temp directory.
- Prisma clients are cached per resolved database URL (`src/lib/db.ts`), so a test configuration can
  never reuse the development client.
- The test suite itself exercises `sqlite3 .backup` into a separate temp location and verifies the
  restored records — keep the same command for cron backups.
- Re-issuing a creator key invalidates the previous key for that reference (see §5).

## 4. Operator access

- The queue lives at `/#operator`; sign in with `OPERATOR_KEY`. Losing the key = rotate it in
  `.env` and restart; there are no operator accounts to recover.
- Manual workflow: nothing is e-mailed to suppliers. You contact suppliers yourself and record
  quotes (each re-record for the same supplier becomes a new revision number).

## 5. Creator credential recovery

- A request is opened by its **creator key**, never by the `MD-XXXXXX` reference (display only).
- If a creator loses their key (or holds a legacy record from before keys existed): open the
  request in the operator queue → **"Issue / re-issue creator key"** → hand the key to the creator
  over a channel you both trust. The plaintext key is shown exactly once; only its hash is stored.
- Re-issuing invalidates no other data and is safe to repeat. Do not paste creator keys into the
  request notes — those are visible in exported briefs.

## 6. Decision rules enforced by the server

- Quote decisions only while status is `quote_ready`; closed requests accept no decisions.
- A quote past its `valid until` date cannot be accepted — record a revised quote instead.
- The first decision on a quote is final; changes require a new revision.
- Sample approval requires an accepted quote; production authorization requires a sample decision
  with `approved = true` (a **rejected** sample never permits production) **and** artwork-ready
  lines. Three distinct gates, three distinct acknowledgements.
- Sample approval and production authorization are bound to the accepted quote revision they
  followed: recording a new revision of the same supplier's quote clears both (the history stays in
  the event log), and the revised quote must be accepted, the sample re-reviewed and production
  re-authorized. A rejected sample can be superseded by a new sample decision — the path is never
  dead.
- On a closed request the operator can only add notes or reopen; quotes, info requests and all
  creator decisions are rejected until it is reopened.
- Creators can answer `needs_info` requests; answers move the request back to `submitted`.

## 7. Pilot startup checklist

1. `npm install && npm run db:generate && npm run db:push`
2. Set `DATABASE_URL` + `OPERATOR_KEY`; restart.
3. Verify: operator queue opens; a test submission returns a creator key; look-up with the wrong
   key fails with 401; a legacy/lost-key record is recoverable via §5.
4. Take the first backup (§3).
