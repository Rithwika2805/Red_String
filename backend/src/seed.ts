import fs from 'fs';
import path from 'path';
import { pool } from './config/db';

const seedDatabase = async () => {
  console.log('🌱 Starting database initialization...');
  try {
    const schemaPath = path.join(__dirname, 'models', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql...');
    await pool.query(schemaSql);
    console.log('✅ Database schema initialized successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
};

seedDatabase();
