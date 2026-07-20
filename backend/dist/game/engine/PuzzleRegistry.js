"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PuzzleRegistry = exports.DecryptVerifier = exports.AudioVerifier = exports.TimelineVerifier = void 0;
// 1. Timeline Puzzle Verifier
class TimelineVerifier {
    verify(answer, definition) {
        // answer structure: Record<string, string> (hotspotId -> realTime choice)
        // definition.data.events lists correct realTime maps
        const events = definition.data.events;
        if (!events || !answer)
            return false;
        // Check if every defined event matches its correct realTime value
        for (const event of events) {
            if (answer[event.id] !== event.realTime) {
                return false;
            }
        }
        return true;
    }
}
exports.TimelineVerifier = TimelineVerifier;
// 2. Audio Puzzle Verifier
class AudioVerifier {
    verify(answer, definition) {
        // answer structure: number[] (submitted sorted index array)
        // definition.data.correctOrder holds correct order array
        const correctOrder = definition.data.correctOrder;
        if (!correctOrder || !Array.isArray(answer))
            return false;
        if (answer.length !== correctOrder.length)
            return false;
        for (let i = 0; i < correctOrder.length; i++) {
            if (answer[i] !== correctOrder[i]) {
                return false;
            }
        }
        return true;
    }
}
exports.AudioVerifier = AudioVerifier;
// 3. Decryption Terminal Verifier
class DecryptVerifier {
    verify(answer, definition) {
        // answer structure: string (submitted password)
        // definition.data.password holds correct password
        const correctPassword = definition.data.password;
        if (!correctPassword || typeof answer !== 'string')
            return false;
        return answer.trim() === correctPassword.trim();
    }
}
exports.DecryptVerifier = DecryptVerifier;
// Puzzle Registry Manager
class PuzzleRegistry {
    static verifiers = {};
    static register(type, verifier) {
        this.verifiers[type] = verifier;
    }
    static get(type) {
        return this.verifiers[type];
    }
    static verify(type, answer, definition) {
        const verifier = this.get(type);
        if (!verifier) {
            throw new Error(`No puzzle verifier registered for type: ${type}`);
        }
        return verifier.verify(answer, definition);
    }
}
exports.PuzzleRegistry = PuzzleRegistry;
// Auto-register standard verifiers
PuzzleRegistry.register('timeline', new TimelineVerifier());
PuzzleRegistry.register('audio', new AudioVerifier());
PuzzleRegistry.register('terminal', new DecryptVerifier());
