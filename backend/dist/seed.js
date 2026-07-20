"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./config/db");
const CaseLoader_1 = require("./game/loader/CaseLoader");
const seedDatabase = async () => {
    console.log('🌱 Starting database validation and initialization...');
    try {
        // 1. Validate all case folders with Zod schemas
        console.log('Validating case configurations...');
        const cases = CaseLoader_1.CaseLoader.listCases();
        console.log(`Found ${cases.length} cases to validate.`);
        for (const caseMeta of cases) {
            console.log(`Validating case: "${caseMeta.id}" (${caseMeta.title})...`);
            const loaded = CaseLoader_1.CaseLoader.loadCase(caseMeta.id);
            console.log(`✅ Case "${caseMeta.id}" is valid! Manifest Version: ${loaded.manifest.version}`);
        }
        // 2. Execute schema.sql
        const schemaPath = path_1.default.join(__dirname, 'models', 'schema.sql');
        const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
        console.log('Executing database schema.sql...');
        await db_1.pool.query(schemaSql);
        console.log('✅ Database schema initialized successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error during validation or database seeding:', error);
        process.exit(1);
    }
};
seedDatabase();
