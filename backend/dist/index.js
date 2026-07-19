"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const cases_1 = __importDefault(require("./routes/cases"));
const board_1 = __importDefault(require("./routes/board"));
const notes_1 = __importDefault(require("./routes/notes"));
const error_1 = require("./middleware/error");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable CORS for frontend dev server
app.use((0, cors_1.default)({
    origin: '*', // We can restrict this in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/cases', cases_1.default);
app.use('/api/board', board_1.default);
app.use('/api/notes', notes_1.default);
// Test Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Red String Detective Engine API is online' });
});
// Error handling middleware
app.use(error_1.errorHandler);
app.listen(PORT, () => {
    console.log(`🕵️ Red String Detective Server is running on port ${PORT}`);
});
