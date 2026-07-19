import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query } from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to load static JSON config files from the case folders
const loadCaseJSON = (caseId: string, file: string): any => {
  const filePath = path.join(__dirname, '..', 'data', 'cases', caseId, 'data', `${file}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Config file ${file}.json not found for case ${caseId}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

// 1. Get Cases List
router.get('/', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    const casesDir = path.join(__dirname, '..', 'data', 'cases');
    if (!fs.existsSync(casesDir)) {
      return res.json([]);
    }

    const folders = fs.readdirSync(casesDir);
    const casesList = folders.map((folder) => {
      try {
        const metadata = loadCaseJSON(folder, 'case');
        return {
          id: folder,
          title: metadata.title,
          genre: metadata.genre,
          description: metadata.description,
          startingTime: metadata.starting_time,
          difficulty: metadata.difficulty,
        };
      } catch (err) {
        return null;
      }
    }).filter(Boolean);

    res.json(casesList);
  } catch (error) {
    next(error);
  }
});

// 2. Start / Reset Case Progress
router.post('/:caseId/start', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  const { caseId } = req.params;
  const userId = req.user?.id;

  try {
    const caseMeta = loadCaseJSON(caseId, 'case');
    
    // Randomize safe codes and key drawer locations slightly
    const safeCodes = ['2941', '1003', '8429', '4952'];
    const randomCode = safeCodes[Math.floor(Math.random() * safeCodes.length)];
    const keyPlacements = ['cabinet_drawer', 'pantry_shelf', 'kitchen_pot'];
    const randomPlacement = keyPlacements[Math.floor(Math.random() * keyPlacements.length)];
    
    const randomizedVars = {
      safe_code: randomCode,
      key_placement: randomPlacement
    };

    // Initial people (with suspicion levels hidden)
    const initialPeople = [
      { id: 'eleanor_blackwood', name: 'Eleanor Blackwood', isSuspect: false },
      { id: 'daniel_blackwood', name: 'Daniel Blackwood', isSuspect: false },
      { id: 'sophia_blackwood', name: 'Sophia Blackwood', isSuspect: false },
      { id: 'james_holloway', name: 'James Holloway', isSuspect: false },
      { id: 'olivia_reed', name: 'Olivia Reed', isSuspect: false },
      { id: 'victor_hayes', name: 'Victor Hayes', isSuspect: false }
    ];

    // Initial unlocked scenes
    const initialScenes = ['study', 'kitchen', 'gardens'];

    // Upsert user progress
    await query(
      `INSERT INTO user_progress (
        user_id, case_id, case_type, elapsed_time, randomized_variables, 
        inventory, discovered_evidence, discovered_contradictions, 
        unlocked_dialogues, unlocked_people, revealed_suspicion_meters, 
        unlocked_scenes, completed, score, ending_reached
      ) VALUES ($1, $2, $3, 0, $4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, $5, '[]'::jsonb, $6, false, 0, null)
      ON CONFLICT (user_id, case_id) DO UPDATE SET
        elapsed_time = 0,
        randomized_variables = $4,
        inventory = '[]'::jsonb,
        discovered_evidence = '[]'::jsonb,
        discovered_contradictions = '[]'::jsonb,
        unlocked_dialogues = '[]'::jsonb,
        unlocked_people = $5,
        revealed_suspicion_meters = '[]'::jsonb,
        unlocked_scenes = $6,
        completed = false,
        score = 0,
        ending_reached = null,
        updated_at = CURRENT_TIMESTAMP`,
      [userId, caseId, caseMeta.genre, JSON.stringify(randomizedVars), JSON.stringify(initialPeople), JSON.stringify(initialScenes)]
    );

    // Initial board state
    const initialCards = [
      { id: 'arthur_blackwood', type: 'suspect', x: 200, y: 100, label: 'Arthur Blackwood (Victim)' }
    ];
    await query(
      `INSERT INTO board_state (user_id, case_id, cards, connections, zoom, pan)
       VALUES ($1, $2, $3, '[]'::jsonb, 1.0, '{"x":0,"y":0}'::jsonb)
       ON CONFLICT (user_id, case_id) DO UPDATE SET
         cards = $3,
         connections = '[]'::jsonb,
         zoom = 1.0,
         pan = '{"x":0,"y":0}'::jsonb,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, caseId, JSON.stringify(initialCards)]
    );

    // Initial journal entry (Sherlock thought)
    await query(`DELETE FROM journal_entries WHERE user_id = $1 AND case_id = $2`, [userId, caseId]);
    await query(
      `INSERT INTO journal_entries (user_id, case_id, title, content, is_system, pinned)
       VALUES ($1, $2, 'Case Opened', 'Arthur Blackwood found dead in locked study. Harris claims suicide, but daughters protest. There is a sense of manufactured finality here. I must review the study and interview family members.', true, true)`,
      [userId, caseId]
    );

    res.json({ message: 'Case initialized successfully' });
  } catch (error) {
    next(error);
  }
});

// 3. Get Case Progress
router.get('/:caseId/progress', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  const { caseId } = req.params;
  const userId = req.user?.id;

  try {
    const progressResult = await query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND case_id = $2',
      [userId, caseId]
    );

    if (progressResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not started' });
    }

    const progress = progressResult.rows[0];
    
    // Load config maps to calculate suspicion dynamically and return static definitions
    const evidenceConfig = loadCaseJSON(caseId, 'evidence');
    const suspectsConfig = loadCaseJSON(caseId, 'suspects');
    const explorationConfig = loadCaseJSON(caseId, 'investigation');

    // Calculate dynamic suspicion score per suspect based on discovered clues & contradictions
    const calculatedSuspicion: Record<string, number> = {};
    Object.keys(suspectsConfig).forEach((suspectId) => {
      const suspect = suspectsConfig[suspectId];
      if (suspect.is_victim) return;

      let score = suspect.initial_suspicion || 0;

      // Add suspicion impact of discovered evidence
      progress.discovered_evidence.forEach((clueId: string) => {
        const clue = evidenceConfig[clueId];
        if (clue && clue.suspicion_impact && clue.suspicion_impact[suspectId] !== undefined) {
          score += clue.suspicion_impact[suspectId];
        }
      });

      // Add suspicion impact of exposed contradictions
      progress.discovered_contradictions.forEach((contradictionId: string) => {
        if (contradictionId === 'james_hallway_lie' && suspectId === 'james_holloway') {
          score += 25;
        }
        if (contradictionId === 'victor_gate_lie' && suspectId === 'victor_hayes') {
          score += 35;
        }
        if (contradictionId === 'daniel_will_motive' && suspectId === 'daniel_blackwood') {
          score += 20;
        }
      });

      calculatedSuspicion[suspectId] = Math.min(100, Math.max(0, score));
    });

    // Check if suspicion scores trigger unlocking "Suspect" badges
    const updatedPeople = progress.unlocked_people.map((person: any) => {
      const currentSuspicion = calculatedSuspicion[person.id] || 0;
      const suspectConfig = suspectsConfig[person.id];
      const threshold = suspectConfig?.threshold_reveal_suspect || 999;
      
      return {
        ...person,
        isSuspect: person.isSuspect || currentSuspicion >= threshold
      };
    });

    // Check if suspicion scores reveal suspicion meters
    const updatedRevealedMeters = [...progress.revealed_suspicion_meters];
    Object.keys(calculatedSuspicion).forEach((suspectId) => {
      const score = calculatedSuspicion[suspectId];
      if (score >= 25 && !updatedRevealedMeters.includes(suspectId)) {
        updatedRevealedMeters.push(suspectId);
      }
    });

    // Save updated people / revealed meters if changed
    if (
      JSON.stringify(updatedPeople) !== JSON.stringify(progress.unlocked_people) ||
      JSON.stringify(updatedRevealedMeters) !== JSON.stringify(progress.revealed_suspicion_meters)
    ) {
      await query(
        `UPDATE user_progress 
         SET unlocked_people = $1, revealed_suspicion_meters = $2 
         WHERE user_id = $3 AND case_id = $4`,
        [JSON.stringify(updatedPeople), JSON.stringify(updatedRevealedMeters), userId, caseId]
      );
    }

    res.json({
      progress: {
        ...progress,
        current_time: progress.elapsed_time,
        unlocked_people: updatedPeople,
        revealed_suspicion_meters: updatedRevealedMeters,
        suspicion_scores: calculatedSuspicion,
      },
      definitions: {
        evidence: evidenceConfig,
        suspects: suspectsConfig,
        exploration: explorationConfig,
      }
    });
  } catch (error) {
    next(error);
  }
});

// 4. Explore Scene Node
router.post('/:caseId/explore', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  const { caseId } = req.params;
  const { locationId, nodeId } = req.body;
  const userId = req.user?.id;

  try {
    const progressResult = await query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND case_id = $2',
      [userId, caseId]
    );

    if (progressResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not started' });
    }

    const progress = progressResult.rows[0];
    const explorationConfig = loadCaseJSON(caseId, 'investigation');
    const evidenceConfig = loadCaseJSON(caseId, 'evidence');

    // Find the node in investigation
    const room = explorationConfig[locationId];
    if (!room) {
      return res.status(400).json({ error: 'Invalid room location' });
    }

    // Traverse to search the node
    // Traverse to search the node and check if any parent along the path is locked
    let targetNode: any = null;
    let isPathLocked = false;
    let requiredKey = '';
    let requiredPassword = false;

    const findNodeAndCheckLocks = (obj: any, id: string, parentLocked = false, parentKey = '', parentPass = false) => {
      const currentlyLocked = obj.locked && !(
        (obj.requires_key && progress.inventory.includes(obj.requires_key)) ||
        (obj.requires_password && progress.inventory.includes(obj.requires_password))
      );
      
      const pathLockedNow = parentLocked || currentlyLocked;
      const activeKey = parentKey || (currentlyLocked && obj.requires_key ? obj.requires_key : '');
      const activePass = parentPass || (currentlyLocked && obj.requires_password ? true : false);

      if (obj.nodes && obj.nodes[id]) {
        targetNode = obj.nodes[id];
        isPathLocked = pathLockedNow;
        requiredKey = activeKey;
        requiredPassword = activePass;
        return;
      }

      if (obj.nodes) {
        Object.keys(obj.nodes).forEach((key) => {
          findNodeAndCheckLocks(obj.nodes[key], id, pathLockedNow, activeKey, activePass);
        });
      }
    };

    if (room.nodes && room.nodes[nodeId]) {
      targetNode = room.nodes[nodeId];
    } else if (room.nodes) {
      Object.keys(room.nodes).forEach((key) => {
        findNodeAndCheckLocks(room.nodes[key], nodeId, false, '', false);
      });
    }

    if (!targetNode) {
      return res.status(404).json({ error: 'Investigation node not found' });
    }

    // Check parent locks
    if (isPathLocked) {
      if (requiredKey) {
        return res.status(403).json({ error: 'Locked', requiresKey: requiredKey });
      }
      if (requiredPassword) {
        return res.status(403).json({ error: 'Locked', requiresPassword: true });
      }
    }

    // Check target node locks
    if (targetNode.locked) {
      if (targetNode.requires_key) {
        const hasKey = progress.inventory.includes(targetNode.requires_key);
        if (!hasKey) {
          return res.status(403).json({ error: 'Locked', requiresKey: targetNode.requires_key });
        }
      }
      if (targetNode.requires_password) {
        const hasPass = progress.inventory.includes(targetNode.requires_password);
        if (!hasPass) {
          return res.status(403).json({ error: 'Locked', requiresPassword: true });
        }
      }
    }

    // Grant rewards & consume time
    const updatedInventory = [...progress.inventory];
    const updatedEvidence = [...progress.discovered_evidence];
    const updatedScenes = [...progress.unlocked_scenes];
    let timeCost = targetNode.cost_minutes || (targetNode.is_red_herring ? 2 : 10);
    let unlockedMsg = '';

    if (targetNode.inventory_reward && !updatedInventory.includes(targetNode.inventory_reward)) {
      updatedInventory.push(targetNode.inventory_reward);
      unlockedMsg += `Acquired: ${targetNode.inventory_reward.replace('_', ' ')}. `;
    }

    if (targetNode.evidence_reward && !updatedEvidence.includes(targetNode.evidence_reward)) {
      updatedEvidence.push(targetNode.evidence_reward);
      const clue = evidenceConfig[targetNode.evidence_reward];
      unlockedMsg += `Discovered Clue: ${clue?.title || targetNode.evidence_reward}. `;

      // Spawn new card on detective board
      const boardResult = await query(
        'SELECT cards FROM board_state WHERE user_id = $1 AND case_id = $2',
        [userId, caseId]
      );
      if (boardResult.rows.length > 0) {
        const cards = boardResult.rows[0].cards;
        if (!cards.find((c: any) => c.id === targetNode.evidence_reward)) {
          cards.push({
            id: targetNode.evidence_reward,
            type: 'evidence',
            x: 100 + Math.random() * 400,
            y: 100 + Math.random() * 400,
            label: clue?.title || targetNode.evidence_reward
          });
          await query(
            'UPDATE board_state SET cards = $1 WHERE user_id = $2 AND case_id = $3',
            [JSON.stringify(cards), userId, caseId]
          );
        }
      }

      // Add dynamic journal entry (Sherlock thought)
      let journalTitle = `Clue: ${clue?.title}`;
      let journalContent = '';
      if (targetNode.evidence_reward === 'broken_watch') {
        journalContent = `The broken watch stopped at 9:17. Harris considers it concrete evidence of the death time. But pocket watches don't break simply because their owner dies—it implies a struggle, or perhaps, an attempt to stage the timeline.`;
      } else if (targetNode.evidence_reward === 'wine_glass') {
        journalContent = `Found Arthur's wine glass. A trace almond odor—cyanide, undoubtedly. He was drinking right before he slumped. Was the wine poisoned in the bottle, or did someone slip it in his glass?`;
      } else if (targetNode.evidence_reward === 'burned_letter') {
        journalContent = `A charred letter mentions Victor Hayes and missing funds. Arthur was going to expose him today. If Victor knew, he had every motive in the world to silence Arthur last night.`;
      } else {
        journalContent = `Discovered ${clue?.title} at the ${targetNode.location || locationId}. This might fit into the broader picture.`;
      }

      await query(
        `INSERT INTO journal_entries (user_id, case_id, title, content, is_system, pinned)
         VALUES ($1, $2, $3, $4, true, false)`,
        [userId, caseId, journalTitle, journalContent]
      );
    }

    // Unlock new scenes if conditions met
    if (targetNode.evidence_reward === 'hallway_logs' && !updatedScenes.includes('security_room')) {
      updatedScenes.push('security_room');
    }
    if (updatedEvidence.includes('hallway_logs') && !updatedScenes.includes('security_room')) {
       updatedScenes.push('security_room');
    }

    const updatedTime = progress.elapsed_time + timeCost;

    await query(
      `UPDATE user_progress 
       SET inventory = $1, discovered_evidence = $2, elapsed_time = $3, unlocked_scenes = $4
       WHERE user_id = $5 AND case_id = $6`,
      [JSON.stringify(updatedInventory), JSON.stringify(updatedEvidence), updatedTime, JSON.stringify(updatedScenes), userId, caseId]
    );

    res.json({
      message: targetNode.is_red_herring ? targetNode.description : 'Node investigated successfully',
      unlockedMsg,
      timeElapsed: timeCost,
      inventory: updatedInventory,
      discovered_evidence: updatedEvidence,
      current_time: updatedTime,
      isRedHerring: !!targetNode.is_red_herring
    });
  } catch (error) {
    next(error);
  }
});

// 5. Dialogue Interaction
router.post('/:caseId/dialogue', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  const { caseId } = req.params;
  const { suspectId, nodeKey } = req.body;
  const userId = req.user?.id;

  try {
    const progressResult = await query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND case_id = $2',
      [userId, caseId]
    );

    if (progressResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not started' });
    }

    const progress = progressResult.rows[0];
    const dialoguesConfig = loadCaseJSON(caseId, 'dialogues');

    const suspectDialogues = dialoguesConfig[suspectId];
    if (!suspectDialogues) {
      return res.status(400).json({ error: 'Invalid suspect ID' });
    }

    const node = suspectDialogues[nodeKey];
    if (!node) {
      return res.status(404).json({ error: 'Dialogue node not found' });
    }

    // Execute choice action if any (advance time, unlock evidence/inventory)
    const updatedInventory = [...progress.inventory];
    const updatedEvidence = [...progress.discovered_evidence];
    let timeCost = 5; // default dialog cost

    if (node.choices) {
      // Find matching action
    }

    // General node triggers
    if (node.actions) {
      if (node.actions.advance_time) {
        timeCost = node.actions.advance_time;
      }
      if (node.actions.add_evidence && !updatedEvidence.includes(node.actions.add_evidence)) {
        updatedEvidence.push(node.actions.add_evidence);
      }
      if (node.actions.add_inventory && !updatedInventory.includes(node.actions.add_inventory)) {
        updatedInventory.push(node.actions.add_inventory);
      }
    }

    // Add statement card to board when dialogue is read
    const statementCardId = `${suspectId}_statement_${nodeKey}`;
    const boardResult = await query(
      'SELECT cards FROM board_state WHERE user_id = $1 AND case_id = $2',
      [userId, caseId]
    );
    if (boardResult.rows.length > 0) {
      const cards = boardResult.rows[0].cards;
      if (!cards.find((c: any) => c.id === statementCardId)) {
        cards.push({
          id: statementCardId,
          type: 'theory',
          x: 100 + Math.random() * 400,
          y: 100 + Math.random() * 400,
          label: `${suspectId.replace('_', ' ')}: "${node.text.slice(0, 30)}..."`
        });
        await query(
          'UPDATE board_state SET cards = $1 WHERE user_id = $2 AND case_id = $3',
          [JSON.stringify(cards), userId, caseId]
        );
      }
    }

    // Register unlocked dialogue key
    const updatedUnlockedDialogues = [...progress.unlocked_dialogues];
    if (!updatedUnlockedDialogues.includes(statementCardId)) {
      updatedUnlockedDialogues.push(statementCardId);
    }

    const updatedTime = progress.elapsed_time + timeCost;

    await query(
      `UPDATE user_progress 
       SET unlocked_dialogues = $1, inventory = $2, discovered_evidence = $3, elapsed_time = $4
       WHERE user_id = $5 AND case_id = $6`,
      [JSON.stringify(updatedUnlockedDialogues), JSON.stringify(updatedInventory), JSON.stringify(updatedEvidence), updatedTime, userId, caseId]
    );

    res.json({
      node,
      timeElapsed: timeCost,
      current_time: updatedTime
    });
  } catch (error) {
    next(error);
  }
});

// 6. Cross-Examine (Contradiction Check)
router.post('/:caseId/cross-examine', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  const { caseId } = req.params;
  const { statementId, evidenceId } = req.body;
  const userId = req.user?.id;

  try {
    const progressResult = await query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND case_id = $2',
      [userId, caseId]
    );

    if (progressResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not started' });
    }

    const progress = progressResult.rows[0];
    const dialoguesConfig = loadCaseJSON(caseId, 'dialogues');

    // Parse statement ID: e.g. "james_holloway_statement_james_alibi_tea"
    // format: [suspect]_[name]_statement_[node]
    const match = statementId.match(/^([a-z_]+)_statement_([a-z_]+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid statement selection' });
    }

    const suspectId = match[1];
    const nodeKey = match[2];

    const suspectDialogues = dialoguesConfig[suspectId];
    const node = suspectDialogues?.[nodeKey];

    // Check if statement has a contradiction mapping matching this evidence
    if (node && node.contradicts && node.contradicts[evidenceId]) {
      const contradictionId = node.contradicts[evidenceId];
      const updatedContradictions = [...progress.discovered_contradictions];
      let newUnlock = false;

      if (!updatedContradictions.includes(contradictionId)) {
        updatedContradictions.push(contradictionId);
        newUnlock = true;

        // If contradiction is james_hallway_lie, unlock James hallway confront dialogue!
        const updatedUnlockedDialogues = [...progress.unlocked_dialogues];
        if (contradictionId === 'james_hallway_lie') {
          // James hallway confront route is unlocked
        }

        // Add contradiction card to board
        const boardResult = await query(
          'SELECT cards FROM board_state WHERE user_id = $1 AND case_id = $2',
          [userId, caseId]
        );
        if (boardResult.rows.length > 0) {
          const cards = boardResult.rows[0].cards;
          if (!cards.find((c: any) => c.id === contradictionId)) {
            cards.push({
              id: contradictionId,
              type: 'evidence',
              x: 200,
              y: 200,
              label: `🚨 CONTRADICTION EXPOSED: ${contradictionId.replace(/_/g, ' ').toUpperCase()}`
            });
            await query(
              'UPDATE board_state SET cards = $1 WHERE user_id = $2 AND case_id = $3',
              [JSON.stringify(cards), userId, caseId]
            );
          }
        }

        // Add Sherlock Journal thought
        let journalContent = '';
        if (contradictionId === 'james_hallway_lie') {
          journalContent = `James claimed he spent the entire night in the kitchen. Yet motion sensors place him right in the study hallway at 10:00 PM. He is hiding something. I must confront him.`;
        } else if (contradictionId === 'victor_gate_lie') {
          journalContent = `Victor Hayes claimed he was asleep at home in Elmwood. But security gate logs record his license plate entering at 9:55 PM and departing at 10:15 PM. His alibi is shattered. He was at the manor at the time of death.`;
        } else if (contradictionId === 'eleanor_will_lie') {
          journalContent = `Eleanor claimed they had a stable marriage. But the new will draft reveals Arthur cut her out entirely, and she was planning a divorce. She had a strong motive.`;
        } else if (contradictionId === 'daniel_will_motive') {
          journalContent = `Daniel claimed he didn't care about Arthur's assets. But the draft will shows he was being completely disinherited. That argument yesterday makes perfect sense now.`;
        }

        await query(
          `INSERT INTO journal_entries (user_id, case_id, title, content, is_system, pinned)
           VALUES ($1, $2, 'Contradiction: ' || $3, $4, true, false)`,
          [userId, caseId, contradictionId.replace(/_/g, ' '), journalContent]
        );

        // Save progress
        await query(
          'UPDATE user_progress SET discovered_contradictions = $1 WHERE user_id = $2 AND case_id = $3',
          [JSON.stringify(updatedContradictions), userId, caseId]
        );
      }

      return res.json({
        success: true,
        contradictionId,
        newUnlock,
        message: '🚨 CONTRADICTION EXPOSED! A new lead has been recorded on the board.'
      });
    }

    res.json({
      success: false,
      message: 'This connection yields no immediate contradictions. "These details don\'t seem to clash..."'
    });
  } catch (error) {
    next(error);
  }
});

// 7. Accusation & Case Evaluation (6 Variables presented in slots)
router.post('/:caseId/accuse', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  const { caseId } = req.params;
  const { culprit, weapon, motive, method, timeOfDeath, supportingEvidence } = req.body;
  const userId = req.user?.id;

  try {
    const progressResult = await query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND case_id = $2',
      [userId, caseId]
    );

    if (progressResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not started' });
    }

    const progress = progressResult.rows[0];
    const endingsConfig = loadCaseJSON(caseId, 'endings');

    // 1. Evaluate Culprit
    const isCulpritCorrect = culprit === endingsConfig.culprit;
    let endingId = 'wrong_culprit';
    let finalScore = 0;

    if (isCulpritCorrect) {
      // Check presented core evidence
      const correctEvidencePresented = supportingEvidence.filter((clueId: string) => 
        endingsConfig.core_evidence.includes(clueId)
      );

      const allCoreEvidencePresent = correctEvidencePresented.length === endingsConfig.core_evidence.length;
      const isWeaponCorrect = weapon === endingsConfig.weapon;
      const isMotiveCorrect = motive === endingsConfig.motive;
      const isMethodCorrect = method === endingsConfig.method;
      const isTimeCorrect = timeOfDeath === endingsConfig.time_of_death;

      if (isWeaponCorrect && isMotiveCorrect && isMethodCorrect && isTimeCorrect && allCoreEvidencePresent) {
        endingId = 'conviction_true';
        finalScore = 100;
      } else if (correctEvidencePresented.length >= 2 && (isWeaponCorrect || isMotiveCorrect)) {
        endingId = 'weak_evidence';
        finalScore = 50;
      } else {
        endingId = 'insufficient_evidence';
        finalScore = 25;
      }
    }

    // Deduct score for hints used or excessive time spent
    const timeDeduction = Math.floor(progress.elapsed_time / 30) * 5; // -5 points for every 30 mins
    const hintDeduction = progress.hints_used * 10; // -10 points per hint
    finalScore = Math.max(10, finalScore - timeDeduction - hintDeduction);

    const ending = endingsConfig.endings[endingId];

    // Update case completed status
    await query(
      `UPDATE user_progress 
       SET completed = true, score = $1, ending_reached = $2
       WHERE user_id = $3 AND case_id = $4`,
      [finalScore, endingId, userId, caseId]
    );

    res.json({
      success: endingId === 'conviction_true',
      endingId,
      title: ending.title,
      rating: ending.rating,
      description: ending.description,
      score: finalScore,
      stats: {
        timeSpentMinutes: progress.elapsed_time,
        hintsUsed: progress.hints_used,
        cluesDiscovered: progress.discovered_evidence.length,
        contradictionsFound: progress.discovered_contradictions.length
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
