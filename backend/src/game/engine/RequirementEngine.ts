import { ConditionTree, Condition } from '../validation/schemas';

export class RequirementEngine {
  /**
   * Safe nested property path resolver (resolves "rooms.studio.searched" in worldState).
   */
  public static getNestedValue(obj: any, path: string): any {
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

  /**
   * Evaluate a leaf condition against current player state.
   */
  public static evaluateCondition(
    cond: Condition,
    worldState: any,
    inventory: string[],
    discoveredEvidence: string[],
    completedPuzzles: string[]
  ): boolean {
    const type = cond.type;

    if (type === 'state') {
      const path = cond.path || cond.key;
      if (!path) return false;

      const val = this.getNestedValue(worldState, path);
      
      // Determine comparison value
      const targetVal = cond.equals !== undefined ? cond.equals : cond.value;

      if (cond.gte !== undefined) {
        return typeof val === 'number' && val >= cond.gte;
      }
      if (cond.lte !== undefined) {
        return typeof val === 'number' && val <= cond.lte;
      }
      if (cond.contains !== undefined) {
        return Array.isArray(val) && val.includes(cond.contains);
      }

      return val === targetVal;
    }

    if (type === 'evidence') {
      const evidenceId = cond.id || cond.path;
      return evidenceId ? discoveredEvidence.includes(evidenceId) : false;
    }

    if (type === 'inventory') {
      const itemId = cond.id || cond.path;
      return itemId ? inventory.includes(itemId) : false;
    }

    if (type === 'puzzle') {
      const puzzleId = cond.id || cond.path;
      return puzzleId ? completedPuzzles.includes(puzzleId) : false;
    }

    return false;
  }

  /**
   * Recursively evaluate condition tree (all, any, not operators).
   */
  public static checkRequirements(
    reqs: ConditionTree | null | undefined,
    worldState: any,
    inventory: string[],
    discoveredEvidence: string[],
    completedPuzzles: string[]
  ): boolean {
    if (!reqs) return true;

    // Backward compatibility: If requirements is a flat string array
    if (Array.isArray(reqs)) {
      return (reqs as string[]).every((id) => 
        inventory.includes(id) || 
        discoveredEvidence.includes(id) || 
        worldState[id] === true
      );
    }

    // Logical AND
    if (reqs.all && Array.isArray(reqs.all)) {
      return reqs.all.every((subTree: any) => 
        this.checkRequirements(subTree, worldState, inventory, discoveredEvidence, completedPuzzles)
      );
    }

    // Logical OR
    if (reqs.any && Array.isArray(reqs.any)) {
      return reqs.any.some((subTree: any) => 
        this.checkRequirements(subTree, worldState, inventory, discoveredEvidence, completedPuzzles)
      );
    }

    // Logical NOT
    if (reqs.not) {
      return !this.checkRequirements(reqs.not, worldState, inventory, discoveredEvidence, completedPuzzles);
    }

    // Leaf node evaluation
    if (reqs.type) {
      return this.evaluateCondition(reqs as Condition, worldState, inventory, discoveredEvidence, completedPuzzles);
    }

    return true;
  }
}
