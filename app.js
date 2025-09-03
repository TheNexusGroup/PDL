// PDL Dynamic Agent System - Modular Framework
class PDLFramework {
    constructor(options = {}) {
        this.wsUrl = options.wsUrl || null; // Default to null for offline mode
        this.offlineMode = options.offline !== false && !this.wsUrl; // Default to offline
        this.eventHistory = [];
        this.currentPhase = 'discovery';
        this.activeAgents = new Set();
        this.hooks = new Map();
        this.ws = null;
        this.reconnectInterval = 5000;
        this.maxEventHistory = 1000; // Limit for bandwidth efficiency
        
        if (!this.offlineMode) {
            this.initWebSocket();
        } else {
            console.log('PDL Framework running in offline mode');
        }
        this.registerDefaultHooks();
    }

    // WebSocket Connection Management
    initWebSocket() {
        try {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => this.onConnectionOpen();
            this.ws.onmessage = (event) => this.onMessage(event);
            this.ws.onclose = () => this.onConnectionClose();
            this.ws.onerror = (error) => this.onConnectionError(error);
        } catch (error) {
            console.warn('WebSocket unavailable, running in offline mode');
        }
    }

    onConnectionOpen() {
        console.log('PDL WebSocket connected');
        this.emit('system', { type: 'connection', status: 'connected' });
    }

    onMessage(event) {
        const data = JSON.parse(event.data);
        this.handleIncomingEvent(data);
    }

    onConnectionClose() {
        console.log('PDL WebSocket disconnected, attempting reconnect...');
        setTimeout(() => this.initWebSocket(), this.reconnectInterval);
    }

    onConnectionError(error) {
        console.error('PDL WebSocket error:', error);
    }

    // Event System
    emit(eventType, data, options = {}) {
        const event = {
            id: this.generateEventId(),
            type: eventType,
            timestamp: new Date().toISOString(),
            phase: this.currentPhase,
            data: data,
            brief: options.brief || this.generateBrief(eventType, data),
            references: options.references || [],
            agent: options.agent || 'system'
        };

        // Add to local history with size limit
        this.addToHistory(event);
        
        // Execute hooks
        this.executeHooks(eventType, event);
        
        // Send via WebSocket
        this.sendToServer(event);
        
        // Update UI
        this.updateVisualization(event);
        
        return event.id;
    }

    addToHistory(event) {
        this.eventHistory.push(event);
        
        // Maintain size limit for bandwidth efficiency
        if (this.eventHistory.length > this.maxEventHistory) {
            this.eventHistory = this.eventHistory.slice(-this.maxEventHistory);
        }
    }

    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateBrief(eventType, data) {
        // Auto-generate concise briefs to avoid unnecessary tokens
        switch (eventType) {
            case 'phase_transition':
                return `Phase: ${data.from} → ${data.to}`;
            case 'agent_assigned':
                return `Agent: ${data.agent} (${data.role})`;
            case 'discovery':
                return `Found: ${data.summary}`;
            case 'research_complete':
                return `Research: ${data.topic} - ${data.conclusion}`;
            case 'gate_review':
                return `Gate ${data.gate}: ${data.status}`;
            default:
                return `${eventType}: ${JSON.stringify(data).substring(0, 50)}...`;
        }
    }

    // Hook System for MCP Integration
    registerHook(eventType, hookFn, options = {}) {
        if (!this.hooks.has(eventType)) {
            this.hooks.set(eventType, []);
        }
        
        this.hooks.get(eventType).push({
            fn: hookFn,
            priority: options.priority || 0,
            async: options.async || false
        });
        
        // Sort by priority
        this.hooks.get(eventType).sort((a, b) => b.priority - a.priority);
    }

    executeHooks(eventType, event) {
        const hooks = this.hooks.get(eventType) || [];
        
        hooks.forEach(hook => {
            try {
                if (hook.async) {
                    Promise.resolve(hook.fn(event)).catch(console.error);
                } else {
                    hook.fn(event);
                }
            } catch (error) {
                console.error(`Hook error for ${eventType}:`, error);
            }
        });
    }

    // Default Hooks for Common Events
    registerDefaultHooks() {
        // Phase transition hook
        this.registerHook('phase_transition', (event) => {
            this.currentPhase = event.data.to;
            this.updatePhaseVisualization(event.data.to);
        });

        // Agent coordination hook
        this.registerHook('agent_assigned', (event) => {
            this.activeAgents.add(event.data.agent);
            this.updateAgentVisualization();
        });

        // Development notes hook - integrates with MCP
        this.registerHook('development_note', (event) => {
            this.writeDevelopmentNote(event);
        });
    }

    // MCP Integration for Development Notes
    writeDevelopmentNote(event) {
        // This would call MCP tool to write to event history
        const note = {
            timestamp: event.timestamp,
            phase: event.phase,
            type: event.type,
            brief: event.brief,
            references: event.references,
            agent: event.agent
        };

        // Call MCP hook to write to ./.claude/context/DEVELOPMENT_NOTES.md
        if (window.mcpAvailable) {
            window.callMCP('write_development_note', note);
        } else {
            console.log('Development Note:', note);
        }
    }

    // Visualization Updates
    updateVisualization(event) {
        // Update PDL diagram based on event
        const svg = document.querySelector('#pdl-svg-content svg');
        if (!svg) return;

        switch (event.type) {
            case 'phase_transition':
                this.highlightPhase(svg, event.data.to);
                break;
            case 'agent_assigned':
                this.showAgentActivity(svg, event.data.agent);
                break;
            case 'gate_review':
                this.updateGateStatus(svg, event.data.gate, event.data.status);
                break;
        }
    }

    highlightPhase(svg, phase) {
        // Remove previous highlights
        svg.querySelectorAll('.current-phase').forEach(el => {
            el.classList.remove('current-phase');
        });

        // Add current phase highlight
        const phaseElements = svg.querySelectorAll('rect[fill*="phaseGrad"]');
        const phaseMap = {
            'discovery': 0,
            'planning': 1,
            'development': 2,
            'launch': 3,
            'growth': 4,
            'optimization': 5,
            'evolution': 6
        };
        
        if (phaseElements[phaseMap[phase]]) {
            phaseElements[phaseMap[phase]].classList.add('current-phase');
        }
    }

    showAgentActivity(svg, agent) {
        // Visual indicator for agent activity
        console.log(`Agent ${agent} is active`);
    }

    updateGateStatus(svg, gate, status) {
        // Update gate visual status
        const gateElement = svg.querySelector(`text:contains("${gate}")`);
        if (gateElement) {
            gateElement.classList.toggle('gate-passed', status === 'passed');
        }
    }

    updatePhaseVisualization(phase) {
        const svg = document.querySelector('#pdl-svg-content svg');
        if (svg) {
            this.highlightPhase(svg, phase);
        }
    }

    // API Methods
    transitionPhase(fromPhase, toPhase, reason = '') {
        return this.emit('phase_transition', {
            from: fromPhase,
            to: toPhase,
            reason: reason
        }, {
            brief: `Phase: ${fromPhase} → ${toPhase}`,
            references: reason ? [`reason: ${reason}`] : []
        });
    }

    assignAgent(agentType, role, task = '') {
        return this.emit('agent_assigned', {
            agent: agentType,
            role: role,
            task: task
        }, {
            brief: `${agentType} assigned as ${role}`,
            references: task ? [`task: ${task}`] : []
        });
    }

    logDiscovery(finding, source = '', confidence = 'medium') {
        return this.emit('discovery', {
            finding: finding,
            source: source,
            confidence: confidence
        }, {
            brief: `Discovery: ${finding.substring(0, 40)}...`,
            references: source ? [source] : []
        });
    }

    logResearch(topic, conclusion, references = []) {
        return this.emit('research_complete', {
            topic: topic,
            conclusion: conclusion,
            references: references
        }, {
            brief: `Research: ${topic} - ${conclusion.substring(0, 30)}...`,
            references: references
        });
    }

    // Utility Methods
    sendToServer(event) {
        if (!this.offlineMode && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(event));
        } else if (this.offlineMode) {
            // Store events locally in offline mode
            localStorage.setItem(`pdl_event_${event.id}`, JSON.stringify(event));
        }
    }

    handleIncomingEvent(data) {
        // Handle events from other agents/sessions
        this.addToHistory(data);
        this.executeHooks(data.type, data);
        this.updateVisualization(data);
    }

    getEventHistory(filter = {}) {
        let filtered = this.eventHistory;

        if (filter.phase) {
            filtered = filtered.filter(e => e.phase === filter.phase);
        }
        if (filter.agent) {
            filtered = filtered.filter(e => e.agent === filter.agent);
        }
        if (filter.type) {
            filtered = filtered.filter(e => e.type === filter.type);
        }

        return filtered;
    }

    getCurrentState() {
        return {
            phase: this.currentPhase,
            activeAgents: Array.from(this.activeAgents),
            recentEvents: this.eventHistory.slice(-10),
            connected: this.ws && this.ws.readyState === WebSocket.OPEN
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDLFramework;
} else {
    window.PDLFramework = PDLFramework;
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
    window.pdl = new PDLFramework();
    
    // Expose useful methods globally
    window.pdlTransition = (from, to, reason) => window.pdl.transitionPhase(from, to, reason);
    window.pdlAssign = (agent, role, task) => window.pdl.assignAgent(agent, role, task);
    window.pdlDiscover = (finding, source) => window.pdl.logDiscovery(finding, source);
    window.pdlResearch = (topic, conclusion, refs) => window.pdl.logResearch(topic, conclusion, refs);
}