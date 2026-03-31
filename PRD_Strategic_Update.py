#!/usr/bin/env python3
"""Generate the Not Verify PRD Strategic Update PDF."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfgen import canvas as pdfcanvas
import datetime

# ── Colors ──
PRIMARY = HexColor('#009eda')
DARK = HexColor('#111827')
GRAY = HexColor('#6b7280')
LIGHT_GRAY = HexColor('#f3f4f6')
BORDER = HexColor('#e5e7eb')
RED = HexColor('#dc2626')
AMBER = HexColor('#d97706')
GREEN = HexColor('#059669')
PURPLE = HexColor('#7c3aed')
BLUE = HexColor('#2563eb')

# ── Page Setup ──
PAGE_W, PAGE_H = letter
MARGIN = 0.85 * inch

def header_footer(canvas, doc):
    canvas.saveState()
    # Header line
    canvas.setStrokeColor(PRIMARY)
    canvas.setLineWidth(2)
    canvas.line(MARGIN, PAGE_H - 0.6*inch, PAGE_W - MARGIN, PAGE_H - 0.6*inch)
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(GRAY)
    canvas.drawString(MARGIN, PAGE_H - 0.52*inch, 'NOT VERIFY  ·  PRODUCT REQUIREMENTS UPDATE  ·  CONFIDENTIAL')
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 0.52*inch, datetime.date.today().strftime('%B %d, %Y'))
    # Footer
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(GRAY)
    canvas.drawString(MARGIN, 0.5*inch, f'Page {doc.page}')
    canvas.drawRightString(PAGE_W - MARGIN, 0.5*inch, '© 2026 Not Verify, Inc. — All Rights Reserved')
    canvas.restoreState()

def build_pdf():
    doc = SimpleDocTemplate(
        '/Users/nake/Desktop/Product X/Not_Verify_PRD_Strategic_Update.pdf',
        pagesize=letter,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=0.9*inch, bottomMargin=0.8*inch,
    )

    # ── Styles ──
    s_cover_title = ParagraphStyle('CoverTitle', fontName='Helvetica-Bold', fontSize=28, leading=34, textColor=DARK, alignment=TA_LEFT)
    s_cover_sub = ParagraphStyle('CoverSub', fontName='Helvetica', fontSize=13, leading=18, textColor=GRAY, alignment=TA_LEFT)
    s_section_num = ParagraphStyle('SectionNum', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=PRIMARY, spaceAfter=4)
    s_h1 = ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=20, leading=26, textColor=DARK, spaceBefore=16, spaceAfter=8)
    s_h2 = ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=14, leading=19, textColor=DARK, spaceBefore=14, spaceAfter=6)
    s_h3 = ParagraphStyle('H3', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=DARK, spaceBefore=10, spaceAfter=4)
    s_body = ParagraphStyle('Body', fontName='Helvetica', fontSize=9.5, leading=14.5, textColor=DARK, alignment=TA_JUSTIFY, spaceAfter=6)
    s_body_bold = ParagraphStyle('BodyBold', fontName='Helvetica-Bold', fontSize=9.5, leading=14.5, textColor=DARK, spaceAfter=6)
    s_bullet = ParagraphStyle('Bullet', fontName='Helvetica', fontSize=9.5, leading=14, textColor=DARK, leftIndent=18, bulletIndent=6, spaceAfter=4, alignment=TA_LEFT)
    s_bullet2 = ParagraphStyle('Bullet2', fontName='Helvetica', fontSize=9, leading=13, textColor=GRAY, leftIndent=36, bulletIndent=22, spaceAfter=3, alignment=TA_LEFT)
    s_numbered = ParagraphStyle('Numbered', fontName='Helvetica', fontSize=9.5, leading=14, textColor=DARK, leftIndent=18, spaceAfter=4)
    s_callout = ParagraphStyle('Callout', fontName='Helvetica-Oblique', fontSize=9, leading=13, textColor=GRAY, leftIndent=12, rightIndent=12, spaceAfter=8, spaceBefore=4)
    s_table_head = ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=white, alignment=TA_CENTER)
    s_table_cell = ParagraphStyle('TD', fontName='Helvetica', fontSize=8.5, leading=12, textColor=DARK, alignment=TA_CENTER)
    s_table_cell_left = ParagraphStyle('TDL', fontName='Helvetica', fontSize=8.5, leading=12, textColor=DARK, alignment=TA_LEFT)
    s_label = ParagraphStyle('Label', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=GRAY, spaceAfter=2)

    story = []

    # ════════════════════════════════════════════
    # COVER PAGE
    # ════════════════════════════════════════════
    story.append(Spacer(1, 1.5*inch))
    story.append(Paragraph('Product Requirements<br/>Strategic Update', s_cover_title))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width='40%', thickness=3, color=PRIMARY, spaceAfter=12))
    story.append(Paragraph('Pricing &amp; Credit Transparency · Auto-Publish Resolution Workflow · Platform Extensibility &amp; New Verticals', s_cover_sub))
    story.append(Spacer(1, 24))

    meta_data = [
        ['Document', 'PRD-2026-Q1-003'],
        ['Version', '1.0 — Initial Draft'],
        ['Status', 'Proposed'],
        ['Author', 'Product &amp; Design'],
        ['Date', datetime.date.today().strftime('%B %d, %Y')],
        ['Stakeholders', 'Engineering, GTM, Finance, Customer Success'],
    ]
    meta_table = Table(
        [[Paragraph(f'<b>{r[0]}</b>', ParagraphStyle('ml', fontName='Helvetica-Bold', fontSize=8.5, textColor=GRAY)),
          Paragraph(r[1], ParagraphStyle('mr', fontName='Helvetica', fontSize=8.5, textColor=DARK))]
         for r in meta_data],
        colWidths=[1.4*inch, 4*inch],
        hAlign='LEFT',
    )
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LINEBELOW', (0,0), (-1,-2), 0.5, BORDER),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 40))
    story.append(Paragraph('<b>Executive Summary</b>', ParagraphStyle('es', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=DARK, spaceAfter=8)))
    story.append(Paragraph(
        'This document addresses three strategic gaps identified through stakeholder review of the Not Verify platform. '
        'Section 1 defines a transparent credit consumption model with a Usage &amp; Billing dashboard to give enterprise buyers '
        'cost predictability. Section 2 resolves the "Auto-Publish Not Cleared" UX dead end by introducing a guided resolution '
        'workflow with actionable steps. Section 3 proposes "Domain Modules" — an extensibility architecture that decouples '
        'the platform from Financial Services and enables activation of industry-specific AI agent packs for Healthcare/Life Sciences, '
        'Legal, and beyond.',
        s_body
    ))
    story.append(PageBreak())

    # ════════════════════════════════════════════
    # TABLE OF CONTENTS
    # ════════════════════════════════════════════
    story.append(Paragraph('Table of Contents', s_h1))
    story.append(Spacer(1, 8))
    toc_items = [
        ('1', 'Pricing &amp; Credit Transparency', '3'),
        ('  1.1', 'Credit Consumption Model', '3'),
        ('  1.2', 'Credit Calculation Formula', '3'),
        ('  1.3', 'Enterprise Pricing Tiers', '4'),
        ('  1.4', 'Usage &amp; Billing Dashboard — UX Flow', '5'),
        ('2', 'UX Friction: Auto-Publish Resolution Workflow', '6'),
        ('  2.1', 'Current Problem', '6'),
        ('  2.2', 'Business Logic: Clearance Criteria', '6'),
        ('  2.3', 'Resolution Workflow — Step-by-Step UX', '7'),
        ('  2.4', 'Badge State Machine', '8'),
        ('3', 'Platform Extensibility &amp; New Verticals', '9'),
        ('  3.1', 'Domain Module Architecture', '9'),
        ('  3.2', 'Intelligence Hub Configuration UX', '10'),
        ('  3.3', 'Industry Agent Packs — Catalog', '11'),
        ('  3.4', 'Vertical Deep Dives', '12'),
    ]
    for num, title, pg in toc_items:
        indent = 24 if num.startswith('  ') else 0
        weight = 'Helvetica-Bold' if not num.startswith('  ') else 'Helvetica'
        row = Table(
            [[Paragraph(num.strip(), ParagraphStyle('tn', fontName=weight, fontSize=9, textColor=PRIMARY if not num.startswith('  ') else GRAY)),
              Paragraph(title, ParagraphStyle('tt', fontName=weight, fontSize=9, textColor=DARK)),
              Paragraph(pg, ParagraphStyle('tp', fontName='Helvetica', fontSize=9, textColor=GRAY, alignment=TA_CENTER))]],
            colWidths=[0.5*inch, 5*inch, 0.6*inch],
            hAlign='LEFT',
        )
        row.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (0,0), indent),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('LINEBELOW', (0,0), (-1,-1), 0.3, HexColor('#f0f0f0')),
        ]))
        story.append(row)

    story.append(PageBreak())

    # ════════════════════════════════════════════
    # SECTION 1: PRICING & CREDIT TRANSPARENCY
    # ════════════════════════════════════════════
    story.append(Paragraph('SECTION 1', s_section_num))
    story.append(Paragraph('Pricing &amp; Credit Transparency', s_h1))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=12))

    # 1.1 Credit Consumption Model
    story.append(Paragraph('1.1 &nbsp; Credit Consumption Model', s_h2))
    story.append(Paragraph(
        'Credits are the universal unit of consumption on the Not Verify platform. Every action that invokes AI processing — '
        'translation, quality assessment, compliance checking, or human review routing — consumes credits proportional to '
        'the computational complexity involved.',
        s_body
    ))
    story.append(Paragraph('<b>Design Principles</b>', s_body_bold))
    bullets = [
        '<b>Predictability</b> — Enterprise buyers must know the cost <i>before</i> initiating a project. The platform must surface a binding cost estimate at the PreFlight stage, not after execution.',
        '<b>Transparency</b> — Every credit charge must be attributable to a specific processing dimension (words, locales, agents, or review loops). No opaque "platform fees."',
        '<b>Scalability</b> — Volume discounts and committed-use plans reward large-scale adoption. Credits purchased in bulk cost less per unit.',
        '<b>Auditability</b> — Finance teams need exportable usage reports with GL-code-compatible line items for cost allocation across departments or projects.',
    ]
    for b in bullets:
        story.append(Paragraph(b, s_bullet, bulletText='•'))

    story.append(Spacer(1, 8))

    # 1.2 Credit Calculation Formula
    story.append(Paragraph('1.2 &nbsp; Credit Calculation Formula', s_h2))
    story.append(Paragraph(
        'A project\'s credit cost is computed as the sum of four independently metered dimensions:',
        s_body
    ))
    story.append(Spacer(1, 4))

    # Formula box
    formula_table = Table(
        [[Paragraph(
            '<b>Total Credits = Base Processing + Agent Credits + Locale Multiplier + Review Credits</b>',
            ParagraphStyle('formula', fontName='Courier-Bold', fontSize=10, leading=14, textColor=PRIMARY, alignment=TA_CENTER)
        )]],
        colWidths=[6*inch],
        hAlign='CENTER',
    )
    formula_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor('#f0f9ff')),
        ('BOX', (0,0), (-1,-1), 1, PRIMARY),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(formula_table)
    story.append(Spacer(1, 10))

    # Dimension breakdown table
    dim_header = [
        Paragraph('Dimension', s_table_head),
        Paragraph('Calculation', s_table_head),
        Paragraph('Example', s_table_head),
    ]
    dim_rows = [
        ['Base Processing', '1 credit per 1,000 source words\n(minimum 5 credits)', '12,400 words → 13 credits'],
        ['Agent Credits', 'Per-agent cost × number activated\n(5–18 cr per agent)', '3 agents (12+8+5) → 25 credits'],
        ['Locale Multiplier', '1.0× for Tier 1 (EN, FR, DE, ES)\n1.5× for Tier 2 (JA, ZH, KO, AR)\n2.0× for Tier 3 (rare languages)', 'Japanese target → 1.5× multiplier'],
        ['Review Credits', '3 credits per human review loop\n1 credit per auto-review pass', 'HITL review → 3 credits'],
    ]
    dim_data = [dim_header]
    for row in dim_rows:
        dim_data.append([
            Paragraph(f'<b>{row[0]}</b>', s_table_cell_left),
            Paragraph(row[1].replace('\n', '<br/>'), s_table_cell_left),
            Paragraph(row[2], s_table_cell_left),
        ])
    dim_table = Table(dim_data, colWidths=[1.4*inch, 2.8*inch, 2.0*inch], hAlign='LEFT')
    dim_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('BACKGROUND', (0,1), (-1,-1), white),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, LIGHT_GRAY]),
    ]))
    story.append(dim_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        '<i>Example: A 12,400-word Earnings Report → Japanese, using J-GAAP Specialist (12cr), Brand Voice Sentry (5cr), '
        'and Meridian Digital Twin (8cr), with one HITL review loop:</i>',
        s_callout
    ))
    # Example calculation
    calc_data = [
        ['Base Processing', '13 cr', '(12,400 words)'],
        ['Agent Credits', '25 cr', '(12 + 5 + 8)'],
        ['Locale Multiplier', '× 1.5', '(JA = Tier 2)'],
        ['Review Credits', '3 cr', '(1 HITL loop)'],
        ['', '', ''],
        ['Total', '60 cr', '((13 + 25) × 1.5) + 3'],
    ]
    calc_table = Table(
        [[Paragraph(r[0], ParagraphStyle('c1', fontName='Helvetica-Bold' if i==5 else 'Helvetica', fontSize=9, textColor=DARK if i!=5 else PRIMARY)),
          Paragraph(r[1], ParagraphStyle('c2', fontName='Helvetica-Bold' if i==5 else 'Courier', fontSize=9, textColor=PRIMARY if i==5 else DARK, alignment=TA_CENTER)),
          Paragraph(r[2], ParagraphStyle('c3', fontName='Helvetica', fontSize=8, textColor=GRAY))]
         for i, r in enumerate(calc_data)],
        colWidths=[1.5*inch, 1*inch, 2*inch],
        hAlign='LEFT',
    )
    calc_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LINEBELOW', (0,4), (-1,4), 1, DARK),
        ('BACKGROUND', (0,5), (-1,5), HexColor('#f0f9ff')),
    ]))
    story.append(calc_table)

    story.append(PageBreak())

    # 1.3 Enterprise Pricing Tiers
    story.append(Paragraph('1.3 &nbsp; Enterprise Pricing Tiers', s_h2))
    story.append(Paragraph(
        'Not Verify offers three commercial tiers. All tiers include the platform, base AI models, and standard support. '
        'Credits are the variable cost dimension.',
        s_body
    ))

    tier_header = [
        Paragraph('', s_table_head),
        Paragraph('Starter', s_table_head),
        Paragraph('Business', s_table_head),
        Paragraph('Enterprise', s_table_head),
    ]
    tier_rows = [
        ['Monthly Credits', '500 cr', '5,000 cr', 'Custom'],
        ['Per-Credit Cost', '$0.40/cr', '$0.28/cr', 'Negotiated'],
        ['Overage Rate', '$0.52/cr', '$0.36/cr', 'Committed-Use'],
        ['Seats', '5', '25', 'Unlimited'],
        ['Domain Modules', '1 included', '3 included', 'All included'],
        ['HITL Review', 'Basic', 'Priority Queue', 'Dedicated Team'],
        ['Org Brain', '10 GB', '100 GB', 'Unlimited'],
        ['SLA', '99.5%', '99.9%', '99.99%'],
        ['Support', 'Email', 'Priority', 'Named CSM + TAM'],
    ]
    tier_data = [tier_header]
    for row in tier_rows:
        tier_data.append([
            Paragraph(f'<b>{row[0]}</b>', s_table_cell_left),
            Paragraph(row[1], s_table_cell),
            Paragraph(row[2], s_table_cell),
            Paragraph(f'<b>{row[3]}</b>', s_table_cell),
        ])
    tier_table = Table(tier_data, colWidths=[1.5*inch, 1.4*inch, 1.4*inch, 1.4*inch], hAlign='LEFT')
    tier_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BACKGROUND', (0,1), (0,-1), HexColor('#f9fafb')),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (1,1), (-1,-1), [white, LIGHT_GRAY]),
    ]))
    story.append(tier_table)
    story.append(Spacer(1, 12))

    # 1.4 Usage & Billing Dashboard UX
    story.append(Paragraph('1.4 &nbsp; Usage &amp; Billing Dashboard — UX Flow', s_h2))
    story.append(Paragraph(
        'A new "Usage &amp; Billing" view accessible from the primary navigation and the user profile menu. '
        'This dashboard provides real-time visibility into credit consumption, projected costs, and historical usage.',
        s_body
    ))
    story.append(Paragraph('<b>Dashboard Components</b>', s_body_bold))

    ux_items = [
        ('<b>Credit Balance Widget</b> — Large, always-visible display: "2,340 of 5,000 credits remaining" with a visual progress bar. Color shifts from blue → amber (80% used) → red (95% used). Links to "Buy More Credits" CTA.',
        ),
        ('<b>Current Billing Period Card</b> — Shows period dates, total credits consumed, projected end-of-period usage (based on trailing 7-day average), and estimated overage cost if trending over the allocation.',
        ),
        ('<b>Cost Breakdown Chart</b> — Stacked bar chart showing credit consumption by dimension: Base Processing (blue), Agent Credits (purple), Locale Multiplier (teal), Review Credits (amber). Filterable by date range, project, and team.',
        ),
        ('<b>Project-Level Ledger</b> — Sortable table of every project with columns: Project Name, Date, Source Words, Target Locales, Agents Used, Credits Consumed, Status. Each row is expandable to show the four-dimension breakdown. Exportable to CSV/XLSX.',
        ),
        ('<b>Pre-Flight Cost Estimator</b> — Before any project executes, the PreFlight Simulator (existing) is enhanced to show a binding cost estimate card: "This project will consume ~59 credits" with a breakdown. User must acknowledge before proceeding.',
        ),
    ]
    for item in ux_items:
        story.append(Paragraph(item[0], s_bullet, bulletText='•'))

    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>UX Workflow: Viewing Cost Before Execution</b>', s_body_bold))
    steps = [
        'User configures project in PreFlight Simulator (selects agents, locales, uploads source).',
        'Platform calculates credit estimate in real time — displayed as a prominent card: <b>"Estimated Cost: 59 credits"</b> with expandable breakdown.',
        'If estimated cost exceeds remaining balance, a blocking dialog appears: "This project requires 59 credits. You have 23 remaining. <b>Purchase additional credits</b> or <b>reduce scope.</b>"',
        'User acknowledges cost → project executes → credits are deducted atomically upon completion.',
        'If project fails or is cancelled before completion, credits are fully refunded within 60 seconds.',
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f'<b>{i}.</b> &nbsp; {step}', s_numbered))

    story.append(PageBreak())

    # ════════════════════════════════════════════
    # SECTION 2: AUTO-PUBLISH RESOLUTION
    # ════════════════════════════════════════════
    story.append(Paragraph('SECTION 2', s_section_num))
    story.append(Paragraph('Auto-Publish Resolution Workflow', s_h1))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=12))

    # 2.1
    story.append(Paragraph('2.1 &nbsp; Current Problem', s_h2))
    story.append(Paragraph(
        'The "Auto-Publish Not Cleared" badge in the Quality Narrative phase displays a red warning when a project\'s '
        'trust score falls below the configured auto-publish threshold (default: 92%). Currently, this badge is a dead end — '
        'the user sees the warning but receives no guidance on what specific actions would resolve it. '
        'The badge appears as a permanent blocker with no path forward.',
        s_body
    ))
    story.append(Paragraph(
        '<i>User feedback: "I see the red badge. I know something is wrong. But I have no idea what I need to do to fix it, '
        'or whether fixing it is even possible on this project."</i>',
        s_callout
    ))

    # 2.2
    story.append(Paragraph('2.2 &nbsp; Business Logic: Clearance Criteria', s_h2))
    story.append(Paragraph(
        'Auto-publish clearance is granted when <b>all</b> of the following conditions are simultaneously satisfied:',
        s_body
    ))

    criteria = [
        '<b>Trust Score ≥ Threshold</b> — The project\'s composite trust score must meet or exceed the organization\'s configured auto-publish threshold (default 92%, configurable 90–100%).',
        '<b>Zero Unresolved Critical Flags</b> — Every segment flagged with "Critical" severity must have a human decision (Accept, Edit, or Reject). No critical flags may remain in an unresolved state.',
        '<b>Zero Unresolved Major Flags</b> — Every segment flagged with "Major" severity must have a human decision. Minor flags do not block auto-publish.',
        '<b>Compliance Gate Passed</b> — The project must pass all domain-specific compliance checks (e.g., J-GAAP standard references resolved, currency formatting correct for target locale, regulatory boilerplate present).',
        '<b>No Low-Confidence Segments Below Floor</b> — No individual segment may have a confidence score below the organization\'s minimum floor (default: 70%). Segments below this floor require explicit human review.',
    ]
    for c in criteria:
        story.append(Paragraph(c, s_bullet, bulletText='•'))

    story.append(Spacer(1, 6))
    story.append(Paragraph(
        '<b>Clearance is evaluated continuously</b> — every time a decision is made in the Human Review phase, the platform '
        're-evaluates all five criteria. The badge updates in real time.',
        s_body
    ))

    story.append(Spacer(1, 8))

    # 2.3 Resolution Workflow
    story.append(Paragraph('2.3 &nbsp; Resolution Workflow — Step-by-Step UX', s_h2))
    story.append(Paragraph(
        'The red badge transforms from a dead end into an interactive resolution guide:',
        s_body
    ))

    workflow_steps = [
        ('<b>Badge Click → Resolution Panel</b>',
         'Clicking the "Auto-Publish Not Cleared" badge opens an anchored panel (not a modal — the user stays in context). '
         'The panel title reads: "Auto-Publish Checklist — N of 5 criteria met."'),
        ('<b>Criteria Checklist (Live)</b>',
         'Five rows, each showing a criterion with a real-time status icon:\n'
         '&nbsp;&nbsp;✅ Green checkmark = criterion met\n'
         '&nbsp;&nbsp;🔴 Red circle = criterion not met (with count, e.g., "2 critical flags unresolved")\n'
         'Each unmet criterion has a <b>"Resolve →"</b> action link that navigates directly to the relevant view.'),
        ('<b>Guided Navigation</b>',
         '"Resolve →" on Trust Score links to the PreFlight Simulator with enhancement suggestions.\n'
         '"Resolve →" on Critical/Major Flags opens the Continuous Narrative View, pre-filtered to show only unresolved flags of that severity.\n'
         '"Resolve →" on Compliance Gate opens the compliance detail panel.\n'
         '"Resolve →" on Low-Confidence Segments opens the narrative view filtered to segments below the floor.'),
        ('<b>Progressive Badge Update</b>',
         'As the user resolves criteria, the badge transitions through states:\n'
         '&nbsp;&nbsp;<font color="#dc2626">● Not Cleared (0–2 of 5)</font> → '
         '<font color="#d97706">● In Progress (3–4 of 5)</font> → '
         '<font color="#059669">● Cleared (5 of 5)</font>\n'
         'The number indicator provides continuous progress feedback.'),
        ('<b>Clearance Confirmation</b>',
         'When all 5 criteria are met, the badge turns green and a confirmation toast appears: '
         '"Auto-Publish Cleared — this project will be published automatically in 30 minutes." '
         'A "Publish Now" button is available for immediate action. A "Hold" button pauses auto-publish for manual review.'),
    ]
    for i, (title, desc) in enumerate(workflow_steps, 1):
        story.append(Paragraph(f'<b>Step {i}: {title}</b>', s_body_bold))
        story.append(Paragraph(desc.replace('\n', '<br/>'), s_body))

    story.append(PageBreak())

    # 2.4 Badge State Machine
    story.append(Paragraph('2.4 &nbsp; Badge State Machine', s_h2))
    story.append(Paragraph(
        'The auto-publish badge has five discrete states with defined transitions:',
        s_body
    ))

    badge_header = [
        Paragraph('State', s_table_head),
        Paragraph('Visual', s_table_head),
        Paragraph('Label', s_table_head),
        Paragraph('Trigger', s_table_head),
    ]
    badge_rows = [
        ['Blocked', '🔴 Red badge, pulse animation', '"Not Cleared (1 of 5)"', '< 3 criteria met'],
        ['In Progress', '🟡 Amber badge', '"In Progress (3 of 5)"', '3–4 criteria met'],
        ['Cleared', '🟢 Green badge, subtle glow', '"Cleared for Publish"', 'All 5 criteria met'],
        ['Publishing', '🔵 Blue badge, spinner', '"Publishing..."', 'Publish initiated'],
        ['Published', '✅ Static green, no badge', '"Published"', 'Publish complete'],
    ]
    badge_data = [badge_header]
    for row in badge_rows:
        badge_data.append([
            Paragraph(f'<b>{row[0]}</b>', s_table_cell_left),
            Paragraph(row[1], s_table_cell_left),
            Paragraph(row[2], s_table_cell_left),
            Paragraph(row[3], s_table_cell_left),
        ])
    badge_table = Table(badge_data, colWidths=[1*inch, 1.8*inch, 1.6*inch, 1.6*inch], hAlign='LEFT')
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, LIGHT_GRAY]),
    ]))
    story.append(badge_table)

    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>Edge Cases</b>', s_body_bold))
    edge_cases = [
        'If the user <b>lowers the threshold</b> (e.g., from 92% to 90%), the system re-evaluates immediately. A project at 91% trust would instantly clear.',
        'If a <b>previously cleared project</b> receives a new critical flag (e.g., from a triggered realignment), it reverts to "Not Cleared" and the user is notified via toast.',
        'The <b>"100% Manual Only"</b> threshold option disables auto-publish entirely — the badge shows "Manual Review Required" in a neutral gray state.',
    ]
    for ec in edge_cases:
        story.append(Paragraph(ec, s_bullet, bulletText='•'))

    story.append(PageBreak())

    # ════════════════════════════════════════════
    # SECTION 3: PLATFORM EXTENSIBILITY
    # ════════════════════════════════════════════
    story.append(Paragraph('SECTION 3', s_section_num))
    story.append(Paragraph('Platform Extensibility &amp; New Verticals', s_h1))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=12))

    # 3.1
    story.append(Paragraph('3.1 &nbsp; Domain Module Architecture', s_h2))
    story.append(Paragraph(
        'The platform must be decoupled from any single industry. We introduce <b>Domain Modules</b> — self-contained, '
        'activatable packages that configure the Intelligence Hub for a specific regulated vertical. Each Domain Module includes:',
        s_body
    ))

    module_components = [
        '<b>Specialized AI Agents</b> — Pre-trained models for the domain\'s regulatory and linguistic requirements (e.g., J-GAAP Specialist for Finance, HIPAA Compliance Agent for Healthcare).',
        '<b>Compliance Rule Sets</b> — Machine-readable rules that define what the quality and compliance gates check for (e.g., FDA 21 CFR Part 11 for pharma, GDPR Article 30 for legal).',
        '<b>Terminology Knowledge Bases</b> — Domain-specific glossaries, Do-Not-Translate lists, and approved term pairs pre-loaded into the Org Brain.',
        '<b>Quality Calibration Profiles</b> — Pre-tuned trust score weightings that reflect the domain\'s tolerance for error (e.g., clinical trial docs have near-zero tolerance; marketing has higher flexibility).',
        '<b>Workflow Templates</b> — Default agent assembly configurations and review routing rules appropriate for the domain (e.g., pharma always requires dual HITL review).',
    ]
    for mc in module_components:
        story.append(Paragraph(mc, s_bullet, bulletText='•'))

    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>Architectural Principle: Composition, Not Forks</b>', s_body_bold))
    story.append(Paragraph(
        'Domain Modules compose onto the existing platform — they do not fork it. The core document processing pipeline, '
        'Continuous Narrative View, Intelligence Sidebar, Knowledge Rules engine, and Propagation system remain '
        'domain-agnostic. Modules inject domain-specific behavior at defined extension points:',
        s_body
    ))

    ext_points = [
        '<b>Agent Registry</b> — Modules register their agents into the global agent catalog. The PreFlight Simulator displays only agents relevant to the active module(s).',
        '<b>Compliance Gate API</b> — Modules define compliance checks as rule functions that the Quality Narrative phase evaluates. Multiple modules can stack (e.g., a Life Sciences + EU Regulatory combo).',
        '<b>Knowledge Base Loader</b> — Module activation seeds the Org Brain with domain terminology. This data merges with (never overwrites) organization-specific Knowledge Rules.',
        '<b>Onboarding Adapter</b> — The onboarding flow dynamically adjusts its questions based on the selected module (e.g., asking about target regulatory bodies for pharma vs. filing jurisdictions for finance).',
    ]
    for ep in ext_points:
        story.append(Paragraph(ep, s_bullet, bulletText='•'))

    story.append(PageBreak())

    # 3.2 Intelligence Hub Configuration UX
    story.append(Paragraph('3.2 &nbsp; Intelligence Hub Configuration UX', s_h2))
    story.append(Paragraph(
        'Enterprise users configure their active Domain Modules through a new "Domain Configuration" panel accessible '
        'from the Intelligence Hub settings gear icon.',
        s_body
    ))
    story.append(Paragraph('<b>Configuration Workflow</b>', s_body_bold))

    config_steps = [
        '<b>1.</b> &nbsp; User clicks the <b>settings gear</b> in the Intelligence Hub header → "Domain Modules" tab opens.',
        '<b>2.</b> &nbsp; The panel displays a <b>module catalog</b> — cards for each available vertical: Financial Services, Healthcare &amp; Life Sciences, Legal &amp; Compliance, Technology, Manufacturing, Media &amp; Entertainment.',
        '<b>3.</b> &nbsp; Each card shows: module name, description, number of specialized agents included, compliance frameworks covered, and credit cost impact (e.g., "+2 cr/project for pharma compliance checks").',
        '<b>4.</b> &nbsp; User clicks <b>"Activate"</b> on one or more modules. Multi-module activation is supported (e.g., a pharma company doing EU filings activates both "Healthcare" and "Legal").',
        '<b>5.</b> &nbsp; On activation, the system: (a) injects module agents into the agent catalog, (b) seeds the Org Brain with domain terminology, (c) adjusts the compliance gate rules, (d) updates the onboarding flow for future projects.',
        '<b>6.</b> &nbsp; A <b>confirmation dialog</b> shows what changed: "Activated: Healthcare &amp; Life Sciences — 4 agents added, 2,340 terms loaded, FDA/EMA compliance gates enabled."',
        '<b>7.</b> &nbsp; Modules can be <b>deactivated</b> at any time. Deactivation removes agents from new projects but does not affect in-flight or completed projects.',
    ]
    for step in config_steps:
        story.append(Paragraph(step, s_numbered))

    story.append(Spacer(1, 10))

    # 3.3 Industry Agent Packs
    story.append(Paragraph('3.3 &nbsp; Industry Agent Packs — Catalog', s_h2))
    story.append(Paragraph(
        'Each Domain Module ships with a curated set of AI agents. Below is the initial catalog:',
        s_body
    ))

    pack_header = [
        Paragraph('Module', s_table_head),
        Paragraph('Agents Included', s_table_head),
        Paragraph('Compliance Frameworks', s_table_head),
        Paragraph('Cost', s_table_head),
    ]
    pack_rows = [
        ['Financial\nServices',
         'J-GAAP Specialist (12cr)\nSEC Filing Agent (14cr)\nIFRS Mapper (10cr)\nCurrency Formatter (5cr)',
         'US GAAP, IFRS, J-GAAP\nTSE, SEC, FCA',
         '12–14\ncr/agent'],
        ['Healthcare &amp;\nLife Sciences',
         'Clinical Trial Localizer (18cr)\nHIPAA Compliance Agent (16cr)\nFDA Labeling Specialist (15cr)\nMedical Terminology Agent (12cr)',
         'FDA 21 CFR Part 11\nEMA, ICH-GCP\nHIPAA, HITECH',
         '12–18\ncr/agent'],
        ['Legal &amp;\nCompliance',
         'GDPR Compliance Agent (15cr)\nContract Law Specialist (14cr)\nIP/Patent Linguist (16cr)\nRegulatory Filing Agent (12cr)',
         'GDPR, CCPA\nSOX, Basel III\nEU AI Act',
         '12–16\ncr/agent'],
        ['Technology',
         'API Doc Specialist (8cr)\nUI String Localizer (6cr)\nSDK Reference Agent (10cr)',
         'WCAG 2.1\nISO 17100',
         '6–10\ncr/agent'],
    ]
    pack_data = [pack_header]
    for row in pack_rows:
        pack_data.append([
            Paragraph(f'<b>{row[0]}</b>', s_table_cell_left),
            Paragraph(row[1].replace('\n', '<br/>'), s_table_cell_left),
            Paragraph(row[2].replace('\n', '<br/>'), s_table_cell_left),
            Paragraph(row[3].replace('\n', '<br/>'), s_table_cell),
        ])
    pack_table = Table(pack_data, colWidths=[1.1*inch, 2.2*inch, 1.7*inch, 0.9*inch], hAlign='LEFT')
    pack_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, LIGHT_GRAY]),
    ]))
    story.append(pack_table)

    story.append(PageBreak())

    # 3.4 Vertical Deep Dives
    story.append(Paragraph('3.4 &nbsp; Vertical Deep Dives', s_h2))

    # Healthcare
    story.append(Paragraph('<b>Healthcare &amp; Life Sciences</b>', s_h3))
    story.append(Paragraph(
        'Pharmaceutical companies localizing clinical trial protocols, IFUs (Instructions for Use), and regulatory submissions '
        'face the highest-stakes translation environment in enterprise. A single terminology error in a drug label can trigger '
        'an FDA warning letter or delay a product launch by months.',
        s_body
    ))
    story.append(Paragraph('<b>How the platform adapts:</b>', s_body_bold))
    health_items = [
        '<b>Clinical Trial Localizer</b> agent understands ICH-GCP terminology, subject consent form conventions, and site-specific regulatory requirements per country.',
        '<b>HIPAA Compliance Agent</b> automatically detects and flags Protected Health Information (PHI) in source documents, preventing accidental exposure in translated outputs.',
        '<b>FDA Labeling Specialist</b> enforces 21 CFR Part 201 label formatting requirements, including black box warning placement, dosage instructions, and contraindication language.',
        '<b>Dual HITL Review</b> is the default workflow — all clinical documents require two independent human reviewers, with a conflict resolution step if they disagree.',
        '<b>Quality floor is set to 95%</b> by default (vs. 92% for finance) — reflecting the near-zero tolerance for translation errors in patient-facing materials.',
    ]
    for item in health_items:
        story.append(Paragraph(item, s_bullet, bulletText='•'))

    story.append(Spacer(1, 10))

    # Legal
    story.append(Paragraph('<b>Legal &amp; Compliance</b>', s_h3))
    story.append(Paragraph(
        'Law firms and corporate legal departments localize contracts, regulatory filings, and compliance documentation '
        'across jurisdictions. Legal translation requires precision in defined terms, jurisdictional references, and '
        'legislative citation formats.',
        s_body
    ))
    story.append(Paragraph('<b>How the platform adapts:</b>', s_body_bold))
    legal_items = [
        '<b>GDPR Compliance Agent</b> scans source and target documents for personal data handling language, ensuring translated privacy policies maintain legal equivalence across EU member states.',
        '<b>Contract Law Specialist</b> identifies governing law clauses, arbitration references, and defined terms ("the Company," "the Parties") — ensuring they remain consistent and correctly localized throughout a document.',
        '<b>IP/Patent Linguist</b> preserves patent claim language precision — a critical requirement where a single word change can alter the scope of patent protection.',
        '<b>Jurisdiction-aware compliance gates</b> check that translated contracts reference the correct local laws (e.g., "Code Civil" in French filings, "BGB" in German, "Civil Code" in English).',
        '<b>Defined Term Locking</b> — any term defined in a contract header (e.g., "Effective Date means...") is automatically locked as a Do-Not-Translate term and propagated consistently using the existing Knowledge Rules engine.',
    ]
    for item in legal_items:
        story.append(Paragraph(item, s_bullet, bulletText='•'))

    story.append(Spacer(1, 16))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=12))
    story.append(Paragraph(
        '<b>End of Document</b> — PRD-2026-Q1-003 v1.0',
        ParagraphStyle('end', fontName='Helvetica-Bold', fontSize=9, textColor=GRAY, alignment=TA_CENTER)
    ))

    # ── Build ──
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print('✅ PDF generated: Not_Verify_PRD_Strategic_Update.pdf')

if __name__ == '__main__':
    build_pdf()
