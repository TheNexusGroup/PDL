# PDL Client Interface Design

## Overview
The PDL client interface provides real-time visualization of project phases, agent activities, sprint planning, and development progress through an interactive web dashboard.

## Core Interface Components

### 1. Main Dashboard Layout

```html
<!-- Primary Navigation -->
<nav class="pdl-nav">
  <div class="phase-indicator">
    <span class="current-phase">Development Phase</span>
    <div class="phase-progress">
      <div class="progress-bar" style="width: 65%"></div>
    </div>
  </div>
  <div class="system-status">
    <span class="connection-status connected">●</span>
    <span class="active-agents">5 agents active</span>
  </div>
</nav>

<!-- Main Content Grid -->
<main class="dashboard-grid">
  <section class="phase-overview"></section>
  <section class="agent-activity"></section>
  <section class="sprint-board"></section>
  <section class="event-stream"></section>
  <section class="notes-panel"></section>
</main>
```

### 2. Phase Overview Component

#### Visual Design
```typescript
interface PhaseOverviewProps {
  currentPhase: PDLPhase;
  phaseHistory: PhaseHistory[];
  nextMilestones: Milestone[];
  gateStatus: GateStatus;
}

const PhaseOverview: React.FC<PhaseOverviewProps> = ({
  currentPhase,
  phaseHistory,
  nextMilestones,
  gateStatus
}) => {
  return (
    <div className="phase-overview">
      {/* Phase Timeline */}
      <div className="phase-timeline">
        {PHASES.map(phase => (
          <div 
            key={phase.id}
            className={`phase-node ${phase.status}`}
            data-phase={phase.name}
          >
            <div className="phase-icon">{phase.icon}</div>
            <span className="phase-name">{phase.name}</span>
            {phase.status === 'current' && (
              <div className="progress-ring">
                <svg viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" 
                    strokeDasharray={`${phase.progress}, 100`} />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current Phase Details */}
      <div className="current-phase-details">
        <h3>{currentPhase.name} Phase</h3>
        <div className="phase-metrics">
          <div className="metric">
            <span className="label">Progress</span>
            <span className="value">{currentPhase.progress}%</span>
          </div>
          <div className="metric">
            <span className="label">Duration</span>
            <span className="value">{currentPhase.duration} days</span>
          </div>
          <div className="metric">
            <span className="label">Gate Status</span>
            <span className={`value ${gateStatus.toLowerCase()}`}>
              {gateStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Next Milestones */}
      <div className="upcoming-milestones">
        <h4>Upcoming Milestones</h4>
        {nextMilestones.map(milestone => (
          <div key={milestone.id} className="milestone-item">
            <span className="milestone-date">{milestone.dueDate}</span>
            <span className="milestone-title">{milestone.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 3. Agent Activity Monitor

#### Real-time Agent Status
```typescript
interface AgentActivityProps {
  agents: AgentStatus[];
  eventStream: PDLEvent[];
}

const AgentActivity: React.FC<AgentActivityProps> = ({ agents, eventStream }) => {
  return (
    <div className="agent-activity">
      <h3>Agent Activity</h3>
      
      {/* Agent Grid */}
      <div className="agent-grid">
        {agents.map(agent => (
          <div key={agent.id} className={`agent-card ${agent.status}`}>
            <div className="agent-avatar">
              <img src={`/avatars/${agent.type}.svg`} alt={agent.name} />
              <div className={`status-indicator ${agent.status}`}></div>
            </div>
            
            <div className="agent-info">
              <h4>{agent.name}</h4>
              <span className="agent-type">{agent.type}</span>
              <span className="current-task">{agent.currentTask}</span>
            </div>
            
            <div className="agent-metrics">
              <div className="metric">
                <span className="label">Phase</span>
                <span className="value">{agent.currentPhase}</span>
              </div>
              <div className="metric">
                <span className="label">Tasks</span>
                <span className="value">{agent.completedTasks}/{agent.totalTasks}</span>
              </div>
              <div className="metric">
                <span className="label">Last Active</span>
                <span className="value">{formatRelativeTime(agent.lastActive)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Agent Events */}
      <div className="recent-agent-events">
        <h4>Recent Activity</h4>
        <div className="event-list">
          {eventStream.slice(0, 10).map(event => (
            <div key={event.id} className="event-item">
              <span className="event-time">{formatTime(event.timestamp)}</span>
              <span className="event-agent">{event.agent}</span>
              <span className="event-brief">{event.brief}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 4. Sprint Planning Board

#### Kanban-style Task Management
```typescript
interface SprintBoardProps {
  currentSprint: Sprint;
  tasks: SprintTask[];
  onTaskUpdate: (taskId: string, updates: TaskUpdate) => void;
}

const SprintBoard: React.FC<SprintBoardProps> = ({ 
  currentSprint, 
  tasks, 
  onTaskUpdate 
}) => {
  const columns = ['todo', 'in_progress', 'review', 'done'];
  
  return (
    <div className="sprint-board">
      <div className="sprint-header">
        <h3>Sprint {currentSprint.number}</h3>
        <div className="sprint-progress">
          <span>{currentSprint.completedPoints}/{currentSprint.totalPoints} SP</span>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${currentSprint.progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="kanban-columns">
        {columns.map(column => (
          <div key={column} className="kanban-column">
            <div className="column-header">
              <h4>{column.replace('_', ' ').toUpperCase()}</h4>
              <span className="task-count">
                {tasks.filter(task => task.status === column).length}
              </span>
            </div>
            
            <div className="task-list">
              {tasks
                .filter(task => task.status === column)
                .map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onUpdate={onTaskUpdate}
                  />
                ))
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TaskCard: React.FC<{ 
  task: SprintTask, 
  onUpdate: (id: string, updates: TaskUpdate) => void 
}> = ({ task, onUpdate }) => (
  <div className={`task-card priority-${task.priority}`}>
    <div className="task-header">
      <span className="task-id">#{task.id}</span>
      <span className={`task-priority ${task.priority}`}>
        {task.priority.toUpperCase()}
      </span>
    </div>
    
    <h5 className="task-title">{task.title}</h5>
    <p className="task-description">{task.description}</p>
    
    <div className="task-meta">
      <span className="assigned-agent">{task.assignedAgent}</span>
      <span className="story-points">{task.storyPoints} SP</span>
    </div>
    
    <div className="task-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${task.progress}%` }}
        ></div>
      </div>
      <span className="progress-text">{task.progress}%</span>
    </div>
    
    {task.blockers && task.blockers.length > 0 && (
      <div className="task-blockers">
        <span className="blocker-icon">⚠️</span>
        <span className="blocker-count">{task.blockers.length} blockers</span>
      </div>
    )}
  </div>
);
```

### 5. Real-time Event Stream

#### Live Activity Feed
```typescript
interface EventStreamProps {
  events: PDLEvent[];
  filter: EventFilter;
  onFilterChange: (filter: EventFilter) => void;
}

const EventStream: React.FC<EventStreamProps> = ({ 
  events, 
  filter, 
  onFilterChange 
}) => {
  return (
    <div className="event-stream">
      <div className="stream-header">
        <h3>Live Activity</h3>
        <EventFilters filter={filter} onChange={onFilterChange} />
      </div>
      
      <div className="event-list">
        {events.map(event => (
          <div key={event.id} className={`event-item event-${event.type}`}>
            <div className="event-timestamp">
              {formatRelativeTime(event.timestamp)}
            </div>
            
            <div className="event-content">
              <div className="event-header">
                <span className="event-agent">{event.agent}</span>
                <span className="event-phase">{event.phase}</span>
                <span className={`event-type ${event.type}`}>
                  {event.type.replace('_', ' ')}
                </span>
              </div>
              
              <p className="event-brief">{event.brief}</p>
              
              {event.references && event.references.length > 0 && (
                <div className="event-references">
                  {event.references.map(ref => (
                    <a key={ref} href={ref} className="reference-link">
                      {ref.split('/').pop()}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 6. Notes and Minutes Panel

#### Contextual Notes Management
```typescript
interface NotesPanelProps {
  notes: NoteEntry[];
  currentPhase: string;
  onAddNote: (note: NewNoteEntry) => void;
}

const NotesPanel: React.FC<NotesPanelProps> = ({ 
  notes, 
  currentPhase, 
  onAddNote 
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'all' | 'meeting'>('current');
  const [newNote, setNewNote] = useState('');

  return (
    <div className="notes-panel">
      <div className="notes-header">
        <h3>Notes & Minutes</h3>
        <div className="notes-tabs">
          <button 
            className={activeTab === 'current' ? 'active' : ''}
            onClick={() => setActiveTab('current')}
          >
            Current Phase
          </button>
          <button 
            className={activeTab === 'meeting' ? 'active' : ''}
            onClick={() => setActiveTab('meeting')}
          >
            Meetings
          </button>
          <button 
            className={activeTab === 'all' ? 'active' : ''}
            onClick={() => setActiveTab('all')}
          >
            All Notes
          </button>
        </div>
      </div>

      {/* Quick Note Input */}
      <div className="quick-note">
        <textarea
          placeholder="Add a quick note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <button onClick={() => {
          onAddNote({
            type: 'insight',
            phase: currentPhase,
            content: newNote,
            references: []
          });
          setNewNote('');
        }}>
          Add Note
        </button>
      </div>

      {/* Notes List */}
      <div className="notes-list">
        {notes
          .filter(note => {
            switch (activeTab) {
              case 'current': return note.phase === currentPhase;
              case 'meeting': return note.type === 'meeting';
              default: return true;
            }
          })
          .map(note => (
            <div key={note.id} className={`note-item note-${note.type}`}>
              <div className="note-header">
                <span className="note-timestamp">
                  {formatDateTime(note.createdAt)}
                </span>
                <span className="note-agent">{note.agent}</span>
                <span className={`note-type ${note.type}`}>
                  {note.type}
                </span>
              </div>
              
              <div className="note-content">
                {note.content}
              </div>
              
              {note.references && note.references.length > 0 && (
                <div className="note-references">
                  {note.references.map(ref => (
                    <a key={ref} href={ref} className="reference-link">
                      📎 {ref.split('/').pop()}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
};
```

## Responsive Design & Mobile Support

### Breakpoint Strategy
```css
/* Desktop First Approach */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto auto;
  gap: 20px;
}

/* Tablet */
@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .kanban-columns {
    flex-direction: column;
  }
  
  .agent-grid {
    grid-template-columns: 1fr;
  }
}
```

## Real-time Updates Architecture

### WebSocket Integration
```typescript
class PDLDashboardClient {
  private ws: WebSocket;
  private eventHandlers: Map<string, Function[]> = new Map();

  connect() {
    this.ws = new WebSocket('ws://localhost:9292/pdl-updates');
    
    this.ws.onmessage = (event) => {
      const data: PDLWebSocketMessage = JSON.parse(event.data);
      this.handleUpdate(data);
    };
  }

  private handleUpdate(message: PDLWebSocketMessage) {
    switch (message.type) {
      case 'phase_update':
        this.emit('phaseChanged', message.payload);
        break;
      case 'agent_status':
        this.emit('agentStatusChanged', message.payload);
        break;
      case 'task_update':
        this.emit('taskUpdated', message.payload);
        break;
      case 'note_added':
        this.emit('noteAdded', message.payload);
        break;
    }
  }

  subscribe(eventType: string, callback: Function) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(callback);
  }
}
```

## Performance Optimization

### Virtual Scrolling for Large Datasets
```typescript
const VirtualizedEventList: React.FC<{ events: PDLEvent[] }> = ({ events }) => {
  const [visibleStart, setVisibleStart] = useState(0);
  const [visibleEnd, setVisibleEnd] = useState(50);
  
  return (
    <div className="virtualized-list" onScroll={handleScroll}>
      {events.slice(visibleStart, visibleEnd).map(event => (
        <EventItem key={event.id} event={event} />
      ))}
    </div>
  );
};
```

### Optimistic UI Updates
```typescript
const useOptimisticTaskUpdate = () => {
  return useMutation({
    mutationFn: updateTask,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['tasks']);
      
      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(['tasks']);
      
      // Optimistically update
      queryClient.setQueryData(['tasks'], (old: SprintTask[]) =>
        old?.map(task => 
          task.id === variables.taskId 
            ? { ...task, ...variables.updates }
            : task
        )
      );
      
      return { previousTasks };
    }
  });
};
```