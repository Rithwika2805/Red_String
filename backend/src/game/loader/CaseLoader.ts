import fs from 'fs';
import path from 'path';
import { CaseValidator } from '../validation/validator';
import { CaseManifest } from '../validation/schemas';

export interface CaseData {
  manifest: CaseManifest;
  rooms: any;
  hotspots: any;
  interactables: any;
  dialogues: any;
  effects: any;
  triggers: any;
  endings: any;
  puzzles: any;
  suspects: any;
  contradictions: any;
  evidence: any;
}

export class CaseLoader {
  private static casesDir = path.join(__dirname, '..', '..', 'data', 'cases');

  /**
   * Scan and list all active cases by searching for manifest.json.
   */
  public static listCases(): CaseManifest[] {
    const list: CaseManifest[] = [];
    if (!fs.existsSync(this.casesDir)) return list;

    const folders = fs.readdirSync(this.casesDir);
    for (const folder of folders) {
      const manifestPath = path.join(this.casesDir, folder, 'data', 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          CaseValidator.validateManifest(manifestData, folder);
          list.push(manifestData);
        } catch (e) {
          console.error(`Error loading manifest for case folder "${folder}":`, e);
        }
      }
    }
    return list;
  }

  /**
   * Load and validate all configs for a specific case.
   */
  public static loadCase(caseId: string): CaseData {
    const casePath = path.join(this.casesDir, caseId, 'data');
    if (!fs.existsSync(casePath)) {
      throw new Error(`Case directory not found: ${casePath}`);
    }

    const manifest = this.readJSON(path.join(casePath, 'manifest.json'));
    CaseValidator.validateManifest(manifest, caseId);

    const rooms = this.readJSON(path.join(casePath, 'rooms.json'));
    CaseValidator.validateRooms(rooms, caseId);

    const hotspots = this.readJSON(path.join(casePath, 'hotspots.json'));
    CaseValidator.validateHotspots(hotspots, caseId);

    const interactables = this.readJSON(path.join(casePath, 'interactables.json'));
    CaseValidator.validateInteractables(interactables, caseId);

    const dialogues = this.readJSON(path.join(casePath, 'dialogues.json'));
    CaseValidator.validateDialogues(dialogues, caseId);

    const effects = this.readJSON(path.join(casePath, 'effects.json'));
    CaseValidator.validateEffects(effects, caseId);

    const suspects = this.readJSON(path.join(casePath, 'suspects.json'));
    CaseValidator.validateSuspects(suspects, caseId);

    const evidence = this.readJSON(path.join(casePath, 'evidence.json'));
    CaseValidator.validateEvidence(evidence, caseId);

    // load contradictions from root file
    const contradictions = this.readJSON(path.join(casePath, 'contradiction.json'));
    CaseValidator.validateContradictions(contradictions, caseId);

    // triggers and endings are optional but highly recommended
    const triggers = fs.existsSync(path.join(casePath, 'triggers.json'))
      ? this.readJSON(path.join(casePath, 'triggers.json'))
      : [];
    CaseValidator.validateTriggers(triggers, caseId);

    const endings = this.readJSON(path.join(casePath, 'endings.json'));
    CaseValidator.validateEndings(endings, caseId);

    // puzzles/ timeline, audio, etc. (excluding contradiction which is root level)
    const puzzles = this.loadCasePuzzles(caseId, casePath);
    CaseValidator.validatePuzzles(puzzles, caseId);

    return { manifest, rooms, hotspots, interactables, dialogues, effects, triggers, endings, puzzles, suspects, contradictions, evidence };
  }

  private static readJSON(filePath: string): any {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Configuration file missing: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  private static loadCasePuzzles(caseId: string, casePath: string): Record<string, any> {
    const puzzles: Record<string, any> = {};
    const puzzlesDir = path.join(casePath, 'puzzles');
    
    if (!fs.existsSync(puzzlesDir)) return puzzles;

    const files = fs.readdirSync(puzzlesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const puzzleId = file.replace('.json', '');
        // Exclude contradiction.json from puzzles directory if it happened to be there
        if (puzzleId === 'contradiction') continue;
        const data = this.readJSON(path.join(puzzlesDir, file));
        puzzles[puzzleId] = data;
      }
    }
    return puzzles;
  }
}
