/**
 * Conversational agent builder — the scripted session.
 *
 * Adapted from a real plan-then-build transcript recorded against the
 * standalone arbitr Agent Studio prototype (Opus-5-backed). This demo
 * version is a SIMULATION: no model calls — the script advances beat by
 * beat, and two choice points genuinely mutate the spec so the session
 * feels alive. The builder's voice, the planning-first discipline, the
 * honest dry-run stop, and the structural gates are preserved verbatim
 * in spirit from the source session.
 *
 * Gates are structural here too: building requires a finished plan,
 * testing a complete spec, deploying a passed test.
 */

/* ── The plan artifact (fills progressively during planning) ──── */

export const PLAN_STAGES = {
  seed: {
    job_today:
      'Every Monday Alex opens last week’s German QA reports from Yuki’s review team, finds every segment a reviewer marked critical, and works out which flags are really the same underlying mistake repeated (six flags, one root cause). The write-up goes to the vendor as an email Alex sends personally.',
    understood_as: 'Turn last week’s German critical QA flags into a small set of root-cause patterns, written up so the vendor can act on them.',
    shape: null,
    open_questions: [
      'What actually goes into the email — the flagged segments, or your own read on the pattern?',
      'Is “critical” the only severity worth pulling, or do repeated majors matter too?',
    ],
    risks: [],
    verdict: null,
  },
  complete: {
    job_today:
      'Every Monday Alex opens last week’s German QA reports from Yuki’s review team, finds every segment a reviewer marked critical, and works out which flags are really the same underlying mistake repeated (six flags, one root cause). The write-up goes to the vendor as an email Alex sends personally. Three to four hours in a bad week — nearly all of it the pattern-spotting, not the reading.',
    understood_as: 'Turn last week’s German critical QA flags into a small set of root-cause patterns, written up so the vendor can act on them.',
    shape:
      'Wakes Monday morning after the prior week’s German QA reports are closed. Reads the critical flags, groups them by underlying cause rather than listing them one by one, and drafts the vendor write-up with example segments behind each pattern. The send stays with Alex.',
    open_questions: [
      'Is “critical” the only severity worth pulling, or do repeated majors matter too?',
      'One vendor per week, or several German vendors needing separate write-ups?',
    ],
    risks: [
      'The clustering is the judgement call — grouped badly, the write-up is worse than useless',
      'A vendor-facing email goes out under Meridian’s name, so the send should stay with a human',
      'Quoting flagged source segments externally could carry regulated or personal content',
    ],
    verdict: 'agent',
    verdict_note: 'There is a real judgement step — deciding which flags share a root cause — so this isn’t a template. One job, one owner, one output.',
  },
}

/* ── The spec (assembles during building; choices mutate it) ──── */

export const BASE_SPEC = {
  name: 'German critical QA vendor brief',
  job_description: 'Group last week’s critical German QA flags into root-cause patterns and draft the vendor write-up for Alex to send.',
  owner: 'Alex Chen',
  trigger: { type: 'scheduled', detail: 'every Monday 07:30, covering the previous week’s closed German QA reports' },
  model: 'arbitr-general',
  tools: ['qa.read_report', 'termbase.lookup', 'email.create_draft'],
  knowledge: ['history.qa_reports', 'cortex.terminology', 'docs.style_guide_de'],
  steps: [
    'Read all German QA reports closed in the previous week',
    'Pull every segment a reviewer marked critical, with the reviewer’s comment',
    'Look up the approved term for any terminology flag so the pattern can be explained, not just named',
    'Group the flags by underlying cause rather than listing them individually',
    'Note anything it cannot confidently group and flag it for Alex’s judgement',
    'Draft the vendor email in Alex’s mailbox with the patterns ordered by frequency',
  ],
  human_checkpoints: ['Alex reviews and sends the vendor email — the agent only ever creates a draft'],
  guardrails: [
    'Never send an email — draft only',
    'Never soften or reinterpret a reviewer’s severity decision',
    'Never quote a segment that appears to contain personal data; describe the issue instead',
  ],
  escalation_triggers: [
    'No closed German QA reports found for the period',
    'Flags it cannot confidently assign to a pattern',
    'A flagged segment appears to contain regulated wording or personal data',
  ],
  autonomy_level: 'L0',
  failure_behavior: 'Stop and hand back to Alex with what it did read and which flags it could not group — never guess a pattern or invent an example segment.',
  test_results: null,
}

/** Choice A — severity scope. */
export function applySeverityChoice(spec, includeMajors) {
  const steps = [...spec.steps]
  if (includeMajors) {
    steps.splice(2, 0, 'Include any major-severity flag that recurs three or more times, as a clearly separate second section')
  }
  return {
    ...spec,
    steps,
    severityScope: includeMajors ? 'critical + repeated majors' : 'critical only',
    success_criteria: includeMajors
      ? ['Monday write-up under 30 minutes instead of three to four hours', 'Repeated root causes fall over following weeks — including repeated majors']
      : ['Monday write-up under 30 minutes instead of three to four hours', 'The patterns it names match the ones Alex would have found'],
  }
}

/** Choice B — output destination. */
export function applyOutputChoice(spec, alsoSlack) {
  return {
    ...spec,
    tools: alsoSlack ? [...BASE_SPEC.tools, 'slack.post_message'] : [...BASE_SPEC.tools],
    output: alsoSlack
      ? { format: 'Draft vendor email + a one-line-per-pattern list posted to #vendor-quality', destination: 'Draft in Alex’s mailbox — never sent automatically · Slack #vendor-quality' }
      : { format: 'Draft vendor email: root-cause patterns ordered by frequency, each with example segments and the approved correction', destination: 'Draft in Alex’s mailbox — never sent automatically' },
  }
}

/* ── Dry run results (depends on Choice A) ─────────────────────── */

export function dryRunFor(spec) {
  const criticalOnly = spec.severityScope !== 'critical + repeated majors'
  return {
    fixture: 'QA-2026-0731-DE · 412 German segments · trust score 91% · 7 flags',
    accessed: ['qa.read_report', 'termbase.lookup'],
    stoppedForHuman: criticalOnly,
    stopReason: criticalOnly
      ? 'Cannot complete pattern grouping — one lone critical flag is not a pattern; handing back before drafting the vendor email.'
      : null,
    handedTo: criticalOnly ? 'Alex Chen' : null,
    outputPreview: criticalOnly
      ? 'Read 1 report · found 1 critical (segment 188: source 4.2% → target 4,7%) · 2 majors for forbidden term “Drawdown” were out of scope. Nothing to group — stopped and handed back.'
      : 'Draft created: 2 patterns. #1 Forbidden term “Drawdown” (2×, approved term cited from the termbase). #2 Figure mismatch 4.2% → 4,7% (segment 188, single critical, own section).',
    passed: true,
    passedAt: '2026-08-18T11:30:40Z',
    insight: criticalOnly
      ? 'Correct behaviour — but it means quiet weeks produce nothing. The two “Drawdown” majors were the actual repeat. Widening to repeated majors would have produced a useful draft this week.'
      : 'The repeated “Drawdown” majors carried the useful pattern this week — the single critical still sits at the top in its own section.',
  }
}

/* ── The script ─────────────────────────────────────────────────
   Each beat: the builder's reply, panel events, and the chips that
   advance the session. `choice` marks a real decision point. */

export const OPENERS = [
  'Every Monday I go through last week’s German QA reports and pull out anything a reviewer marked critical, then email a summary to the vendor.',
  'When a translated file comes back from a vendor I check it against our termbase by hand before it goes anywhere.',
  'I want something that watches our credit burn and tells me before we run out mid-month.',
]

export const SCRIPT = [
  {
    id: 'clarify',
    mode: 'planning',
    builder:
      'That’s a real Monday. Before I sketch anything: when you write it up, what do you actually put in the email — just the flagged segments, or your own read on the pattern and what you want the vendor to change?',
    panel: [{ type: 'plan', stage: 'seed' }],
    chips: ['Three or four hours some weeks. The reports come from Yuki’s reviewers; I write the vendor email myself. The slow part is spotting that six separate flags are really the same mistake.'],
  },
  {
    id: 'plan-complete',
    mode: 'planning',
    builder:
      'That clustering step is the actual job — the rest is retrieval and typing.\n\nHere’s the plan as I understand it. The judgement call is deciding which flags share a root cause, which is why this is an agent and not a template. Two risks worth naming now: the email goes out under Meridian’s name, so the send should stay yours; and quoting flagged segments to an external vendor could carry regulated or personal content — I’ll bind that as a guardrail, not a suggestion.\n\nIf the plan reads right, say the word and I’ll start building.',
    panel: [{ type: 'plan', stage: 'complete' }],
    chips: ['That reads right. Let’s build it.'],
    gate: 'plan',
  },
  {
    id: 'build-seed',
    mode: 'building',
    builder:
      'Here’s the starting point — it’ll be wrong in places.\n\n**German critical QA vendor brief.** Wakes Monday 07:30, reads last week’s closed German QA reports, pulls every critical flag with the reviewer’s comment, groups them by underlying cause, and drafts the vendor email in your mailbox — patterns ordered by frequency, example segments behind each, the approved correction pulled from the termbase so the vendor sees *why*.\n\nIt drafts only. It has no ability to send, so the email stays yours. Failure behaviour defaults to stopping and handing back with what it managed to read.\n\nOne choice I’d like your call on: today you only pull criticals. But a mistake made twenty times at major severity is often the more useful pattern for a vendor. I’d add repeated majors — the same issue three or more times — as a clearly separate second section. Keep it critical-only, or widen it?',
    panel: [{ type: 'mode', mode: 'building' }, { type: 'spec', apply: 'base' }],
    choice: {
      id: 'severity',
      options: [
        { chip: 'Keep it critical-only — match what I do today.', value: false, ack: 'Critical-only it is — matching your Monday exactly. The spec keeps repeated majors out of scope.' },
        { chip: 'Widen it — add repeated majors as a separate section.', value: true, ack: 'Done — repeated majors (3+ occurrences) get their own clearly separate section, so they never dilute the critical list.' },
      ],
    },
  },
  {
    id: 'output-choice',
    mode: 'building',
    builder:
      'On the output: the draft lands in your mailbox and nothing sends itself — that’s bound as a guardrail, not a setting. Some teams also want the pattern list posted to an internal channel so whoever raises tickets has it in one place. I’d keep it to one output you already read, but it’s your call: draft only, or draft plus a Slack post to #vendor-quality?',
    panel: [],
    choice: {
      id: 'output',
      options: [
        { chip: 'Draft only — one output, one place to look.', value: false, ack: 'Agreed — one output you already read. The spec stays draft-only.' },
        { chip: 'Add the Slack post as well.', value: true, ack: 'Added — a one-line-per-pattern post to #vendor-quality alongside the draft. The email still never sends itself.' },
      ],
    },
  },
  {
    id: 'dry-run',
    mode: 'building',
    builder: 'Running it against last week’s real report — QA-2026-0731-DE, 412 German segments, trust score 91%, 7 flags.',
    panel: [{ type: 'dryrun' }],
    chips: ['Test it against last week’s report.'],
    gate: 'test',
    // builderAfter is composed at runtime from dryRunFor(spec)
  },
  {
    id: 'deploy',
    mode: 'building',
    builder: null, // composed: dry-run verdict + "ready to deploy"
    panel: [{ type: 'deployed' }],
    chips: ['Deploy it.'],
    gate: 'deploy',
    deployedReply:
      'It’s live, owned by you, running Mondays at 07:30 into your mailbox as a draft only.\n\nPause or edit it from the Agent Studio dashboard — the run history there will show every report it read and every draft it produced.',
  },
]

/* ── Gates (structural, mirroring the source project) ──────────── */

export function planReady(plan) {
  return Boolean(plan && plan.shape && plan.verdict && plan.risks?.length)
}
export function testReady(spec) {
  return Boolean(spec && spec.name && spec.steps?.length && spec.guardrails?.length && spec.severityScope && spec.output)
}
export function deployReady(spec, dryRun) {
  return testReady(spec) && Boolean(dryRun?.passed) && spec.autonomy_level === 'L0'
}
