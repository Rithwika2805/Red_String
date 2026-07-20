import { Effect } from '../validation/schemas';

export class EffectEngine {
  /**
   * Safe nested property path setter (mutates and resolves intermediate paths).
   */
  public static setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = value;
      } else {
        if (current[part] === undefined || current[part] === null || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part];
      }
    }
  }

  /**
   * execute a single declarative effect, mutating state references and collecting updates.
   */
  public static executeEffect(
    eff: Effect,
    worldState: any,
    inventory: string[],
    discoveredEvidence: string[],
    completedPuzzles: string[]
  ): {
    emittedEvent?: string;
    newCard?: any;
  } {
    const action = eff.action;
    const path = eff.path;

    if (action === 'set' && path) {
      this.setNestedValue(worldState, path, eff.value);
    } else if (action === 'increment' && path) {
      const currentVal = typeof path === 'string' ? (this.resolveValue(worldState, path) || 0) : 0;
      const incrementVal = typeof eff.value === 'number' ? eff.value : 1;
      this.setNestedValue(worldState, path, currentVal + incrementVal);
    } else if (action === 'add_inventory') {
      const item = eff.item || eff.id;
      if (item && !inventory.includes(item)) {
        inventory.push(item);
      }
    } else if (action === 'remove_inventory') {
      const item = eff.item || eff.id;
      if (item) {
        const index = inventory.indexOf(item);
        if (index !== -1) {
          inventory.splice(index, 1);
        }
      }
    } else if (action === 'unlock_evidence') {
      const evidenceId = eff.id || eff.path;
      if (evidenceId && !discoveredEvidence.includes(evidenceId)) {
        discoveredEvidence.push(evidenceId);
      }
    } else if (action === 'board_card' && eff.card) {
      return { newCard: eff.card };
    }

    return {};
  }

  /**
   * Execute an array of effects in sequence.
   */
  public static executeEffects(
    effects: Effect[] | null | undefined,
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
    if (!effects) return { emittedEvents, newCards };

    effects.forEach((eff) => {
      const result = this.executeEffect(eff, worldState, inventory, discoveredEvidence, completedPuzzles);
      if (result.emittedEvent) {
        emittedEvents.push(result.emittedEvent);
      }
      if (result.newCard) {
        newCards.push(result.newCard);
      }
    });

    return { emittedEvents, newCards };
  }

  private static resolveValue(obj: any, path: string): any {
    if (!obj) return undefined;
    if (obj[path] !== undefined) return obj[path];
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }
}
