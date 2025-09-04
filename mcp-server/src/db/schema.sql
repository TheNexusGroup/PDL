-- PDL Multi-Project Database Schema

-- Projects table - top-level container
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active', -- active, paused, completed, archived
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  config TEXT, -- JSON blob for project-specific settings
  repository_url TEXT,
  documentation_url TEXT,
  tags TEXT, -- JSON array
  UNIQUE(slug)
);

-- Phases table - project-scoped
CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL, -- discovery, planning, development, etc.
  display_name TEXT,
  start_date TEXT,
  end_date TEXT,
  planned_end_date TEXT,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  gate_approved BOOLEAN DEFAULT 0,
  gate_review_date TEXT,
  gate_reviewer TEXT,
  gate_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, name)
);

-- Agents table - global agents
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  type TEXT NOT NULL,
  specializations TEXT, -- JSON array
  status TEXT DEFAULT 'available',
  time_zone TEXT DEFAULT 'UTC',
  working_hours TEXT, -- JSON: {start: "09:00", end: "17:00"}
  capacity_hours_per_week INTEGER DEFAULT 40,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Project agent assignments
CREATE TABLE IF NOT EXISTS project_agents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  role TEXT,
  assigned_date TEXT DEFAULT CURRENT_TIMESTAMP,
  unassigned_date TEXT,
  current_phase TEXT,
  status TEXT DEFAULT 'active',
  project_capacity_percentage INTEGER DEFAULT 100,
  project_hourly_rate DECIMAL(10,2),
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (current_phase) REFERENCES phases(id),
  UNIQUE(project_id, agent_id)
);

-- Events table - project-scoped
CREATE TABLE IF NOT EXISTS events (
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
  refs TEXT, -- JSON array
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'system',
  is_archived BOOLEAN DEFAULT 0,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE SET NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_events_project_timestamp ON events(project_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_project_type ON events(project_id, type);
CREATE INDEX IF NOT EXISTS idx_events_project_agent ON events(project_id, agent_id);

-- Sprints table - project-scoped
CREATE TABLE IF NOT EXISTS sprints (
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
  UNIQUE(project_id, number)
);

-- Tasks table - project and sprint scoped
CREATE TABLE IF NOT EXISTS tasks (
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
  refs TEXT, -- JSON array
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
  FOREIGN KEY (phase_id) REFERENCES phases(id),
  FOREIGN KEY (assigned_agent) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_sprint ON tasks(project_id, sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_agent);

-- Notes table - project-scoped
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  phase_id TEXT,
  sprint_id TEXT,
  title TEXT,
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  visibility TEXT DEFAULT 'team',
  tags TEXT, -- JSON array
  refs TEXT, -- JSON array
  status TEXT DEFAULT 'published',
  is_pinned BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (phase_id) REFERENCES phases(id),
  FOREIGN KEY (author_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_notes_project_type ON notes(project_id, type);
CREATE INDEX IF NOT EXISTS idx_notes_project_phase ON notes(project_id, phase_id);