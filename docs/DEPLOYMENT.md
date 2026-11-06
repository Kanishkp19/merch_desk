# Deploy the hackathon demo for free

Use Render's **Free web service**, with the repository's `render.yaml`.
It runs the existing Next.js server and SQLite implementation without a rewrite.
Render provides a public HTTPS URL. This is a demo configuration, not durable
hosting for actual supplier requests.

## 1. Publish these files to GitHub

Commit and push the deployment files, documentation and LICENSE to the public
repository: https://github.com/Kanishkp19/merch_desk.
Keep `.env`, database files, and API keys out of Git.

From this checkout, after reviewing the changes:

```bash
git add LICENSE README.md render.yaml scripts/render-start.sh docs/CURRENT.md docs/DEPLOYMENT.md docs/DEVPOST.md
git commit -m "Prepare free hosting and hackathon submission"
git push origin HEAD
```

If GitHub asks you to authenticate, sign in through your Git client or run
`gh auth login` locally and follow its browser sign-in flow. Do not share tokens
in chat. In Render, select the branch printed by `git branch --show-current`.

## 2. Create the Render service

1. Sign in at https://dashboard.render.com using GitHub.
2. Choose **New → Blueprint**, connect `Kanishkp19/merch_desk`, and select the
   branch containing `render.yaml`.
3. Confirm the service uses **Free**. Do not select a paid database or disk.
4. Supply the four secrets requested by the Blueprint:

| Variable | Value |
| --- | --- |
| `QLOO_API_KEY` | Your issued Qloo hackathon key |
| `GROQ_API_KEY` | Your Groq API key for agent tool calls and comparison |
| `CF_ACCOUNT_ID` | Cloudflare account ID for Workers AI |
| `CF_API_TOKEN` | Cloudflare token with Workers AI access |

Copy values from your own provider dashboards or local environment into Render;
do not paste them into Devpost, GitHub, screenshots, or this document.
The Blueprint generates the operator key automatically; retrieve it from Render
only if you want to demonstrate the manual operator queue. Judges can use the
creator journey without it. Never publish the operator key.

5. Apply the Blueprint and wait for the deploy to become **Live**. Copy the actual
   `https://…onrender.com` address; do not assume a particular name is available.
6. If Blueprint setup is unavailable, choose **New → Web Service**, connect the
   same repo, select **Node** and **Free**, and copy the build command, start
   command and environment settings from `render.yaml`. Generate a long random
   operator key yourself in this manual flow.

The build installs from `bun.lock`, generates Prisma, checks TypeScript, and builds
Next.js. Startup initializes the schema and binds to Render's assigned port on
all interfaces. No developer database is uploaded.

## 3. Verify the public deployment before submitting

- Open the URL in an incognito window and on your phone, without a Render login.
- Open `/api/status`: expect `data.dataMode` to be `live`, `data.qloo` to be
  `true`, at least one `data.llmProviders` entry and `data.image` to be `true`.
  These report configuration; a successful real journey is the provider check.
- Describe a Bengaluru ambient electronic producer whose fans like analog
  photography, gig posters and filter coffee. Add Tycho as a reference artist.
- Research taste, inspect the Qloo evidence, build the collection, approve one
  concept image, and download the line sheet. Check the comparison panel too.
- Create a small launch, adjust quantities and economics, submit a test quote
  request, save its creator key, and confirm it reopens while the service runs.
- Check refresh recovery and the no-match artist path. Confirm provider failures
  show a useful message while preserving the brief and collection.
- If a provider fails, check Render logs and that provider's key/quota. A successful
  build or status response does not prove live Qloo research works.

## 4. Finish Devpost

Use [DEVPOST.md](DEVPOST.md) for the description and judge walkthrough. Add the
actual live URL to Devpost and the GitHub repository's About website field.
Confirm GitHub detects MIT from the root LICENSE. Save the Devpost project,
complete its required fields and submit it to the hackathon. Reopen it to confirm
submission rather than draft status. The supplied event page gives a deadline of
**31 October 2026, 9:15 AM IST**. A demo video is not required.

## Free-tier limits

Render Free sleeps after 15 minutes without incoming traffic. The next visitor
may wait about a minute for startup. Local SQLite requests disappear on restart,
redeploy or sleep; browser drafts remain on that browser. Use disposable demo
requests and export important briefs. Durable quote tracking needs persistent
storage and is outside this configuration. Do not represent it as durable hosting.

Hosting and AI quotas are separate. Use provider free plans and check their
remaining quotas before judging; image generation and API access are not
unlimited. The local Z.ai runtime is deliberately excluded from the configured
provider order because it may not be available on Render.

Sources: [Render Free](https://render.com/docs/free),
[Blueprint reference](https://render.com/docs/blueprint-spec),
[Bun version](https://render.com/docs/bun-version),
[Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
