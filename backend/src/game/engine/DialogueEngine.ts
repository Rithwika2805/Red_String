import { RequirementEngine } from './RequirementEngine';
import { EffectEngine } from './EffectEngine';

export class DialogueEngine {
  /**
   * Filter accessible choices for a dialogue node based on requirements.
   */
  public static filterChoices(
    choices: any[] | undefined,
    worldState: any,
    inventory: string[],
    discoveredEvidence: string[],
    completedPuzzles: string[]
  ): any[] {
    if (!choices) return [];
    return choices.filter((choice) => {
      return RequirementEngine.checkRequirements(
        choice.requires,
        worldState,
        inventory,
        discoveredEvidence,
        completedPuzzles
      );
    });
  }

  /**
   * Process dialogue node requirements and choice triggers.
   */
  public static executeDialogueChoice(
    choice: any,
    effectsConfig: Record<string, any[]>, // from effects.json
    worldState: any,
    inventory: string[],
    discoveredEvidence: string[],
    completedPuzzles: string[]
  ): {
    emittedEvents: string[];
    newCards: any[];
  } {
    const emittedEvents: string[] = [];
    const newCards: any[] = [];

    // 1. Execute direct inline choice effects
    if (choice.effects) {
      const result = EffectEngine.executeEffects(
        choice.effects,
        worldState,
        inventory,
        discoveredEvidence,
        completedPuzzles
      );
      emittedEvents.push(...result.emittedEvents);
      newCards.push(...result.newCards);
    }

    // 2. Execute referenced effect key from effects.json
    if (choice.effect && effectsConfig[choice.effect]) {
      const result = EffectEngine.executeEffects(
        effectsConfig[choice.effect],
        worldState,
        inventory,
        discoveredEvidence,
        completedPuzzles
      );
      emittedEvents.push(...result.emittedEvents);
      newCards.push(...result.newCards);
    }

    return { emittedEvents, newCards };
  }
}
