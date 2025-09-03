# PDL Hook System & Event Standards

## Hook-Based Event Tracking

### Event Schema
```typescript
interface PDLEvent {
  id: string;           // Unique identifier
  type: string;         // Event type (phase_transition, discovery, etc.)
  timestamp: string;    // ISO timestamp
  phase: string;        // Current PDL phase
  data: object;         // Event-specific data
  brief: string;        // Max 60 chars - token efficient
  references: string[]; // File paths, URLs, attachments
  agent: string;        // Originating agent
}
```

### Standard Event Types
```yaml
System Events:
  - phase_transition: Phase changes
  - gate_review: Gate approval/rejection
  - agent_assigned: Agent role assignments

Development Events:
  - discovery: Research findings
  - research_complete: Research conclusions
  - architecture_decision: Technical choices
  - implementation_complete: Feature completion

Quality Events:
  - test_result: Test outcomes
  - code_review: Review findings
  - performance_metric: Performance data
```

### MCP Integration Hook
```javascript
// Standard hook for writing development notes
pdl.registerHook('development_note', async (event) => {
  const note = {
    timestamp: event.timestamp,
    phase: event.phase,
    brief: event.brief,
    references: event.references,
    agent: event.agent
  };
  
  // Write to ./.claude/context/DEVELOPMENT_NOTES.md
  await mcpCall('write_note', {
    file: './.claude/context/DEVELOPMENT_NOTES.md',
    entry: note
  });
});
```

### Development Note Format
```markdown
## [TIMESTAMP] [PHASE] [AGENT]
**Brief:** [60 char summary]
**References:** [file paths, URLs]
**Details:** [Optional expanded context]

---
```

### Bandwidth Optimization
- Events limited to 1000 in memory
- Briefs max 60 characters
- References as paths only, not content
- Automatic cleanup of old events