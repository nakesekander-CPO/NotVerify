import { describe, it, expect } from 'vitest'
import {
  PLAN_STAGES, BASE_SPEC, SCRIPT, OPENERS,
  applySeverityChoice, applyOutputChoice, dryRunFor,
  planReady, testReady, deployReady,
} from './agentBuilder'

describe('agent builder script integrity', () => {
  it('every beat has a builder reply or a composed one, and chips or a choice to advance', () => {
    for (const beat of SCRIPT) {
      expect(beat.builder !== undefined || beat.deployedReply).toBeTruthy()
      expect((beat.chips?.length || 0) + (beat.choice?.options?.length || 0)).toBeGreaterThan(0)
    }
    expect(OPENERS.length).toBe(3)
  })

  it('the plan gate opens only on the complete plan', () => {
    expect(planReady(PLAN_STAGES.seed)).toBe(false)
    expect(planReady(PLAN_STAGES.complete)).toBe(true)
  })

  it('choices genuinely mutate the spec', () => {
    const widened = applyOutputChoice(applySeverityChoice(BASE_SPEC, true), false)
    expect(widened.steps.join(' ')).toContain('major-severity')
    const narrow = applyOutputChoice(applySeverityChoice(BASE_SPEC, false), true)
    expect(narrow.steps.join(' ')).not.toContain('major-severity')
    expect(narrow.tools).toContain('slack.post_message')
    expect(widened.tools).not.toContain('slack.post_message')
  })

  it('dry run stops-for-human on critical-only, drafts on widened scope — passes either way', () => {
    const narrow = applyOutputChoice(applySeverityChoice(BASE_SPEC, false), false)
    const wide = applyOutputChoice(applySeverityChoice(BASE_SPEC, true), false)
    const stopRun = dryRunFor(narrow)
    const draftRun = dryRunFor(wide)
    expect(stopRun.stoppedForHuman).toBe(true)
    expect(stopRun.handedTo).toBe('Alex Chen')
    expect(draftRun.stoppedForHuman).toBe(false)
    expect(stopRun.passed && draftRun.passed).toBe(true)
  })

  it('deploy gate is structural: complete spec + passed test + L0 ceiling', () => {
    const spec = applyOutputChoice(applySeverityChoice(BASE_SPEC, true), false)
    expect(testReady(spec)).toBe(true)
    expect(deployReady(spec, null)).toBe(false)
    expect(deployReady(spec, dryRunFor(spec))).toBe(true)
    expect(deployReady({ ...spec, autonomy_level: 'L3' }, dryRunFor(spec))).toBe(false)
  })

  it('the draft-only guardrail survives every path', () => {
    for (const majors of [true, false]) for (const slack of [true, false]) {
      const spec = applyOutputChoice(applySeverityChoice(BASE_SPEC, majors), slack)
      expect(spec.guardrails.join(' ')).toContain('Never send an email')
      expect(spec.output.destination).toContain('never sent automatically')
    }
  })
})
