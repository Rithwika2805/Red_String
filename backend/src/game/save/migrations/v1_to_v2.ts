import { Migration } from './Migration';

export class MigrationV1ToV2 implements Migration {
  public fromVersion = 1;
  public toVersion = 2;

  public migrate(save: any): any {
    console.log(`migrating save state from v1 to v2...`);
    const migrated = { ...save };

    // Initialize world state if empty
    if (!migrated.world_state) {
      migrated.world_state = {};
    }

    // Migrate old flat arrays to world_state properties
    if (save.discovered_contradictions && Array.isArray(save.discovered_contradictions)) {
      save.discovered_contradictions.forEach((contradictionId: string) => {
        migrated.world_state[contradictionId] = true;
      });
    }

    if (save.unlocked_scenes && Array.isArray(save.unlocked_scenes)) {
      save.unlocked_scenes.forEach((sceneId: string) => {
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
