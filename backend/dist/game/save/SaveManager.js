"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveManager = void 0;
const v1_to_v2_1 = require("./migrations/v1_to_v2");
class SaveManager {
    static TARGET_SAVE_VERSION = 2;
    static migrations = {};
    static {
        // Register migrations
        const v1_to_v2 = new v1_to_v2_1.MigrationV1ToV2();
        this.migrations[v1_to_v2.fromVersion] = v1_to_v2;
    }
    /**
     * Run migrations on loaded database progress.
     */
    static migrate(save) {
        let current = { ...save };
        let version = current.save_version || 1;
        while (version < this.TARGET_SAVE_VERSION) {
            const migration = this.migrations[version];
            if (!migration) {
                console.warn(`No migration found for version: ${version}. Stopping save migration.`);
                break;
            }
            current = migration.migrate(current);
            version = current.save_version;
        }
        return current;
    }
    /**
     * Verify if a save needs migration and run it.
     */
    static processLoadedSave(save) {
        const originalVersion = save.save_version || 1;
        const migratedSave = this.migrate(save);
        const needsSave = migratedSave.save_version !== originalVersion;
        return { migratedSave, needsSave };
    }
}
exports.SaveManager = SaveManager;
