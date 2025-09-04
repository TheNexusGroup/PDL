// Quick test of MCP server functionality
import Database from './src/db/database.js';
import { v4 as uuidv4 } from 'uuid';

async function testServer() {
  const db = new Database();
  await db.connect();
  
  console.log('Testing PDL MCP Server...\n');
  
  try {
    // Test 1: Create a project
    console.log('1. Creating test project...');
    const project = await db.createProject({
      name: 'Test Project',
      slug: 'test-project',
      description: 'Testing the PDL MCP server',
      createdBy: 'test-user',
      repositoryUrl: 'https://github.com/test/test-project',
      tags: ['test', 'demo']
    });
    console.log('✓ Project created:', project.id);
    
    // Test 2: Create phases
    console.log('\n2. Creating project phases...');
    const phases = ['discovery', 'planning', 'development', 'launch', 'growth', 'optimization'];
    for (const phaseName of phases) {
      const phase = await db.createPhase(project.id, {
        name: phaseName,
        displayName: phaseName.charAt(0).toUpperCase() + phaseName.slice(1),
        plannedEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: phaseName === 'discovery' ? 'active' : 'pending'
      });
      console.log(`  ✓ ${phaseName} phase created`);
    }
    
    // Test 3: Create and assign agents
    console.log('\n3. Creating and assigning agents...');
    const agentTypes = [
      { name: 'Alice PM', type: 'product_manager', specializations: ['strategy', 'roadmap'] },
      { name: 'Bob Dev', type: 'developer', specializations: ['frontend', 'react'] },
      { name: 'Carol QA', type: 'qa_engineer', specializations: ['automation', 'testing'] }
    ];
    
    let firstAgentId = null;
    for (const agentData of agentTypes) {
      const agent = await db.createAgent(agentData);
      if (!firstAgentId) firstAgentId = agent.id; // Save first agent ID for events
      await db.assignAgentToProject({
        projectId: project.id,
        agentId: agent.id,
        role: agentData.type,
        capacityPercentage: 80
      });
      console.log(`  ✓ ${agentData.name} (${agentData.type}) assigned to project`);
    }
    
    // Test 4: Log some events
    console.log('\n4. Logging project events...');
    const events = [
      { type: 'phase_started', brief: 'Discovery phase initiated' },
      { type: 'agent_assigned', brief: 'Team assembled for project' },
      { type: 'research_complete', brief: 'Market research findings documented' }
    ];
    
    for (const eventData of events) {
      await db.logEvent({
        projectId: project.id,
        ...eventData,
        agentId: firstAgentId, // Use real agent ID
        priority: 'medium'
      });
      console.log(`  ✓ Event logged: ${eventData.brief}`);
    }
    
    // Test 5: Retrieve project data
    console.log('\n5. Retrieving project data...');
    const projectData = await db.getProject(project.id);
    const currentPhase = await db.getCurrentPhase(project.id);
    const team = await db.getProjectAgents(project.id);
    const recentEvents = await db.getEvents(project.id, { limit: 5 });
    
    console.log(`  ✓ Project: ${projectData.name}`);
    console.log(`  ✓ Current Phase: ${currentPhase.name}`);
    console.log(`  ✓ Team Size: ${team.length} agents`);
    console.log(`  ✓ Recent Events: ${recentEvents.length} events`);
    
    console.log('\n✅ All tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.close();
  }
}

testServer().catch(console.error);