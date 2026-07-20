import { RequirementEngine } from './RequirementEngine';
import { EffectEngine } from './EffectEngine';
import { Trigger } from '../validation/schemas';

export class TriggerEngine {
  /**
   * Evaluate state triggers and execute matching effects.
   */
  public static evaluateTriggers(
    triggerCode: string,
    triggers: Trigger[] | null | undefined,
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
    if (!triggers) return { emittedEvents, newCards };

    triggers.forEach((trig) => {
      if (trig.trigger === triggerCode) {
        // Validate triggers criteria
        const meetsRequirements = RequirementEngine.checkRequirements(
          trig.requires,
          worldState,
          inventory,
          discoveredEvidence,
          completedPuzzles
        );

        if (meetsRequirements) {
          const result = EffectEngine.executeEffects(
            trig.effects,
            worldState,
            inventory,
            discoveredEvidence,
            completedPuzzles
          );
          emittedEvents.push(...result.emittedEvents);
          newCards.push(...result.newCards);
        }
      }
    });

    return { emittedEvents, newCards };
  }
}
