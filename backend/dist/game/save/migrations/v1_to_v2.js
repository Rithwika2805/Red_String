"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationV1ToV2 = void 0;
class MigrationV1ToV2 {
    fromVersion = 1;
    toVersion = 2;
    migrate(save) {
        console.log(`migrating save state from v1 to v2...`);
        const migrated = { ...save };
        // Initialize world state if empty
        if (!migrated.world_state) {
            migrated.world_state = {};
        }
        // Migrate old flat arrays to world_state properties
        if (save.discovered_contradictions && Array.isArray(save.discovered_contradictions)) {
            save.discovered_contradictions.forEach((contradictionId) => {
                migrated.world_state[contradictionId] = true;
            });
        }
        if (save.unlocked_scenes && Array.isArray(save.unlocked_scenes)) {
            save.unlocked_scenes.forEach((sceneId) => {
                migrated.world_state[`scene_unlocked_${sceneId}`] = true;
            });
        }
        // Map old current_time to elapsed_time if it existed
        if (save.current_time !== undefined && save.elapsed_time === undefined) {
            migrated.elapsed_time = save.current_time;
        }
        migrated.save_version = 2;
        return migrated;
    }
}
exports.MigrationV1ToV2 = MigrationV1ToV2;
