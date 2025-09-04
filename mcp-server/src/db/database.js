import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../db/pdl.db');

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          // Enable foreign keys
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Generic query methods
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Project management methods
  async createProject(params) {
    const id = uuidv4();
    const sql = `
      INSERT INTO projects (id, name, slug, description, created_by, config, repository_url, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.run(sql, [
      id,
      params.name,
      params.slug,
      params.description || null,
      params.createdBy,
      JSON.stringify(params.config || {}),
      params.repositoryUrl || null,
      JSON.stringify(params.tags || [])
    ]);
    
    return this.getProject(id);
  }

  async getProject(projectId) {
    const sql = 'SELECT * FROM projects WHERE id = ?';
    const project = await this.get(sql, [projectId]);
    
    if (project) {
      project.config = JSON.parse(project.config || '{}');
      project.tags = JSON.parse(project.tags || '[]');
    }
    
    return project;
  }

  async getProjects(filter = {}) {
    let sql = 'SELECT * FROM projects WHERE 1=1';
    const params = [];
    
    if (filter.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }
    
    if (filter.createdBy) {
      sql += ' AND created_by = ?';
      params.push(filter.createdBy);
    }
    
    if (filter.search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (filter.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
      
      if (filter.offset) {
        sql += ' OFFSET ?';
        params.push(filter.offset);
      }
    }
    
    const projects = await this.all(sql, params);
    
    // Parse JSON fields
    return projects.map(p => ({
      ...p,
      config: JSON.parse(p.config || '{}'),
      tags: JSON.parse(p.tags || '[]')
    }));
  }

  // Phase management methods
  async createPhase(projectId, params) {
    const id = uuidv4();
    const sql = `
      INSERT INTO phases (id, project_id, name, display_name, start_date, planned_end_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.run(sql, [
      id,
      projectId,
      params.name,
      params.displayName || params.name,
      params.startDate || new Date().toISOString(),
      params.plannedEndDate,
      params.status || 'pending'
    ]);
    
    return this.getPhase(id);
  }

  async getPhase(phaseId) {
    const sql = 'SELECT * FROM phases WHERE id = ?';
    return this.get(sql, [phaseId]);
  }

  async getCurrentPhase(projectId) {
    const sql = `
      SELECT * FROM phases 
      WHERE project_id = ? AND status = 'active' 
      ORDER BY start_date DESC 
      LIMIT 1
    `;
    return this.get(sql, [projectId]);
  }

  async getPhases(projectId) {
    const sql = 'SELECT * FROM phases WHERE project_id = ? ORDER BY created_at';
    return this.all(sql, [projectId]);
  }

  // Agent management methods
  async createAgent(params) {
    const id = uuidv4();
    const sql = `
      INSERT INTO agents (id, name, email, type, specializations, status, time_zone, working_hours, capacity_hours_per_week)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.run(sql, [
      id,
      params.name,
      params.email || null,
      params.type,
      JSON.stringify(params.specializations || []),
      params.status || 'available',
      params.timeZone || 'UTC',
      JSON.stringify(params.workingHours || { start: '09:00', end: '17:00' }),
      params.capacityHoursPerWeek || 40
    ]);
    
    return this.getAgent(id);
  }

  async getAgent(agentId) {
    const sql = 'SELECT * FROM agents WHERE id = ?';
    const agent = await this.get(sql, [agentId]);
    
    if (agent) {
      agent.specializations = JSON.parse(agent.specializations || '[]');
      agent.working_hours = JSON.parse(agent.working_hours || '{}');
    }
    
    return agent;
  }

  async assignAgentToProject(params) {
    const id = uuidv4();
    const sql = `
      INSERT INTO project_agents (id, project_id, agent_id, role, status, project_capacity_percentage)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await this.run(sql, [
      id,
      params.projectId,
      params.agentId,
      params.role || null,
      params.status || 'active',
      params.capacityPercentage || 100
    ]);
    
    return this.get('SELECT * FROM project_agents WHERE id = ?', [id]);
  }

  async getProjectAgents(projectId) {
    const sql = `
      SELECT pa.*, a.name, a.email, a.type, a.specializations
      FROM project_agents pa
      JOIN agents a ON pa.agent_id = a.id
      WHERE pa.project_id = ? AND pa.status = 'active'
    `;
    
    const agents = await this.all(sql, [projectId]);
    
    return agents.map(a => ({
      ...a,
      specializations: JSON.parse(a.specializations || '[]')
    }));
  }

  // Event logging methods
  async logEvent(params) {
    const id = uuidv4();
    const sql = `
      INSERT INTO events (id, project_id, type, subtype, phase_id, agent_id, brief, description, data, refs, priority, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.run(sql, [
      id,
      params.projectId,
      params.type,
      params.subtype || null,
      params.phaseId || null,
      params.agentId || null,
      params.brief.substring(0, 60), // Enforce 60 char limit
      params.description || null,
      JSON.stringify(params.data || {}),
      JSON.stringify(params.refs || []),
      params.priority || 'medium',
      params.category || 'system'
    ]);
    
    return this.get('SELECT * FROM events WHERE id = ?', [id]);
  }

  async getEvents(projectId, filter = {}) {
    let sql = 'SELECT * FROM events WHERE project_id = ?';
    const params = [projectId];
    
    if (filter.type) {
      sql += ' AND type = ?';
      params.push(filter.type);
    }
    
    if (filter.phaseId) {
      sql += ' AND phase_id = ?';
      params.push(filter.phaseId);
    }
    
    if (filter.agentId) {
      sql += ' AND agent_id = ?';
      params.push(filter.agentId);
    }
    
    sql += ' ORDER BY timestamp DESC';
    
    if (filter.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }
    
    const events = await this.all(sql, params);
    
    return events.map(e => ({
      ...e,
      data: JSON.parse(e.data || '{}'),
      refs: JSON.parse(e.refs || '[]')
    }));
  }
}

export default Database;