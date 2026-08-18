import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, FileText, Shield,
  Globe, ThumbsUp, ThumbsDown, RefreshCw, BookOpen, AlertTriangle, Loader2,
  X, Check, ChevronRight, Send, Pen, Download, ChevronDown, Copy, Link2,
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'
import { useContentCreation } from '../context/ContentCreationStore'
import { useToast } from './ToastProvider'

const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

/* ─── Domain Nodes ───────────────────────────────────────────── */

const DOMAIN_NODES = [
  { id: 'financial', label: 'Financial (J-GAAP)', entries: 412, color: '#f59e0b', patterns: 89 },
  { id: 'regulatory', label: 'Regulatory (TSE)', entries: 287, color: '#8b5cf6', patterns: 64 },
  { id: 'brand', label: 'Brand Voice', entries: 198, color: '#06b6d4', patterns: 42 },
  { id: 'cultural', label: 'Cultural Adaptation', entries: 156, color: '#10b981', patterns: 38 },
  { id: 'currency', label: 'Currency Patterns', entries: 94, color: '#f43f5e', patterns: 27 },
  { id: 'legal', label: 'Legal Compliance', entries: 143, color: '#64748b', patterns: 31 },
]

const KEYWORD_MAP = {
  financial: ['earnings', 'financial', 'revenue', 'quarter', 'q1', 'q2', 'q3', 'q4', 'fiscal', 'income', 'balance', 'profit', 'loss', 'gaap', 'ifrs'],
  regulatory: ['compliance', 'regulatory', 'filing', 'tse', 'sec', 'disclosure', 'regulation', 'audit'],
  brand: ['brand', 'voice', 'tone', 'messaging', 'communication'],
  cultural: ['cultural', 'adaptation', 'local', 'market', 'audience', 'regional'],
  currency: ['currency', 'yen', 'euro', 'dollar', 'conversion', 'denomination'],
  legal: ['legal', 'contract', 'agreement', 'liability', 'clause', 'policy', 'terms'],
}

const CONTENT_TYPES = [
  { id: 'report', label: 'Report' },
  { id: 'memo', label: 'Memo' },
  { id: 'brief', label: 'Brief' },
  { id: 'disclosure', label: 'Disclosure' },
  { id: 'email', label: 'Email' },
  { id: 'custom', label: 'Custom' },
]

const ALL_LOCALES = [
  { code: 'ja', label: 'Japanese' }, { code: 'de', label: 'German' }, { code: 'zh', label: 'Chinese' },
  { code: 'fr', label: 'French' }, { code: 'es', label: 'Spanish' }, { code: 'ko', label: 'Korean' },
]

/* ─── Mock Generated Content ─────────────────────────────────── */

const MOCK_CONTENT = {
  financial: {
    en: {
      title: 'Q4 2025 Earnings Disclosure Summary',
      sections: [
        { heading: 'Executive Summary', body: 'Meridian Capital reports consolidated revenue of \u00a534.2 billion for the quarter ended December 31, 2025, representing a 12.3% increase year-over-year. Operating income reached \u00a58.7 billion, driven primarily by strong performance in the M&A advisory and wealth management divisions. The Board of Directors has approved a quarterly dividend of \u00a545 per share.' },
        { heading: 'Financial Highlights', body: 'Total assets under management grew to \u00a52.8 trillion, a 15.4% increase from the prior year period. Net interest income was \u00a512.1 billion, while fee-based income contributed \u00a518.6 billion. The cost-to-income ratio improved to 62.3% from 65.8% in the prior year quarter, reflecting continued operational efficiency gains.' },
        { heading: 'Regulatory Compliance Note', body: 'This disclosure has been prepared in accordance with J-GAAP standards and TSE listing requirements. All financial figures have been converted using the prescribed ASBJ methodology. Currency denominations follow TSE formatting conventions.' },
        { heading: 'Forward-Looking Statements', body: 'This document contains forward-looking statements based on current expectations and assumptions. Actual results may differ materially due to market conditions, regulatory changes, and other factors described in our annual securities report filed with the Financial Services Agency.' },
      ],
    },
    ja: {
      title: '2025\u5E74\u7B2C4\u56DB\u534A\u671F \u6C7A\u7B97\u958B\u793A\u6982\u8981',
      sections: [
        { heading: '\u7D4C\u55B6\u6982\u6CC1', body: '\u30E1\u30EA\u30C7\u30A3\u30A2\u30F3\u30FB\u30AD\u30E3\u30D4\u30BF\u30EB\u306F\u30012025\u5E7412\u670831\u65E5\u306B\u7D42\u4E86\u3057\u305F\u56DB\u534A\u671F\u306E\u9023\u7D50\u58F2\u4E0A\u9AD8\u304C\u00A5342\u5104\u3067\u3042\u308A\u3001\u524D\u5E74\u540C\u671F\u6BD412.3%\u306E\u5897\u52A0\u3068\u306A\u308A\u307E\u3057\u305F\u3002\u55B6\u696D\u5229\u76CA\u306F\u00A587\u5104\u306B\u9054\u3057\u3001M&A\u30A2\u30C9\u30D0\u30A4\u30B6\u30EA\u30FC\u304A\u3088\u3073\u30A6\u30A7\u30EB\u30B9\u30DE\u30CD\u30B8\u30E1\u30F3\u30C8\u90E8\u9580\u306E\u597D\u8ABF\u306A\u696D\u7E3E\u304C\u4E3B\u306A\u8981\u56E0\u3067\u3059\u3002\u53D6\u7DE0\u5F79\u4F1A\u306F\u00A545\u306E\u56DB\u534A\u671F\u914D\u5F53\u3092\u627F\u8A8D\u3057\u307E\u3057\u305F\u3002' },
        { heading: '\u8CA1\u52D9\u30CF\u30A4\u30E9\u30A4\u30C8', body: '\u904B\u7528\u8CC7\u7523\u7DCF\u984D\u306F\u00A52.8\u5146\u306B\u62E1\u5927\u3057\u3001\u524D\u5E74\u540C\u671F\u6BD415.4%\u306E\u5897\u52A0\u3068\u306A\u308A\u307E\u3057\u305F\u3002\u7D14\u91D1\u5229\u53CE\u5165\u306F\u00A5121\u5104\u3001\u624B\u6570\u6599\u53CE\u5165\u306F\u00A5186\u5104\u3067\u3057\u305F\u3002\u30B3\u30B9\u30C8\u30FB\u30A4\u30F3\u30AB\u30E0\u30FB\u30EC\u30B7\u30AA\u306F65.8%\u304B\u308962.3%\u306B\u6539\u5584\u3057\u3001\u7D99\u7D9A\u7684\u306A\u696D\u52D9\u52B9\u7387\u5316\u3092\u53CD\u6620\u3057\u3066\u3044\u307E\u3059\u3002' },
        { heading: '\u898F\u5236\u9075\u5B88\u4E8B\u9805', body: '\u672C\u958B\u793A\u306F\u3001\u4F01\u696D\u4F1A\u8A08\u57FA\u6E96\uFF08J-GAAP\uFF09\u304A\u3088\u3073\u6771\u4EAC\u8A3C\u5238\u53D6\u5F15\u6240\u4E0A\u5834\u898F\u5247\u306B\u57FA\u3065\u304D\u4F5C\u6210\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u3059\u3079\u3066\u306E\u8CA1\u52D9\u6570\u5024\u306F\u3001ASBJ\u6240\u5B9A\u306E\u65B9\u6CD5\u8AD6\u306B\u5F93\u3044\u63DB\u7B97\u3055\u308C\u3066\u3044\u307E\u3059\u3002' },
        { heading: '\u5C06\u6765\u898B\u901A\u3057\u306B\u95A2\u3059\u308B\u6CE8\u8A18', body: '\u672C\u66F8\u306B\u306F\u3001\u73FE\u6642\u70B9\u306E\u4E88\u60F3\u304A\u3088\u3073\u524D\u63D0\u306B\u57FA\u3065\u304F\u5C06\u6765\u898B\u901A\u3057\u306B\u95A2\u3059\u308B\u8A18\u8FF0\u304C\u542B\u307E\u308C\u3066\u3044\u307E\u3059\u3002\u5B9F\u969B\u306E\u7D50\u679C\u306F\u3001\u5E02\u5834\u74B0\u5883\u3001\u898F\u5236\u5909\u66F4\u3001\u305D\u306E\u4ED6\u306E\u8981\u56E0\u306B\u3088\u308A\u5927\u304D\u304F\u7570\u306A\u308B\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002' },
      ],
    },
    de: {
      title: 'Q4 2025 Ergebnis\u00FCbersicht',
      sections: [
        { heading: 'Zusammenfassung', body: 'Meridian Capital verzeichnet einen konsolidierten Umsatz von \u00A534,2 Milliarden f\u00FCr das am 31. Dezember 2025 endende Quartal, was einem Anstieg von 12,3% gegen\u00FCber dem Vorjahr entspricht. Das Betriebsergebnis erreichte \u00A58,7 Milliarden, haupts\u00E4chlich getrieben durch die starke Leistung der M&A-Beratungs- und Verm\u00F6gensverwaltungsbereiche.' },
        { heading: 'Finanzielle Highlights', body: 'Das verwaltete Gesamtverm\u00F6gen wuchs auf \u00A52,8 Billionen, ein Anstieg von 15,4% gegen\u00FCber dem Vorjahreszeitraum. Der Nettozinsertrag betrug \u00A512,1 Milliarden, w\u00E4hrend die geb\u00FChrenbasierten Ertr\u00E4ge \u00A518,6 Milliarden beitrugen. Die Aufwand-Ertrags-Quote verbesserte sich von 65,8% auf 62,3%.' },
        { heading: 'Regulatorische Konformit\u00E4t', body: 'Diese Offenlegung wurde in \u00DCbereinstimmung mit den IFRS-Standards und den Anforderungen der lokalen Regulierungsbeh\u00F6rden erstellt. Alle Finanzzahlen wurden gem\u00E4\u00DF der vorgeschriebenen Methodik umgerechnet.' },
        { heading: 'Zukunftsgerichtete Aussagen', body: 'Dieses Dokument enth\u00E4lt zukunftsgerichtete Aussagen, die auf aktuellen Erwartungen und Annahmen basieren. Die tats\u00E4chlichen Ergebnisse k\u00F6nnen aufgrund von Marktbedingungen und regulatorischen \u00C4nderungen wesentlich abweichen.' },
      ],
    },
    zh: {
      title: '2025\u5E74\u7B2C\u56DB\u5B63\u5EA6\u4E1A\u7EE9\u62AB\u9732\u6458\u8981',
      sections: [
        { heading: '\u6267\u884C\u6458\u8981', body: 'Meridian Capital\u62A5\u544A\u622A\u81F32025\u5E7412\u670831\u65E5\u6B62\u7684\u5B63\u5EA6\u5408\u5E76\u6536\u5165\u4E3A\u00A5342\u4EBF\uFF0C\u540C\u6BD4\u589E\u957F12.3%\u3002\u8425\u4E1A\u5229\u6DA6\u8FBE\u5230\u00A587\u4EBF\uFF0C\u4E3B\u8981\u5F97\u76CA\u4E8E\u5E76\u8D2D\u54A8\u8BE2\u548C\u8D22\u5BCC\u7BA1\u7406\u90E8\u95E8\u7684\u5F3A\u52B2\u8868\u73B0\u3002\u8463\u4E8B\u4F1A\u5DF2\u6279\u51C6\u6BCF\u80A1\u00A545\u7684\u5B63\u5EA6\u80A1\u606F\u3002' },
        { heading: '\u8D22\u52A1\u4EAE\u70B9', body: '\u7BA1\u7406\u8D44\u4EA7\u603B\u989D\u589E\u957F\u81F3\u00A52.8\u4E07\u4EBF\uFF0C\u540C\u6BD4\u589E\u957F15.4%\u3002\u51C0\u5229\u606F\u6536\u5165\u4E3A\u00A5121\u4EBF\uFF0C\u624B\u7EED\u8D39\u6536\u5165\u8D21\u732E\u4E86\u00A5186\u4EBF\u3002\u6210\u672C\u6536\u5165\u6BD4\u4ECE65.8%\u6539\u5584\u81F362.3%\uFF0C\u53CD\u6620\u4E86\u6301\u7EED\u7684\u8FD0\u8425\u6548\u7387\u63D0\u5347\u3002' },
        { heading: '\u76D1\u7BA1\u5408\u89C4\u8BF4\u660E', body: '\u672C\u62AB\u9732\u6587\u4EF6\u6839\u636E\u4E2D\u56FD\u4F1A\u8BA1\u51C6\u5219\u548C\u76F8\u5173\u76D1\u7BA1\u8981\u6C42\u7F16\u5236\u3002\u6240\u6709\u8D22\u52A1\u6570\u636E\u5747\u6309\u7167\u89C4\u5B9A\u7684\u65B9\u6CD5\u8FDB\u884C\u4E86\u6362\u7B97\u3002' },
        { heading: '\u524D\u77BB\u6027\u58F0\u660E', body: '\u672C\u6587\u4EF6\u5305\u542B\u57FA\u4E8E\u5F53\u524D\u9884\u671F\u548C\u5047\u8BBE\u7684\u524D\u77BB\u6027\u58F0\u660E\u3002\u5B9E\u9645\u7ED3\u679C\u53EF\u80FD\u56E0\u5E02\u573A\u6761\u4EF6\u3001\u76D1\u7BA1\u53D8\u5316\u548C\u5176\u4ED6\u56E0\u7D20\u800C\u5B58\u5728\u91CD\u5927\u5DEE\u5F02\u3002' },
      ],
    },
  },
  general: {
    en: {
      title: 'Internal Policy Update Memorandum',
      sections: [
        { heading: 'Purpose', body: 'This memorandum outlines key updates to Meridian Capital\'s operational policies effective Q1 2026. These changes reflect evolving regulatory requirements across our Japan, Germany, and New Zealand operations.' },
        { heading: 'Key Changes', body: 'Effective immediately, all client-facing documentation must undergo compliance verification before distribution. The quality threshold has been raised from 85% to 90% for regulatory filings. New cultural adaptation guidelines have been implemented for the APAC region.' },
        { heading: 'Implementation Timeline', body: 'Phase 1 (January): Updated compliance templates deployed. Phase 2 (February): Training sessions for regional leads. Phase 3 (March): Full enforcement across all divisions.' },
      ],
    },
    ja: {
      title: '\u793E\u5185\u30DD\u30EA\u30B7\u30FC\u66F4\u65B0\u306B\u95A2\u3059\u308B\u89DA\u66F8',
      sections: [
        { heading: '\u76EE\u7684', body: '\u672C\u89DA\u66F8\u306F\u30012026\u5E74\u7B2C1\u56DB\u534A\u671F\u304B\u3089\u9069\u7528\u3055\u308C\u308B\u30E1\u30EA\u30C7\u30A3\u30A2\u30F3\u30FB\u30AD\u30E3\u30D4\u30BF\u30EB\u306E\u904B\u55B6\u30DD\u30EA\u30B7\u30FC\u306E\u4E3B\u8981\u306A\u66F4\u65B0\u4E8B\u9805\u3092\u8AAC\u660E\u3057\u307E\u3059\u3002\u3053\u308C\u3089\u306E\u5909\u66F4\u306F\u3001\u65E5\u672C\u3001\u30C9\u30A4\u30C4\u3001\u30CB\u30E5\u30FC\u30B8\u30FC\u30E9\u30F3\u30C9\u306B\u304A\u3051\u308B\u898F\u5236\u8981\u4EF6\u306E\u5909\u5316\u3092\u53CD\u6620\u3057\u3066\u3044\u307E\u3059\u3002' },
        { heading: '\u4E3B\u8981\u306A\u5909\u66F4\u70B9', body: '\u5373\u6642\u767A\u52B9\uFF1A\u3059\u3079\u3066\u306E\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u5411\u3051\u6587\u66F8\u306F\u3001\u914D\u5E03\u524D\u306B\u30B3\u30F3\u30D7\u30E9\u30A4\u30A2\u30F3\u30B9\u691C\u8A3C\u3092\u53D7\u3051\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002\u898F\u5236\u5F53\u5C40\u3078\u306E\u63D0\u51FA\u66F8\u985E\u306E\u54C1\u8CEA\u95BE\u5024\u306F85%\u304B\u309090%\u306B\u5F15\u304D\u4E0A\u3052\u3089\u308C\u307E\u3057\u305F\u3002' },
        { heading: '\u5B9F\u65BD\u30B9\u30B1\u30B8\u30E5\u30FC\u30EB', body: '\u30D5\u30A7\u30FC\u30BA1\uFF081\u6708\uFF09\uFF1A\u66F4\u65B0\u3055\u308C\u305F\u30B3\u30F3\u30D7\u30E9\u30A4\u30A2\u30F3\u30B9\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u306E\u5C55\u958B\u3002\u30D5\u30A7\u30FC\u30BA2\uFF082\u6708\uFF09\uFF1A\u5730\u57DF\u30EA\u30FC\u30C0\u30FC\u5411\u3051\u30C8\u30EC\u30FC\u30CB\u30F3\u30B0\u3002\u30D5\u30A7\u30FC\u30BA3\uFF083\u6708\uFF09\uFF1A\u5168\u90E8\u9580\u3067\u306E\u5B8C\u5168\u65BD\u884C\u3002' },
      ],
    },
    de: {
      title: 'Interne Richtlinienaktualisierung \u2014 Memorandum',
      sections: [
        { heading: 'Zweck', body: 'Dieses Memorandum beschreibt die wichtigsten Aktualisierungen der Betriebsrichtlinien von Meridian Capital, die ab Q1 2026 gelten. Diese \u00C4nderungen spiegeln die sich entwickelnden regulatorischen Anforderungen in unseren Niederlassungen in Japan, Deutschland und Neuseeland wider.' },
        { heading: 'Wesentliche \u00C4nderungen', body: 'Mit sofortiger Wirkung: Alle kundenorientierten Dokumente m\u00FCssen vor der Verteilung eine Compliance-Pr\u00FCfung durchlaufen. Der Qualit\u00E4tsschwellenwert f\u00FCr regulatorische Einreichungen wurde von 85% auf 90% angehoben.' },
        { heading: 'Umsetzungszeitplan', body: 'Phase 1 (Januar): Aktualisierte Compliance-Vorlagen bereitgestellt. Phase 2 (Februar): Schulungen f\u00FCr regionale Leiter. Phase 3 (M\u00E4rz): Vollst\u00E4ndige Durchsetzung in allen Abteilungen.' },
      ],
    },
    zh: {
      title: '\u5185\u90E8\u653F\u7B56\u66F4\u65B0\u5907\u5FD8\u5F55',
      sections: [
        { heading: '\u76EE\u7684', body: '\u672C\u5907\u5FD8\u5F55\u6982\u8FF0\u4E86Meridian Capital\u81EA2026\u5E74\u7B2C\u4E00\u5B63\u5EA6\u8D77\u751F\u6548\u7684\u8FD0\u8425\u653F\u7B56\u4E3B\u8981\u66F4\u65B0\u3002\u8FD9\u4E9B\u53D8\u66F4\u53CD\u6620\u4E86\u6211\u4EEC\u5728\u65E5\u672C\u3001\u5FB7\u56FD\u548C\u65B0\u897F\u5170\u4E1A\u52A1\u4E2D\u4E0D\u65AD\u53D8\u5316\u7684\u76D1\u7BA1\u8981\u6C42\u3002' },
        { heading: '\u4E3B\u8981\u53D8\u66F4', body: '\u7ACB\u5373\u751F\u6548\uFF1A\u6240\u6709\u9762\u5411\u5BA2\u6237\u7684\u6587\u6863\u5FC5\u987B\u5728\u5206\u53D1\u524D\u8FDB\u884C\u5408\u89C4\u9A8C\u8BC1\u3002\u76D1\u7BA1\u6587\u4EF6\u7684\u8D28\u91CF\u9608\u503C\u5DF2\u4ECE85%\u63D0\u9AD8\u523090%\u3002' },
        { heading: '\u5B9E\u65BD\u65F6\u95F4\u8868', body: '\u7B2C\u4E00\u9636\u6BB5\uFF081\u6708\uFF09\uFF1A\u90E8\u7F72\u66F4\u65B0\u7684\u5408\u89C4\u6A21\u677F\u3002\u7B2C\u4E8C\u9636\u6BB5\uFF082\u6708\uFF09\uFF1A\u5730\u533A\u8D1F\u8D23\u4EBA\u57F9\u8BAD\u3002\u7B2C\u4E09\u9636\u6BB5\uFF083\u6708\uFF09\uFF1A\u5168\u90E8\u95E8\u5B8C\u5168\u6267\u884C\u3002' },
      ],
    },
  },
}

/* ─── ScoreRing (reused pattern) ─────────────────────────────── */

function ScoreRing({ score, size = 80, strokeWidth = 6, prefersReducedMotion = false }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = score >= 85 ? '#34d399' : score >= 70 ? '#fbbf24' : '#f87171'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={strokeWidth} />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: prefersReducedMotion ? 0 : 1.2, type: 'spring', stiffness: 80, damping: 15 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-bold text-gray-900" style={{ fontSize: size > 60 ? '1.5rem' : '1rem' }}>{score}</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 1: PROMPT STUDIO
   ═══════════════════════════════════════════════════════════════ */

function PromptStudio({ onGenerate, prefersReduced }) {
  const [promptText, setPromptText] = useState('')
  const [activeNodes, setActiveNodes] = useState(new Set(['brand']))
  const [selectedType, setSelectedType] = useState('report')
  const [locales, setLocales] = useState(['ja', 'de', 'zh'])
  const debounceRef = useRef(null)

  // Auto-suggest nodes from prompt keywords
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const lower = promptText.toLowerCase()
      const matched = new Set(['brand']) // always include brand voice
      for (const [nodeId, keywords] of Object.entries(KEYWORD_MAP)) {
        if (keywords.some(k => lower.includes(k))) matched.add(nodeId)
      }
      setActiveNodes(matched)
      // Auto-detect content type
      if (lower.includes('memo') || lower.includes('memorandum')) setSelectedType('memo')
      else if (lower.includes('brief')) setSelectedType('brief')
      else if (lower.includes('disclosure') || lower.includes('filing')) setSelectedType('disclosure')
      else if (lower.includes('email')) setSelectedType('email')
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [promptText])

  const toggleNode = (id) => setActiveNodes(prev => {
    const next = new Set(prev)
    if (next.has(id) && id !== 'brand') next.delete(id)
    else next.add(id)
    return next
  })

  const creditEstimate = activeNodes.size * 7 + locales.length * 3
  const timeEstimate = Math.max(2, Math.round(activeNodes.size * 0.8 + locales.length * 0.5))

  const nodeReasons = {
    financial: 'Your prompt maps to 412 J-GAAP entries',
    regulatory: 'Regulatory context detected \u2014 287 TSE entries available',
    brand: 'Applied to all generated content for voice consistency',
    cultural: 'Cultural adaptation needed for target markets',
    currency: 'Currency formatting rules activated',
    legal: 'Legal compliance terms detected',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Stat pills */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {[
          { value: '1,247', label: 'entries available' },
          { value: '342', label: 'patterns' },
          { value: '6', label: 'domains' },
        ].map(s => (
          <span key={s.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.03] border border-black/[0.12] text-[11px]">
            <span className="font-mono font-bold text-gray-900">{s.value}</span>
            <span className="text-gray-500 font-medium">{s.label}</span>
          </span>
        ))}
      </div>

      {/* Prompt input */}
      <div className="rounded-xl border border-black/[0.12] bg-white overflow-hidden">
        <textarea
          value={promptText}
          onChange={e => setPromptText(e.target.value)}
          placeholder="Describe what you want to create...&#10;&#10;e.g. &quot;Write a Q4 earnings disclosure summary for TSE filing in Japanese and German&quot;"
          rows={4}
          className="w-full px-5 pt-5 pb-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none resize-none leading-relaxed"
        />

        {/* Auto-suggested nodes */}
        <div className="px-5 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Cortex intelligence</p>
          <div className="flex flex-wrap gap-2">
            {DOMAIN_NODES.map(node => {
              const isActive = activeNodes.has(node.id)
              return (
                <button key={node.id} type="button" onClick={() => toggleNode(node.id)}
                  className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 border border-blue-200 text-blue-700'
                      : 'bg-gray-50 border border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {isActive ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current opacity-40" />}
                  {node.label}
                  <span className="opacity-60">&middot; {node.entries}</span>
                </button>
              )
            })}
          </div>
          {/* Reason for top suggested node */}
          {promptText.length > 5 && (
            <div className="mt-2 space-y-0.5">
              {[...activeNodes].filter(id => id !== 'brand').slice(0, 2).map(id => (
                <p key={id} className="text-[10px] text-blue-600 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> {nodeReasons[id] || `${DOMAIN_NODES.find(n => n.id === id)?.label} activated`}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content type + Locale + Tone */}
      <div className="grid grid-cols-[1fr_auto] gap-4">
        {/* Content type pills */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Content type</p>
          <div className="flex flex-wrap gap-1">
            {CONTENT_TYPES.map(ct => (
              <button key={ct.id} type="button" onClick={() => setSelectedType(ct.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  selectedType === ct.id ? 'bg-[#3D16FA]/10 border border-[#3D16FA]/30 text-[#3D16FA]' : 'border border-black/[0.06] text-gray-500 hover:bg-gray-50'
                }`}>
                {ct.label}
              </button>
            ))}
          </div>
        </div>
        {/* Locales + Tone */}
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Markets &middot; Tone</p>
          <div className="flex items-center gap-1.5 justify-end">
            {locales.map(code => (
              <span key={code} className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-medium">
                {code.toUpperCase()}
              </span>
            ))}
            <span className="text-[10px] text-gray-400">&middot; Formal</span>
          </div>
        </div>
      </div>

      {/* Credit estimate + Generate */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-gray-400">
          ~{creditEstimate} credits &middot; ~{timeEstimate} minutes
        </p>
        <button
          type="button"
          onClick={() => onGenerate({ promptText, activeNodes: [...activeNodes], selectedType, locales })}
          disabled={promptText.length < 10}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3D16FA] hover:bg-[#0089c4] text-white text-[14px] font-semibold shadow-sm shadow-[#3D16FA]/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" /> Generate
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 2: INTELLIGENCE ASSEMBLY
   ═══════════════════════════════════════════════════════════════ */

function IntelligenceAssembly({ config, onComplete, prefersReduced }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), prefersReduced ? 500 : 3000)
    return () => clearTimeout(timer)
  }, [onComplete, prefersReduced])

  const nodes = DOMAIN_NODES.filter(n => config.activeNodes.includes(n.id))
  const totalEntries = nodes.reduce((s, n) => s + n.entries, 0)

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white border border-black/[0.12] rounded-xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-black/[0.06]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Assembling intelligence</p>
          <p className="text-[15px] font-semibold text-gray-900">{config.selectedType === 'report' ? 'Report' : config.selectedType === 'disclosure' ? 'Disclosure' : 'Document'} Generation</p>
          <p className="text-[12px] text-gray-500 mt-0.5">{config.locales.map(l => l.toUpperCase()).join(', ')} &middot; Formal tone &middot; {nodes.length} domains activated</p>
        </div>

        <div className="px-6 py-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Loading domain intelligence</p>
          {nodes.map((node, i) => (
            <motion.div key={node.id}
              initial={prefersReduced ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={prefersReduced ? { duration: 0 } : { delay: i * 0.4 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-black/[0.06]"
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: node.color + '15' }}>
                <Brain className="w-3.5 h-3.5" style={{ color: node.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-gray-800">{node.label}</p>
                <p className="text-[10px] text-gray-400">{node.entries} entries &middot; {node.patterns} patterns loaded</p>
              </div>
              <motion.div
                initial={prefersReduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: prefersReduced ? 0 : i * 0.4 + 0.8 }}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </motion.div>
            </motion.div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-black/[0.06] bg-gray-50/60">
          <div className="space-y-1 text-[11px] text-gray-500">
            <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {totalEntries} knowledge entries loaded across {nodes.length} domains</p>
            <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> Brand voice guardrails active</p>
            <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> Compliance validation will run post-generation</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 3: GENERATION
   ═══════════════════════════════════════════════════════════════ */

function GenerationProgress({ config, onComplete, prefersReduced }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (prefersReduced) { setProgress(100); onComplete(); return }
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(100, prev + (100 / 80) * (0.8 + Math.random() * 0.4))
        if (next >= 100) { clearInterval(interval); setTimeout(() => onComplete(), 600) }
        return next
      })
    }, 100)
    return () => clearInterval(interval)
  }, [onComplete, prefersReduced])

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white border border-black/[0.12] rounded-xl p-8 flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-xl bg-[#3D16FA]/10 flex items-center justify-center">
          <Pen className="w-6 h-6 text-[#3D16FA]" />
        </div>
        <div className="text-center">
          <p className="text-[16px] font-semibold text-gray-900 mb-1">Generating content</p>
          <p className="text-[13px] text-gray-500">Applying {config.activeNodes.length} intelligence domains across {config.locales.length} markets</p>
        </div>
        <div className="w-full max-w-sm">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-[#3D16FA] to-[#34d399] rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <p className="text-[11px] text-gray-400 text-center mt-2 tabular-nums">{Math.round(progress)}% complete</p>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 4: REVIEW & REFINE
   ═══════════════════════════════════════════════════════════════ */

const LOCALE_LABELS = { en: 'English', ja: '\u65E5\u672C\u8A9E', de: 'Deutsch', zh: '\u4E2D\u6587', fr: 'Fran\u00E7ais', es: 'Espa\u00F1ol', ko: '\uD55C\uAD6D\uC5B4' }

function ReviewRefine({ config, onAccept, onBack, prefersReduced }) {
  const [activeTab, setActiveTab] = useState('content')
  const [contentLocale, setContentLocale] = useState('en')
  const [showRefine, setShowRefine] = useState(false)
  const [refineText, setRefineText] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [refinementCount, setRefinementCount] = useState(0)
  const { addToast } = useToast()
  const exportRef = useRef(null)

  const hasFinancial = config.activeNodes.includes('financial')
  const contentSet = hasFinancial ? MOCK_CONTENT.financial : MOCK_CONTENT.general
  const content = contentSet[contentLocale] || contentSet.en
  const availableLocales = ['en', ...config.locales.filter(l => contentSet[l])]
  const activeNodeDetails = DOMAIN_NODES.filter(n => config.activeNodes.includes(n.id))
  const totalEntries = activeNodeDetails.reduce((s, n) => s + n.entries, 0)
  const totalPatterns = activeNodeDetails.reduce((s, n) => s + n.patterns, 0)
  const creditsCost = config.activeNodes.length * 7 + config.locales.length * 3

  const tabs = [
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'sources', label: 'Sources', icon: BookOpen },
    { id: 'compliance', label: 'Compliance', icon: Shield, badge: 1 },
  ]

  return (
    <div className="space-y-5">
      {/* Completion header */}
      <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Content Generated</h1>
          <p className="text-[14px] text-gray-500">
            {content.title} &middot; {config.locales.map(l => l.toUpperCase()).join(' \u00b7 ')} &middot; {creditsCost} credits
          </p>
        </div>
      </div>

      {/* Score + metadata */}
      <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-6">
        <div className="flex items-center gap-6">
          <ScoreRing score={93} size={72} strokeWidth={6} prefersReducedMotion={prefersReduced} />
          <div className="flex-1">
            <h2 className="text-[17px] font-semibold text-gray-900 mb-1">93% Confidence Score</h2>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Generated from {totalEntries} knowledge entries across {config.activeNodes.length} domains. {totalPatterns} patterns applied. Brand voice and regulatory compliance verified.
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-black/[0.12]">
        <div className="flex gap-6 px-2">
          {tabs.map(tab => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 pb-3 text-[13px] font-medium transition-colors cursor-pointer ${
                  isActive ? 'text-gray-900 border-b-2 border-straker-500' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.badge && (
                  <span className={`ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${isActive ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'content' && (
        <div className="grid grid-cols-[1fr_280px] gap-5">
          {/* Generated content */}
          <div className="rounded-xl border border-black/[0.08] bg-white overflow-hidden">
            {/* Locale tabs */}
            <div className="flex items-center border-b border-black/[0.06] px-4 pt-3">
              {availableLocales.map(loc => (
                <button key={loc} type="button" onClick={() => setContentLocale(loc)}
                  className={`px-3 pb-2.5 text-[12px] font-medium border-b-2 transition-colors cursor-pointer -mb-px ${
                    contentLocale === loc
                      ? 'border-[#3D16FA] text-[#3D16FA]'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}>
                  {loc === 'en' ? 'EN (Source)' : `${loc.toUpperCase()} \u00b7 ${LOCALE_LABELS[loc] || loc}`}
                </button>
              ))}
            </div>
            <div className="p-6 space-y-5">
            <h2 className={`text-[18px] font-bold text-gray-900 ${contentLocale === 'ja' || contentLocale === 'zh' ? '' : ''}`}>{content.title}</h2>
            {content.sections.map((section, i) => (
              <div key={i}>
                <h3 className="text-[14px] font-semibold text-gray-800 mb-2">{section.heading}</h3>
                <p className={`text-[13px] text-gray-600 leading-relaxed ${contentLocale === 'ja' || contentLocale === 'zh' ? 'tracking-wide' : ''}`}>{section.body}</p>
              </div>
            ))}
            </div>
          </div>
          {/* Sources sidebar */}
          <div className="rounded-xl border border-black/[0.08] bg-gray-50 p-4 self-start sticky top-36">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Intelligence sources used</p>
            <div className="space-y-2.5">
              {activeNodeDetails.map(node => (
                <div key={node.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
                  <div>
                    <p className="text-[11px] font-medium text-gray-700">{node.label}</p>
                    <p className="text-[10px] text-gray-400">{node.entries} entries &middot; {node.patterns} patterns</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] space-y-1 text-[10px] text-gray-400">
              <p>{totalEntries} total entries referenced</p>
              <p>{totalPatterns} patterns applied</p>
              <p>5 guardrails enforced</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="space-y-3">
          {activeNodeDetails.map(node => (
            <div key={node.id} className="rounded-xl border border-black/[0.08] bg-white p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: node.color + '15' }}>
                <Brain className="w-5 h-5" style={{ color: node.color }} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-gray-800">{node.label}</p>
                <p className="text-[11px] text-gray-500">{node.entries} entries &middot; {node.patterns} patterns &middot; v3.2</p>
              </div>
              <span className="text-[11px] font-medium text-emerald-600">Active</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-3">
          {[
            { label: 'J-GAAP terminology compliance', status: 'passed', detail: 'All financial terms match ASBJ prescribed terminology' },
            { label: 'Brand voice alignment', status: 'passed', detail: 'Tone and register consistent with Meridian Capital voice policy' },
            { label: 'Currency formatting', status: 'flag', detail: 'Minor: Section 2 uses mixed denomination formats (\u00a5 and JPY). Recommend standardizing to \u00a5 for TSE filing.' },
          ].map((item, i) => (
            <div key={i} className={`rounded-xl border p-4 ${item.status === 'passed' ? 'border-emerald-200/60 bg-emerald-50/30' : 'border-amber-200/60 bg-amber-50/30'}`}>
              <div className="flex items-center gap-2 mb-1">
                {item.status === 'passed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                <p className={`text-[13px] font-semibold ${item.status === 'passed' ? 'text-emerald-800' : 'text-amber-800'}`}>{item.label}</p>
              </div>
              <p className="text-[12px] text-gray-600 ml-6">{item.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Feedback bar */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setFeedback('up')}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${feedback === 'up' ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-gray-100 text-gray-400'}`}>
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setFeedback('down')}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${feedback === 'down' ? 'bg-red-50 text-red-500' : 'hover:bg-gray-100 text-gray-400'}`}>
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
        <button type="button" onClick={() => setShowRefine(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/[0.08] text-gray-600 text-[12px] font-medium hover:bg-gray-50 cursor-pointer transition-colors">
          <RefreshCw className="w-3 h-3" /> Refine
        </button>

        {/* Export dropdown */}
        <div className="relative" ref={exportRef}>
          <button type="button" onClick={() => setShowExport(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/[0.08] text-gray-600 text-[12px] font-medium hover:bg-gray-50 cursor-pointer transition-colors">
            <Download className="w-3 h-3" /> Export{contentLocale !== 'en' ? ` (${contentLocale.toUpperCase()})` : ''}
          </button>
          <AnimatePresence>
            {showExport && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-black/[0.12] rounded-xl shadow-lg overflow-hidden z-20">
                {[
                  { id: 'docx', icon: FileText, label: 'Export as .docx', sub: 'Word document', action: true },
                  { id: 'pdf', icon: FileText, label: 'Export as .pdf', sub: 'PDF document', action: true },
                  { id: 'clipboard', icon: Copy, label: 'Copy to clipboard', sub: 'Plain text', action: true },
                ].map(opt => (
                  <button key={opt.id} type="button" onClick={() => {
                    const localeLabel = contentLocale !== 'en' ? ` ${contentLocale.toUpperCase()} version` : ''
                    addToast(`Exported${localeLabel} as .${opt.id === 'clipboard' ? 'txt (copied)' : opt.id}`, 'success', 3000)
                    setShowExport(false)
                  }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 cursor-pointer transition-colors">
                    <opt.icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <div><p className="text-[12px] text-gray-800">{opt.label}</p><p className="text-[10px] text-gray-400">{opt.sub}</p></div>
                  </button>
                ))}
                <div className="border-t border-black/[0.06] my-0.5" />
                {[
                  { id: 'slack', label: 'Send to Slack', sub: 'Via integration' },
                  { id: 'gdrive', label: 'Send to Google Drive', sub: 'Via integration' },
                ].map(opt => (
                  <button key={opt.id} type="button" onClick={() => { addToast('Integration coming soon \u2014 connect in Settings', 'info', 3000); setShowExport(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 cursor-pointer transition-colors">
                    <Link2 className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <div className="flex-1"><p className="text-[12px] text-gray-500">{opt.label}</p><p className="text-[10px] text-gray-400">{opt.sub}</p></div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 font-medium">Soon</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1" />
        <button type="button" onClick={() => onAccept(feedback, refinementCount)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3D16FA] hover:bg-[#0089c4] text-white text-[13px] font-semibold cursor-pointer transition-colors">
          <CheckCircle2 className="w-4 h-4" /> Accept &amp; Save
        </button>
      </div>

      {/* Refine input */}
      <AnimatePresence>
        {showRefine && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex gap-2">
              <input type="text" value={refineText} onChange={e => setRefineText(e.target.value)}
                placeholder="e.g. Make the tone less formal, add more detail about regulatory changes..."
                className="flex-1 rounded-lg border border-black/[0.08] bg-white px-3 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#3D16FA] transition" />
              <button type="button" onClick={() => { setRefinementCount(c => c + 1); setShowRefine(false); setRefineText('') }}
                className="px-4 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-[12px] font-semibold cursor-pointer transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function ContentCreator({ onBack }) {
  const prefersReduced = useReducedMotion()
  const [step, setStep] = useState('prompt')
  const [config, setConfig] = useState(null)
  const { saveContent, addLearningEvent, setActiveSession, clearActiveSession } = useContentCreation()
  const { addToast } = useToast()

  const handleGenerate = useCallback((cfg) => {
    setConfig(cfg)
    setStep('assembly')
  }, [])

  const handleAssemblyComplete = useCallback(() => setStep('generation'), [])
  const handleGenerationComplete = useCallback(() => {
    setStep('review')
    // Set active session for Sage context-awareness
    if (config) {
      const activeNodeDetails = DOMAIN_NODES.filter(n => config.activeNodes.includes(n.id))
      const hasFinancial = config.activeNodes.includes('financial')
      const contentData = hasFinancial ? MOCK_CONTENT.financial : MOCK_CONTENT.general
      setActiveSession({
        step: 'review',
        contentTitle: contentData.en.title,
        entriesUsed: activeNodeDetails.reduce((s, n) => s + n.entries, 0),
        domainsUsed: activeNodeDetails.map(n => n.label),
        confidenceScore: 93,
        complianceNoteCount: 1,
      })
    }
  }, [config, setActiveSession])

  const handleAccept = useCallback((feedback, refinementCount) => {
    if (!config) return
    const activeNodeDetails = DOMAIN_NODES.filter(n => config.activeNodes.includes(n.id))
    const hasFinancial = config.activeNodes.includes('financial')
    const contentData = hasFinancial ? MOCK_CONTENT.financial : MOCK_CONTENT.general
    const creditsCost = config.activeNodes.length * 7 + config.locales.length * 3

    // Save to content library
    saveContent({
      title: contentData.en.title,
      contentType: config.selectedType,
      content: contentData,
      activatedNodes: activeNodeDetails.map(n => ({ name: n.label, entries: n.entries, patterns: n.patterns })),
      locales: config.locales,
      confidenceScore: 93,
      complianceFlags: [
        { name: 'J-GAAP terminology', status: 'pass', detail: 'All terms match ASBJ' },
        { name: 'Brand voice alignment', status: 'pass', detail: 'Consistent with policy' },
        { name: 'Currency formatting', status: 'warning', detail: 'Minor mixed denomination' },
      ],
      creditsUsed: creditsCost,
      feedbackSignal: feedback || null,
      refinementCount: refinementCount || 0,
    })

    // Add learning event
    const domains = activeNodeDetails.map(n => n.label).join(', ')
    const typeName = config.selectedType.charAt(0).toUpperCase() + config.selectedType.slice(1)
    let eventDesc = `${typeName} generated using ${domains} (accepted)`
    if (refinementCount > 0) eventDesc = `${typeName} generated using ${domains} (accepted, ${refinementCount} refinement${refinementCount > 1 ? 's' : ''})`
    if (feedback === 'up') eventDesc += ' \u2014 positive signal captured'
    if (feedback === 'down') eventDesc += ' \u2014 improvement signal captured'
    addLearningEvent(eventDesc, '#06b6d4', 'creation')

    // Clear session + toast + navigate
    clearActiveSession()
    addToast(`Content saved to library \u00b7 ${creditsCost} credits used`, 'success')
    onBack?.()
  }, [config, saveContent, addLearningEvent, clearActiveSession, addToast, onBack])

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.4 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={onBack} className="p-1.5 rounded-lg hover:bg-black/[0.06] transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#3D16FA]" />
          <h1 className="text-[20px] font-semibold text-gray-900">Create with Cortex</h1>
        </div>
        {step !== 'prompt' && (
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400">
            {['assembly', 'generation', 'review'].map((s, i) => (
              <span key={s} className={`flex items-center gap-1 ${step === s ? 'text-[#3D16FA] font-semibold' : ['assembly', 'generation', 'review'].indexOf(step) > i ? 'text-emerald-600' : ''}`}>
                {i > 0 && <span className="text-gray-200 mx-0.5">/</span>}
                {['assembly', 'generation', 'review'].indexOf(step) > i ? '\u2713' : ['Assembly', 'Generation', 'Review'][i]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Phase content */}
      <AnimatePresence mode="wait">
        {step === 'prompt' && (
          <motion.div key="prompt" initial={prefersReduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PromptStudio onGenerate={handleGenerate} prefersReduced={prefersReduced} />
          </motion.div>
        )}
        {step === 'assembly' && config && (
          <motion.div key="assembly" initial={prefersReduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IntelligenceAssembly config={config} onComplete={handleAssemblyComplete} prefersReduced={prefersReduced} />
          </motion.div>
        )}
        {step === 'generation' && config && (
          <motion.div key="generation" initial={prefersReduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GenerationProgress config={config} onComplete={handleGenerationComplete} prefersReduced={prefersReduced} />
          </motion.div>
        )}
        {step === 'review' && config && (
          <motion.div key="review" initial={prefersReduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ReviewRefine config={config} onAccept={handleAccept} onBack={onBack} prefersReduced={prefersReduced} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
