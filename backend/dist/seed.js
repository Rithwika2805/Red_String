"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./config/db");
const seedDatabase = async () => {
    console.log('🌱 Starting database initialization...');
    try {
        const schemaPath = path_1.default.join(__dirname, 'models', 'schema.sql');
        const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
        console.log('Executing schema.sql...');
        await db_1.pool.query(schemaSql);
        console.log('✅ Database schema initialized successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
};
seedDatabase();
