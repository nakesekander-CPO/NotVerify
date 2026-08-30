/**
 * SwiftBridge language switch — dictionary integrity + Japan
 * localisation prompt rules (Akie Mimori decisions, 2026/08/14).
 *
 * The JA rules tested here are the machine-checkable subset of the
 * approved localisation prompt: keep-English terms never glossed,
 * no second person, half-width Latin/numerals, no Latin comma/period,
 * -er loanwords without the trailing 長音 mark, kana-preferred forms,
 * and アビタAI only in Japanese running copy (Latin arbitr in
 * lockups/copyright, never アービター anywhere).
 */

import { describe, it, expect } from 'vitest'
import {
  STR, t, SB_LANGS, SB_LANG_STORAGE_KEY,
  JA_TAB_LABELS, JA_SERVICE_LABELS, JA_STEP_NAMES, JA_V2_FEATURES,
  JA_VOICES, JA_MARSHALL_ISSUES, JA_EVIDENCE_REASONS, OWNER_LABELS,
  pickLabel, stepName, ownerLabel, fmtDateTime, fmtTime,
} from '../i18n'

/* Every JA string the module ships, with a traceable id. */
const jaStrings = () => {
  const out = []
  for (const [key, entry] of Object.entries(STR)) out.push([`STR.${key}`, entry.ja])
  for (const [k, v] of Object.entries(JA_TAB_LABELS)) out.push([`tab.${k}`, v])
  for (const [k, v] of Object.entries(JA_SERVICE_LABELS)) out.push([`service.${k}`, v])
  for (const [k, v] of Object.entries(JA_STEP_NAMES)) out.push([`step.${k}`, v])
  JA_V2_FEATURES.forEach((v, i) => out.push([`v2.${i}`, v]))
  for (const [k, v] of Object.entries(JA_VOICES)) { out.push([`voice.${k}.tone`, v.tone]); out.push([`voice.${k}.desc`, v.desc]) }
  for (const [k, v] of Object.entries(JA_MARSHALL_ISSUES)) { out.push([`fm.${k}.issue`, v.issue]); out.push([`fm.${k}.detail`, v.detail]) }
  for (const [k, v] of Object.entries(JA_EVIDENCE_REASONS)) out.push([`evidence.${k}`, v])
  for (const [k, v] of Object.entries(OWNER_LABELS)) out.push([`owner.${k}`, v.ja])
  return out
}

describe('dictionary integrity', () => {
  it('every key carries non-empty en and ja strings', () => {
    for (const [key, entry] of Object.entries(STR)) {
      expect(entry.en, `${key}.en`).toBeTruthy()
      expect(entry.ja, `${key}.ja`).toBeTruthy()
    }
  })

  it('t() resolves en / ja / current (current falls back to en)', () => {
    expect(t('en', 'projects.header')).toBe('Projects')
    expect(t('ja', 'projects.header')).toBe('案件一覧')
    expect(t('current', 'projects.header')).toBe('Projects 案件一覧')
    // no current override → falls back to en
    expect(t('current', 'btn.retry')).toBe('Retry')
  })

  it('t() interpolates variables', () => {
    expect(t('ja', 'sla.left', { h: 14 })).toBe('残り14時間')
    expect(t('en', 'qa.critical', { n: 2 })).toBe('2 critical')
  })

  it('exposes the three states and the storage key', () => {
    expect(SB_LANGS).toEqual(['current', 'en', 'ja'])
    expect(SB_LANG_STORAGE_KEY).toBe('sb-lang')
  })
})

describe('JA rules — keep-English terms', () => {
  it('never glosses AI Dubbing in Japanese (AI吹替/AI吹き替え banned in JA-mode strings)', () => {
    for (const [id, s] of jaStrings()) {
      expect(s.includes('AI吹替') || s.includes('AI吹き替え'), id).toBe(false)
    }
  })

  it('the dubbing tab, service, and step keep the English name', () => {
    expect(JA_TAB_LABELS.dubbing).toBe('AI Dubbing')
    expect(JA_SERVICE_LABELS.dubbing).toBe('AI Dubbing')
    expect(JA_STEP_NAMES['dubbing-prep']).toContain('AI Dubbing')
  })
})

describe('JA rules — register and orthography', () => {
  it('never addresses the reader (no あなた / 貴社 / 御社)', () => {
    for (const [id, s] of jaStrings()) {
      expect(/あなた|貴社|御社/.test(s), id).toBe(false)
    }
  })

  it('uses half-width Latin and numerals (one documented quote exception)', () => {
    // fm6 deliberately QUOTES the full-width digits being normalised (２０２６→2026)
    const exceptions = new Set(['fm.fm6.detail'])
    for (const [id, s] of jaStrings()) {
      if (exceptions.has(id)) continue
      expect(/[Ａ-Ｚａ-ｚ０-９]/.test(s), id).toBe(false)
    }
  })

  it('uses 、and 。— never Latin ，．', () => {
    for (const [id, s] of jaStrings()) {
      expect(/，|．/.test(s), id).toBe(false)
    }
  })

  it('drops the trailing 長音 on -er loanwords (サーバ not サーバー)', () => {
    const denylist = ['サーバー', 'ユーザー', 'コンピューター', 'スライドマスター', 'フッター', 'プレースホルダー', 'プリンター', 'マスター']
    for (const [id, s] of jaStrings()) {
      for (const bad of denylist) expect(s.includes(bad), `${id} contains ${bad}`).toBe(false)
    }
  })

  it('prefers kana forms (no 下さい / 出来る / 但し)', () => {
    for (const [id, s] of jaStrings()) {
      expect(/下さい|出来る|但し/.test(s), id).toBe(false)
    }
  })
})

describe('JA rules — the arbitr rendering', () => {
  it('アビタAI never leaks into EN strings; アービター never exists at all', () => {
    for (const [key, entry] of Object.entries(STR)) {
      expect(entry.en.includes('アビタ'), `${key}.en`).toBe(false)
      expect(`${entry.en}${entry.ja}${entry.current ?? ''}`.includes('アービター'), key).toBe(false)
    }
  })

  it('Latin "arbitr" appears in JA strings only in lockups/copyright (running copy uses アビタAI)', () => {
    const lockupKeys = new Set(['header.platformLockup', 'footer.copyright'])
    for (const [key, entry] of Object.entries(STR)) {
      if (entry.ja.includes('arbitr')) {
        expect(lockupKeys.has(key), `${key}.ja uses Latin arbitr outside a lockup`).toBe(true)
      }
    }
    // and the running-copy strings that reference the platform do use アビタAI
    expect(t('ja', 'projects.slaTracked')).toContain('アビタAI')
    expect(t('ja', 'legend.agents')).toContain('アビタAI')
  })
})

describe('helpers', () => {
  it('pickLabel selects per language with optional JA override', () => {
    const svc = { label: 'AI Dubbing', labelJa: 'AI吹替' }
    expect(pickLabel(svc, 'en')).toBe('AI Dubbing')
    expect(pickLabel(svc, 'ja', JA_SERVICE_LABELS.dubbing)).toBe('AI Dubbing')
    expect(pickLabel({ label: 'QA & validation', labelJa: 'QA・検証' }, 'ja')).toBe('QA・検証')
  })

  it('stepName applies the dubbing-prep override in JA', () => {
    expect(stepName({ key: 'dubbing-prep', name: 'AI dubbing preparation', nameJa: 'AI吹替準備' }, 'ja')).toBe('AI Dubbing準備')
    expect(stepName({ key: 'translation', name: 'AI translation', nameJa: 'AI翻訳' }, 'ja')).toBe('AI翻訳')
    expect(stepName({ key: 'translation', name: 'AI translation', nameJa: 'AI翻訳' }, 'en')).toBe('AI translation')
  })

  it('ownerLabel maps model owner strings per language, passthrough for current', () => {
    expect(ownerLabel('arbitr · アビタAI', 'en')).toBe('arbitr')
    expect(ownerLabel('arbitr · アビタAI', 'ja')).toBe('アビタAI')
    expect(ownerLabel('Customer', 'ja')).toBe('お客様')
    expect(ownerLabel('arbitr · アビタAI', 'current')).toBe('arbitr · アビタAI')
  })

  it('formats JA dates as YYYY年M月D日 H:MM with half-width numerals', () => {
    const d = new Date(2026, 7, 16, 9, 5) // 2026-08-16 09:05 local
    expect(fmtDateTime(d, 'ja')).toBe('2026年8月16日 9:05')
    expect(fmtTime(d, 'ja')).toBe('9:05')
  })
})
