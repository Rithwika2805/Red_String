"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DialogueEngine = void 0;
const RequirementEngine_1 = require("./RequirementEngine");
const EffectEngine_1 = require("./EffectEngine");
class DialogueEngine {
    /**
     * Filter accessible choices for a dialogue node based on requirements.
     */
    static filterChoices(choices, worldState, inventory, discoveredEvidence, completedPuzzles) {
        if (!choices)
            return [];
        return choices.filter((choice) => {
            return RequirementEngine_1.RequirementEngine.checkRequirements(choice.requires, worldState, inventory, discoveredEvidence, completedPuzzles);
        });
    }
    /**
     * Process dialogue node requirements and choice triggers.
     */
    static executeDialogueChoice(choice, effectsConfig, // from effects.json
    worldState, inventory, discoveredEvidence, completedPuzzles) {
        const emittedEvents = [];
        const newCards = [];
        // 1. Execute direct inline choice effects
        if (choice.effects) {
            const result = EffectEngine_1.EffectEngine.executeEffects(choice.effects, worldState, inventory, discoveredEvidence, completedPuzzles);
            emittedEvents.push(...result.emittedEvents);
            newCards.push(...result.newCards);
        }
        // 2. Execute referenced effect key from effects.json
        if (choice.effect && effectsConfig[choice.effect]) {
            const result = EffectEngine_1.EffectEngine.executeEffects(effectsConfig[choice.effect], worldState, inventory, discoveredEvidence, completedPuzzles);
            emittedEvents.push(...result.emittedEvents);
            newCards.push(...result.newCards);
        }
        return { emittedEvents, newCards };
    }
}
exports.DialogueEngine = DialogueEngine;
