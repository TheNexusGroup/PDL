# Multi-Project PDL Architecture

## Overview
The PDL MCP server must support multiple concurrent projects, each with their own independent PDL lifecycles, team structures, and sprint management. This architecture ensures complete project isolation while enabling cross-project insights and resource sharing.

## Core Multi-Project Requirements

### Project Isolation
- Each project maintains independent PDL phases, agents, and sprints
- No data leakage between projects
- Separate event streams and state management
- Independent configuration and customization

### Resource Sharing
- Agents can participate in multiple projects simultaneously
- Shared templates and best practices across projects
- Cross-project analytics and reporting
- Resource capacity planning across projects

### Scalability
- Support for 100+ concurrent projects
- Efficient database querying with proper indexing
- WebSocket connection pooling and routing
- Horizontal scaling capabilities

## Updated Database Schema

### Core Project Structure
```sql
-- Projects table - top-level container
CREATE TABLE projects (
  id TEXT PRIMARY KEY, -- UUID
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  description TEXT,
  status TEXT DEFAULT 'active', -- active, paused, completed, archived
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  -- Project configuration
  config TEXT, -- JSON blob for project-specific settings
  
  -- Metadata
  repository_url TEXT,
  documentation_url TEXT,
  tags TEXT, -- JSON array
  
  UNIQUE(slug)
);

-- Phases table - now project-scoped
CREATE TABLE phases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL, -- discovery, planning, development, etc.
  display_name TEXT,
  start_date TEXT,
  end_date TEXT,
  planned_end_date TEXT,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  gate_approved BOOLEAN DEFAULT false,
  gate_review_date TEXT,
  gate_reviewer TEXT,
  gate_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, name) -- One phase per type per project
);

-- Agents table - global agents with project assignments
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  type TEXT NOT NULL,
  specializations TEXT, -- JSON array
  status TEXT DEFAULT 'available',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  -- Global agent settings
  time_zone TEXT DEFAULT 'UTC',
  working_hours TEXT, -- JSON: {start: "09:00", end: "17:00"}
  capacity_hours_per_week INTEGER DEFAULT 40
);

-- Project agent assignments - many-to-many relationship
CREATE TABLE project_agents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  role TEXT, -- project-specific role
  assigned_date TEXT DEFAULT CURRENT_TIMESTAMP,
  unassigned_date TEXT,
  current_phase TEXT,
  status TEXT DEFAULT 'active', -- active, inactive, on_leave
  
  -- Project-specific agent metrics
  project_capacity_percentage INTEGER DEFAULT 100,
  project_hourly_rate DECIMAL(10,2),
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (current_phase) REFERENCES phases(id),
  UNIQUE(project_id, agent_id) -- Agent can only be assigned once per project
);

-- Events table - project-scoped
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  subtype TEXT,
  phase_id TEXT,
  agent_id TEXT,
  sprint_id TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  brief TEXT NOT NULL, -- Max 60 chars
  description TEXT,
  data TEXT, -- JSON blob
  references TEXT, -- JSON array
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'system',
  is_archived BOOLEAN DEFAULT false,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE SET NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  
  -- Indexes for efficient querying
  INDEX idx_events_project_timestamp (project_id, timestamp),
  INDEX idx_events_project_type (project_id, type),
  INDEX idx_events_project_agent (project_id, agent_id)
);

-- Sprints table - project-scoped
CREATE TABLE sprints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  goal TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT DEFAULT 'planning',
  phase_id TEXT,
  total_story_points INTEGER DEFAULT 0,
  completed_story_points INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (phase_id) REFERENCES phases(id),
  UNIQUE(project_id, number) -- Sequential numbering per project
);

-- Tasks table - project and sprint scoped
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  sprint_id TEXT,
  phase_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT, -- JSON array
  assigned_agent TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  type TEXT DEFAULT 'story',
  story_points INTEGER DEFAULT 0,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  progress INTEGER DEFAULT 0,
  tags TEXT, -- JSON array
  references TEXT, -- JSON array
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
  FOREIGN KEY (phase_id) REFERENCES phases(id),
  FOREIGN KEY (assigned_agent) REFERENCES agents(id),
  
  INDEX idx_tasks_project_status (project_id, status),
  INDEX idx_tasks_project_sprint (project_id, sprint_id),
  INDEX idx_tasks_assigned_agent (assigned_agent)
);

-- Notes table - project-scoped
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  phase_id TEXT,
  sprint_id TEXT,
  title TEXT,
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  visibility TEXT DEFAULT 'team', -- public, team, private
  tags TEXT, -- JSON array
  references TEXT, -- JSON array
  status TEXT DEFAULT 'published',
  is_pinned BOOLEAN DEFAULT false,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (phase_id) REFERENCES phases(id),
  FOREIGN KEY (author_id) REFERENCES agents(id),
  
  INDEX idx_notes_project_type (project_id, type),
  INDEX idx_notes_project_phase (project_id, phase_id)
);
```

## Updated MCP Function Signatures

### Project Management Functions
```typescript
// Create new project
function mcp__pdl__create_project(params: {
  name: string;
  slug: string;
  description?: string;
  createdBy: UUID;
  config?: ProjectConfig;
  repositoryUrl?: string;
  tags?: string[];
}): Promise<Project>;

// Get projects list
function mcp__pdl__get_projects(params?: {
  status?: ProjectStatus;
  createdBy?: UUID;
  tags?: string[];
  search?: string;
}): Promise<Project[]>;

// Switch context to project
function mcp__pdl__set_active_project(params: {
  projectId: UUID;
}): Promise<{
  project: Project;
  currentPhase: Phase;
  activeAgents: ProjectAgent[];
}>;

// Get project overview
function mcp__pdl__get_project_overview(params: {
  projectId: UUID;
}): Promise<{
  project: Project;
  phases: Phase[];
  metrics: ProjectMetrics;
  recentActivity: Event[];
  teamSummary: TeamSummary;
}>;
```

### Project-Scoped Phase Management
```typescript
// All existing phase functions now require projectId
function mcp__pdl__get_current_phase(params: {
  projectId: UUID;
}): Promise<{
  phase: Phase;
  progress: PhaseMetrics;
  nextMilestones: Milestone[];
  blockers: TaskBlocker[];
}>;

function mcp__pdl__transition_phase(params: {
  projectId: UUID;
  fromPhase: PhaseType;
  toPhase: PhaseType;
  gateApproval?: boolean;
  notes?: string;
  triggeredBy: UUID;
}): Promise<PhaseTransition>;

function mcp__pdl__get_phase_history(params: {
  projectId: UUID;
  phaseType?: PhaseType;
  dateRange?: [ISO8601DateTime, ISO8601DateTime];
}): Promise<Phase[]>;
```

### Cross-Project Agent Management
```typescript
// Assign agent to project
function mcp__pdl__assign_agent_to_project(params: {
  projectId: UUID;
  agentId: UUID;
  role?: string;
  capacityPercentage?: number;
  assignedBy: UUID;
}): Promise<ProjectAgent>;

// Get agent's project assignments
function mcp__pdl__get_agent_projects(params: {
  agentId: UUID;
  status?: 'active' | 'inactive';
}): Promise<Array<{
  project: Project;
  assignment: ProjectAgent;
  currentWorkload: AgentWorkload;
}>>;

// Get project team
function mcp__pdl__get_project_team(params: {
  projectId: UUID;
  includeInactive?: boolean;
}): Promise<ProjectAgent[]>;

// Agent capacity planning across projects
function mcp__pdl__get_agent_capacity_overview(params: {
  agentId: UUID;
  timeframe?: [ISO8601DateTime, ISO8601DateTime];
}): Promise<{
  totalCapacity: number;
  allocatedCapacity: number;
  availableCapacity: number;
  projectAllocations: Array<{
    projectId: UUID;
    projectName: string;
    allocatedPercentage: number;
    currentTasks: number;
  }>;
}>;
```

### Project-Scoped Sprint and Task Management
```typescript
// Create sprint (project-scoped)
function mcp__pdl__create_sprint(params: {
  projectId: UUID;
  name: string;
  goal: string;
  startDate: ISO8601DateTime;
  endDate: ISO8601DateTime;
  phaseId: UUID;
  participants: UUID[];
  createdBy: UUID;
}): Promise<Sprint>;

// Get project sprints
function mcp__pdl__get_sprints(params: {
  projectId: UUID;
  status?: SprintStatus;
  phaseId?: UUID;
  includeArchived?: boolean;
}): Promise<Sprint[]>;

// Create task (project-scoped)
function mcp__pdl__create_task(params: {
  projectId: UUID;
  title: string;
  description: string;
  phaseId: UUID;
  sprintId?: UUID;
  assignedAgent?: UUID;
  // ... other task fields
  createdBy: UUID;
}): Promise<Task>;

// Cross-project task search
function mcp__pdl__search_tasks(params: {
  projectIds?: UUID[];
  search?: string;
  assignedAgent?: UUID;
  status?: TaskStatus;
  dateRange?: [ISO8601DateTime, ISO8601DateTime];
}): Promise<Array<{
  task: Task;
  project: Project;
}>>;
```

## WebSocket Event Routing

### Project-Scoped Subscriptions
```typescript
interface WSSubscription {
  subscriptionId: UUID;
  projectIds: UUID[]; // Can subscribe to multiple projects
  eventTypes?: EventType[];
  agentId?: UUID;
  phaseId?: UUID;
}

interface WSProjectMessage {
  id?: UUID;
  type: 'event' | 'project_switch' | 'multi_project_update';
  projectId: UUID;
  timestamp: ISO8601DateTime;
  payload: {
    event?: Event;
    projectState?: ProjectState;
    crossProjectData?: CrossProjectData;
  };
}

class ProjectAwareWebSocketManager {
  subscribeToProjects(params: {
    projectIds: UUID[];
    eventTypes?: EventType[];
    agentId?: UUID;
    callback: (message: WSProjectMessage) => void;
  }): WSSubscription;
  
  broadcastToProject(projectId: UUID, message: WSProjectMessage): void;
  
  broadcastCrossProject(
    projectIds: UUID[], 
    message: CrossProjectMessage
  ): void;
}
```

## Client Interface Updates

### Project Selection Interface
```typescript
interface ProjectSelectorProps {
  projects: Project[];
  activeProject?: Project;
  onProjectSwitch: (projectId: UUID) => void;
  onCreateProject: () => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  activeProject,
  onProjectSwitch,
  onCreateProject
}) => {
  return (
    <div className="project-selector">
      <div className="active-project">
        <h2>{activeProject?.name || 'No Project Selected'}</h2>
        <span className="project-phase">
          {activeProject?.currentPhase || 'N/A'}
        </span>
      </div>
      
      <div className="project-switcher">
        <select 
          value={activeProject?.id || ''} 
          onChange={(e) => onProjectSwitch(e.target.value)}
        >
          <option value="">Select Project...</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name} ({project.status})
            </option>
          ))}
        </select>
        
        <button onClick={onCreateProject} className="create-project-btn">
          + New Project
        </button>
      </div>
    </div>
  );
};
```

### Multi-Project Dashboard
```typescript
interface MultiProjectDashboardProps {
  projects: Project[];
  activeProject: Project;
  crossProjectInsights: CrossProjectInsights;
}

const MultiProjectDashboard: React.FC<MultiProjectDashboardProps> = ({
  projects,
  activeProject,
  crossProjectInsights
}) => {
  return (
    <div className="multi-project-dashboard">
      {/* Project selector at top */}
      <ProjectSelector {...projectSelectorProps} />
      
      {/* Active project dashboard */}
      <div className="active-project-dashboard">
        <ProjectDashboard projectId={activeProject.id} />
      </div>
      
      {/* Cross-project insights sidebar */}
      <div className="cross-project-sidebar">
        <AgentCapacityOverview agents={crossProjectInsights.agents} />
        <ProjectComparisonMetrics projects={projects} />
        <SharedResourcesPanel resources={crossProjectInsights.resources} />
      </div>
    </div>
  );
};
```

## Cross-Project Analytics

### Resource Utilization
```typescript
interface CrossProjectAnalytics {
  getAgentUtilizationAcrossProjects(
    timeframe: [ISO8601DateTime, ISO8601DateTime]
  ): Promise<AgentUtilizationReport>;
  
  getProjectComparisonMetrics(
    projectIds: UUID[]
  ): Promise<ProjectComparisonReport>;
  
  getResourceBottlenecks(): Promise<ResourceBottleneckReport>;
  
  getVelocityTrends(
    projectIds: UUID[],
    timeframe: [ISO8601DateTime, ISO8601DateTime]
  ): Promise<VelocityTrendReport>;
}

interface AgentUtilizationReport {
  agentId: UUID;
  agentName: string;
  totalCapacity: number;
  allocations: Array<{
    projectId: UUID;
    projectName: string;
    allocatedHours: number;
    utilizationPercentage: number;
    efficiency: number;
  }>;
  overallUtilization: number;
  recommendedActions: string[];
}
```

## Project Templates and Initialization

### Template System
```typescript
interface ProjectTemplate {
  id: UUID;
  name: string;
  description: string;
  phases: PhaseTemplate[];
  defaultAgentRoles: AgentRoleTemplate[];
  sprintConfiguration: SprintConfigTemplate;
  taskTemplates: TaskTemplate[];
}

interface PhaseTemplate {
  name: PhaseType;
  displayName: string;
  estimatedDuration: number; // days
  requiredDeliverables: string[];
  gateRequirements: string[];
  defaultTasks: TaskTemplate[];
}

function mcp__pdl__create_project_from_template(params: {
  templateId: UUID;
  projectName: string;
  projectSlug: string;
  customizations?: TemplateCustomizations;
  createdBy: UUID;
}): Promise<Project>;

function mcp__pdl__get_project_templates(): Promise<ProjectTemplate[]>;
```

## Migration Strategy

### Phase 1: Database Migration
1. Create new multi-project schema
2. Migrate existing single project data
3. Add project isolation layer
4. Update all queries to include project_id

### Phase 2: API Updates
1. Update all MCP functions to require projectId
2. Implement project management functions
3. Add cross-project analytics endpoints
4. Update WebSocket routing

### Phase 3: Client Updates
1. Add project selector interface
2. Update dashboard for project context
3. Implement multi-project views
4. Add cross-project insights

### Phase 4: Advanced Features
1. Project templates system
2. Advanced cross-project analytics
3. Resource optimization recommendations
4. Multi-project sprint coordination

This multi-project architecture ensures complete isolation between projects while enabling powerful cross-project insights and resource management capabilities.