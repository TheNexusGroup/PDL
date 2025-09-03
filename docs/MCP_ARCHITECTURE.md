# PDL MCP Server Architecture

## Overview
The PDL MCP (Model Context Protocol) server provides real-time phase management, sprint planning, and agent coordination capabilities for development teams using the Product Development Lifecycle framework.

## Core Components

### 1. MCP Server Functions

#### Phase Management
```typescript
// Get current phase information
mcp__pdl__get_current_phase(): {
  phase: string,
  startDate: string,
  progress: number,
  activeAgents: string[],
  gateStatus: 'pending' | 'approved' | 'rejected',
  nextMilestones: Milestone[]
}

// Transition to next phase
mcp__pdl__transition_phase(options: {
  fromPhase: string,
  toPhase: string,
  gateApproval: boolean,
  notes: string
}): PhaseTransition

// Get phase history and metrics
mcp__pdl__get_phase_history(): PhaseHistory[]
```

#### Sprint Planning Integration
```typescript
// Get sprint-ready tasks from current phase
mcp__pdl__get_sprint_tasks(options: {
  phase?: string,
  agent?: string,
  priority?: 'high' | 'medium' | 'low'
}): SprintTask[]

// Update task status and progress
mcp__pdl__update_task_status(taskId: string, status: {
  state: 'todo' | 'in_progress' | 'blocked' | 'done',
  progress: number,
  notes: string,
  blockers?: string[]
}): TaskUpdate

// Generate sprint report
mcp__pdl__generate_sprint_report(sprintId: string): SprintReport
```

#### Notes and Minutes Management
```typescript
// Add development notes
mcp__pdl__add_note(note: {
  type: 'meeting' | 'decision' | 'blocker' | 'insight',
  phase: string,
  content: string,
  references: string[],
  agent: string
}): NoteEntry

// Get notes by phase/agent/type
mcp__pdl__get_notes(filter: {
  phase?: string,
  agent?: string,
  type?: string,
  dateRange?: [string, string]
}): NoteEntry[]

// Generate phase summary
mcp__pdl__get_phase_summary(phase: string): PhaseSummary
```

#### Real-time State Tracking
```typescript
// Subscribe to real-time updates
mcp__pdl__subscribe_updates(callback: (event: PDLEvent) => void): Subscription

// Get current system state
mcp__pdl__get_system_state(): {
  currentPhase: string,
  activeAgents: AgentStatus[],
  recentEvents: PDLEvent[],
  systemHealth: HealthMetrics
}

// Emit custom events
mcp__pdl__emit_event(event: CustomPDLEvent): void
```

### 2. Data Storage Architecture

#### SQLite Database Schema
```sql
-- Core tables for phase management
CREATE TABLE phases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'active',
  gate_approved BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  current_phase TEXT,
  status TEXT DEFAULT 'available',
  last_active TEXT,
  FOREIGN KEY (current_phase) REFERENCES phases(id)
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  phase_id TEXT,
  agent_id TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  brief TEXT NOT NULL,
  data TEXT, -- JSON blob
  references TEXT, -- JSON array
  FOREIGN KEY (phase_id) REFERENCES phases(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  phase_id TEXT NOT NULL,
  agent_id TEXT,
  content TEXT NOT NULL,
  references TEXT, -- JSON array
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (phase_id) REFERENCES phases(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_agent TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  progress INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (phase_id) REFERENCES phases(id),
  FOREIGN KEY (assigned_agent) REFERENCES agents(id)
);
```

#### File System Structure
```
./.claude/pdl/
├── state/
│   ├── current_phase.json
│   ├── active_agents.json
│   └── system_metrics.json
├── notes/
│   ├── discovery/
│   ├── planning/
│   ├── development/
│   ├── launch/
│   ├── growth/
│   └── optimization/
├── sprints/
│   ├── sprint_001/
│   ├── sprint_002/
│   └── templates/
└── reports/
    ├── phase_summaries/
    └── sprint_reports/
```

### 3. WebSocket Integration

#### Event Broadcasting
```typescript
interface PDLWebSocketMessage {
  type: 'phase_update' | 'agent_status' | 'task_update' | 'note_added';
  payload: any;
  timestamp: string;
  source: 'mcp_server' | 'client' | 'agent';
}

class PDLWebSocketServer {
  broadcast(message: PDLWebSocketMessage): void;
  subscribeToPhase(clientId: string, phase: string): void;
  subscribeToAgent(clientId: string, agentId: string): void;
}
```

### 4. Agent Coordination Hooks

#### Standard Agent Hooks
```typescript
// Hook fired when agent starts work on a phase
pdl.registerHook('agent_phase_start', async (event) => {
  await mcp__pdl__add_note({
    type: 'insight',
    phase: event.phase,
    content: `${event.agent} began work on ${event.phase} phase`,
    references: [],
    agent: event.agent
  });
});

// Hook fired when task is completed
pdl.registerHook('task_completed', async (event) => {
  await mcp__pdl__update_task_status(event.taskId, {
    state: 'done',
    progress: 100,
    notes: event.completionNotes || 'Task completed successfully'
  });
});

// Hook fired for phase gate reviews
pdl.registerHook('gate_review', async (event) => {
  const summary = await mcp__pdl__get_phase_summary(event.phase);
  // Auto-generate gate review document
});
```

## Implementation Phases

### Phase 1: Core MCP Server (Week 1-2)
- Set up MCP server framework
- Implement basic phase management functions
- Create SQLite database and schema
- Basic WebSocket event system

### Phase 2: Sprint Integration (Week 3-4)
- Implement task management functions
- Create sprint planning utilities
- Add agent coordination hooks
- File system organization

### Phase 3: Real-time Features (Week 5-6)
- Complete WebSocket broadcasting
- Implement subscription system
- Add real-time state tracking
- Performance optimization

### Phase 4: Advanced Features (Week 7-8)
- Phase summaries and reporting
- Advanced filtering and search
- Dashboard data feeds
- Documentation and testing

## Performance Considerations

### Bandwidth Optimization
- Event brief limited to 60 characters
- Lazy loading for historical data
- Compressed JSON for WebSocket messages
- Indexed database queries

### Scalability
- Connection pooling for database
- Event queue for high-volume scenarios
- Modular plugin architecture
- Horizontal scaling support

## Security & Data Privacy
- No sensitive data in briefs
- Encrypted WebSocket connections
- Role-based access control
- Audit logging for all actions