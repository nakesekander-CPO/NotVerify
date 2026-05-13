import { useState, useCallback, useMemo, useEffect } from 'react'
import Header from './components/Header'
import OnboardingFlow from './components/OnboardingFlow'
import CommandSurface from './components/CommandSurface'
import CommandUpload from './components/CommandUpload'
import MissionControl from './components/MissionControl'
import AgentWarRoom from './components/AgentWarRoom'
import AgentMarketplace from './components/AgentMarketplace'
import IntelligenceMarketplace from './components/IntelligenceMarketplace'
import Settings from './components/Settings'
import CustomAgentStudio from './components/CustomAgentStudio'
import LiveTelemetry from './components/LiveTelemetry'
import QualityNarrative from './components/QualityNarrative'
import AgentArbitration from './components/AgentArbitration'
import ColdStartDashboard from './components/ColdStartDashboard'
import TeamDirectory from './components/TeamDirectory'
import HITLVendorWorkflow from './components/HITLVendorWorkflow'
import HumanReview from './components/HumanReview'
import OrgBrain from './components/OrgBrain'
import AgentProfile from './components/AgentProfile'
import IntelligenceAssistant from './components/IntelligenceAssistant'
import IntegrationsHub from './components/Integrations'
import AgentAssemblyTransition from './components/AgentAssemblyTransition'
import TimeJumpTransition from './components/TimeJumpTransition'
import MobileBlocker from './components/MobileBlocker'
import GlobalNav from './components/GlobalNav'
import ProjectProgress from './components/ProjectProgress'
import Footer from './components/Footer'
import ParametersDrawer from './components/ParametersDrawer'
import CampaignHub from './components/CampaignHub'
import OperationsControlRoom from './components/OperationsControlRoom'
import CampaignResultsView from './components/CampaignResultsView'
import ContentCreator from './components/ContentCreator'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import GovernanceAudit from './components/GovernanceAudit'
import useMediaQuery from './hooks/useMediaQuery'
import useQualityCalculator from './hooks/useQualityCalculator'
import { generateOrgIntelligence } from './data/orgIntelligence'
import { generateDiscoveryStream } from './data/discoveryFindings'
import { generateQualityNarrative } from './data/qualityNarrative'

export default function App() {
  const isMobile = useMediaQuery('(max-width: 767px), (max-width: 1024px) and (max-height: 500px)')

  // Organizational intelligence (simulated — loaded once)
  const orgIntelligence = useMemo(() => generateOrgIntelligence(), [])

  // Core flow: onboarding → dashboard → reading → upload → processing → narrative
  const [phase, setPhase] = useState('onboarding')
  // Debug: expose phase setter for testing (remove in production)
  if (typeof window !== 'undefined') { window.__setPhase = setPhase }
  const [onboardingConfig, setOnboardingConfig] = useState(null)
  const [file, setFile] = useState(null)
  const [structuredContext, setStructuredContext] = useState({
    targetLocales: [],
    industryVertical: '',
    toneGuidelines: { enabled: false, glossaryFile: null, styleGuideUrl: '', dntTerms: '', tone: '' },
  })
  const [projectMeta, setProjectMeta] = useState({ name: '', poNumber: '', visibility: 'private' })
  const [triageData, setTriageData] = useState(null)
  const [enabledUpsells, setEnabledUpsells] = useState(new Set())
  const [discoveryFindings, setDiscoveryFindings] = useState([])
  const [showParametersDrawer, setShowParametersDrawer] = useState(false)
  const [preloadedConfig, setPreloadedConfig] = useState(null)
  const [showMarketplace, setShowMarketplace] = useState(false)
  if (typeof window !== 'undefined') { window.__setShowMarketplace = setShowMarketplace }
  const [showAgentStudio, setShowAgentStudio] = useState(false)
  const [showArbitration, setShowArbitration] = useState(false)
  const [showAgentProfile, setShowAgentProfile] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [showTeamDirectory, setShowTeamDirectory] = useState(false)
  const [showHitlWorkflow, setShowHitlWorkflow] = useState(false)
  const [teamDirectoryContext, setTeamDirectoryContext] = useState({ itemId: null, itemTitle: '' })
  const [activeAgents, setActiveAgents] = useState([])
  const [hiredMarketplaceAgents, setHiredMarketplaceAgents] = useState([])
  const [projectsCompleted, setProjectsCompleted] = useState(0) // tracks if Day 0
  const [activeCampaign, setActiveCampaign] = useState(null) // Campaign object or null
  const [qualityThreshold, setQualityThreshold] = useState(85) // org-level default
  const [humanReviewMode, setHumanReviewMode] = useState(null) // null | 'assign' | 'review'
  if (typeof window !== 'undefined') { window.__setHumanReviewMode = setHumanReviewMode }
  const [previousPhase, setPreviousPhase] = useState(null) // to return after review
  const [campaignReviewJob, setCampaignReviewJob] = useState(null) // { docId, fileName, locale, score, detectedType }
  const [campaignReviewRequest, setCampaignReviewRequest] = useState(null) // memoized reviewRequest for HumanReview
  const [connectedIntegrations, setConnectedIntegrations] = useState([])

  const handleConnectIntegration = useCallback((integration) => {
    setConnectedIntegrations(prev => {
      if (prev.some(i => i.id === integration.id)) return prev
      return [...prev, integration]
    })
  }, [])

  const handleDisconnectIntegration = useCallback((integrationId) => {
    setConnectedIntegrations(prev => prev.filter(i => i.id !== integrationId))
  }, [])

  // Campaign launch — store campaign and enter processing phase
  const handleCampaignLaunch = useCallback((campaign) => {
    setActiveCampaign(campaign)
    setPhase('processing')
  }, [])

  // Default agents for the ensemble (activated during "reading" phase)
  const defaultAgents = useMemo(() => [
    {
      id: 'JP-FIN-3', name: 'J-GAAP Specialist', version: 'v4.2', icon: 'Shield',
      confidence: 94, status: 'active', ruleBadge: 'ASBJ Rule 29 Detected',
      segmentsProcessed: 47, errorsFound: 14,
      reasoningLog: [
        { segment: 42, text: "Flagged 'Goodwill' → requires Japanese term 'のれん' per 2024 preference.", severity: 'high' },
        { segment: 18, text: "ASC 606 revenue recognition mapped to ASBJ 29.", severity: 'medium' },
        { segment: 7, text: "Currency format $4.2M converted to ¥630百万.", severity: 'low' },
      ]
    },
    {
      id: 'MER-DT-1', name: "Meridian Capital 'Digital Twin'", version: 'v2.1', icon: 'Building2',
      confidence: 97, status: 'active', glossaryMatch: 112, glossaryTotal: 1247,
      segmentsProcessed: 47, errorsFound: 3,
      reasoningLog: [
        { segment: 12, text: "Applied Meridian Capital preferred term 'revenue recognition' → '収益認識' (not '売上認識').", severity: 'medium' },
        { segment: 31, text: "Brand voice check: formal register maintained throughout fiscal summary.", severity: 'low' },
      ]
    },
    {
      id: 'BV-SENT-1', name: 'Brand Voice Sentry', version: 'v1.8', icon: 'Mic',
      confidence: 91, status: 'active', profile: 'Meridian Capital Corporate', toneScore: 96,
      segmentsProcessed: 47, errorsFound: 2,
      reasoningLog: [
        { segment: 5, text: "Tone deviation detected: 'we believe' → adjusted to formal '当社は認識しております' per corporate style.", severity: 'medium' },
      ]
    }
  ], [])

  const computedQuality = useQualityCalculator(
    triageData?.qualityScore,
    triageData?.upsellOptions || [],
    enabledUpsells
  )

  // Generate quality narrative data for the results phase
  const qualityNarrative = useMemo(() => {
    if (!triageData) return null
    return generateQualityNarrative(triageData, enabledUpsells, orgIntelligence)
  }, [triageData, enabledUpsells, orgIntelligence])

  // Screen 1 → Reading → Screen 2: File uploaded from dashboard dropzone
  const handleFileAccepted = useCallback((acceptedFile) => {
    setFile(acceptedFile)
    setActiveCampaign(null) // Single-doc flow — clear any previous campaign

    // Generate triage data
    const sc = structuredContext
    const triageResult = {
      fileName: acceptedFile.name,
      fileSize: acceptedFile.size,
      fileType: acceptedFile.type,
      classification: getClassification(acceptedFile),
      intent: getIntent(acceptedFile, sc),
      agent: getAgent(acceptedFile, sc),
      plan: getPlan(acceptedFile, sc),
      sourceIQ: getSourceIQ(acceptedFile, sc),
      qualityScore: getQualityScore(acceptedFile, sc),
      upsellOptions: getUpsellOptions(acceptedFile, sc),
      sandboxPreview: getSandboxPreview(acceptedFile, sc),
    }
    setTriageData(triageResult)

    // Generate discovery findings stream
    const findings = generateDiscoveryStream(acceptedFile, sc)
    setDiscoveryFindings(findings)

    // Go to streaming intelligence "reading" phase first
    setPhase('reading')
  }, [structuredContext])

  // Onboarding complete → transition to dashboard
  const handleOnboardingComplete = useCallback((config) => {
    setOnboardingConfig(config)
    // Pre-populate structured context from onboarding
    if (config.targetLocales?.length > 0) {
      setStructuredContext(prev => ({
        ...prev,
        targetLocales: config.targetLocales,
        industryVertical: config.industryVertical || '',
        toneGuidelines: {
          ...prev.toneGuidelines,
          tone: config.tone || '',
          styleGuideUrl: config.styleGuideUrl || '',
          dntTerms: config.dntTerms || '',
          glossaryFile: config.glossaryFile || null,
        },
      }))
    }
    setPhase('agent-assembly')
  }, [])

  // Screen 1: "Start Q3 Earnings Project" clicked — go to upload with preloaded config
  const handleStartPredicted = useCallback((prediction) => {
    // Pre-populate context from prediction
    const newContext = {
      targetLocales: prediction.locales || ['ja', 'de', 'zh'],
      industryVertical: prediction.vertical || 'Financial Services',
      toneGuidelines: { enabled: false, glossaryFile: null, styleGuideUrl: '', dntTerms: '', tone: '' },
    }
    setStructuredContext(newContext)
    setPreloadedConfig(prediction)

    // Generate simulated triage data for the predicted project
    const simulatedFile = { name: prediction.fileName || 'Q3_Earnings_Final.docx', size: 575000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    const triageResult = {
      fileName: simulatedFile.name,
      fileSize: simulatedFile.size,
      fileType: simulatedFile.type,
      classification: getClassification(simulatedFile),
      intent: getIntent(simulatedFile, newContext),
      agent: getAgent(simulatedFile, newContext),
      plan: getPlan(simulatedFile, newContext),
      sourceIQ: getSourceIQ(simulatedFile, newContext),
      qualityScore: getQualityScore(simulatedFile, newContext),
      upsellOptions: getUpsellOptions(simulatedFile, newContext),
      sandboxPreview: getSandboxPreview(simulatedFile, newContext),
    }
    setTriageData(triageResult)

    const findings = generateDiscoveryStream(simulatedFile, newContext)
    setDiscoveryFindings(findings)

    // Go through reading phase first
    setPhase('reading')
  }, [])

  // Screen 1: Re-run a recent project
  const handleRerun = useCallback((project) => {
    setStructuredContext(prev => ({
      ...prev,
      targetLocales: project.locales || [],
      industryVertical: project.industry || '',
    }))
  }, [])

  // Mission Control complete → skip upload, go directly to processing
  const handleReadingComplete = useCallback((deployConfig) => {
    // If the simulator passes back a custom agent set, use it
    if (deployConfig?.agents?.length > 0) {
      const mapped = deployConfig.agents.map(a => ({
        id: a.id, name: a.name, version: a.version || 'v1.0', icon: a.icon || 'Shield',
        confidence: a.confidence || 90, status: 'active',
        segmentsProcessed: 47, errorsFound: Math.round(a.qualityLift / 2),
        reasoningLog: [{ segment: 0, text: `${a.name} deployed via Mission Control.`, severity: 'low' }]
      }))
      setActiveAgents(mapped)
    } else {
      setActiveAgents(defaultAgents)
    }
    setPhase('processing')
  }, [defaultAgents])

  // Open marketplace
  const handleOpenMarketplace = useCallback(() => {
    setShowMarketplace(true)
  }, [])

  // Hire agent from marketplace
  const handleHireAgent = useCallback((agent) => {
    setHiredMarketplaceAgents(prev => [...prev, agent])
    setActiveAgents(prev => [...prev, {
      id: agent.id, name: agent.name, version: 'v1.0', icon: 'Star',
      confidence: Math.round((agent.scores.accuracy + agent.scores.tone) / 2),
      status: 'active', segmentsProcessed: 0, errorsFound: 0,
      reasoningLog: [{ segment: 0, text: `${agent.name} hired from marketplace and deployed to project.`, severity: 'low' }]
    }])
    setShowMarketplace(false)
  }, [])

  // Custom agent created
  const handleAgentCreated = useCallback((agent) => {
    setActiveAgents(prev => [...prev, {
      id: 'CUSTOM-1', name: agent.name || 'Meridian Capital Custom Agent', version: 'v1.0', icon: 'Building2',
      confidence: 95, status: 'active', segmentsProcessed: 0, errorsFound: 0,
      reasoningLog: [{ segment: 0, text: 'Custom agent trained on your golden records and deployed.', severity: 'low' }]
    }])
    setShowAgentStudio(false)
  }, [])

  // Screen 2 → Screen 3: Deploy
  const handleLaunch = useCallback(() => {
    setPhase('processing')
  }, [])

  // Screen 3 → Screen 4: Processing complete
  // completedJobs: array of { docId, locale, qualityScore, status } from OperationsControlRoom
  const handleProcessingComplete = useCallback((completedJobs) => {
    if (completedJobs?.length > 0) {
      setActiveCampaign(prev => {
        if (!prev) return prev;
        const jobsByDocId = completedJobs.reduce((acc, j) => {
          if (!acc[j.docId]) acc[j.docId] = [];
          acc[j.docId].push(j);
          return acc;
        }, {});
        const updatedDocs = prev.documents.map(doc => {
          const docJobs = jobsByDocId[doc.id];
          if (!docJobs) return doc;
          const localeResults = docJobs.map(j => ({
            locale: j.locale,
            qualityScore: j.qualityScore,
            status: j.status,
            segments: [],
          }));
          const overallStatus = localeResults.some(r => r.status === 'review') ? 'review' : 'complete';
          return { ...doc, localeResults, status: overallStatus };
        });
        return { ...prev, documents: updatedDocs, status: 'complete' };
      });
    }
    setPhase('narrative');
  }, [])

  // Entry Point 1: Trust score below threshold → human review assignment
  const handleComplianceRequired = useCallback(() => {
    setPreviousPhase(phase)
    setHumanReviewMode('assign')
    setPhase('human-review')
  }, [phase])

  // Entry Point 1a-self: Review Now — skip assignment, go directly to review phase
  // Create with Org Brain
  const handleCreateContent = useCallback(() => {
    setPreviousPhase(phase)
    setPhase('create')
  }, [phase])

  const handleReviewNow = useCallback(() => {
    setPreviousPhase(phase)
    setHumanReviewMode('review')
    setPhase('human-review')
  }, [phase])

  // Entry Point 1b: Campaign review — specific doc×locale job
  const handleCampaignReviewJob = useCallback((job) => {
    const locale = job.locale.toUpperCase();
    const fileName = job.fileName;
    const docType = job.detectedType || 'General';
    const mockSegments = [
      { id: `${job.docId}-seg-1`, segmentNumber: 1, flagged: false, source: `Section 1 of ${fileName}`, translation: `[${locale}] セクション 1 翻訳済み` },
      { id: `${job.docId}-seg-2`, segmentNumber: 2, flagged: false, source: `Section 2 of ${fileName} — standard content`, translation: `[${locale}] セクション 2 標準コンテンツ` },
      { id: `${job.docId}-seg-3`, segmentNumber: 3, flagged: true, severity: 'major', source: `Key ${docType.toLowerCase()} terminology requiring domain expertise for accurate localization.`, translation: `[${locale}] ドメイン専門用語の翻訳が不正確です。`, issue: `${docType} terminology mismatch — domain-specific terms require specialist review`, suggestedFix: `[${locale}] 正確なドメイン用語を使用した修正版`, flaggedBy: 'Quality Agent', agentId: 'QA-1', diffOriginal: 'terminology requiring', diffReplacement: '正確なドメイン用語' },
      { id: `${job.docId}-seg-4`, segmentNumber: 4, flagged: true, severity: 'critical', source: `Compliance-sensitive content that must meet regional regulatory standards for ${locale} market.`, translation: `[${locale}] 規制基準を満たしていないコンテンツ。`, issue: `Regional compliance standard not met for ${locale} market`, suggestedFix: `[${locale}] 地域の規制基準に準拠した翻訳`, flaggedBy: 'Compliance Monitor', agentId: 'COMP-1', diffOriginal: 'regulatory standards', diffReplacement: '規制基準に準拠' },
      { id: `${job.docId}-seg-5`, segmentNumber: 5, flagged: false, source: `Standard paragraph content from ${fileName}.`, translation: `[${locale}] 標準的な段落コンテンツ。` },
      { id: `${job.docId}-seg-6`, segmentNumber: 6, flagged: true, severity: 'minor', source: `Brand voice and cultural adaptation should reflect local conventions.`, translation: `[${locale}] ブランドボイスの文化的適応が不十分です。`, issue: 'Cultural adaptation below threshold — tone adjustment recommended', suggestedFix: `[${locale}] 現地の慣習を反映したブランドボイス`, flaggedBy: 'Brand Voice Sentry', agentId: 'BVS-1' },
      { id: `${job.docId}-seg-7`, segmentNumber: 7, flagged: false, source: `Closing content of ${fileName}.`, translation: `[${locale}] 文書の締めくくり。` },
    ];
    setCampaignReviewJob(job)
    setCampaignReviewRequest({
      id: `review-${job.docId}-${job.locale}`,
      projectName: activeCampaign?.name || 'Campaign',
      fileName,
      trustScore: job.score,
      threshold: activeCampaign?.config?.qualityThreshold ?? 85,
      locale,
      localeCode: locale,
      classification: docType,
      assignedBy: { name: onboardingConfig?.userName || 'Alex', initials: (onboardingConfig?.userName || 'Alex').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() },
      createdAt: new Date().toISOString(),
      allSegments: mockSegments,
      flaggedSegments: mockSegments.filter(s => s.flagged),
    })
    setPreviousPhase(phase)
    setHumanReviewMode('assign')
    setPhase('human-review')
  }, [phase, activeCampaign, onboardingConfig])

  // Entry Point 2: Manual delegate from Intelligence Feed → human review assignment
  const handleOpenTeamDirectory = useCallback((itemId, itemTitle) => {
    setTeamDirectoryContext({ itemId, itemTitle })
    setPreviousPhase(phase)
    setHumanReviewMode('assign')
    setPhase('human-review')
  }, [phase])

  // Assignment complete → switch to reviewer view
  const handleReviewAssigned = useCallback((reviewerId, note) => {
    console.log('Review assigned to:', reviewerId, 'Note:', note)
    setHumanReviewMode('review')
  }, [])

  // Review submitted → return to previous phase with retraining data
  const handleReviewSubmitted = useCallback((results) => {
    console.log('Review submitted. Retraining data:', results)
    setHumanReviewMode(null)
    setCampaignReviewJob(null)
    setCampaignReviewRequest(null)
    setPhase(previousPhase || 'narrative')
  }, [previousPhase])

  // Back from human review → return to previous phase
  const handleReviewBack = useCallback(() => {
    setHumanReviewMode(null)
    setPhase(previousPhase || 'narrative')
  }, [previousPhase])

  // Team directory delegation (legacy modal — still used for TeamDirectory component)
  const handleDelegationComplete = useCallback((member, note) => {
    console.log('Delegated to:', member.name, 'Note:', note, 'Item:', teamDirectoryContext.itemId)
    setShowTeamDirectory(false)
  }, [teamDirectoryContext])

  // Agent arbitration resolved
  const handleArbitrationResolved = useCallback((resolutions) => {
    console.log('Arbitration resolved:', resolutions)
    setShowArbitration(false)
  }, [])

  // Open agent profile
  const handleOpenAgentProfile = useCallback((agent) => {
    setSelectedAgent(agent)
    setShowAgentProfile(true)
  }, [])

  // Remove hired agent
  const handleRemoveAgent = useCallback((agentId) => {
    setHiredMarketplaceAgents(prev => prev.filter(a => a.id !== agentId))
    setActiveAgents(prev => prev.filter(a => a.id !== agentId))
  }, [])

  // Screen 4 → Screen 1: Start new project
  // If this is the first project completing (projectsCompleted === 0), show time-jump transition
  const handleReset = useCallback(() => {
    const goToTimeJump = projectsCompleted === 0
    setProjectsCompleted(prev => prev + 1)
    setFile(null)
    setActiveCampaign(null)
    setStructuredContext({ targetLocales: [], industryVertical: '', toneGuidelines: { enabled: false, glossaryFile: null, styleGuideUrl: '', dntTerms: '', tone: '' } })
    setProjectMeta({ name: '', poNumber: '', visibility: 'private' })
    setTriageData(null)
    setEnabledUpsells(new Set())
    setDiscoveryFindings([])
    setPreloadedConfig(null)
    setActiveAgents([])
    setHiredMarketplaceAgents([])
    if (goToTimeJump) {
      setPhase('time-jump')
    } else {
      setPhase('dashboard')
    }
  }, [projectsCompleted])

  // Safety net: redirect to dashboard if we're on a data-dependent phase with no data
  useEffect(() => {
    const dataRequiredPhases = ['upload', 'reading', 'processing', 'narrative']
    // Campaign processing doesn't require triageData — skip redirect
    if (dataRequiredPhases.includes(phase) && !triageData && !activeCampaign) {
      setPhase('dashboard')
    }
  }, [phase, triageData, activeCampaign])

  // Container width — human review fills the full viewport; other phases use responsive max-width
  const needsWarRoom = phase === 'upload' || phase === 'processing' || phase === 'narrative'
  const isHumanReview = phase === 'human-review'
  const isOrgBrain = phase === 'org-brain'
  const containerClass = isHumanReview
    ? 'w-full flex flex-col overflow-hidden'
    : 'w-full max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px]'

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-straker-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-[13px] focus:font-medium">
          Skip to main content
        </a>
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center px-6 outline-none">
          <MobileBlocker />
        </main>
      </div>
    )
  }

  // Onboarding is a full-screen experience — no header/stepper/footer
  if (phase === 'onboarding') {
    return (
      <div className="min-h-screen bg-white">
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  // Agent assembly transition — plays between onboarding and dashboard
  if (phase === 'agent-assembly') {
    return (
      <div className="min-h-screen bg-white">
        <AgentAssemblyTransition
          agents={defaultAgents}
          userName={onboardingConfig?.userName || 'Alex'}
          onComplete={() => setPhase('first-campaign')}
          onSkipToDashboard={() => setPhase('dashboard')}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-straker-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-[13px] focus:font-medium">
        Skip to main content
      </a>
      <Header companyName={onboardingConfig?.orgName || 'Meridian Capital'} onOpenSettings={() => { setPreviousPhase(phase); setPhase('settings') }} onOpenMarketplace={() => setShowMarketplace(true)} onOpenHitlWorkflow={() => setShowHitlWorkflow(true)} onNavigateHome={() => setPhase('dashboard')} />
      {phase !== 'settings' && phase !== 'integrations' && phase !== 'onboarding' && phase !== 'agent-assembly' && (
        <GlobalNav
          currentPhase={phase}
          onNavigate={(target) => { setPreviousPhase(phase); setPhase(target); }}
        />
      )}
      <main id="main-content" tabIndex={-1} className={`flex-1 flex outline-none ${isHumanReview ? 'overflow-hidden' : 'items-start justify-center px-6 lg:px-8 xl:px-12 2xl:px-16 pt-8 xl:pt-10 pb-12 xl:pb-16'}`}>
        <div className={containerClass}>
          {/* Project progress — inline indicator during active project */}
          {['reading', 'processing', 'narrative'].includes(phase) && !isHumanReview && !(phase === 'narrative' && activeCampaign && !triageData) && (
            <ProjectProgress currentState={phase} />
          )}

          {/* Settings page */}
          {phase === 'settings' && (
            <Settings
              onBack={() => setPhase(previousPhase || 'dashboard')}
              onOpenIntegrations={() => { setPreviousPhase('settings'); setPhase('integrations') }}
            />
          )}

          {/* Integrations hub */}
          {phase === 'integrations' && (
            <IntegrationsHub
              onBack={() => setPhase(previousPhase || 'dashboard')}
              connectedIntegrations={connectedIntegrations}
              onConnectIntegration={handleConnectIntegration}
              onDisconnectIntegration={handleDisconnectIntegration}
            />
          )}

          {/* Campaign Hub — bulk ingestion + pre-flight */}
          {phase === 'campaign-hub' && (
            <CampaignHub
              structuredContext={structuredContext}
              onLaunch={handleCampaignLaunch}
              onBack={() => setPhase('dashboard')}
            />
          )}

          {/* First campaign — post-onboarding entry point */}
          {phase === 'first-campaign' && (
            <CampaignHub
              structuredContext={structuredContext}
              onLaunch={handleCampaignLaunch}
              onBack={() => setPhase('dashboard')}
              isFirstRun={true}
            />
          )}

          {/* Screen 1: Intelligent Dashboard (or Cold Start for Day 0) */}
          {phase === 'dashboard' && projectsCompleted === 0 && !onboardingConfig?.skipColdStart ? (
            <ColdStartDashboard
              userName={onboardingConfig?.userName || 'Alex'}
              companyName={onboardingConfig?.orgName || 'Meridian Capital'}
              configuredLocales={structuredContext.targetLocales?.length > 0 ? structuredContext.targetLocales : ['ja', 'de', 'zh']}
              configuredVertical={structuredContext.industryVertical || 'Financial Services'}
              onStartFirstProject={() => setPhase('time-jump')}
              onStartCampaign={() => setPhase('campaign-hub')}
              onCreateContent={handleCreateContent}
              onFileAccepted={handleFileAccepted}
              connectedIntegrations={connectedIntegrations}
              onOpenIntegrations={() => { setPreviousPhase('dashboard'); setPhase('integrations') }}
            />
          ) : phase === 'dashboard' && (
            <CommandSurface
              onFileAccepted={handleFileAccepted}
              onFileWithLocales={(file, locales) => {
                // Update structuredContext with user-chosen locales before processing
                setStructuredContext(prev => ({ ...prev, targetLocales: locales }))
                handleFileAccepted(file)
              }}
              defaultLocales={structuredContext.targetLocales?.length > 0 ? structuredContext.targetLocales : ['ja', 'de', 'zh']}
              orgIntelligence={orgIntelligence}
              onRerun={handleRerun}
              onStartPredicted={handleStartPredicted}
              onOpenTeamDirectory={handleOpenTeamDirectory}
              onOpenOrgBrain={() => { setPreviousPhase('dashboard'); setPhase('org-brain') }}
              onOpenMarketplace={() => setShowMarketplace(true)}
              onOpenAgentStudio={() => setShowAgentStudio(true)}
              userName={onboardingConfig?.userName || 'Alex'}
              companyName={onboardingConfig?.orgName || 'Meridian Capital'}
              connectedIntegrations={connectedIntegrations}
              onOpenIntegrations={() => { setPreviousPhase('dashboard'); setPhase('integrations') }}
              onStartCampaign={() => setPhase('campaign-hub')}
              onCreateContent={handleCreateContent}
            />
          )}

          {/* Time Jump Transition — shown after first project from Cold Start */}
          {phase === 'time-jump' && (
            <TimeJumpTransition
              onComplete={() => {
                setProjectsCompleted(1)
                setPhase('dashboard')
              }}
            />
          )}

          {/* Mission Control — Unified Analysis + Agent Configuration */}
          {phase === 'reading' && (
            <MissionControl
              triageData={triageData}
              discoveryFindings={discoveryFindings}
              structuredContext={structuredContext}
              documentProfile={{
                vertical: structuredContext.industryVertical || 'Financial Services',
                contentTypes: onboardingConfig?.contentTypes || ['earnings reports'],
                locales: structuredContext.targetLocales?.length > 0 ? structuredContext.targetLocales : ['ja'],
              }}
              onDeploy={handleReadingComplete}
              onFileAccepted={handleFileAccepted}
              preloaded={preloadedConfig}
            />
          )}

          {/* Human-in-the-Loop Review — full-width, no war room sidebar */}
          {phase === 'human-review' && (
            <HumanReview
              mode={humanReviewMode || 'assign'}
              onAssign={handleReviewAssigned}
              onSubmitReview={handleReviewSubmitted}
              onBack={() => { handleReviewBack(); setCampaignReviewJob(null); setCampaignReviewRequest(null); }}
              connectedIntegrations={connectedIntegrations}
              onOpenIntegrations={() => { setPreviousPhase('human-review'); setPhase('integrations') }}
              {...(campaignReviewRequest ? { reviewRequest: campaignReviewRequest } : {})}
            />
          )}

          {/* Org Brain — top-level phase accessible from dashboard or narrative */}
          {phase === 'org-brain' && (
            <OrgBrain
              onClose={() => setPhase(previousPhase || 'dashboard')}
              onNavigateBack={() => setPhase(previousPhase || 'dashboard')}
              onCreateContent={handleCreateContent}
            />
          )}

          {/* Create with Org Brain */}
          {phase === 'create' && (
            <ContentCreator
              onBack={() => setPhase(previousPhase || 'dashboard')}
            />
          )}

          {/* Analytics */}
          {phase === 'analytics' && (
            <AnalyticsDashboard
              onBack={() => setPhase(previousPhase || 'dashboard')}
            />
          )}

          {/* Governance */}
          {phase === 'governance' && (
            <GovernanceAudit
              onBack={() => setPhase(previousPhase || 'dashboard')}
            />
          )}

          {/* Campaign results — full width, no sidebar */}
          {phase === 'narrative' && !triageData && activeCampaign && (
            <CampaignResultsView
              campaign={activeCampaign}
              threshold={activeCampaign.config?.qualityThreshold ?? 85}
              onReset={handleReset}
              onReviewJob={handleCampaignReviewJob}
            />
          )}

          {/* Screens 2-4 with Agent War Room sidebar */}
          {needsWarRoom && !(phase === 'narrative' && !triageData && activeCampaign) && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
              {/* Main content */}
              <div className="min-w-0">
                {/* Screen 2: Smart Upload Zone + War Room */}
                {phase === 'upload' && (
                  <CommandUpload
                    onFileAccepted={handleFileAccepted}
                    onLaunch={handleLaunch}
                    triageData={triageData}
                    discoveryFindings={discoveryFindings}
                    structuredContext={structuredContext}
                    preloaded={preloadedConfig}
                  />
                )}

                {/* Screen 3: Processing — Control Room for campaigns, LiveTelemetry for single docs */}
                {phase === 'processing' && activeCampaign && (
                  <OperationsControlRoom
                    campaign={activeCampaign}
                    onComplete={handleProcessingComplete}
                  />
                )}
                {phase === 'processing' && !activeCampaign && (
                  <LiveTelemetry
                    fileName={triageData?.fileName || 'Document'}
                    totalSegments={247}
                    locales={structuredContext.targetLocales?.length > 0 ? structuredContext.targetLocales : ['ja', 'de', 'zh']}
                    agents={activeAgents}
                    onComplete={handleProcessingComplete}
                    duration={15000}
                  />
                )}

                {/* Screen 4: Explainable Quality Narrative */}
                {phase === 'narrative' && triageData && (
                  <QualityNarrative
                    data={triageData}
                    computedQuality={computedQuality}
                    enabledUpsells={enabledUpsells}
                    qualityNarrative={qualityNarrative}
                    orgIntelligence={orgIntelligence}
                    onReset={handleReset}
                    activeAgents={activeAgents}
                    onComplianceRequired={handleComplianceRequired}
                    onReviewNow={handleReviewNow}
                    onOpenOrgBrain={() => { setPreviousPhase('narrative'); setPhase('org-brain') }}
                    activeCampaign={activeCampaign}
                  />
                )}

                {/* Fallback: no content, no campaign */}
                {phase === 'narrative' && !triageData && !activeCampaign && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <p className="text-gray-500 text-sm">No project data loaded.</p>
                    <button
                      onClick={() => setPhase('dashboard')}
                      className="px-4 py-2 rounded-lg bg-amber hover:bg-amber-deep text-white text-sm font-medium transition-colors cursor-pointer"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                )}

                {/* (Human Review renders outside war room grid) */}
              </div>

              {/* Agent War Room Sidebar */}
              <div className="hidden lg:block">
                <div className="sticky top-36">
                  <AgentWarRoom
                    agents={activeAgents}
                    onHireAgent={handleOpenMarketplace}
                    onTrainAgent={() => setShowAgentStudio(true)}
                    onResolveConflicts={() => setShowArbitration(true)}
                    onViewAgentProfile={handleOpenAgentProfile}
                    isProcessing={phase === 'processing'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Persistent Intelligence Assistant — available on all post-onboarding screens,
          except while the HITL Vendor Workflow overlay is open (Quick Review is a
          secure focused-edit surface and the Sage FAB introduces a competing AI entry
          point + visual noise that conflicts with the workspace's secure-session promise). */}
      {!showHitlWorkflow && (
        <IntelligenceAssistant
          userName={onboardingConfig?.userName || 'Alex'}
          companyName={onboardingConfig?.orgName || 'Meridian Capital'}
          currentPhase={phase}
          connectedIntegrations={connectedIntegrations}
          onOpenIntegrations={() => { setPreviousPhase(phase); setPhase('integrations') }}
        />
      )}

      {/* Intelligence Marketplace — full-page overlay */}
      <IntelligenceMarketplace
        isOpen={showMarketplace}
        onClose={() => setShowMarketplace(false)}
        onDeployAgent={handleHireAgent}
        hiredAgents={hiredMarketplaceAgents}
        onRemoveAgent={handleRemoveAgent}
        documentProfile={{
          vertical: structuredContext.industryVertical || 'Financial Services',
          contentTypes: onboardingConfig?.contentTypes || ['earnings reports'],
          locales: structuredContext.targetLocales?.length > 0 ? structuredContext.targetLocales : ['ja'],
        }}
        connectedIntegrations={connectedIntegrations}
        onConnectIntegration={handleConnectIntegration}
        onDisconnectIntegration={handleDisconnectIntegration}
      />

      <CustomAgentStudio
        isOpen={showAgentStudio}
        onClose={() => setShowAgentStudio(false)}
        onAgentCreated={handleAgentCreated}
        orgName={onboardingConfig?.orgName || 'Meridian Capital'}
      />

      <AgentProfile
        isOpen={showAgentProfile}
        onClose={() => { setShowAgentProfile(false); setSelectedAgent(null) }}
        agent={selectedAgent}
        onContinueTraining={() => { setShowAgentProfile(false); setShowAgentStudio(true) }}
      />

      <ParametersDrawer
        isOpen={showParametersDrawer}
        onClose={() => setShowParametersDrawer(false)}
        qualityThreshold={activeCampaign?.config?.qualityThreshold ?? qualityThreshold}
        onThresholdChange={(val) => {
          setQualityThreshold(val)
          // Also update the active campaign if one is running
          if (activeCampaign) {
            setActiveCampaign(prev => ({
              ...prev,
              config: { ...prev.config, qualityThreshold: val },
            }))
          }
        }}
      />

      {/* Team Directory Modal — Enterprise Delegation */}
      <TeamDirectory
        isOpen={showTeamDirectory}
        onClose={() => setShowTeamDirectory(false)}
        onDelegate={handleDelegationComplete}
        itemTitle={teamDirectoryContext.itemTitle}
      />

      {/* HITL Vendor Workflow — governed human-in-the-loop module */}
      {showHitlWorkflow && (
        <HITLVendorWorkflow
          currentUserId="alex"
          onClose={() => setShowHitlWorkflow(false)}
        />
      )}

      {/* Agent Arbitration Modal — When agents disagree */}
      {showArbitration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-[900px] max-h-[85vh] overflow-y-auto rounded-lg bg-white border border-black/[0.12] p-1">
            <AgentArbitration
              onResolve={(id, resolution) => console.log('Resolved:', id, resolution)}
              onResolveAll={handleArbitrationResolved}
            />
            <button
              onClick={() => setShowArbitration(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Data generators using structured context ---
// Primary locale = first selected locale (drives all deterministic logic)
function primaryLocale(sc) {
  const locales = sc.targetLocales || (sc.targetLocale ? [sc.targetLocale] : [])
  return locales[0] || ''
}

function getClassification(file) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
  const pages = Math.max(1, Math.round(file.size / 25000))

  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
    const mins = Math.max(1, Math.round(file.size / (5 * 1024 * 1024)))
    return `${mins}-minute ${ext.toUpperCase()} Video, English Audio Detected`
  }
  if (ext === 'pdf') return `${pages}-page PDF, English Earnings Report`
  if (['doc', 'docx'].includes(ext)) return `${pages}-page Word Document, English`
  if (['xls', 'xlsx'].includes(ext)) return `Multi-sheet Excel Workbook (${sizeMB} MB)`
  if (['ppt', 'pptx'].includes(ext)) return `${Math.max(5, pages)}-slide Presentation Deck`
  return `${ext?.toUpperCase() || 'Unknown'} File (${sizeMB} MB)`
}

function getIntent(file, sc) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext)

  if (primaryLocale(sc) === 'ja') {
    if (isVideo) return 'Japanese Video Processing with Lip-Sync'
    return 'Japanese Financial Processing (J-GAAP Compliance)'
  }
  if (primaryLocale(sc) === 'de') return 'EU Regulatory Processing (IFRS Compliance)'
  if (primaryLocale(sc) === 'zh') return 'Mandarin Financial Processing (CAS Compliance)'
  if (primaryLocale(sc) === 'fr') return 'French Market Processing (EU Compliance)'
  if (primaryLocale(sc) === 'es') return 'Spanish Market Processing'
  if (primaryLocale(sc) === 'ko') return 'Korean Market Processing (K-IFRS Compliance)'
  if (primaryLocale(sc) === 'pt') return 'Portuguese Market Processing'
  if (primaryLocale(sc) === 'ar') return 'Arabic Market Processing (RTL Adaptation)'

  if (isVideo) return 'Multi-Market Video Processing'
  if (ext === 'pdf') return 'Financial Processing'
  if (['ppt', 'pptx'].includes(ext)) return 'Enterprise Presentation Processing'
  return 'Document Processing & Compliance Review'
}

function getAgent(file, sc) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext)

  if (primaryLocale(sc) === 'ja') {
    if (isVideo) return { name: 'Japan Media Processing Agent', id: 'JP-MEDIA-7' }
    return { name: 'Japan Financial Regulatory Agent', id: 'JP-FIN-3' }
  }
  if (primaryLocale(sc) === 'de') return { name: 'EU Regulatory Compliance Agent', id: 'EU-REG-5' }
  if (primaryLocale(sc) === 'zh') return { name: 'China Financial Standards Agent', id: 'CN-FIN-2' }
  if (primaryLocale(sc) === 'ko') return { name: 'Korea Financial Regulatory Agent', id: 'KR-FIN-1' }
  if (primaryLocale(sc) === 'ar') return { name: 'Arabic Processing & RTL Agent', id: 'AR-LOC-3' }

  if (isVideo) return { name: 'Global Media Processing Agent', id: 'GL-MEDIA-1' }
  return { name: 'Enterprise Document Agent', id: 'EN-DOC-4' }
}

function getPlan(file, sc) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext)
  const isJapan = primaryLocale(sc) === 'ja'

  let guardrails
  if (isJapan && !isVideo) {
    guardrails = [
      'GAAP to J-GAAP terminology mapping',
      'Yen denomination & fiscal calendar alignment',
      'TSE disclosure format compliance',
      'Keigo (formal register) enforcement',
      'Hankaku/Zenkaku number standardization',
    ]
  } else if (isVideo) {
    guardrails = [
      'Phoneme-level lip-sync alignment',
      'Cultural gesture & visual compliance',
      'Audio waveform quality assurance',
      'Subtitle timing & positioning',
      'Brand voice consistency check',
    ]
  } else {
    guardrails = [
      'Regulatory terminology verification',
      'Numerical precision & currency formatting',
      'Legal disclaimer processing',
      'Brand guideline compliance',
      'Cultural sensitivity review',
    ]
  }

  return { guardrails }
}

function getSourceIQ(file, sc) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext)
  const isJapan = primaryLocale(sc) === 'ja'
  const isFinancial = ext === 'pdf' || sc.industryVertical?.toLowerCase().includes('financial')

  if (isJapan && isFinancial) {
    return {
      overall: 73,
      label: 'High Complexity',
      summary: 'Dense financial terminology with cross-jurisdictional regulatory requirements. Specialized domain expertise required for GAAP-to-J-GAAP conversion.',
      dimensions: [
        { name: 'Terminology Density', score: 68, icon: 'terminology', benchmark: { average: 54, context: '14 pts above avg for financial docs' }, findings: [{ severity: 'major', delta: -8, text: '47 specialized financial terms detected requiring J-GAAP equivalents.' }] },
        { name: 'Reading Level', score: 82, icon: 'reading', benchmark: { average: 74, context: '8 pts above avg for regulatory filings' }, findings: [{ severity: 'minor', delta: -4, text: 'Flesch-Kincaid grade level 14.2 — typical for SEC filings.' }] },
        { name: 'Regulatory Complexity', score: 61, icon: 'regulatory', benchmark: { average: 72, context: '11 pts below avg — unusually complex' }, findings: [{ severity: 'critical', delta: -12, text: 'Document references US GAAP standards (ASC 606, ASC 842) that must be mapped to J-GAAP equivalents.' }] },
        { name: 'Cultural Adaptation', score: 77, icon: 'cultural', benchmark: { average: 70, context: '7 pts above avg' }, findings: [{ severity: 'major', delta: -5, text: 'Number formatting requires conversion: $1,234.56 → ¥1,234.' }] },
      ],
    }
  }

  if (isVideo) {
    return {
      overall: 65, label: 'High Complexity',
      summary: 'Audio track contains rapid dialogue with overlapping speakers.',
      dimensions: [
        { name: 'Audio Complexity', score: 58, icon: 'terminology', benchmark: { average: 65, context: '7 pts below avg' }, findings: [{ severity: 'major', delta: -10, text: 'Multiple speakers detected with overlapping dialogue segments.' }] },
        { name: 'Visual Text', score: 72, icon: 'reading', benchmark: { average: 80, context: '8 pts below avg' }, findings: [{ severity: 'minor', delta: -5, text: '12 on-screen text elements require separate rendering pipeline.' }] },
        { name: 'Lip-Sync Difficulty', score: 61, icon: 'regulatory', benchmark: { average: 70, context: '9 pts below avg' }, findings: [{ severity: 'major', delta: -8, text: 'Target language phoneme duration differs by 23% average.' }] },
        { name: 'Cultural Adaptation', score: 80, icon: 'cultural', benchmark: { average: 78, context: '2 pts above avg' }, findings: [{ severity: 'minor', delta: -3, text: 'Hand gestures in 2 segments may carry different cultural connotations.' }] },
      ],
    }
  }

  return {
    overall: 82, label: 'Moderate Complexity',
    summary: 'Standard business document with moderate specialized terminology.',
    dimensions: [
      { name: 'Terminology Density', score: 85, icon: 'terminology', benchmark: { average: 78, context: '7 pts above avg' }, findings: [{ severity: 'minor', delta: -3, text: '18 domain-specific terms identified.' }] },
      { name: 'Reading Level', score: 88, icon: 'reading', benchmark: { average: 82, context: '6 pts above avg' }, findings: [{ severity: 'minor', delta: -2, text: 'Flesch-Kincaid grade level 11.4.' }] },
      { name: 'Regulatory Complexity', score: 79, icon: 'regulatory', benchmark: { average: 75, context: '4 pts above avg' }, findings: [{ severity: 'minor', delta: -4, text: 'Standard legal boilerplate detected.' }] },
      { name: 'Cultural Adaptation', score: 90, icon: 'cultural', benchmark: { average: 83, context: '7 pts above avg' }, findings: [{ severity: 'minor', delta: -2, text: 'Minimal cultural adaptation required.' }] },
    ],
  }
}

function getQualityScore(file, sc) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext)
  const isJapan = primaryLocale(sc) === 'ja'
  const isFinancial = ext === 'pdf' || sc.industryVertical?.toLowerCase().includes('financial')

  if (isJapan && isFinancial) {
    return {
      overall: 76, potential: 89, label: 'Baseline Estimate',
      summary: 'Projected confidence using standard processing models without custom enhancements.',
      dimensions: [
        { name: 'Terminology Accuracy', score: 68, potential: 76, icon: 'terminology' },
        { name: 'Fluency & Register', score: 82, potential: 86, icon: 'reading' },
        { name: 'Regulatory Compliance', score: 72, potential: 84, icon: 'regulatory' },
        { name: 'Cultural Adaptation', score: 80, potential: 85, icon: 'cultural' },
      ],
    }
  }

  if (isVideo) {
    return {
      overall: 71, potential: 86, label: 'Baseline Estimate',
      summary: 'Projected confidence for audio/visual content deployment using standard pipeline.',
      dimensions: [
        { name: 'Output Accuracy', score: 74, potential: 82, icon: 'terminology' },
        { name: 'Lip-Sync Precision', score: 62, potential: 78, icon: 'reading' },
        { name: 'Audio Quality', score: 76, potential: 84, icon: 'regulatory' },
        { name: 'Cultural Adaptation', score: 78, potential: 85, icon: 'cultural' },
      ],
    }
  }

  return {
    overall: 84, potential: 93, label: 'Baseline Estimate',
    summary: 'Projected confidence using standard models.',
    dimensions: [
      { name: 'Terminology Accuracy', score: 86, potential: 92, icon: 'terminology' },
      { name: 'Fluency & Register', score: 88, potential: 93, icon: 'reading' },
      { name: 'Regulatory Compliance', score: 80, potential: 90, icon: 'regulatory' },
      { name: 'Cultural Adaptation', score: 87, potential: 94, icon: 'cultural' },
    ],
  }
}

function getUpsellOptions(file, sc) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext)
  const isJapan = primaryLocale(sc) === 'ja'

  if (isJapan && !isVideo) {
    return [
      { id: 'glossary', icon: 'bookOpen', title: 'Custom Terminology Glossary', description: 'Upload your J-GAAP glossary to enforce consistent financial terminology.', impact: [{ dimension: 'Terminology Accuracy', delta: '+8' }], tag: 'Recommended' },
      { id: 'model-pack', icon: 'cpu', title: 'Financial Services Model Pack', description: 'Enable industry-specific AI models trained on 50K+ Japanese financial filings.', impact: [{ dimension: 'Terminology Accuracy', delta: '+4' }, { dimension: 'Regulatory Compliance', delta: '+6' }], tag: 'Premium' },
      { id: 'human-review', icon: 'userCheck', title: 'Expert Human Review Loop', description: 'Add certified J-GAAP linguist review for regulatory sections.', impact: [{ dimension: 'Regulatory Compliance', delta: '+6' }, { dimension: 'Cultural Adaptation', delta: '+3' }], tag: 'Enterprise' },
    ]
  }

  if (isVideo) {
    return [
      { id: 'voice-profile', icon: 'bookOpen', title: 'Custom Voice Profiles', description: 'Upload speaker samples to match voice characteristics.', impact: [{ dimension: 'Lip-Sync Precision', delta: '+10' }], tag: 'Recommended' },
      { id: 'model-pack', icon: 'cpu', title: 'Media Processing Model Pack', description: 'Enable models optimized for conversational dialogue.', impact: [{ dimension: 'Output Accuracy', delta: '+5' }, { dimension: 'Audio Quality', delta: '+4' }], tag: 'Premium' },
      { id: 'human-review', icon: 'userCheck', title: 'Expert Human Review Loop', description: 'Add native-speaker review for cultural nuance.', impact: [{ dimension: 'Cultural Adaptation', delta: '+5' }, { dimension: 'Output Accuracy', delta: '+3' }], tag: 'Enterprise' },
    ]
  }

  return [
    { id: 'glossary', icon: 'bookOpen', title: 'Custom Terminology Glossary', description: 'Upload your brand terminology glossary.', impact: [{ dimension: 'Terminology Accuracy', delta: '+6' }], tag: 'Recommended' },
    { id: 'model-pack', icon: 'cpu', title: 'Industry Model Pack', description: 'Enable domain-specific models.', impact: [{ dimension: 'Terminology Accuracy', delta: '+4' }, { dimension: 'Regulatory Compliance', delta: '+6' }], tag: 'Premium' },
    { id: 'human-review', icon: 'userCheck', title: 'Expert Human Review Loop', description: 'Add professional linguist review.', impact: [{ dimension: 'Regulatory Compliance', delta: '+4' }, { dimension: 'Cultural Adaptation', delta: '+4' }], tag: 'Enterprise' },
  ]
}

function getSandboxPreview(file, sc) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext)
  const isJapan = primaryLocale(sc) === 'ja'

  if (isJapan && !isVideo) {
    return {
      type: 'document', scope: 'First 2 pages',
      segments: [
        { source: 'Revenue was recognized in accordance with ASC 606.', target: '収益はASBJ第29号に基づき認識されました。', annotations: [{ type: 'regulatory', label: 'ASC 606 → ASBJ 29' }, { type: 'terminology', label: 'J-GAAP mapped' }] },
        { source: 'Total goodwill impairment charges of $4.2 million were recorded.', target: 'のれんの減損損失合計額 ¥630百万を計上しました。', annotations: [{ type: 'currency', label: 'USD → JPY' }, { type: 'terminology', label: '減損損失 mapped' }] },
      ],
      stats: { segmentsProcessed: 47, terminologyMatches: 23, guardrailsApplied: 8 },
    }
  }

  return {
    type: 'document', scope: 'First 2 pages',
    segments: [
      { source: 'This Agreement shall be governed by applicable laws.', target: 'Ce Contrat sera régi conformément aux lois applicables.', annotations: [{ type: 'terminology', label: 'Legal term mapped' }] },
    ],
    stats: { segmentsProcessed: 24, terminologyMatches: 11, guardrailsApplied: 5 },
  }
}
