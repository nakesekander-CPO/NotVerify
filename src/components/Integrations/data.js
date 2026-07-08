export const CONNECTORS = [
  // File Storage
  { id: 'google-drive', name: 'Google Drive', category: 'File Storage', color: '#4285F4', letter: 'G' },
  { id: 'dropbox', name: 'Dropbox', category: 'File Storage', color: '#0061FF', letter: 'D' },
  { id: 'box', name: 'Box', category: 'File Storage', color: '#0061D5', letter: 'B' },
  { id: 'sharepoint', name: 'SharePoint', category: 'File Storage', color: '#038387', letter: 'S' },
  { id: 'onedrive', name: 'OneDrive', category: 'File Storage', color: '#0078D4', letter: 'O' },
  // Communication
  { id: 'slack', name: 'Slack', category: 'Communication', color: '#4A154B', letter: 'S' },
  { id: 'gmail', name: 'Gmail', category: 'Communication', color: '#EA4335', letter: 'G' },
  { id: 'teams', name: 'Microsoft Teams', category: 'Communication', color: '#6264A7', letter: 'T' },
  // Project Management
  { id: 'jira', name: 'Jira', category: 'Project Management', color: '#0052CC', letter: 'J' },
  { id: 'asana', name: 'Asana', category: 'Project Management', color: '#F06A6A', letter: 'A' },
  { id: 'linear', name: 'Linear', category: 'Project Management', color: '#5E6AD2', letter: 'L' },
  { id: 'clickup', name: 'ClickUp', category: 'Project Management', color: '#7B68EE', letter: 'C' },
  // CRM
  { id: 'salesforce', name: 'Salesforce', category: 'CRM', color: '#00A1E0', letter: 'S' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', color: '#FF7A59', letter: 'H' },
  { id: 'dynamics', name: 'Dynamics 365', category: 'CRM', color: '#002050', letter: 'D' },
  // Knowledge Base
  { id: 'confluence', name: 'Confluence', category: 'Knowledge Base', color: '#0052CC', letter: 'C' },
  { id: 'notion', name: 'Notion', category: 'Knowledge Base', color: '#37352F', letter: 'N' },
  { id: 'coda', name: 'Coda', category: 'Knowledge Base', color: '#F46A54', letter: 'C' },
  // Ticketing
  { id: 'zendesk', name: 'Zendesk', category: 'Ticketing', color: '#03363D', letter: 'Z' },
  { id: 'freshdesk', name: 'Freshdesk', category: 'Ticketing', color: '#25C16F', letter: 'F' },
  // Dev Tools
  { id: 'github', name: 'GitHub', category: 'Dev Tools', color: '#24292E', letter: 'G' },
  { id: 'gitlab', name: 'GitLab', category: 'Dev Tools', color: '#FC6D26', letter: 'G' },
  // Calendar
  { id: 'google-calendar', name: 'Google Calendar', category: 'Calendar', color: '#1A73E8', letter: 'C' },
  { id: 'calendly', name: 'Calendly', category: 'Calendar', color: '#006BFF', letter: 'C' },
  // Productivity
  { id: 'google-sheets', name: 'Google Sheets', category: 'Productivity', color: '#34A853', letter: 'S' },
  { id: 'docusign', name: 'DocuSign', category: 'Productivity', color: '#FFCC00', letter: 'D' },
]

export const CATEGORIES = [
  'All',
  'File Storage',
  'Communication',
  'Project Management',
  'CRM',
  'Knowledge Base',
  'Ticketing',
  'Dev Tools',
  'Calendar',
  'Productivity',
]

export const TRIGGERS = [
  { id: 'doc-uploaded', label: 'Document uploaded', step: 1 },
  { id: 'agents-assigned', label: 'Agent ensemble assigned', step: 2 },
  { id: 'processing-complete', label: 'Processing complete', step: 3 },
  { id: 'quality-passed', label: 'Quality check passed', step: 4 },
  { id: 'quality-failed', label: 'Quality check failed', step: 4 },
  { id: 'quality-threshold', label: 'Quality score threshold met', step: 4 },
  { id: 'compliance-approved', label: 'Compliance review approved', step: 5 },
  { id: 'compliance-flagged', label: 'Compliance review flagged', step: 5 },
  { id: 'review-approved', label: 'Human review approved', step: 6 },
  { id: 'review-revision', label: 'Revision requested', step: 6 },
  { id: 'org-brain-updated', label: 'Cortex entry created / updated', step: 7 },
  { id: 'manual', label: 'Manual trigger', step: null },
]

export const CONDITION_TYPES = [
  { id: 'doc-type', label: 'Document type is', options: ['.pdf', '.docx', '.pptx', '.xlsx', '.mp4'] },
  { id: 'locale', label: 'Target locale is', options: ['JA', 'DE', 'FR', 'ES', 'ZH', 'KO'] },
  { id: 'quality-above', label: 'Quality score above', options: ['70', '75', '80', '85', '90'] },
  { id: 'quality-below', label: 'Quality score below', options: ['70', '65', '60', '55'] },
  { id: 'compliance-status', label: 'Compliance status is', options: ['passed', 'flagged', 'pending'] },
  { id: 'agent', label: 'Agent involved is', options: ['JP-FIN-3', 'Brand Voice Sentry', 'Compliance Monitor'] },
]

export const CONNECTOR_ACTIONS = {
  slack: [
    { id: 'slack-message', label: 'Send message to channel', fields: ['channel', 'message'] },
    { id: 'slack-dm', label: 'Send DM to user', fields: ['user', 'message'] },
    { id: 'slack-channel', label: 'Create channel', fields: ['name'] },
  ],
  'google-drive': [
    { id: 'gdrive-upload', label: 'Upload file', fields: ['folder'] },
    { id: 'gdrive-folder', label: 'Create folder', fields: ['name', 'parent'] },
    { id: 'gdrive-move', label: 'Move file', fields: ['destination'] },
  ],
  dropbox: [
    { id: 'dropbox-upload', label: 'Upload file', fields: ['path'] },
    { id: 'dropbox-folder', label: 'Create folder', fields: ['name'] },
  ],
  box: [
    { id: 'box-upload', label: 'Upload file', fields: ['folder'] },
    { id: 'box-folder', label: 'Create folder', fields: ['name'] },
  ],
  sharepoint: [
    { id: 'sp-upload', label: 'Upload to library', fields: ['library', 'folder'] },
  ],
  gmail: [
    { id: 'gmail-send', label: 'Send email', fields: ['to', 'subject', 'body'] },
    { id: 'gmail-notify', label: 'Send notification email', fields: ['to', 'body'] },
  ],
  jira: [
    { id: 'jira-ticket', label: 'Create ticket', fields: ['project', 'type', 'summary', 'assignee'] },
    { id: 'jira-comment', label: 'Add comment to issue', fields: ['issue', 'body'] },
    { id: 'jira-status', label: 'Update issue status', fields: ['issue', 'status'] },
  ],
  linear: [
    { id: 'linear-issue', label: 'Create issue', fields: ['team', 'title', 'assignee'] },
    { id: 'linear-comment', label: 'Add comment', fields: ['issue', 'body'] },
  ],
  asana: [
    { id: 'asana-task', label: 'Create task', fields: ['project', 'name', 'assignee'] },
    { id: 'asana-status', label: 'Update task status', fields: ['task', 'status'] },
  ],
  salesforce: [
    { id: 'sf-record', label: 'Create record', fields: ['object', 'name'] },
    { id: 'sf-update', label: 'Update opportunity', fields: ['opportunity', 'field', 'value'] },
    { id: 'sf-log', label: 'Log activity', fields: ['record', 'subject', 'description'] },
  ],
  hubspot: [
    { id: 'hs-deal', label: 'Update deal stage', fields: ['deal', 'stage'] },
    { id: 'hs-note', label: 'Create note', fields: ['contact', 'body'] },
  ],
  confluence: [
    { id: 'cf-page', label: 'Create page', fields: ['space', 'title', 'body'] },
    { id: 'cf-update', label: 'Update page', fields: ['page', 'body'] },
  ],
  notion: [
    { id: 'notion-page', label: 'Create page', fields: ['database', 'title'] },
    { id: 'notion-db', label: 'Add to database', fields: ['database', 'title'] },
  ],
  github: [
    { id: 'gh-issue', label: 'Create issue', fields: ['repo', 'title', 'body'] },
    { id: 'gh-pr', label: 'Open pull request', fields: ['repo', 'title', 'branch'] },
  ],
  'google-sheets': [
    { id: 'sheets-row', label: 'Add row', fields: ['spreadsheet', 'sheet'] },
    { id: 'sheets-cell', label: 'Update cell', fields: ['spreadsheet', 'cell', 'value'] },
  ],
  'google-calendar': [
    { id: 'cal-event', label: 'Create event', fields: ['title', 'date', 'attendees'] },
  ],
  zendesk: [
    { id: 'zd-ticket', label: 'Create ticket', fields: ['subject', 'description', 'priority'] },
    { id: 'zd-note', label: 'Add internal note', fields: ['ticket', 'body'] },
  ],
  freshdesk: [
    { id: 'fd-ticket', label: 'Create ticket', fields: ['subject', 'description'] },
  ],
  docusign: [
    { id: 'ds-sign', label: 'Send for signature', fields: ['template', 'recipient'] },
  ],
}

export const WORKFLOW_TEMPLATES = [
  {
    id: 't1',
    name: 'Notify team on completion',
    description: 'Send a Slack message when a document is approved.',
    trigger: 'review-approved',
    condition: null,
    actions: [{ connectorId: 'slack', actionId: 'slack-message', config: { channel: '#deliveries', message: '✅ {{document.name}} has been approved. Download: {{document.link}}' } }],
  },
  {
    id: 't2',
    name: 'File to client folder',
    description: 'Upload the final document to the client\'s Google Drive folder.',
    trigger: 'review-approved',
    condition: null,
    actions: [{ connectorId: 'google-drive', actionId: 'gdrive-upload', config: { folder: '/Deliverables/{{project.client}}' } }],
  },
  {
    id: 't3',
    name: 'Flag compliance issues',
    description: 'Create a Jira ticket and DM the compliance lead when compliance is flagged.',
    trigger: 'compliance-flagged',
    condition: null,
    actions: [
      { connectorId: 'jira', actionId: 'jira-ticket', config: { project: 'COMP', type: 'Bug', summary: 'Compliance flag: {{document.name}}', assignee: 'compliance-lead' } },
      { connectorId: 'slack', actionId: 'slack-dm', config: { user: '@compliance-lead', message: 'Compliance flagged on {{document.name}}: {{compliance.details}}' } },
    ],
  },
  {
    id: 't4',
    name: 'Sync to knowledge base',
    description: 'Create a Confluence page when a new Cortex entry is added.',
    trigger: 'org-brain-updated',
    condition: null,
    actions: [{ connectorId: 'confluence', actionId: 'cf-page', config: { space: 'KNOW', title: '{{entry.title}}', body: '{{entry.content}}' } }],
  },
  {
    id: 't5',
    name: 'Quality alert — JA',
    description: 'Create a Linear issue and notify the quality team for Japanese content below threshold.',
    trigger: 'quality-threshold',
    condition: { type: 'locale', value: 'JA' },
    actions: [
      { connectorId: 'linear', actionId: 'linear-issue', config: { team: 'QUAL', title: 'Quality alert: {{document.name}} ({{quality.score}}%)', assignee: 'jp-fin-team' } },
      { connectorId: 'slack', actionId: 'slack-message', config: { channel: '#quality-ja', message: '⚠️ Quality score {{quality.score}}% on {{document.name}}' } },
    ],
  },
  {
    id: 't6',
    name: 'Client CRM update',
    description: 'Update the Salesforce opportunity when processing is complete.',
    trigger: 'processing-complete',
    condition: null,
    actions: [{ connectorId: 'salesforce', actionId: 'sf-update', config: { opportunity: '{{project.client}}', field: 'Deliverable_Status__c', value: 'Processing Complete' } }],
  },
]
