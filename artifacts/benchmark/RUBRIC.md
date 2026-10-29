# MerchDesk quality benchmark

The 12 briefs in `briefs.json` cover music and non-music creators, budgets, cities, reference artists, conflicting interests, and sparse evidence. Cases b09–b12 are holdout cases. The original Mira Vale run in `../e2e-mira-vale/` is the preserved before example.

Run `bun scripts/benchmark.ts --base http://localhost:3000 --out artifacts/benchmark/run-YYYYMMDD` after changes. The runner saves inputs, profile, collection, partner output, elapsed time, Qloo call count, fallback mode, and any errors. It never saves credentials. Images are omitted to protect free quota; score visual fidelity only for a separately reviewed image set.

Run `bun scripts/benchmark-review.ts` to prepare the anonymized `review-packet/` and blank `scores.csv`. Reviewers should receive that packet without the raw run folder or the case mapping. For each case, score each dimension 1–5 independently: **1** harmful or irrelevant, **2** mostly weak, **3** usable with clear issues, **4** good with minor issues, **5** specific and convincing. Score relevance (matches the brief), evidence (traceable signals or explicit uncertainty), originality (more than generic merch), budget fit (run cost and category), partner usefulness (credible format and location), and visual fidelity (identity, palette, material, composition, text artifacts). Mark visual fidelity `N/A` when no image was generated. A higher internal fit score or more products does not raise a reviewer score.

Record one sentence supporting each score and the output path. After tuning, evaluate all 12 without changing the holdout expectations. Proposed release target: at least 10/12 cases average 4/5 for relevance and evidence. This target is not yet measured.
