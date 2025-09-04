import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../db/pdl.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

async function initDatabase() {
  console.log('Initializing PDL database...');
  
  // Ensure database directory exists
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  
  // Read schema file
  const schema = await fs.readFile(SCHEMA_PATH, 'utf8');
  
  // Create database connection
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      process.exit(1);
    }
    console.log('Connected to SQLite database');
  });
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  // Execute schema
  return new Promise((resolve, reject) => {
    db.exec(schema, (err) => {
      if (err) {
        console.error('Error executing schema:', err);
        reject(err);
      } else {
        console.log('Database schema created successfully');
        
        // Close database
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          }
          console.log('Database initialization complete');
          resolve();
        });
      }
    });
  });
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initDatabase().catch(console.error);
}

export default initDatabase;