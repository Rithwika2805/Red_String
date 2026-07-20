"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceConfigSchema = exports.EvidenceItemSchema = exports.PuzzlesConfigSchema = exports.PuzzleDefinitionSchema = exports.EndingsConfigSchema = exports.EndingSlotSchema = exports.ContradictionsConfigSchema = exports.ContradictionSchema = exports.SuspectsConfigSchema = exports.SuspectSchema = exports.TriggersConfigSchema = exports.TriggerSchema = exports.EffectsConfigSchema = exports.DialogueTreeSchema = exports.DialogueNodeSchema = exports.DialogueChoiceSchema = exports.InteractablesConfigSchema = exports.InteractableNodeSchema = exports.InteractableItemSchema = exports.HotspotsConfigSchema = exports.HotspotSchema = exports.RoomsConfigSchema = exports.RoomDefinitionSchema = exports.CaseManifestSchema = exports.EffectSchema = exports.ConditionTreeSchema = exports.ConditionSchema = void 0;
const zod_1 = require("zod");
// Condition & Requirements Schema
exports.ConditionSchema = zod_1.z.lazy(() => zod_1.z.object({
    type: zod_1.z.enum(['state', 'evidence', 'inventory', 'puzzle']),
    path: zod_1.z.string().optional(),
    key: zod_1.z.string().optional(), // backward compatibility with "key" or "path"
    equals: zod_1.z.any().optional(),
    gte: zod_1.z.number().optional(),
    lte: zod_1.z.number().optional(),
    contains: zod_1.z.any().optional(),
    id: zod_1.z.string().optional(),
    value: zod_1.z.any().optional()
}));
exports.ConditionTreeSchema = zod_1.z.lazy(() => zod_1.z.object({
    all: zod_1.z.array(exports.ConditionTreeSchema).optional(),
    any: zod_1.z.array(exports.ConditionTreeSchema).optional(),
    not: zod_1.z.lazy(() => exports.ConditionTreeSchema).optional(),
    type: zod_1.z.enum(['state', 'evidence', 'inventory', 'puzzle']).optional(),
    path: zod_1.z.string().optional(),
    key: zod_1.z.string().optional(),
    equals: zod_1.z.any().optional(),
    gte: zod_1.z.number().optional(),
    lte: zod_1.z.number().optional(),
    contains: zod_1.z.any().optional(),
    id: zod_1.z.string().optional(),
    value: zod_1.z.any().optional()
}));
// Declarative Effect Schema
exports.EffectSchema = zod_1.z.object({
    action: zod_1.z.enum(['set', 'increment', 'add_inventory', 'remove_inventory', 'unlock_evidence', 'board_card']),
    path: zod_1.z.string().optional(),
    value: zod_1.z.any().optional(),
    item: zod_1.z.string().optional(),
    id: zod_1.z.string().optional(),
    card: zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.enum(['suspect', 'evidence', 'theory']),
        label: zod_1.z.string(),
        x: zod_1.z.number().optional(),
        y: zod_1.z.number().optional()
    }).optional()
});
// Case Manifest Schema
exports.CaseManifestSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    genre: zod_1.z.string(),
    description: zod_1.z.string(),
    difficulty: zod_1.z.number(),
    length: zod_1.z.string(),
    version: zod_1.z.number(),
    engineVersion: zod_1.z.number(),
    entryRoom: zod_1.z.string(),
    coverImage: zod_1.z.string().optional(),
    music: zod_1.z.string().optional(),
    thumbnail: zod_1.z.string().optional(),
    modules: zod_1.z.array(zod_1.z.string())
});
// Rooms Schema
exports.RoomDefinitionSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    bg_image: zod_1.z.string()
});
exports.RoomsConfigSchema = zod_1.z.record(zod_1.z.string(), exports.RoomDefinitionSchema);
// Hotspots Schema
exports.HotspotSchema = zod_1.z.object({
    name: zod_1.z.string(),
    hotspot: zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
        w: zod_1.z.number(),
        h: zod_1.z.number()
    }),
    is_red_herring: zod_1.z.boolean().optional(),
    cost_minutes: zod_1.z.number().optional()
});
exports.HotspotsConfigSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.record(zod_1.z.string(), exports.HotspotSchema));
// Interactables Schema
exports.InteractableItemSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    locked: zod_1.z.boolean().optional(),
    requires_key: zod_1.z.string().optional(),
    requires_password: zod_1.z.string().optional(),
    evidence_reward: zod_1.z.string().optional(),
    inventory_reward: zod_1.z.string().optional(),
    cost_minutes: zod_1.z.number().optional(),
    is_red_herring: zod_1.z.boolean().optional(),
    requires: exports.ConditionTreeSchema.optional(),
    effects: zod_1.z.array(exports.EffectSchema).optional()
});
// An interactable container node can have sub-nodes
exports.InteractableNodeSchema = zod_1.z.lazy(() => zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    locked: zod_1.z.boolean().optional(),
    requires_key: zod_1.z.string().optional(),
    requires_password: zod_1.z.string().optional(),
    evidence_reward: zod_1.z.string().optional(),
    inventory_reward: zod_1.z.string().optional(),
    cost_minutes: zod_1.z.number().optional(),
    is_red_herring: zod_1.z.boolean().optional(),
    requires: exports.ConditionTreeSchema.optional(),
    effects: zod_1.z.array(exports.EffectSchema).optional(),
    nodes: zod_1.z.record(zod_1.z.string(), exports.InteractableNodeSchema).optional()
}));
exports.InteractablesConfigSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.record(zod_1.z.string(), exports.InteractableNodeSchema));
// Dialogue Node Schema
exports.DialogueChoiceSchema = zod_1.z.object({
    text: zod_1.z.string(),
    next: zod_1.z.string(),
    requires: exports.ConditionTreeSchema.optional(),
    effects: zod_1.z.array(exports.EffectSchema).optional(),
    effect: zod_1.z.string().optional() // backward compatibility/referencing key in effects.json
});
exports.DialogueNodeSchema = zod_1.z.object({
    text: zod_1.z.string(),
    requires: exports.ConditionTreeSchema.optional(),
    effects: zod_1.z.array(exports.EffectSchema).optional(),
    choices: zod_1.z.array(exports.DialogueChoiceSchema).optional()
});
exports.DialogueTreeSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.record(zod_1.z.string(), exports.DialogueNodeSchema));
// Effects Config Schema
exports.EffectsConfigSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.array(exports.EffectSchema));
// Triggers Schema
exports.TriggerSchema = zod_1.z.object({
    trigger: zod_1.z.string(),
    requires: exports.ConditionTreeSchema.optional(),
    effects: zod_1.z.array(exports.EffectSchema)
});
exports.TriggersConfigSchema = zod_1.z.array(exports.TriggerSchema);
// Suspects Schema
exports.SuspectSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    initial_suspicion: zod_1.z.number().optional(),
    threshold_reveal_suspect: zod_1.z.number()
});
exports.SuspectsConfigSchema = zod_1.z.record(zod_1.z.string(), exports.SuspectSchema);
// Contradictions Schema
exports.ContradictionSchema = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string()
});
exports.ContradictionsConfigSchema = zod_1.z.record(zod_1.z.string(), exports.ContradictionSchema);
// Ending Accusation Schema
exports.EndingSlotSchema = zod_1.z.object({
    slot: zod_1.z.string(),
    correct: zod_1.z.string()
});
exports.EndingsConfigSchema = zod_1.z.object({
    culprit: zod_1.z.string().optional(), // backward compatibility
    weapon: zod_1.z.string().optional(),
    motive: zod_1.z.string().optional(),
    method: zod_1.z.string().optional(),
    time_of_death: zod_1.z.string().optional(),
    core_evidence: zod_1.z.array(zod_1.z.string()).optional(),
    required: zod_1.z.array(exports.EndingSlotSchema),
    endings: zod_1.z.record(zod_1.z.string(), zod_1.z.object({
        title: zod_1.z.string(),
        rating: zod_1.z.string(),
        description: zod_1.z.string()
    }))
});
// Puzzle Definitions
exports.PuzzleDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    title: zod_1.z.string(),
    difficulty: zod_1.z.number(),
    requirements: exports.ConditionTreeSchema.optional(),
    rewards: zod_1.z.array(exports.EffectSchema),
    data: zod_1.z.any()
});
exports.PuzzlesConfigSchema = zod_1.z.record(zod_1.z.string(), exports.PuzzleDefinitionSchema);
// Evidence/Clue Config Schema
exports.EvidenceItemSchema = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    location: zod_1.z.string(),
    reliability: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    importance: zod_1.z.string().optional(),
    suspicion_impact: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional()
});
exports.EvidenceConfigSchema = zod_1.z.record(zod_1.z.string(), exports.EvidenceItemSchema);
