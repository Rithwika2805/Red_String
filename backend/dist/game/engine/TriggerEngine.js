"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriggerEngine = void 0;
const RequirementEngine_1 = require("./RequirementEngine");
const EffectEngine_1 = require("./EffectEngine");
class TriggerEngine {
    /**
     * Evaluate state triggers and execute matching effects.
     */
    static evaluateTriggers(triggerCode, triggers, worldState, inventory, discoveredEvidence, completedPuzzles) {
        const emittedEvents = [];
        const newCards = [];
        if (!triggers)
            return { emittedEvents, newCards };
        triggers.forEach((trig) => {
            if (trig.trigger === triggerCode) {
                // Validate triggers criteria
                const meetsRequirements = RequirementEngine_1.RequirementEngine.checkRequirements(trig.requires, worldState, inventory, discoveredEvidence, completedPuzzles);
                if (meetsRequirements) {
                    const result = EffectEngine_1.EffectEngine.executeEffects(trig.effects, worldState, inventory, discoveredEvidence, completedPuzzles);
                    emittedEvents.push(...result.emittedEvents);
                    newCards.push(...result.newCards);
                }
            }
        });
        return { emittedEvents, newCards };
    }
}
exports.TriggerEngine = TriggerEngine;
