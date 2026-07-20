import { z } from 'zod';

// Condition & Requirements Schema
export const ConditionSchema = z.lazy(() => 
  z.object({
    type: z.enum(['state', 'evidence', 'inventory', 'puzzle']),
    path: z.string().optional(),
    key: z.string().optional(), // backward compatibility with "key" or "path"
    equals: z.any().optional(),
    gte: z.number().optional(),
    lte: z.number().optional(),
    contains: z.any().optional(),
    id: z.string().optional(),
    value: z.any().optional()
  })
);

export type Condition = z.infer<typeof ConditionSchema>;

export const ConditionTreeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    all: z.array(ConditionTreeSchema).optional(),
    any: z.array(ConditionTreeSchema).optional(),
    not: z.lazy(() => ConditionTreeSchema).optional(),
    type: z.enum(['state', 'evidence', 'inventory', 'puzzle']).optional(),
    path: z.string().optional(),
    key: z.string().optional(),
    equals: z.any().optional(),
    gte: z.number().optional(),
    lte: z.number().optional(),
    contains: z.any().optional(),
    id: z.string().optional(),
    value: z.any().optional()
  })
);

export type ConditionTree = z.infer<typeof ConditionTreeSchema>;

// Declarative Effect Schema
export const EffectSchema = z.object({
  action: z.enum(['set', 'increment', 'add_inventory', 'remove_inventory', 'unlock_evidence', 'board_card']),
  path: z.string().optional(),
  value: z.any().optional(),
  item: z.string().optional(),
  id: z.string().optional(),
  card: z.object({
    id: z.string(),
    type: z.enum(['suspect', 'evidence', 'theory']),
    label: z.string(),
    x: z.number().optional(),
    y: z.number().optional()
  }).optional()
});

export type Effect = z.infer<typeof EffectSchema>;

// Case Manifest Schema
export const CaseManifestSchema = z.object({
  id: z.string(),
  title: z.string(),
  genre: z.string(),
  description: z.string(),
  difficulty: z.number(),
  length: z.string(),
  version: z.number(),
  engineVersion: z.number(),
  entryRoom: z.string(),
  coverImage: z.string().optional(),
  music: z.string().optional(),
  thumbnail: z.string().optional(),
  modules: z.array(z.string())
});

export type CaseManifest = z.infer<typeof CaseManifestSchema>;

// Rooms Schema
export const RoomDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  bg_image: z.string()
});

export const RoomsConfigSchema = z.record(z.string(), RoomDefinitionSchema);

// Hotspots Schema
export const HotspotSchema = z.object({
  name: z.string(),
  hotspot: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number()
  }),
  is_red_herring: z.boolean().optional(),
  cost_minutes: z.number().optional()
});

export const HotspotsConfigSchema = z.record(z.string(), z.record(z.string(), HotspotSchema));

// Interactables Schema
export const InteractableItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  locked: z.boolean().optional(),
  requires_key: z.string().optional(),
  requires_password: z.string().optional(),
  evidence_reward: z.string().optional(),
  inventory_reward: z.string().optional(),
  cost_minutes: z.number().optional(),
  is_red_herring: z.boolean().optional(),
  requires: ConditionTreeSchema.optional(),
  effects: z.array(EffectSchema).optional()
});

// An interactable container node can have sub-nodes
export const InteractableNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    description: z.string(),
    locked: z.boolean().optional(),
    requires_key: z.string().optional(),
    requires_password: z.string().optional(),
    evidence_reward: z.string().optional(),
    inventory_reward: z.string().optional(),
    cost_minutes: z.number().optional(),
    is_red_herring: z.boolean().optional(),
    requires: ConditionTreeSchema.optional(),
    effects: z.array(EffectSchema).optional(),
    nodes: z.record(z.string(), InteractableNodeSchema).optional()
  })
);

export const InteractablesConfigSchema = z.record(z.string(), z.record(z.string(), InteractableNodeSchema));

// Dialogue Node Schema
export const DialogueChoiceSchema = z.object({
  text: z.string(),
  next: z.string(),
  requires: ConditionTreeSchema.optional(),
  effects: z.array(EffectSchema).optional(),
  effect: z.string().optional() // backward compatibility/referencing key in effects.json
});

export const DialogueNodeSchema = z.object({
  text: z.string(),
  requires: ConditionTreeSchema.optional(),
  effects: z.array(EffectSchema).optional(),
  choices: z.array(DialogueChoiceSchema).optional()
});

export const DialogueTreeSchema = z.record(z.string(), z.record(z.string(), DialogueNodeSchema));

// Effects Config Schema
export const EffectsConfigSchema = z.record(z.string(), z.array(EffectSchema));

// Triggers Schema
export const TriggerSchema = z.object({
  trigger: z.string(),
  requires: ConditionTreeSchema.optional(),
  effects: z.array(EffectSchema)
});

export const TriggersConfigSchema = z.array(TriggerSchema);
export type Trigger = z.infer<typeof TriggerSchema>;

// Suspects Schema
export const SuspectSchema = z.object({
  name: z.string(),
  description: z.string(),
  initial_suspicion: z.number().optional(),
  threshold_reveal_suspect: z.number()
});
export const SuspectsConfigSchema = z.record(z.string(), SuspectSchema);

// Contradictions Schema
export const ContradictionSchema = z.object({
  title: z.string(),
  description: z.string()
});
export const ContradictionsConfigSchema = z.record(z.string(), ContradictionSchema);

// Ending Accusation Schema
export const EndingSlotSchema = z.object({
  slot: z.string(),
  correct: z.string()
});

export const EndingsConfigSchema = z.object({
  culprit: z.string().optional(), // backward compatibility
  weapon: z.string().optional(),
  motive: z.string().optional(),
  method: z.string().optional(),
  time_of_death: z.string().optional(),
  core_evidence: z.array(z.string()).optional(),
  required: z.array(EndingSlotSchema),
  endings: z.record(z.string(), z.object({
    title: z.string(),
    rating: z.string(),
    description: z.string()
  }))
});

// Puzzle Definitions
export const PuzzleDefinitionSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  difficulty: z.number(),
  requirements: ConditionTreeSchema.optional(),
  rewards: z.array(EffectSchema),
  data: z.any()
});

export const PuzzlesConfigSchema = z.record(z.string(), PuzzleDefinitionSchema);

// Evidence/Clue Config Schema
export const EvidenceItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  location: z.string(),
  reliability: z.string().optional(),
  tags: z.array(z.string()).optional(),
  importance: z.string().optional(),
  suspicion_impact: z.record(z.string(), z.number()).optional()
});
export const EvidenceConfigSchema = z.record(z.string(), EvidenceItemSchema);
