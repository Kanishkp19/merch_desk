# Benchmark run: 29 October 2026

All 12 briefs were replayed live against `localhost:3000`. Inputs and full outputs are in `run-2026-10-29/`; the preserved Mira Vale before run is in `../e2e-mira-vale/`. No image requests were made by the benchmark. The `browser/` directory has separate desktop and mobile journey evidence, including downloads and A4 PDFs.

| Measure | Result |
| --- | ---: |
| Profile + collection requests completed | 12/12 |
| Products returned | 79 |
| Products with zero fit | 18 |
| Cases with all products at zero fit | 2 (b03, b12) |
| Partner requests failed with Qloo 503 | 7/12 |
| Qloo calls per profile | 5–8 |
| Elapsed per case | 50–88 seconds |
| Paid image calls | 0 |

The 12 cases meet the benchmark coverage target. The current outputs do **not** establish the proposed quality gate: b03 and b12 have no product evidence; b01 has several irrelevant affinity tags; 7 partner searches failed. b12 correctly needs an insufficient-data outcome, and the six exploratory concepts remain too prominent for that brief. These are observed weaknesses, not proof that Qloo's returned affinities are invalid.

The 1–5 rubric and anonymized reviewer packet are in `RUBRIC.md` and `review-packet/`. Independent blind scoring and visual fidelity scoring remain unmeasured; do not report the proposed 10/12 at 4/5 target as met. The browser journey used saved benchmark responses and a previously generated image to verify UI behavior without spending image quota. It covered landing validation, keyboard focus, profile, collection, approval, image recovery after refresh, stale-image export prevention, partner failure/retry, reject/undo/replace, download, and A4 line-sheet PDF on desktop and mobile.

The server image cap is enforced per anonymous cookie session in the running Node process. A restart or separate server replica has its own counters; deployment-wide durable quotas require shared storage.
