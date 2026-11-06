# Current slice: hackathon deployment and submission

Scope: prepare Render Free hosting, an MIT license, and Devpost submission copy.
No product changes or database migration to another provider.

Files: LICENSE, render.yaml, scripts/render-start.sh, README.md,
docs/DEPLOYMENT.md, docs/DEVPOST.md, docs/CURRENT.md.

Targeted checks: shell syntax, TypeScript, production build, then run the
production start script with a temporary SQLite database and verify HTTP status,
the sample page, and database initialization. Review diff for credentials.

Status: local preparation complete. Shell syntax, diff whitespace, TypeScript,
production build, YAML parsing, production home/status HTTP checks, and fresh
SQLite schema initialization passed. The smoke run used fixture mode and a
temporary database, so it does not establish production API availability.
External deployment requires the owner's Render login and API keys; verify the
live provider journey and submit Devpost after deployment. No full suite run.
