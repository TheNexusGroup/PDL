import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import Database from './db/database.js';
import initDatabase from './db/init.js';

// Initialize database connection
const db = new Database();

// MCP Server
const server = new Server(
  {
    name: 'pdl-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  // Project Management Tools
  {
    name: 'mcp__pdl__create_project',
    description: 'Create a new PDL project',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        slug: { type: 'string', description: 'URL-friendly project identifier' },
        description: { type: 'string', description: 'Project description' },
        createdBy: { type: 'string', description: 'Creator ID' },
        repositoryUrl: { type: 'string', description: 'Repository URL' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Project tags' }
      },
      required: ['name', 'slug', 'createdBy']
    }
  },
  {
    name: 'mcp__pdl__get_projects',
    description: 'List all projects with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'paused', 'completed', 'archived'] },
        createdBy: { type: 'string' },
        search: { type: 'string' },
        limit: { type: 'number' },
        offset: { type: 'number' }
      }
    }
  },
  {
    name: 'mcp__pdl__get_project',
    description: 'Get detailed information about a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' }
      },
      required: ['projectId']
    }
  },
  
  // Phase Management Tools
  {
    name: 'mcp__pdl__get_current_phase',
    description: 'Get the current active phase of a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' }
      },
      required: ['projectId']
    }
  },
  {
    name: 'mcp__pdl__create_phase',
    description: 'Create a new phase for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { 
          type: 'string', 
          enum: ['discovery', 'planning', 'development', 'launch', 'growth', 'optimization'],
          description: 'Phase type' 
        },
        displayName: { type: 'string', description: 'Display name for the phase' },
        startDate: { type: 'string', description: 'ISO 8601 date string' },
        plannedEndDate: { type: 'string', description: 'ISO 8601 date string' }
      },
      required: ['projectId', 'name', 'plannedEndDate']
    }
  },
  {
    name: 'mcp__pdl__transition_phase',
    description: 'Transition from one phase to another',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        fromPhase: { type: 'string', description: 'Current phase name' },
        toPhase: { type: 'string', description: 'Target phase name' },
        gateApproval: { type: 'boolean', description: 'Gate approval status' },
        notes: { type: 'string', description: 'Transition notes' },
        triggeredBy: { type: 'string', description: 'Agent ID triggering transition' }
      },
      required: ['projectId', 'fromPhase', 'toPhase', 'triggeredBy']
    }
  },
  
  // Agent Management Tools
  {
    name: 'mcp__pdl__register_agent',
    description: 'Register a new agent in the system',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Agent name' },
        email: { type: 'string', description: 'Agent email' },
        type: { 
          type: 'string',
          enum: ['product_manager', 'tech_lead', 'developer', 'designer', 'qa_engineer', 'devops', 'analyst'],
          description: 'Agent type'
        },
        specializations: { type: 'array', items: { type: 'string' } },
        capacityHoursPerWeek: { type: 'number', description: 'Weekly capacity in hours' }
      },
      required: ['name', 'type']
    }
  },
  {
    name: 'mcp__pdl__assign_agent_to_project',
    description: 'Assign an agent to a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        agentId: { type: 'string', description: 'Agent ID' },
        role: { type: 'string', description: 'Project-specific role' },
        capacityPercentage: { type: 'number', description: 'Percentage of agent capacity for this project' }
      },
      required: ['projectId', 'agentId']
    }
  },
  {
    name: 'mcp__pdl__get_project_team',
    description: 'Get all agents assigned to a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' }
      },
      required: ['projectId']
    }
  },
  
  // Event Management Tools
  {
    name: 'mcp__pdl__log_event',
    description: 'Log an event for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        type: { type: 'string', description: 'Event type' },
        brief: { type: 'string', description: 'Brief description (max 60 chars)' },
        description: { type: 'string', description: 'Full description' },
        phaseId: { type: 'string', description: 'Related phase ID' },
        agentId: { type: 'string', description: 'Related agent ID' },
        data: { type: 'object', description: 'Additional event data' },
        references: { type: 'array', items: { type: 'string' } },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
      },
      required: ['projectId', 'type', 'brief']
    }
  },
  {
    name: 'mcp__pdl__get_events',
    description: 'Get events for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        type: { type: 'string', description: 'Filter by event type' },
        phaseId: { type: 'string', description: 'Filter by phase' },
        agentId: { type: 'string', description: 'Filter by agent' },
        limit: { type: 'number', description: 'Maximum events to return' }
      },
      required: ['projectId']
    }
  }
];

// Register tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Project Management
      case 'mcp__pdl__create_project':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await db.createProject(args), null, 2)
            }
          ]
        };
        
      case 'mcp__pdl__get_projects':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await db.getProjects(args || {}), null, 2)
            }
          ]
        };
        
      case 'mcp__pdl__get_project':
        const project = await db.getProject(args.projectId);
        const phases = await db.getPhases(args.projectId);
        const team = await db.getProjectAgents(args.projectId);
        const recentEvents = await db.getEvents(args.projectId, { limit: 10 });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ project, phases, team, recentEvents }, null, 2)
            }
          ]
        };
        
      // Phase Management  
      case 'mcp__pdl__get_current_phase':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await db.getCurrentPhase(args.projectId), null, 2)
            }
          ]
        };
        
      case 'mcp__pdl__create_phase':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await db.createPhase(args.projectId, args), null, 2)
            }
          ]
        };
        
      case 'mcp__pdl__transition_phase':
        // Mark old phase as completed
        const oldPhaseSQL = `
          UPDATE phases 
          SET status = 'completed', end_date = CURRENT_TIMESTAMP 
          WHERE project_id = ? AND name = ?
        `;
        await db.run(oldPhaseSQL, [args.projectId, args.fromPhase]);
        
        // Activate new phase
        const newPhaseSQL = `
          UPDATE phases 
          SET status = 'active', start_date = CURRENT_TIMESTAMP 
          WHERE project_id = ? AND name = ?
        `;
        await db.run(newPhaseSQL, [args.projectId, args.toPhase]);
        
        // Log transition event
        await db.logEvent({
          projectId: args.projectId,
          type: 'phase_transition',
          brief: `Phase transition: ${args.fromPhase} → ${args.toPhase}`,
          description: args.notes,
          agentId: args.triggeredBy,
          data: { fromPhase: args.fromPhase, toPhase: args.toPhase, gateApproval: args.gateApproval }
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ 
                success: true, 
                fromPhase: args.fromPhase, 
                toPhase: args.toPhase 
              }, null, 2)
            }
          ]
        };
        
      // Agent Management
      case 'mcp__pdl__register_agent':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await db.createAgent(args), null, 2)
            }
          ]
        };
        
      case 'mcp__pdl__assign_agent_to_project':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await db.assignAgentToProject(args), null, 2)
            }
          ]
        };
        
      case 'mcp__pdl__get_project_team':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await db.getProjectAgents(args.projectId), null, 2)
            }
          ]
        };
        
      // Event Management
      case 'mcp__pdl__log_event':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await db.logEvent(args), null, 2)
            }
          ]
        };
        
      case 'mcp__pdl__get_events':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await db.getEvents(args.projectId, args), null, 2)
            }
          ]
        };
        
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    console.error('Tool execution error:', error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error.message}`
    );
  }
});

// Initialize and start server
async function main() {
  console.log('PDL MCP Server starting...');
  
  // Initialize database
  await initDatabase();
  await db.connect();
  console.log('Database connected');
  
  // Start MCP server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('PDL MCP Server running');
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\nShutting down PDL MCP Server...');
  await db.close();
  process.exit(0);
});

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});