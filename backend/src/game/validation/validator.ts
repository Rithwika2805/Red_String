import { 
  CaseManifestSchema, 
  RoomsConfigSchema, 
  HotspotsConfigSchema, 
  InteractablesConfigSchema, 
  DialogueTreeSchema, 
  EffectsConfigSchema, 
  TriggersConfigSchema, 
  EndingsConfigSchema, 
  PuzzlesConfigSchema,
  SuspectsConfigSchema,
  ContradictionsConfigSchema,
  EvidenceConfigSchema
} from './schemas';

export class CaseValidator {
  /**
   * Validate manifest structure.
   */
  public static validateManifest(data: any, caseId: string): void {
    const res = CaseManifestSchema.safeParse(data);
    if (!res.success) {
      throw new Error(`[Schema Error] Invalid manifest.json in case "${caseId}":\n${res.error.message}`);
    }
  }

  /**
   * Validate rooms config.
   */
  public static validateRooms(data: any, caseId: string): void {
    const res = RoomsConfigSchema.safeParse(data);
    if (!res.success) {
      throw new Error(`[Schema Error] Invalid rooms.json in case "${caseId}":\n${res.error.message}`);
    }
  }

  /**
   * Validate hotspots config.
   */
  public static validateHotspots(data: any, caseId: string): void {
    const res = HotspotsConfigSchema.safeParse(data);
    if (!res.success) {
      throw new Error(`[Schema Error] Invalid hotspots.json in case "${caseId}":\n${res.error.message}`);
    }
  }

  /**
   * Validate interactables config.
   */
  public static validateInteractables(data: any, caseId: string): void {
    const res = InteractablesConfigSchema.safeParse(data);
    if (!res.success) {
      throw new Error(`[Schema Error] Invalid interactables.json in case "${caseId}":\n${res.error.message}`);
    }
  }

  /**
   * Validate dialogues config.
   */
  public static validateDialogues(data: any, caseId: string): void {
    const res = DialogueTreeSchema.safeParse(data);
    if (!res.success) {
      throw new Error(`[Schema Error] Invalid dialogues.json in case "${caseId}":\n${res.error.message}`);
    }
  }

  /**
   * Validate effects config.
   */
  public static validateEffects(data: any, caseId: string): void {
    const res = EffectsConfigSchema.safeParse(data);
    if (!res.success) {
      throw new Error(`[Schema Error] Invalid effects.json in case "${caseId}":\n${res.error.message}`);
    }
  }

  /**
   * Validate triggers config.
   */
  public static validateTriggers(data: any, caseId: string): void {
    const res = TriggersConfigSchema.safeParse(data);
    if (!res.success) {
      throw new Error(`[Schema Error] Invalid triggers.json in case "${caseId}":\n${res.error.message}`);
    }
  }

  /**
   * Validate evidence config.
   */
  public static validateEvidence(data: any, caseId: string): void {
    const res = EvidenceConfigSchema.safeParse(data);
    if (!res.success) {
      throw new Error(`[Schema Error] Invalid evidence.json in case "${caseId}":\n${res.error.message}`);
    }
  }

  /**
   * Validate suspects config.
   */
  public static validateSuspects(data: any, caseId: string): void {
    const res = SuspectsConfigSchema.safeParse(data);
    if (!res.success) {
      throw new Error(`[Schema Error] Invalid suspects.json in case "${caseId}":\n${res.error.message}`);
    }
  }

  /**
   * Validate contradictions config.
   */
  public static validateContradictions(data: any, caseId: string): void {
    const res = ContradictionsConfigSchema.safeParse(data);
    if (!res.success) {
      throw new Error(`[Schema Error] Invalid contradiction.json in case "${caseId}":\n${res.error.message}`);
    }
  }

  /**
   * Validate endings config.
   */
  public static validateEndings(data: any, caseId: string): void {
    const res = EndingsConfigSchema.safeParse(data);
    if (!res.success) {
      throw new Error(`[Schema Error] Invalid endings.json in case "${caseId}":\n${res.error.message}`);
    }
  }

  /**
   * Validate puzzles config.
   */
  public static validatePuzzles(data: any, caseId: string): void {
    const res = PuzzlesConfigSchema.safeParse(data);
    if (!res.success) {
      throw new Error(`[Schema Error] Invalid puzzles configuration in case "${caseId}":\n${res.error.message}`);
    }
  }
}
