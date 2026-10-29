# MerchDesk: product direction and execution instructions for Zcode

Copy everything below into Zcode.

---

You are the lead engineer executing the product direction in this brief. Treat this as an implementation assignment with business reasoning, not a brainstorming exercise. Make decisions, inspect the repository, deliver functioning workflows, and document the remaining assumptions. Do not stop after producing a roadmap.

## 1. Product direction: what we are building

Build MerchDesk into a guided merch-launch workspace for independent Indian creators. Its core job is to help a creator decide what to sell, understand the cash and risk involved, obtain a realistic production quote, and operate a small launch through a manually supported pilot.

The initial customer hypothesis is an independent musician or illustrator with an engaged audience, original artwork or access to a designer, and a concrete upcoming release, event, or community moment. Choose one of these segments for the first pilot based on the existing product and practical access to customers. Explain the choice, then keep the experience consistent with it. Audience size alone is not evidence of demand.

The product promise is: “Plan a small merch drop, understand its economics, and get ready for production with clear next steps.” Do not promise profitability, guaranteed delivery, verified demand, or supplier availability without evidence.

The initial commercial hypothesis is a paid, assisted launch service supported by this workspace. We can manually coordinate suppliers while learning what creators actually need. An upfront planning/service fee, a supplier payment, and any platform revenue must be distinguishable. Suggest a pilot price as an experiment with explicit assumptions, not as a researched market fact. Do not build subscriptions or a commission marketplace before there is evidence that either fits.

The principal outcome to validate is whether a suitable creator will pay for help and complete a launch with acceptable economics and operational effort. Generating recommendations is an intermediate step.

## 2. Inspect before changing anything

Read repository instructions and inspect relevant code in bounded sections. Confirm the actual stack, routes, components, persistence, authentication, pricing engine, catalog, tests, and deployment assumptions. Identify mocked integrations and anything that exists only in documentation. Existing context reports creator briefs, recommendations, INR pricing, seven cities, venues, seasonal notes, and printable line sheets; verify each capability rather than treating that report as authoritative.

Create a concise implementation map using real paths: retain, edit, add, and defer. Check for case-sensitive filename collisions because the project previously encountered capital/lowercase UI filename problems on macOS. Preserve unrelated work; do not stash or reset the whole working tree.

If the business direction requires assumptions the repository cannot answer, record them and proceed with reversible choices. Ask only when missing information blocks a consequential action. Missing suppliers or payment credentials should lead to a clearly labeled manual workflow, not fabricated integrations.

## 3. The complete customer journey

The intended journey is:

Landing page → creator brief → recommended launch → editable economics → saved plan → quote request → operator review → supplier quote → creator decision → sample review → production readiness → launch tracking → actual outcome.

Use this journey to decide what to build. Every screen should help the creator make a decision or complete an action. Use existing navigation and UI patterns where possible. Implement responsive layouts and accessible controls, with explicit empty, loading, validation, error, and success states.

### A. Rewrite the landing page

Lead with the chosen customer and their launch problem. Explain three tangible outputs: a focused assortment, transparent launch economics, and a production-ready request. Make the primary CTA “Plan my merch drop” and provide a secondary example-plan view only if it can be built cheaply from clearly labeled sample data.

Explain how the pilot works, what the creator provides, what MerchDesk does, and what requires external confirmation. Remove unsupported partner logos, invented testimonials, fabricated usage counts, and exaggerated AI claims. Clearly label pilot availability and manual assistance.

Acceptance: a first-time visitor can tell who this is for, what they receive, and what happens after clicking the CTA.

### B. Make the creator brief useful

Capture creator/project name, launch purpose, target launch date, budget, city or delivery region, selling channel, preferred product types, audience evidence, artwork readiness, and fulfillment preference. Separate required inputs from optional information. Explain any input that changes a recommendation. Preserve progress and allow editing after a plan is generated.

Use ranges or “unknown” where precise information is unavailable. Never infer guaranteed demand from followers. Do not request detailed customer addresses at the planning stage.

Acceptance: a creator can finish a useful brief without knowing all their manufacturing details, and missing information becomes a visible task rather than an invented answer.

### C. Turn recommendations into a launch builder

Recommend a focused assortment, initially one to three products. Reuse the existing catalog and scoring where appropriate. Explain why each product fits, its practical tradeoffs, artwork requirements, indicative lead time if sourced, and which inputs remain unverified.

Allow replacing/removing a product, changing quantity, and adjusting selling price. Keep decisions in a saved plan. Mark recommendations as rules-based, AI-assisted, or manually curated according to the actual implementation; confidence must reflect evidence, not decorative percentages.

Show feasible alternatives when a product conflicts with the budget or date. If no reliable lead time exists, say confirmation is required. AI-generated visuals are concepts, not approved production artwork.

Acceptance: changing the assortment updates the economics and task checklist without losing the rest of the plan.

### D. Build an editable economics workspace

Provide product-level and launch-level inputs for quantity ordered, expected units sold, selling price, supplier unit cost, setup and sampling, packaging, inbound freight, customer shipping charges, outbound shipping cost, payment fees, platform/service fees, and reasonable defect/return assumptions. Keep costs optional but visibly incomplete when unknown.

Distinguish fixed versus variable costs, inventory purchases versus units sold, customer receipts versus creator revenue, and contribution versus final accounting profit. Explicitly define each displayed metric. Show required upfront cash, potential unsold stock, scenario contribution, and break-even where meaningful. Account for the purchase cost of the full batch when modeling launch cash exposure, even if fewer units sell. Avoid counting that same inventory expense twice.

Show conservative, base, and optimistic scenarios whose assumptions creators can inspect. For multiple products, explain the sales-mix assumption behind any combined break-even figure. If contribution is non-positive, explain why a finite break-even does not exist. Prevent negative quantities, invalid percentages, division by zero, and misleading rounding. Use an appropriate money representation consistently.

Preserve estimate sources, dates, quote validity, and whether taxes/shipping are included. Never silently treat a missing cost as zero. Verify current tax rules through authoritative sources before editing tax calculations; do not reuse historic category rates as established facts. If classification or tax treatment cannot be established, keep it configurable and flag the unresolved assumption. Describe tax-inclusive and tax-exclusive inputs consistently.

Acceptance: the creator can answer “How much cash do I need, what happens if sales disappoint, and what has not been confirmed?” Targeted tests must cover low sales, unsold inventory, zero/negative contribution, fee calculation, missing costs, and the chosen tax-inclusive/exclusive behavior.

### E. Build the saved launch workspace

Create a launch overview with its name, status, target date, assortment, economics summary, outstanding decisions, and one clear next action. Support revisiting and editing the launch. Preserve a version or snapshot when a quote request is submitted so later edits do not silently alter the request the operator received.

Provide a launch checklist covering artwork, specifications, quote, sample, production decision, selling setup, fulfillment responsibility, and outcome review. Set dates only from explicit inputs or transparent estimates. Evolve the existing line sheet into an exportable launch brief, including assumptions and unresolved items.

Use the existing persistence system if available. A local-only draft can support early planning, but a submitted request must be durably available to the operator; browser storage alone is insufficient. If production storage cannot be configured, label the limitation and implement a portable export/manual handoff without claiming successful submission.

Acceptance: refreshing or returning does not unexpectedly erase a saved plan; the interface accurately states whether it is stored on the device or in an account.

### F. Build quote requests and manual operations

Create a structured request from the launch: product specifications, quantities, artwork readiness, target date, delivery region, cost assumptions, and creator contact details with consent to share necessary information. Let creators review the exact request before submission. Prevent accidental duplicate requests and provide a stable reference.

Build a minimal protected operator queue. The operator can inspect requests, identify missing information, record supplier communications, attach or record quote evidence, enter minimum quantities and lead times, specify included/excluded costs and validity dates, and assign the next action. Quote revisions must remain distinguishable.

Creators should see understandable statuses such as “Submitted,” “Needs information,” “Quote ready,” and “Closed.” A creator accepting a quote must not automatically imply supplier acceptance, payment, production authorization, or guaranteed delivery. Keep sample approval and production authorization separate.

If there is no supplier integration, explicitly show that the founder coordinates quotes manually. Do not create fake supplier responses or claim requests were emailed when they were only saved.

Acceptance: one real request can travel from creator submission to operator review to a recorded quote and creator decision, with appropriate access controls and no simulated external activity.

### G. Add lightweight demand validation and outcome tracking

After the planning/quote workflow works, add a shareable interest page only if it helps the pilot answer a real demand question. Show selected products, indicative pricing, and an explicit explanation that registering interest is not a purchase. Capture minimal information with consent and prevent obvious duplicate submissions. Do not expose private economics or operator notes through a public link.

Keep interest registrations, reservations, paid preorders, and completed sales separate. Do not build checkout until payment recipient, refund/cancellation ownership, fulfillment obligations, and reconciliation are decided. Never represent a nonbinding interest list as secured revenue.

Add manual outcome recording for units produced/sold, actual costs, receipts, returns/defects, time spent, and creator feedback. Compare actual results with the submitted plan snapshot, showing variance and missing data. This is the feedback loop that makes future planning more useful.

Acceptance: the founder can see whether a pilot launch happened, what it cost, whether the creator would repeat, and how much manual support it needed.

## 4. Technical and data design

Adapt to the current stack. Avoid unnecessary migrations or a new service for every capability. Consider these conceptual entities and reuse existing equivalents: CreatorBrief, LaunchPlan, LaunchPlanVersion, LaunchItem, CostAssumption, QuoteRequest, SupplierQuote, LaunchTask, LaunchOutcome, and an optional InterestRegistration. Add only entities needed for the current milestone.

Keep calculations in a testable domain layer. Persist the inputs and assumptions needed to reproduce a saved result. Validate at trust boundaries. Enforce ownership and operator permissions on the server where applicable; a hidden route is not authorization. Keep public-share data explicitly scoped. Keep credentials server-side and minimize retained personal data.

Use existing authentication if suitable. If it is absent, choose the smallest secure approach compatible with the deployment; avoid building a custom password system. Distinguish local development demonstrations from production-ready access control. Keep an audit trail for consequential request/quote/status changes without storing unnecessary sensitive content.

Do not let LLM output directly determine money calculations, supplier promises, or workflow authorization. Deterministic code should enforce those rules. Bound AI use to suggestions, explanations, or drafting with appropriate validation and fallback behavior.

## 5. Measurement and the pilot business

Measure the funnel with clearly defined events: brief completed, plan saved, economics reviewed, quote requested, quote provided, quote accepted, sample approved, production authorized, launch completed, and repeat interest recorded. Implement only events supported by the delivered workflow. Protect event payloads from personal information and duplicate counting. Do not build an elaborate analytics dashboard before there is data.

Create a practical founder playbook for 5–10 creators. Include segment-specific recruitment criteria, interview questions about previous behavior, outreach drafts for me to send, a sample paid offer, onboarding steps, the manual quote process, and an outcome review. Do not send outreach or contact suppliers without authorization.

Define experiment thresholds before the pilot, labeling them as proposed decisions rather than industry benchmarks. Track willingness to pay through actual paid commitments where possible, alongside creator outcomes, request-to-launch conversion, support hours, quote turnaround, service revenue, variable delivery costs, and contribution per launch. Separate creator profitability from MerchDesk’s economics. Explain what evidence would justify continuing, changing the offer, or stopping.

Research current competitors and alternatives only when useful to a decision. Use dated sources and distinguish researched facts from inference. A credible differentiation hypothesis is reducing launch uncertainty and coordination work; do not claim that it is unique without evidence.

## 6. Implementation order and scope control

Milestone 1 — A credible planning-to-request journey: improve the brief and recommendations; deliver editable economics, persistent plans, a useful export, and a real quote-request handoff. Start with one coherent vertical slice and make it work before expanding the catalog.

Milestone 2 — An operable assisted pilot: add the protected operator queue, evidence-backed quotes, clear decisions and sample/production gates, and actual outcome recording. Complete a documented manual walkthrough using explicitly labeled fixtures. Human supplier responses, payment, and fulfillment remain external evidence until they actually happen.

Milestone 3 — Demand learning and selective automation: add the interest page if useful, review pilot outcomes, and automate the most expensive demonstrated bottleneck. Payments, supplier integrations, additional cities, subscriptions, and storefront breadth require a clear dependency or evidence-backed reason.

At the beginning, present a compact implementation table: feature, existing files, new files/entities, acceptance criteria, priority, and dependency. Then implement the first complete slice within applicable repository instructions. If those instructions require stopping after a slice, finish and report it honestly; do not claim later milestones are complete. Otherwise continue through feasible authorized implementation with targeted verification. Do not repeatedly ask permission for routine edits.

Do not deploy, publish, charge money, send messages, or make external commitments merely because this brief describes a business workflow. Prepare and test those capabilities locally when possible, and identify any explicit authorization needed for external execution.

## 7. What to defer

Defer broad supplier marketplaces, nationwide logistics orchestration, social feeds, creator discovery, more cities, loyalty programs, complex subscriptions, autonomous purchasing, decorative AI features, and unsupported revenue projections. These are not prerequisites for proving one successful assisted launch.

Keep seasonal and venue guidance secondary to product feasibility, cash exposure, supplier confirmation, and execution. More recommendations and more cities do not by themselves make the business more viable.

## 8. Definition of done and final delivery

For each delivered milestone, show a coherent user journey, functioning persistence appropriate to its claims, recoverable failure states, meaningful targeted checks, and accurate labels for estimates and manual steps. Validate calculations with explicit example inputs and expected results. Use the repository’s required checks without defaulting to a full-suite run. Do not invent test results or external success.

Deliver the implemented code plus concise documentation for setup, the data/workflow model, operating the pilot, and unresolved business assumptions, using existing documentation locations when sensible. Explain how a founder can run the workflow tomorrow, which parts require manual work, and what prevents inviting real creators if anything does.

Your final report must separate: implemented and verified; implemented but dependent on configuration; manually operated; deferred; and unvalidated business assumptions. Name the most important next customer experiment. Be candid if the product is ready for a pilot but the business has not yet been validated.

Begin by inspecting the repository, identifying the shortest path to a real planning-to-quote-request journey, and implementing that path.
