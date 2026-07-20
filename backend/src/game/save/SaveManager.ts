import { Migration } from './migrations/Migration';
import { MigrationV1ToV2 } from './migrations/v1_to_v2';

export class SaveManager {
  private static TARGET_SAVE_VERSION = 2;
  private static migrations: Record<number, Migration> = {};

  static {
    // Register migrations
    const v1_to_v2 = new MigrationV1ToV2();
    this.migrations[v1_to_v2.fromVersion] = v1_to_v2;
  }

  /**
   * Run migrations on loaded database progress.
   */
  public static migrate(save: any): any {
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
  public static processLoadedSave(save: any): { migratedSave: any; needsSave: boolean } {
    const originalVersion = save.save_version || 1;
    const migratedSave = this.migrate(save);
    const needsSave = migratedSave.save_version !== originalVersion;

    return { migratedSave, needsSave };
  }
}
