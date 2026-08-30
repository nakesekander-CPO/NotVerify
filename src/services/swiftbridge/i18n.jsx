/**
 * SwiftBridge — section-scoped language switch (Current / EN / JA).
 *
 * Three states:
 *   current — the page exactly as shipped before this feature: mixed
 *             bilingual glosses ("Projects 案件一覧"). Kept on purpose
 *             as the "before" state for localisation review.
 *   en      — fully English UI, all Japanese glosses removed.
 *   ja      — fully Japanese UI produced by applying the approved
 *             Japan localisation prompt (Akie Mimori decisions,
 *             2026/08/14): です・ます register, 体言止め buttons, no
 *             second person, half-width Latin/numerals, 「アビタAI」
 *             for arbitr in running copy (Latin in lockups), and the
 *             keep-English list (SwiftBridge, AI Dubbing, Cortex …).
 *
 * Demo CONTENT (project names, file names, glossary terms, QA finding
 * data) is data about Japanese IR documents and is identical in every
 * state — the toggle switches the interface language, not the subject.
 *
 * Scope: this context is only mounted by the SwiftBridge shell. The
 * default context value is 'current', so any component rendered
 * outside the provider behaves exactly as before.
 */

/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState } from 'react'

export const SB_LANGS = ['current', 'en', 'ja']
export const SB_LANG_STORAGE_KEY = 'sb-lang'

/* ── String dictionary ───────────────────────────────────────────
   Every entry: { en, ja, current? }. `current` falls back to `en`
   when the original string had no Japanese mixed in. */

export const STR = {
  /* Shell */
  'header.tagline': {
    en: 'Faster, more reliable AI-powered IR localization & disclosure workflows',
    ja: 'AIでIR翻訳・開示ワークフローをより速く、より確実に',
    current: 'スイフトブリッジAI — faster, more reliable AI-powered IR localization & disclosure workflows',
  },
  'header.poweredBy': { en: 'Powered by', ja: 'Powered by' },
  'header.platformLockup': { en: 'arbitr', ja: 'arbitr', current: 'arbitr · アビタAI' },
  'header.back': { en: '← Back', ja: '← 戻る' },
  'footer.copyright': {
    en: '© 2026 SwiftBridge K.K. · Operated on the arbitr platform',
    ja: '© 2026 SwiftBridge K.K. · arbitrプラットフォーム上で運用',
    current: '© 2026 SwiftBridge K.K. · Operated on the arbitr platform（アビタAI）',
  },
  'footer.terms': { en: 'Terms of Service', ja: '利用規約', current: '利用規約 Terms' },
  'footer.privacy': { en: 'Privacy Policy', ja: 'プライバシーポリシー', current: 'プライバシーポリシー Privacy' },

  /* Dashboard */
  'dash.title': { en: 'IR localization, on time — every time', ja: 'IR翻訳、常に納期どおり' },
  'dash.subtitle': {
    en: 'Upload a disclosure document, follow the AI-orchestrated workflow, review where it matters, and receive delivery within the committed SLA.',
    ja: '開示文書をアップロードすると、AIが構成したワークフローが進みます。要所は人がレビューし、約束した納期内に納品します。',
  },
  'dash.newProject': { en: '＋ New project', ja: '＋ 新規案件', current: '＋ New project 新規案件' },
  'stat.active': { en: 'Active projects', ja: '進行中', current: 'Active projects · 進行中' },
  'stat.nextSla': { en: 'Next SLA deadline', ja: '次の納期', current: 'Next SLA deadline · 次の納期' },
  'stat.pending': { en: 'Pending reviews', ja: 'レビュー待ち', current: 'Pending reviews · レビュー待ち' },
  'stat.delivered': { en: 'Delivered', ja: '納品済み', current: 'Delivered · 納品済み' },
  'stat.active.subOk': { en: 'All running normally', ja: 'すべて正常に進行中' },
  'stat.active.subBlocked': { en: '{n} blocked — action needed', ja: '{n}件がブロック中 — 対応が必要です' },
  'stat.nextSla.subNone': { en: 'No live deadlines', ja: '進行中の納期はありません' },
  'stat.pending.sub': { en: 'Human & customer gates', ja: '人によるレビュー・お客様の承認' },
  'stat.delivered.sub': { en: '100% on time this quarter', ja: '今四半期の納期遵守率100%' },
  'v2.newIn': { en: 'New in V2', ja: 'V2の新機能' },
  'projects.header': { en: 'Projects', ja: '案件一覧', current: 'Projects 案件一覧' },
  'projects.slaTracked': { en: 'SLA tracked by arbitr', ja: 'SLAはアビタAIが管理', current: 'SLA tracked by arbitr · アビタAI' },
  'badge.delivered': { en: 'Delivered', ja: '納品済み' },
  'badge.blocked': { en: 'Blocked', ja: 'ブロック中' },
  'badge.inProgress': { en: 'In progress', ja: '進行中' },
  'sla.met': { en: 'SLA met', ja: 'SLA達成' },
  'sla.missed': { en: 'SLA missed', ja: 'SLA未達' },
  'sla.breached': { en: 'SLA breached', ja: 'SLA超過' },
  'sla.left': { en: '{h}h left', ja: '残り{h}時間' },

  /* Delivery */
  'delivery.deliverables': { en: 'Deliverables', ja: '納品物', current: 'Deliverables 納品物' },
  'delivery.download': { en: 'Download', ja: 'ダウンロード' },
  'delivery.versionHistory': { en: 'Version history', ja: 'バージョン履歴' },
  'delivery.v2Line': { en: 'Final — human review + QA fixes applied', ja: '最終版 — 人によるレビューとQA修正を反映' },
  'delivery.v1Line': { en: 'AI draft (arbitr)', ja: 'AIドラフト（アビタAI）', current: 'AI draft (arbitr · アビタAI)' },
  'delivery.reviewNoteLabel': { en: 'Review note:', ja: 'レビューメモ：' },
  'delivery.reviewNote': {
    en: 'Terminology aligned to Meridian IR Glossary v3. Footnote 7 retranslated.',
    ja: '用語はMeridian IR Glossary v3に準拠。脚注7を再翻訳しました。',
  },
  'delivery.feedback': { en: 'Your feedback', ja: 'ご評価', current: 'Your feedback ご評価' },
  'delivery.thanks': { en: 'Thank you — feedback recorded.', ja: 'ご評価ありがとうございます。記録しました。', current: 'ありがとうございます — feedback recorded.' },
  'delivery.deliveredAt': { en: 'Delivered {dt} · {sla}', ja: '納品：{dt}・{sla}' },
  'delivery.emptyTitle': { en: '{name} says: nothing delivered yet', ja: '{name}からのお知らせ：納品物はまだありません' },
  'delivery.emptyBody': {
    en: 'Your completed deliverables will appear here with SLA status and version history.',
    ja: '納品が完了すると、SLAステータスとバージョン履歴とともにここに表示されます。',
  },

  /* Wizard */
  'wiz.stage.upload': { en: 'Upload', ja: 'アップロード', current: 'Upload アップロード' },
  'wiz.stage.scan': { en: 'File Marshall', ja: 'ファイル診断', current: 'File Marshall ファイル診断' },
  'wiz.stage.sage': { en: 'Sage — prep choice', ja: 'Sage — 修正方法', current: 'Sage — prep choice 修正方法' },
  'wiz.stage.docType': { en: 'Document type', ja: '文書種別', current: 'Document type 文書種別' },
  'wiz.stage.services': { en: 'Services', ja: 'サービス', current: 'Services サービス' },
  'wiz.stage.confirm': { en: 'Confirm', ja: '確認', current: 'Confirm 確認' },
  'wiz.uploadTitle': { en: 'Upload a file', ja: 'ファイルのアップロード', current: 'Upload a file ファイルをアップロード' },
  'wiz.dropHint': { en: 'Drop a PDF, PowerPoint, or media file here', ja: 'PDF・PowerPoint・メディアファイルをここにドロップ' },
  'wiz.dropTypes': {
    en: 'Timely disclosures · quarterly reports · earnings decks · annual securities reports · video',
    ja: '適時開示・四半期報告書・決算説明資料・有価証券報告書・動画',
    current: '適時開示・四半期報告書・決算説明資料・有価証券報告書・動画',
  },
  'wiz.samplePick': { en: 'Or pick a sample file', ja: 'サンプルファイルから選択' },
  'wiz.docTypeTitle': { en: 'Document type — each type carries a delivery commitment', ja: '文書種別 — 種別ごとに納期が決まります' },
  'wiz.servicesTitle': { en: 'Services', ja: 'サービス選択', current: 'Services サービス選択' },
  'wiz.confirmTitle': { en: 'Project brief', ja: '案件内容の確認', current: 'Project brief 確認' },
  'row.file': { en: 'File', ja: 'ファイル' },
  'row.docType': { en: 'Document type', ja: '文書種別' },
  'row.services': { en: 'Services', ja: 'サービス' },
  'row.langPair': { en: 'Language pair', ja: '言語ペア' },
  'row.sourcePrep': { en: 'Source prep', ja: '事前修正' },
  'row.delivery': { en: 'Delivery commitment', ja: '納期' },
  'row.eta': { en: 'Estimated delivery', ja: '納品予定' },
  'row.prep.self': { en: 'Customer fixes source issues (checklist sent)', ja: 'お客様がソース問題を修正（チェックリスト送付済み）' },
  'row.prep.dtp': { en: 'arbitr DTP pre-flight fixes (24h)', ja: 'アビタAIのDTP事前修正（24時間）' },
  'wiz.back': { en: '← Back', ja: '← 戻る' },
  'wiz.next': { en: 'Next →', ja: '次へ →' },
  'wiz.submit': { en: 'Submit project', ja: '案件を作成', current: 'Submit project 案件を作成' },

  /* Workflow timeline */
  'kind.agent': { en: 'AI agent', ja: 'AIエージェント', current: 'AI agent AIエージェント' },
  'kind.human_review': { en: 'Human review', ja: '人によるレビュー', current: 'Human review 人によるレビュー' },
  'kind.customer_action': { en: 'Customer action', ja: 'お客様の操作', current: 'Customer action お客様の操作' },
  'legend.agents': {
    en: 'Automated steps run on arbitr agents',
    ja: '自動ステップはアビタAIのエージェントが実行します',
    current: 'Automated steps run on arbitr · アビタAI agents',
  },
  'status.pending': { en: 'Pending', ja: '待機中' },
  'status.in_progress': { en: 'In progress', ja: '進行中' },
  'status.completed': { en: 'Completed', ja: '完了' },
  'status.blocked': { en: 'Blocked', ja: 'ブロック中' },
  'status.needs_review': { en: 'Needs review', ja: '要レビュー' },
  'step.poweredByPrefix': { en: 'Powered by ', ja: '実行：' },
  'step.arbitrSuffix': { en: '(arbitr)', ja: '（アビタAI）', current: '(arbitr · アビタAI)' },
  'step.owner': { en: 'Owner: {o}', ja: '担当：{o}' },
  'step.done': { en: ' · done {t}', ja: '・完了 {t}' },
  'step.retryOne': { en: ' · 1 retry', ja: '・再試行1回' },
  'step.retryMany': { en: ' · {n} retries', ja: '・再試行{n}回' },
  'step.opsOverride': { en: 'Ops override', ja: '運用上書き' },
  'btn.retry': { en: 'Retry', ja: '再試行' },
  'btn.opsOverride': { en: 'Ops override', ja: '運用上書き' },
  'btn.openReview': { en: 'Open in Review Workspace', ja: 'レビューワークスペースで開く' },
  'btn.showEvidence': { en: 'Show terminology evidence', ja: '用語適用の証跡を表示' },
  'btn.hideEvidence': { en: 'Hide terminology evidence', ja: '証跡を非表示' },
  'override.placeholder': { en: 'Override note (required — written to audit log)', ja: '上書き理由（必須・監査ログに記録）' },
  'btn.apply': { en: 'Apply', ja: '適用' },

  /* Dubbing studio */
  'dub.poweredBy': {
    en: 'Powered by SUBTITLE-AV-1 (arbitr)',
    ja: '実行：SUBTITLE-AV-1（アビタAI）',
    current: 'Powered by SUBTITLE-AV-1 (arbitr · アビタAI)',
  },
  'dub.scriptGate': {
    en: 'Human review gate — a SwiftBridge linguist verifies the EN script before voicing. Edit any line below.',
    ja: '人によるレビューゲート — 音声化の前に、SwiftBridgeの言語スペシャリストが英語原稿を確認します。以下の各行は編集できます。',
  },
  'dub.approveScript': { en: 'Approve script → voice selection', ja: '原稿を承認して音声選択へ' },
  'dub.voiceTone': { en: 'Voice & tone', ja: '音声・トーン', current: 'Voice & tone 音声・トーン' },
  'dub.generatePreview': { en: 'Generate preview →', ja: 'プレビューを生成 →' },
  'dub.previewLabel': { en: 'Preview', ja: 'プレビュー', current: 'Preview プレビュー' },
  'dub.voiceLine': {
    en: 'Voice: {name} · {tone}. Preview is regenerated whenever the script or voice changes.',
    ja: '音声：{name}・{tone}。原稿または音声を変更すると、プレビューは再生成されます。',
  },
  'dub.playing': { en: '· playing', ja: '・再生中' },
  'dub.sendApproval': { en: 'Send for approval →', ja: '承認へ送信 →' },
  'dub.finalGate': {
    en: 'Final human gate — reviewer signs off on the dubbed output before export.',
    ja: '最終確認ゲート — 書き出しの前に、担当者が吹替出力を承認します。',
  },
  'dub.approveExport': { en: 'Approve & export', ja: '承認して書き出し' },
  'dub.exported': {
    en: 'Exported — {name} (EN dub).mp4 is ready on the Delivery tab.',
    ja: '書き出し完了 — {name} (EN dub).mp4を納品タブに配置しました。',
  },
  'dub.automated': {
    en: 'Automated stage in progress — transcript generated by SUBTITLE-AV-1.',
    ja: '自動ステージを実行中 — SUBTITLE-AV-1が文字起こしを生成します。',
  },

  /* Glossary panel */
  'gl.clientSpecific': { en: 'client-specific', ja: '顧客専用' },
  'gl.csvTemplate': { en: 'CSV template', ja: 'CSVテンプレート' },
  'gl.th.ja': { en: 'Japanese (JA)', ja: '日本語', current: '日本語 (JA)' },
  'gl.th.en': { en: 'English (EN)', ja: '英語', current: 'English (EN)' },
  'gl.th.status': { en: 'Status', ja: 'ステータス' },
  'gl.th.note': { en: 'Note / Action', ja: '備考・操作' },
  'gl.approveTerm': { en: 'Approve term →', ja: '用語を承認 →' },
  'gl.newTermPh': { en: 'New term (JA)', ja: '新しい用語', current: '新しい用語' },
  'gl.enRenderPh': { en: 'Approved EN rendering', ja: '承認済みの英訳' },
  'gl.add': { en: 'Add (enters approval queue)', ja: '追加（承認待ちに登録）' },
  'term.approved': { en: 'approved', ja: '承認済み' },
  'term.pending': { en: 'pending', ja: '承認待ち' },
  'term.forbidden': { en: 'forbidden', ja: '使用禁止' },
  'agent.title': { en: 'Custom agent', ja: 'カスタムエージェント', current: 'Custom agent · カスタムエージェント' },
  'agent.base': { en: 'Base:', ja: 'ベース：' },
  'agent.marketplace': { en: '(arbitr marketplace)', ja: '（アビタAIマーケットプレイス）' },
  'agent.glossaryLabel': { en: 'Glossary:', ja: '用語集：' },
  'agent.styleRules': { en: 'Style rules', ja: 'スタイルルール' },
  'agent.validationLabel': { en: 'Glossary validation: ', ja: '用語集検証：' },
  'agent.enabled': { en: 'enabled', ja: '有効' },
  'agent.validationRest': {
    en: ' · every output is checked against approved terms before QA.',
    ja: '・すべての出力はQAの前に承認済み用語と照合されます。',
  },
  'live.title': { en: 'Live compliance check', ja: 'ライブ用語チェック' },
  'verdict.pass': { en: 'pass', ja: '適合' },
  'verdict.violation': { en: 'violation', ja: '違反' },
  'verdict.missing': { en: 'approved term missing', ja: '承認済み訳語が未使用' },
  'live.none': { en: 'No glossary terms detected in the sample.', ja: 'サンプル内に用語集の対象用語は見つかりませんでした。' },

  /* QA panel */
  'qa.results': { en: 'QA results — {name}', ja: 'QA結果 — {name}' },
  'qa.critical': { en: '{n} critical', ja: '重大{n}件' },
  'qa.major': { en: '{n} major', ja: '重要{n}件' },
  'qa.minor': { en: '{n} minor', ja: '軽微{n}件' },
  'qa.openLine': {
    en: '{n} open · checks by LQA-AUDIT-1 + TERM-GUARDIAN-1 (arbitr)',
    ja: '未対応{n}件・検査：LQA-AUDIT-1 + TERM-GUARDIAN-1（アビタAI）',
    current: '{n} open · checks by LQA-AUDIT-1 + TERM-GUARDIAN-1 (arbitr · アビタAI)',
  },
  'sev.critical': { en: 'critical', ja: '重大' },
  'sev.major': { en: 'major', ja: '重要' },
  'sev.minor': { en: 'minor', ja: '軽微' },
  'qa.approveFix': { en: 'Approve fix', ja: '修正を承認' },
  'qa.reject': { en: 'Reject', ja: '却下' },
  'qa.commentPh': { en: 'Reviewer comment', ja: 'レビューコメント' },
  'qa.save': { en: 'Save', ja: '保存' },
  'res.approved': { en: 'approved', ja: '承認済み' },
  'res.rejected': { en: 'rejected', ja: '却下' },

  /* File Marshall */
  'fm.title': { en: 'File Marshall', ja: 'ファイル診断', current: 'File Marshall · ファイル診断' },
  'fm.scanningFile': { en: '{id} · scanning {file}', ja: '{id}・{file}を診断中' },
  'fm.slidesChip': { en: '{n} slides', ja: '{n}スライド' },
  'fm.slidesScanning': { en: 'Slides · scanning {a}/{b}', ja: 'スライド・診断中{a}/{b}' },
  'fm.slidesDone': { en: 'Slides · scan complete', ja: 'スライド・診断完了' },
  'fm.issuesLabel': { en: 'Issues to fix before translation', ja: '修正が必要な項目', current: 'Issues to fix before translation · 修正が必要な項目' },
  'fm.slideN': { en: 'Slide {n} · ', ja: 'スライド{n}・' },
  'fm.handoff': { en: 'Hand off to Sage', ja: 'Sageに引き継ぐ' },

  /* Sage prep choice */
  'sage.label': { en: 'Sage · arbitr assistant', ja: 'Sage・アビタAIアシスタント' },
  'sage.msgA': { en: 'File Marshall found ', ja: 'File Marshallが、翻訳後のレイアウトに影響する' },
  'sage.msgStrong': { en: '{n} source issues', ja: 'ソース問題{n}件' },
  'sage.msgB': {
    en: ' across your {s} slides that would break the translated layout. You have two ways forward — the delivery commitment changes with your choice.',
    ja: 'を{s}スライドから検出しました。対応方法は2通りあり、選択によって納期が変わります。',
  },
  'choice.selfTitle': { en: 'Fix it yourself', ja: 'お客様ご自身で修正' },
  'choice.dtpTitle': { en: 'We fix it for you', ja: 'SwiftBridgeにお任せ' },
  'choice.self.p1': { en: 'We send you the prep checklist for all 6 issues', ja: '全6件の修正チェックリストを送付' },
  'choice.self.p2': { en: 'Re-upload the fixed deck — the 72h clock starts then', ja: '修正済みデッキの再アップロード時に72時間の計時を開始' },
  'choice.self.p3': { en: 'Fastest path to delivery', ja: '最短での納品が可能' },
  'choice.dtp.p1': { en: 'arbitr DTP pipeline repairs all 6 issues first', ja: 'アビタAIのDTPパイプラインが全6件を先に修復' },
  'choice.dtp.p2': { en: '24h pre-flight, then the standard 72h workflow', ja: '24時間の事前確認後、標準の72時間ワークフローを実行' },
  'choice.dtp.p3': { en: 'Zero effort on your side', ja: 'お客様側の作業は不要' },
  'choice.downloadChecklist': { en: 'Download prep checklist', ja: 'チェックリストをダウンロード' },
  'choice.seeTimeframes': { en: 'See delivery timeframes', ja: '納期の詳細' },
  'choice.faster': { en: ' · faster', ja: '・最速' },
  'choice.selected': { en: 'Selected', ja: '選択中' },
  'sage.eta': { en: 'Estimated delivery — yourself: {a} · we fix: {b}', ja: '納品予定 — ご自身で修正：{a}・お任せ：{b}' },
  'btn.continue': { en: 'Continue', ja: '次へ' },

  /* Terminology evidence */
  'evidence.title': { en: 'Terminology evidence · {g}', ja: '用語適用の証跡・{g}' },
  'evidence.stats': {
    en: '{checked} terms checked · {applied} corrections applied · {held} held for client · {v} violations remaining',
    ja: '照合{checked}件・修正適用{applied}件・お客様確認待ち{held}件・残存違反{v}件',
  },
  'evidence.applied': { en: 'Applied', ja: '適用' },
  'evidence.pass': { en: 'Pass', ja: '適合' },
  'evidence.held': { en: 'Held', ja: '保留' },
  'evidence.notApplied': { en: ' — not applied', ja: ' — 未適用' },
  'evidence.slide': { en: ' · slide {n}', ja: '・スライド{n}' },
  'evidence.footer': {
    en: 'Checked and applied by {id} · {name} — pending glossary terms are never applied without client approval',
    ja: '照合・適用：{id}・{name} — 承認待ちの用語は、お客様の承認なしには適用されません',
  },

  /* Prep-choice SLA notes */
  'prep.self.note': { en: 'Clock starts when the fixed file is re-uploaded', ja: '修正済みファイルの再アップロード時に計時を開始します' },
  'prep.dtp.note': { en: 'Includes 24h DTP pre-flight before translation', ja: '翻訳前に24時間のDTP事前確認を含みます' },
}

/* ── JA data-label overrides (prompt-compliant) ──────────────────
   The seeded model carries labelJa strings written BEFORE the
   localisation ruling; these overrides fix the ones that violate it
   (AI Dubbing must stay English; -er loanwords drop the trailing ー). */

export const JA_TAB_LABELS = {
  dashboard: 'ダッシュボード',
  new: '新規案件',
  workflow: 'ワークフロー',
  dubbing: 'AI Dubbing',            // keep-English list — never AI吹替 in JA mode
  glossary: '用語集・エージェント',
  qa: 'QA・検証',
  delivery: '納品',
}

export const JA_SERVICE_LABELS = { dubbing: 'AI Dubbing' }
export const JA_STEP_NAMES = { 'dubbing-prep': 'AI Dubbing準備' }

export const JA_V2_FEATURES = [
  '信頼性と実行の安定性',
  'スケーラブルなAIワークフロー自動化',
  'AI Dubbing',
  'お客様管理の用語集とカスタムエージェント',
  '人によるレビューを含む透明なワークフロー',
]

/** Workflow-step owner strings (model stores the `current` form). */
export const OWNER_LABELS = {
  'arbitr · アビタAI': { en: 'arbitr', ja: 'アビタAI' },
  'SwiftBridge review team': { en: 'SwiftBridge review team', ja: 'SwiftBridgeレビューチーム' },
  Customer: { en: 'Customer', ja: 'お客様' },
  'arbitr DTP pipeline': { en: 'arbitr DTP pipeline', ja: 'アビタAI DTPパイプライン' },
}

/** Voice metadata (names stay Latin; tone/desc localise). */
export const JA_VOICES = {
  'v-aoi': { tone: 'フォーマルIR', desc: '落ち着いた投資家向けの語り口' },
  'v-kenji': { tone: 'ニュートラル', desc: '明瞭なコーポレートナレーション' },
  'v-mika': { tone: 'ウォーム', desc: '親しみやすく、ブランド動画向き' },
}

/** File Marshall issue text. `issueJa` overrides apply the -er
 *  long-vowel rule (スライドマスター → スライドマスタ); details are
 *  full JA translations of the EN detail copy. */
export const JA_MARSHALL_ISSUES = {
  fm1: { issue: 'スライドマスタがロックされています', detail: 'タイトルブロックとフッタがロックされたマスタ上にあり、解除しないと訳文を配置できません。' },
  fm2: { issue: '埋め込みフォント欠落（游ゴシック）', detail: 'スライド5にも影響。フォントが代替され、すべての改行位置がずれます。' },
  fm3: { issue: '画像化されたテキスト', detail: 'グラフのラベルが画像化されています。元データまたはDTPでの再作成なしには翻訳できません。' },
  fm4: { issue: 'テキストボックスあふれ', detail: 'スライド7にも影響。英語は日本語より約30%長くなり、現状のサイズでは既にあふれています。' },
  fm5: { issue: 'SmartArt未グループ化', detail: '12個の未グループ化シェイプ。うち2個には英語のプレースホルダが含まれています。' },
  fm6: { issue: '全角数字', detail: 'IRの数字表記に合わせ、２０２６→2026の正規化が必要です。' },
}

/** Terminology-evidence row reasons, keyed by `${termId}:${action}`. */
export const JA_EVIDENCE_REASONS = {
  'g1:applied': '使用禁止の旧V1訳を修正',
  'g5:applied': '用語集の優先訳を適用',
  'g9:applied': '用語集注記のIR表記ルールを適用',
  'g6:pass': '既に適合（スライド5も同様）',
  'g7:pass': '既に適合',
  'g2:pass': '既に適合',
  'g11:held': 'お客様の承認待ちの用語 — Sageに通知し、適用せず保留',
}

/* ── Lookup + formatting ───────────────────────────────────────── */

/** t(lang, key, vars) — pure lookup, exported for tests. */
export function t(lang, key, vars) {
  const entry = STR[key]
  if (!entry) return key
  let s = lang === 'ja' ? entry.ja : lang === 'current' ? (entry.current ?? entry.en) : entry.en
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

/** Model-object label pickers (en falls back to .label, ja to .labelJa). */
export function pickLabel(obj, lang, jaOverride) {
  if (!obj) return ''
  if (lang === 'ja') return jaOverride ?? obj.labelJa ?? obj.label
  return obj.label
}

export function stepName(step, lang) {
  if (lang === 'ja') return JA_STEP_NAMES[step.key] ?? step.nameJa ?? step.name
  return step.name
}

export function ownerLabel(owner, lang) {
  const m = OWNER_LABELS[owner]
  if (!m || lang === 'current') return owner
  return lang === 'ja' ? m.ja : m.en
}

const pad2 = (n) => String(n).padStart(2, '0')

/** Date+time per the ruling: JA = YYYY年M月D日 H:MM (half-width). */
export function fmtDateTime(value, lang) {
  const d = value instanceof Date ? value : new Date(value)
  if (lang === 'ja') return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${pad2(d.getMinutes())}`
  return d.toLocaleString()
}

export function fmtTime(value, lang) {
  const d = value instanceof Date ? value : new Date(value)
  if (lang === 'ja') return `${d.getHours()}:${pad2(d.getMinutes())}`
  return d.toLocaleTimeString()
}

/* ── Context / provider / toggle ───────────────────────────────── */

const SBLangContext = createContext({ lang: 'current', setLang: () => {} })

export function SBLangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const v = window.localStorage.getItem(SB_LANG_STORAGE_KEY)
      return SB_LANGS.includes(v) ? v : 'en'
    } catch { return 'en' }
  })
  const setLang = (l) => {
    if (!SB_LANGS.includes(l)) return
    setLangState(l)
    try { window.localStorage.setItem(SB_LANG_STORAGE_KEY, l) } catch { /* private mode etc. */ }
  }
  return <SBLangContext.Provider value={{ lang, setLang }}>{children}</SBLangContext.Provider>
}

export function useSBLang() {
  const { lang, setLang } = useContext(SBLangContext)
  return { lang, setLang, t: (key, vars) => t(lang, key, vars) }
}

const TOGGLE_OPTIONS = [
  { id: 'current', label: 'Current' },
  { id: 'en', label: 'EN' },
  { id: 'ja', label: '日本語' },
]

/** Three-segment language switch, rendered in the brand header. */
export function LangToggle() {
  const { lang, setLang } = useSBLang()
  return (
    <div role="group" aria-label="Interface language"
      className="inline-flex items-center rounded-lg border border-white/25 overflow-hidden"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {TOGGLE_OPTIONS.map(o => (
        <button key={o.id} onClick={() => setLang(o.id)} aria-pressed={lang === o.id}
          className={`px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer transition-colors ${
            lang === o.id ? 'bg-white text-[#0D092A]' : 'text-white/75 hover:bg-white/10'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
