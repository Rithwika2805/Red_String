export interface PuzzleVerifier {
  verify(answer: any, definition: any): boolean;
}

// 1. Timeline Puzzle Verifier
export class TimelineVerifier implements PuzzleVerifier {
  public verify(answer: any, definition: any): boolean {
    // answer structure: Record<string, string> (hotspotId -> realTime choice)
    // definition.data.events lists correct realTime maps
    const events = definition.data.events;
    if (!events || !answer) return false;

    // Check if every defined event matches its correct realTime value
    for (const event of events) {
      if (answer[event.id] !== event.realTime) {
        return false;
      }
    }
    return true;
  }
}

// 2. Audio Puzzle Verifier
export class AudioVerifier implements PuzzleVerifier {
  public verify(answer: any, definition: any): boolean {
    // answer structure: number[] (submitted sorted index array)
    // definition.data.correctOrder holds correct order array
    const correctOrder = definition.data.correctOrder;
    if (!correctOrder || !Array.isArray(answer)) return false;

    if (answer.length !== correctOrder.length) return false;

    for (let i = 0; i < correctOrder.length; i++) {
      if (answer[i] !== correctOrder[i]) {
        return false;
      }
    }
    return true;
  }
}

// 3. Decryption Terminal Verifier
export class DecryptVerifier implements PuzzleVerifier {
  public verify(answer: any, definition: any): boolean {
    // answer structure: string (submitted password)
    // definition.data.password holds correct password
    const correctPassword = definition.data.password;
    if (!correctPassword || typeof answer !== 'string') return false;

    return answer.trim() === correctPassword.trim();
  }
}

// Puzzle Registry Manager
export class PuzzleRegistry {
  private static verifiers: Record<string, PuzzleVerifier> = {};

  public static register(type: string, verifier: PuzzleVerifier): void {
    this.verifiers[type] = verifier;
  }

  public static get(type: string): PuzzleVerifier | undefined {
    return this.verifiers[type];
  }

  public static verify(type: string, answer: any, definition: any): boolean {
    const verifier = this.get(type);
    if (!verifier) {
      throw new Error(`No puzzle verifier registered for type: ${type}`);
    }
    return verifier.verify(answer, definition);
  }
}

// Auto-register standard verifiers
PuzzleRegistry.register('timeline', new TimelineVerifier());
PuzzleRegistry.register('audio', new AudioVerifier());
PuzzleRegistry.register('terminal', new DecryptVerifier());
