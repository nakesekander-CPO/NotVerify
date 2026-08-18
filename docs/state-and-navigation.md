# State & navigation

Phase-state routing lives in `src/App.jsx` (`phase` string + setters — no
router). The authoritative surface list is the `phase === '…'` mounts in
App.jsx; as of 2026-08-18 the first-class pages are: onboarding,
agent-assembly, dashboard (GovernanceDashboard — one surface, day-0/live
states), time-jump (post-first-check transition), campaign-hub, reading
(MissionControl), processing (LiveTelemetry / OperationsControlRoom),
narrative (QualityNarrative / CampaignResultsView), human-review, org-brain
(Cortex — id kept for deep-link stability), create, agent-studio,
swiftbridge, video-dubbing, ai-visibility, analytics, governance, settings,
integrations. Overlays: IntelligenceMarketplace, HITL Vendor Workflow,
AgentProfile, AgentArbitration (processing window only).

Back behavior: `goBack()` in App.jsx — returns to `previousPhase` unless it
is stale/self-referencing, in which case it falls back to the dashboard.
GlobalNav renders on all phases except onboarding/agent-assembly.

Debug hooks (dev only): `window.__setPhase`, `window.__setShowMarketplace`,
`window.__setHumanReviewMode`.
