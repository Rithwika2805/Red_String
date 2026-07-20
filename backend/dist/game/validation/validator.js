"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseValidator = void 0;
const schemas_1 = require("./schemas");
class CaseValidator {
    /**
     * Validate manifest structure.
     */
    static validateManifest(data, caseId) {
        const res = schemas_1.CaseManifestSchema.safeParse(data);
        if (!res.success) {
            throw new Error(`[Schema Error] Invalid manifest.json in case "${caseId}":\n${res.error.message}`);
        }
    }
    /**
     * Validate rooms config.
     */
    static validateRooms(data, caseId) {
        const res = schemas_1.RoomsConfigSchema.safeParse(data);
        if (!res.success) {
            throw new Error(`[Schema Error] Invalid rooms.json in case "${caseId}":\n${res.error.message}`);
        }
    }
    /**
     * Validate hotspots config.
     */
    static validateHotspots(data, caseId) {
        const res = schemas_1.HotspotsConfigSchema.safeParse(data);
        if (!res.success) {
            throw new Error(`[Schema Error] Invalid hotspots.json in case "${caseId}":\n${res.error.message}`);
        }
    }
    /**
     * Validate interactables config.
     */
    static validateInteractables(data, caseId) {
        const res = schemas_1.InteractablesConfigSchema.safeParse(data);
        if (!res.success) {
            throw new Error(`[Schema Error] Invalid interactables.json in case "${caseId}":\n${res.error.message}`);
        }
    }
    /**
     * Validate dialogues config.
     */
    static validateDialogues(data, caseId) {
        const res = schemas_1.DialogueTreeSchema.safeParse(data);
        if (!res.success) {
            throw new Error(`[Schema Error] Invalid dialogues.json in case "${caseId}":\n${res.error.message}`);
        }
    }
    /**
     * Validate effects config.
     */
    static validateEffects(data, caseId) {
        const res = schemas_1.EffectsConfigSchema.safeParse(data);
        if (!res.success) {
            throw new Error(`[Schema Error] Invalid effects.json in case "${caseId}":\n${res.error.message}`);
        }
    }
    /**
     * Validate triggers config.
     */
    static validateTriggers(data, caseId) {
        const res = schemas_1.TriggersConfigSchema.safeParse(data);
        if (!res.success) {
            throw new Error(`[Schema Error] Invalid triggers.json in case "${caseId}":\n${res.error.message}`);
        }
    }
    /**
     * Validate evidence config.
     */
    static validateEvidence(data, caseId) {
        const res = schemas_1.EvidenceConfigSchema.safeParse(data);
        if (!res.success) {
            throw new Error(`[Schema Error] Invalid evidence.json in case "${caseId}":\n${res.error.message}`);
        }
    }
    /**
     * Validate suspects config.
     */
    static validateSuspects(data, caseId) {
        const res = schemas_1.SuspectsConfigSchema.safeParse(data);
        if (!res.success) {
            throw new Error(`[Schema Error] Invalid suspects.json in case "${caseId}":\n${res.error.message}`);
        }
    }
    /**
     * Validate contradictions config.
     */
    static validateContradictions(data, caseId) {
        const res = schemas_1.ContradictionsConfigSchema.safeParse(data);
        if (!res.success) {
            throw new Error(`[Schema Error] Invalid contradiction.json in case "${caseId}":\n${res.error.message}`);
        }
    }
    /**
     * Validate endings config.
     */
    static validateEndings(data, caseId) {
        const res = schemas_1.EndingsConfigSchema.safeParse(data);
        if (!res.success) {
            throw new Error(`[Schema Error] Invalid endings.json in case "${caseId}":\n${res.error.message}`);
        }
    }
    /**
     * Validate puzzles config.
     */
    static validatePuzzles(data, caseId) {
        const res = schemas_1.PuzzlesConfigSchema.safeParse(data);
        if (!res.success) {
            throw new Error(`[Schema Error] Invalid puzzles configuration in case "${caseId}":\n${res.error.message}`);
        }
    }
}
exports.CaseValidator = CaseValidator;
