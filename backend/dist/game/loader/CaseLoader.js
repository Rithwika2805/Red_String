"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseLoader = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const validator_1 = require("../validation/validator");
class CaseLoader {
    static casesDir = path_1.default.join(__dirname, '..', '..', 'data', 'cases');
    /**
     * Scan and list all active cases by searching for manifest.json.
     */
    static listCases() {
        const list = [];
        if (!fs_1.default.existsSync(this.casesDir))
            return list;
        const folders = fs_1.default.readdirSync(this.casesDir);
        for (const folder of folders) {
            const manifestPath = path_1.default.join(this.casesDir, folder, 'data', 'manifest.json');
            if (fs_1.default.existsSync(manifestPath)) {
                try {
                    const manifestData = JSON.parse(fs_1.default.readFileSync(manifestPath, 'utf-8'));
                    validator_1.CaseValidator.validateManifest(manifestData, folder);
                    list.push(manifestData);
                }
                catch (e) {
                    console.error(`Error loading manifest for case folder "${folder}":`, e);
                }
            }
        }
        return list;
    }
    /**
     * Load and validate all configs for a specific case.
     */
    static loadCase(caseId) {
        const casePath = path_1.default.join(this.casesDir, caseId, 'data');
        if (!fs_1.default.existsSync(casePath)) {
            throw new Error(`Case directory not found: ${casePath}`);
        }
        const manifest = this.readJSON(path_1.default.join(casePath, 'manifest.json'));
        validator_1.CaseValidator.validateManifest(manifest, caseId);
        const rooms = this.readJSON(path_1.default.join(casePath, 'rooms.json'));
        validator_1.CaseValidator.validateRooms(rooms, caseId);
        const hotspots = this.readJSON(path_1.default.join(casePath, 'hotspots.json'));
        validator_1.CaseValidator.validateHotspots(hotspots, caseId);
        const interactables = this.readJSON(path_1.default.join(casePath, 'interactables.json'));
        validator_1.CaseValidator.validateInteractables(interactables, caseId);
        const dialogues = this.readJSON(path_1.default.join(casePath, 'dialogues.json'));
        validator_1.CaseValidator.validateDialogues(dialogues, caseId);
        const effects = this.readJSON(path_1.default.join(casePath, 'effects.json'));
        validator_1.CaseValidator.validateEffects(effects, caseId);
        const suspects = this.readJSON(path_1.default.join(casePath, 'suspects.json'));
        validator_1.CaseValidator.validateSuspects(suspects, caseId);
        const evidence = this.readJSON(path_1.default.join(casePath, 'evidence.json'));
        validator_1.CaseValidator.validateEvidence(evidence, caseId);
        // load contradictions from root file
        const contradictions = this.readJSON(path_1.default.join(casePath, 'contradiction.json'));
        validator_1.CaseValidator.validateContradictions(contradictions, caseId);
        // triggers and endings are optional but highly recommended
        const triggers = fs_1.default.existsSync(path_1.default.join(casePath, 'triggers.json'))
            ? this.readJSON(path_1.default.join(casePath, 'triggers.json'))
            : [];
        validator_1.CaseValidator.validateTriggers(triggers, caseId);
        const endings = this.readJSON(path_1.default.join(casePath, 'endings.json'));
        validator_1.CaseValidator.validateEndings(endings, caseId);
        // puzzles/ timeline, audio, etc. (excluding contradiction which is root level)
        const puzzles = this.loadCasePuzzles(caseId, casePath);
        validator_1.CaseValidator.validatePuzzles(puzzles, caseId);
        return { manifest, rooms, hotspots, interactables, dialogues, effects, triggers, endings, puzzles, suspects, contradictions, evidence };
    }
    static readJSON(filePath) {
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`Configuration file missing: ${filePath}`);
        }
        return JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
    }
    static loadCasePuzzles(caseId, casePath) {
        const puzzles = {};
        const puzzlesDir = path_1.default.join(casePath, 'puzzles');
        if (!fs_1.default.existsSync(puzzlesDir))
            return puzzles;
        const files = fs_1.default.readdirSync(puzzlesDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const puzzleId = file.replace('.json', '');
                // Exclude contradiction.json from puzzles directory if it happened to be there
                if (puzzleId === 'contradiction')
                    continue;
                const data = this.readJSON(path_1.default.join(puzzlesDir, file));
                puzzles[puzzleId] = data;
            }
        }
        return puzzles;
    }
}
exports.CaseLoader = CaseLoader;
