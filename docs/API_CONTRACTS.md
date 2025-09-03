# PDL API Contracts & Data Schemas

## Core Data Types

### Base Types
```typescript
type UUID = string;
type ISO8601DateTime = string;
type PhaseType = 'discovery' | 'planning' | 'development' | 'launch' | 'growth' | 'optimization';
type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';
type Priority = 'low' | 'medium' | 'high' | 'critical';
type AgentType = 'product_manager' | 'tech_lead' | 'developer' | 'designer' | 'qa_engineer' | 'devops' | 'analyst';
```

### Phase Management Schemas

#### PDLPhase
```typescript
interface PDLPhase {
  id: UUID;
  name: PhaseType;
  displayName: string;
  description: string;
  startDate: ISO8601DateTime;
  endDate?: ISO8601DateTime;
  plannedEndDate: ISO8601DateTime;
  status: 'pending' | 'active' | 'completed' | 'blocked' | 'on_hold';
  progress: number; // 0-100
  gateApproved: boolean;
  gateReviewDate?: ISO8601DateTime;
  gateReviewer?: string;
  gateNotes?: string;
  milestones: Milestone[];
  metrics: PhaseMetrics;
  dependencies: UUID[]; // Other phase IDs
  deliverables: Deliverable[];
  risks: Risk[];
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

interface Milestone {
  id: UUID;
  title: string;
  description: string;
  dueDate: ISO8601DateTime;
  completedDate?: ISO8601DateTime;
  status: 'pending' | 'completed' | 'overdue';
  assignedTo: UUID; // Agent ID
  deliverables: string[];
}

interface PhaseMetrics {
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  averageVelocity: number;
  burndownRate: number;
  qualityMetrics: {
    defectRate: number;
    testCoverage: number;
    codeReviewCompletion: number;
  };
}

interface Deliverable {
  id: UUID;
  name: string;
  description: string;
  type: 'document' | 'code' | 'design' | 'prototype' | 'report';
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  assignedTo: UUID;
  reviewedBy?: UUID[];
  filePaths: string[];
  tags: string[];
}
```

#### PhaseTransition
```typescript
interface PhaseTransition {
  id: UUID;
  fromPhase: PhaseType;
  toPhase: PhaseType;
  transitionDate: ISO8601DateTime;
  triggeredBy: UUID; // Agent ID
  gateApprovalRequired: boolean;
  gateApprovalStatus: 'pending' | 'approved' | 'rejected';
  approver?: UUID;
  approvalNotes?: string;
  rollbackPlan?: string;
  impactAssessment: {
    affectedAgents: UUID[];
    resourceChanges: ResourceChange[];
    riskLevel: 'low' | 'medium' | 'high';
  };
}

interface ResourceChange {
  resourceType: 'agent' | 'budget' | 'timeline' | 'scope';
  changeDescription: string;
  impact: 'positive' | 'neutral' | 'negative';
}
```

### Agent Management Schemas

#### AgentStatus
```typescript
interface AgentStatus {
  id: UUID;
  name: string;
  email: string;
  type: AgentType;
  specializations: string[];
  currentPhase: PhaseType;
  currentTasks: UUID[];
  status: 'available' | 'busy' | 'blocked' | 'offline' | 'on_leave';
  workload: {
    currentCapacity: number; // 0-100%
    assignedStoryPoints: number;
    completedStoryPoints: number;
    averageVelocity: number;
  };
  performance: AgentPerformance;
  availability: {
    hoursPerWeek: number;
    timeZone: string;
    workingHours: {
      start: string; // "09:00"
      end: string;   // "17:00"
    };
  };
  lastActive: ISO8601DateTime;
  metadata: Record<string, any>;
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

interface AgentPerformance {
  completedTasks: number;
  totalTasks: number;
  averageTaskDuration: number; // hours
  estimationAccuracy: number; // 0-100%
  qualityScore: number; // 0-100%
  collaborationRating: number; // 0-5
  lastReviewDate: ISO8601DateTime;
  improvements: string[];
  achievements: string[];
}
```

### Sprint & Task Management Schemas

#### Sprint
```typescript
interface Sprint {
  id: UUID;
  number: number;
  name: string;
  goal: string;
  startDate: ISO8601DateTime;
  endDate: ISO8601DateTime;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  phaseId: UUID;
  totalStoryPoints: number;
  completedStoryPoints: number;
  velocity: number;
  burndownData: BurndownPoint[];
  retrospective?: SprintRetrospective;
  participants: UUID[]; // Agent IDs
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

interface BurndownPoint {
  date: ISO8601DateTime;
  remainingStoryPoints: number;
  idealRemaining: number;
  completedTasks: number;
  addedTasks: number;
}

interface SprintRetrospective {
  conductedDate: ISO8601DateTime;
  facilitator: UUID;
  participants: UUID[];
  whatWentWell: string[];
  whatNeedsImprovement: string[];
  actionItems: ActionItem[];
  sprintRating: number; // 1-5
  notes: string;
}

interface ActionItem {
  id: UUID;
  description: string;
  assignedTo: UUID;
  dueDate: ISO8601DateTime;
  status: 'pending' | 'in_progress' | 'completed';
  priority: Priority;
}
```

#### SprintTask
```typescript
interface SprintTask {
  id: UUID;
  title: string;
  description: string;
  acceptance_criteria: string[];
  phaseId: UUID;
  sprintId?: UUID;
  assignedAgent: UUID;
  status: TaskStatus;
  priority: Priority;
  type: 'story' | 'bug' | 'task' | 'spike';
  storyPoints: number;
  progress: number; // 0-100
  estimatedHours: number;
  actualHours?: number;
  remainingHours?: number;
  tags: string[];
  labels: string[];
  
  // Dependencies and blockers
  dependencies: UUID[]; // Other task IDs
  blockers: TaskBlocker[];
  
  // Workflow tracking
  workflow: TaskWorkflowState[];
  
  // Quality assurance
  reviewers: UUID[];
  testingNotes?: string;
  definitionOfDone: string[];
  
  // Metadata
  createdBy: UUID;
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
  completedAt?: ISO8601DateTime;
  
  // Additional context
  references: string[]; // URLs, file paths
  attachments: Attachment[];
  comments: TaskComment[];
}

interface TaskBlocker {
  id: UUID;
  description: string;
  type: 'technical' | 'resource' | 'external' | 'decision';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedBy: UUID;
  reportedDate: ISO8601DateTime;
  resolvedBy?: UUID;
  resolvedDate?: ISO8601DateTime;
  resolution?: string;
  impact: string;
}

interface TaskWorkflowState {
  status: TaskStatus;
  timestamp: ISO8601DateTime;
  changedBy: UUID;
  reason?: string;
  duration?: number; // Time spent in this status (seconds)
}

interface TaskComment {
  id: UUID;
  author: UUID;
  content: string;
  timestamp: ISO8601DateTime;
  type: 'comment' | 'status_change' | 'assignment' | 'blocker';
  mentions: UUID[]; // Mentioned agent IDs
}

interface Attachment {
  id: UUID;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: UUID;
  uploadedAt: ISO8601DateTime;
}
```

### Notes & Documentation Schemas

#### NoteEntry
```typescript
interface NoteEntry {
  id: UUID;
  title?: string;
  content: string;
  type: 'meeting' | 'decision' | 'blocker' | 'insight' | 'retrospective' | 'planning';
  phaseId: UUID;
  sprintId?: UUID;
  authorId: UUID;
  visibility: 'public' | 'team' | 'private';
  
  // Meeting-specific fields
  meetingDate?: ISO8601DateTime;
  attendees?: UUID[];
  actionItems?: ActionItem[];
  
  // Context and references
  tags: string[];
  references: string[]; // File paths, URLs, task IDs
  relatedTasks: UUID[];
  
  // Status and workflow
  status: 'draft' | 'published' | 'archived';
  isPinned: boolean;
  
  // Metadata
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
  archivedAt?: ISO8601DateTime;
}
```

### Event System Schemas

#### PDLEvent
```typescript
interface PDLEvent {
  id: UUID;
  type: EventType;
  subtype?: string;
  timestamp: ISO8601DateTime;
  phaseId: UUID;
  sprintId?: UUID;
  agentId: UUID;
  
  // Core event data
  brief: string; // Max 60 characters for bandwidth efficiency
  description?: string; // Fuller description
  data: Record<string, any>; // Event-specific data
  
  // Context and references
  references: string[];
  relatedEvents: UUID[];
  
  // Impact and priority
  priority: Priority;
  impact: 'low' | 'medium' | 'high';
  
  // Metadata
  source: 'system' | 'agent' | 'user' | 'webhook';
  category: 'phase' | 'task' | 'agent' | 'system' | 'quality';
  isArchived: boolean;
}

type EventType = 
  // Phase events
  | 'phase_started' | 'phase_completed' | 'phase_blocked' | 'gate_approved' | 'gate_rejected'
  // Task events  
  | 'task_created' | 'task_assigned' | 'task_started' | 'task_completed' | 'task_blocked'
  // Agent events
  | 'agent_assigned' | 'agent_status_changed' | 'agent_capacity_changed'
  // Sprint events
  | 'sprint_started' | 'sprint_completed' | 'sprint_planning' | 'retrospective'
  // System events
  | 'system_startup' | 'system_error' | 'backup_completed' | 'maintenance'
  // Quality events
  | 'test_passed' | 'test_failed' | 'code_review' | 'deployment' | 'rollback';
```

## MCP Function Contracts

### Phase Management Functions

```typescript
// Get current phase information
function mcp__pdl__get_current_phase(): Promise<{
  phase: PDLPhase;
  progress: PhaseMetrics;
  nextMilestones: Milestone[];
  blockers: TaskBlocker[];
}>;

// Transition between phases
function mcp__pdl__transition_phase(params: {
  fromPhase: PhaseType;
  toPhase: PhaseType;
  gateApproval?: boolean;
  notes?: string;
  triggeredBy: UUID;
}): Promise<PhaseTransition>;

// Get phase history and analytics
function mcp__pdl__get_phase_history(params?: {
  phaseType?: PhaseType;
  dateRange?: [ISO8601DateTime, ISO8601DateTime];
  includeMetrics?: boolean;
}): Promise<PDLPhase[]>;

// Update phase progress
function mcp__pdl__update_phase_progress(params: {
  phaseId: UUID;
  progress: number;
  updatedBy: UUID;
  notes?: string;
}): Promise<PDLPhase>;
```

### Agent Management Functions

```typescript
// Register new agent
function mcp__pdl__register_agent(params: {
  name: string;
  email: string;
  type: AgentType;
  specializations: string[];
  availability: AgentStatus['availability'];
}): Promise<AgentStatus>;

// Update agent status
function mcp__pdl__update_agent_status(params: {
  agentId: UUID;
  status?: AgentStatus['status'];
  currentPhase?: PhaseType;
  workload?: Partial<AgentStatus['workload']>;
  updatedBy: UUID;
}): Promise<AgentStatus>;

// Get agent information
function mcp__pdl__get_agents(params?: {
  phaseId?: UUID;
  status?: AgentStatus['status'];
  type?: AgentType;
  includePerformance?: boolean;
}): Promise<AgentStatus[]>;

// Assign agent to task
function mcp__pdl__assign_agent_to_task(params: {
  taskId: UUID;
  agentId: UUID;
  assignedBy: UUID;
  notes?: string;
}): Promise<SprintTask>;
```

### Sprint & Task Management Functions

```typescript
// Create new sprint
function mcp__pdl__create_sprint(params: {
  name: string;
  goal: string;
  startDate: ISO8601DateTime;
  endDate: ISO8601DateTime;
  phaseId: UUID;
  participants: UUID[];
  createdBy: UUID;
}): Promise<Sprint>;

// Get sprint tasks
function mcp__pdl__get_sprint_tasks(params?: {
  sprintId?: UUID;
  phaseId?: UUID;
  assignedAgent?: UUID;
  status?: TaskStatus;
  priority?: Priority;
  includeSubtasks?: boolean;
}): Promise<SprintTask[]>;

// Create new task
function mcp__pdl__create_task(params: {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  phaseId: UUID;
  sprintId?: UUID;
  type: SprintTask['type'];
  priority: Priority;
  storyPoints: number;
  estimatedHours: number;
  assignedAgent?: UUID;
  createdBy: UUID;
}): Promise<SprintTask>;

// Update task
function mcp__pdl__update_task(params: {
  taskId: UUID;
  updates: Partial<Pick<SprintTask, 
    'title' | 'description' | 'status' | 'progress' | 'actualHours' | 
    'priority' | 'tags' | 'assignedAgent'
  >>;
  updatedBy: UUID;
  notes?: string;
}): Promise<SprintTask>;

// Add task blocker
function mcp__pdl__add_task_blocker(params: {
  taskId: UUID;
  blocker: Omit<TaskBlocker, 'id'>;
}): Promise<TaskBlocker>;

// Generate sprint report
function mcp__pdl__generate_sprint_report(params: {
  sprintId: UUID;
  includeRetrospective?: boolean;
}): Promise<{
  sprint: Sprint;
  metrics: {
    velocity: number;
    burndownData: BurndownPoint[];
    completionRate: number;
    qualityMetrics: PhaseMetrics['qualityMetrics'];
  };
  taskSummary: {
    completed: number;
    incomplete: number;
    blocked: number;
    carryOver: UUID[];
  };
  agentPerformance: Array<{
    agentId: UUID;
    tasksCompleted: number;
    storyPointsDelivered: number;
    averageTaskTime: number;
  }>;
}>;
```

### Notes & Documentation Functions

```typescript
// Add note entry
function mcp__pdl__add_note(params: {
  title?: string;
  content: string;
  type: NoteEntry['type'];
  phaseId: UUID;
  sprintId?: UUID;
  authorId: UUID;
  visibility?: NoteEntry['visibility'];
  tags?: string[];
  references?: string[];
  relatedTasks?: UUID[];
}): Promise<NoteEntry>;

// Get notes with filtering
function mcp__pdl__get_notes(params?: {
  phaseId?: UUID;
  sprintId?: UUID;
  authorId?: UUID;
  type?: NoteEntry['type'];
  tags?: string[];
  dateRange?: [ISO8601DateTime, ISO8601DateTime];
  searchText?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  notes: NoteEntry[];
  totalCount: number;
  hasMore: boolean;
}>;

// Generate phase summary
function mcp__pdl__get_phase_summary(params: {
  phaseId: UUID;
  includeTaskDetails?: boolean;
  includeAgentPerformance?: boolean;
}): Promise<{
  phase: PDLPhase;
  taskSummary: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
  };
  keyAchievements: string[];
  challenges: string[];
  recommendations: string[];
  nextSteps: string[];
  attachments: string[];
}>;
```

### Real-time & System Functions

```typescript
// Subscribe to real-time updates
function mcp__pdl__subscribe_updates(params: {
  eventTypes?: EventType[];
  phaseId?: UUID;
  agentId?: UUID;
  callback: (event: PDLEvent) => void;
}): Promise<{ subscriptionId: UUID; unsubscribe: () => void }>;

// Emit custom event
function mcp__pdl__emit_event(params: {
  type: EventType;
  brief: string;
  description?: string;
  phaseId: UUID;
  agentId: UUID;
  data?: Record<string, any>;
  references?: string[];
  priority?: Priority;
}): Promise<PDLEvent>;

// Get system state
function mcp__pdl__get_system_state(): Promise<{
  currentPhase: PDLPhase;
  activeAgents: AgentStatus[];
  recentEvents: PDLEvent[];
  systemHealth: {
    uptime: number;
    activeConnections: number;
    eventQueueSize: number;
    memoryUsage: number;
    lastBackup: ISO8601DateTime;
  };
  metrics: {
    totalProjects: number;
    activePhases: number;
    completedTasks: number;
    averageVelocity: number;
  };
}>;

// Get event history
function mcp__pdl__get_events(params?: {
  eventTypes?: EventType[];
  phaseId?: UUID;
  agentId?: UUID;
  dateRange?: [ISO8601DateTime, ISO8601DateTime];
  priority?: Priority;
  limit?: number;
  offset?: number;
}): Promise<{
  events: PDLEvent[];
  totalCount: number;
  hasMore: boolean;
}>;
```

## WebSocket Event Schemas

### Client-to-Server Messages
```typescript
interface WSClientMessage {
  id: UUID; // Request ID for correlation
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'request_state';
  payload: {
    eventTypes?: EventType[];
    phaseId?: UUID;
    agentId?: UUID;
    subscriptionId?: UUID; // For unsubscribe
  };
}
```

### Server-to-Client Messages
```typescript
interface WSServerMessage {
  id?: UUID; // Correlation ID for responses
  type: 'event' | 'state_update' | 'error' | 'pong' | 'subscription_confirmed';
  timestamp: ISO8601DateTime;
  payload: {
    event?: PDLEvent;
    state?: Partial<SystemState>;
    error?: {
      code: string;
      message: string;
      details?: any;
    };
    subscriptionId?: UUID;
  };
}
```

## Error Handling & Validation

### Standard Error Response
```typescript
interface PDLError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: ISO8601DateTime;
  requestId?: UUID;
  stack?: string; // Only in development
}

// Error codes
const ERROR_CODES = {
  // Validation errors (400)
  VALIDATION_FAILED: 'validation_failed',
  INVALID_PHASE_TRANSITION: 'invalid_phase_transition',
  INVALID_AGENT_ASSIGNMENT: 'invalid_agent_assignment',
  
  // Authorization errors (403)
  INSUFFICIENT_PERMISSIONS: 'insufficient_permissions',
  AGENT_NOT_AUTHORIZED: 'agent_not_authorized',
  
  // Not found errors (404)
  PHASE_NOT_FOUND: 'phase_not_found',
  TASK_NOT_FOUND: 'task_not_found',
  AGENT_NOT_FOUND: 'agent_not_found',
  
  // Conflict errors (409)
  PHASE_ALREADY_ACTIVE: 'phase_already_active',
  TASK_ALREADY_ASSIGNED: 'task_already_assigned',
  
  // System errors (500)
  DATABASE_ERROR: 'database_error',
  WEBSOCKET_ERROR: 'websocket_error',
  SYSTEM_UNAVAILABLE: 'system_unavailable'
} as const;
```

This comprehensive API contract provides type-safe interfaces for all PDL system interactions, ensuring consistency across the MCP server implementation and client applications.