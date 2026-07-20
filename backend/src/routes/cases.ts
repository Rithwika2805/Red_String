import { Router, Response } from 'express';
import { query } from '../config/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { 
  CaseLoader, 
  SaveManager, 
  RequirementEngine, 
  EffectEngine, 
  TriggerEngine, 
  DialogueEngine, 
  PuzzleRegistry 
} from '../game';

const router = Router();

// Helper to query board state cards
const getBoardState = async (userId: string, caseId: string): Promise<any> => {
  const result = await query(
    'SELECT nodes, edges FROM board_state WHERE user_id = $1 AND case_id = $2',
    [userId, caseId]
  );
  if (result.rows.length === 0) {
    return { nodes: [], edges: [] };
  }
  return result.rows[0];
};

// Helper to save board state cards
const saveBoardState = async (userId: string, caseId: string, nodes: any[], edges: any[]): Promise<void> => {
  await query(
    `INSERT INTO board_state (user_id, case_id, nodes, edges)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, case_id) DO UPDATE SET
       nodes = $3,
       edges = $4,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, caseId, JSON.stringify(nodes), JSON.stringify(edges)]
  );
};

// 1. Get Cases List
router.get('/', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    const list = CaseLoader.listCases();
    res.json(list.map(c => ({
      id: c.id,
      title: c.title,
      genre: c.genre,
      description: c.description,
      difficulty: c.difficulty,
      length: c.length
    })));
  } catch (error) {
    next(error);
  }
});

// 2. Start / Reset Case
router.post('/:caseId/start', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  const { caseId } = req.params;
  const userId = req.user?.id;

  try {
    const caseData = CaseLoader.loadCase(caseId);

    // Default world state keys
    const initialWorldState: Record<string, any> = {
      trust: {},
      rooms: {},
      puzzles: {}
    };

    // Case specific defaults
    if (caseId === 'silent-manor') {
      initialWorldState.trust = { james_holloway: 0, victor_hayes: 0, eleanor_blackwood: 0 };
      initialWorldState.rooms = { study: { unlocked: true }, kitchen: { unlocked: true }, gardens: { unlocked: true } };
    } else {
      initialWorldState.trust = { producer: 0, chief: 0, politician: 0, journalist: 0 };
      initialWorldState.rooms = { tv_studio: { unlocked: true }, editing_room: { unlocked: true }, parking_garage: { unlocked: true } };
    }

    const initialPeople = caseId === 'silent-manor' 
      ? [
          { id: 'eleanor_blackwood', name: 'Eleanor Blackwood', isSuspect: false },
          { id: 'daniel_blackwood', name: 'Daniel Blackwood', isSuspect: false },
          { id: 'sophia_blackwood', name: 'Sophia Blackwood', isSuspect: false },
          { id: 'james_holloway', name: 'James Holloway', isSuspect: false },
          { id: 'olivia_reed', name: 'Olivia Reed', isSuspect: false },
          { id: 'victor_hayes', name: 'Victor Hayes', isSuspect: false }
        ]
      : [
          { id: 'producer', name: 'David Miller', isSuspect: false },
          { id: 'camera_op', name: 'Ray Henderson', isSuspect: false },
          { id: 'politician', name: 'Senator Sterling', isSuspect: false },
          { id: 'journalist', name: 'Julian Cole', isSuspect: false },
          { id: 'security_chief', name: 'Marcus Vance', isSuspect: false }
        ];

    // Initial database insert
    await query(
      `INSERT INTO user_progress (
        user_id, case_id, case_type, elapsed_time, world_state, 
        inventory, discovered_evidence, completed_puzzles, save_version, case_version, completed
      ) VALUES ($1, $2, $3, 0, $4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 2, 1, false)
      ON CONFLICT (user_id, case_id) DO UPDATE SET
        elapsed_time = 0,
        world_state = $4,
        inventory = '[]'::jsonb,
        discovered_evidence = '[]'::jsonb,
        completed_puzzles = '[]'::jsonb,
        save_version = 2,
        case_version = 1,
        completed = false,
        score = 0,
        ending_reached = null,
        updated_at = CURRENT_TIMESTAMP`,
      [userId, caseId, caseData.manifest.genre, JSON.stringify(initialWorldState)]
    );

    // Reset pinboard with victim card
    const initialNodes = caseId === 'silent-manor'
      ? [{ id: 'arthur_blackwood', type: 'suspect', x: 200, y: 100, label: 'Arthur Blackwood (Victim)' }]
      : [{ id: 'elena_voss', type: 'suspect', x: 200, y: 100, label: 'Elena Voss (Victim)' }];

    await saveBoardState(userId!, caseId, initialNodes, []);

    // Reset journal entries
    await query('DELETE FROM journal_entries WHERE user_id = $1 AND case_id = $2', [userId, caseId]);
    const journalTitle = 'Case Investigation Opened';
    const journalContent = caseId === 'silent-manor'
      ? 'Arthur Blackwood found dead in locked study. Harris claims suicide, but daughters protest. There is a sense of manufactured finality here. I must review the study and interview family members.'
      : 'Elena Voss killed on air in television studio A. The studio was locked and cameras cut for 30 seconds. I must inspect the presenter desk, review camera footage, and reconstruct the timeline.';
    
    await query(
      `INSERT INTO journal_entries (user_id, case_id, title, content, is_system, pinned)
       VALUES ($1, $2, $3, $4, true, true)`,
      [userId, caseId, journalTitle, journalContent]
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
    const result = await query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND case_id = $2',
      [userId, caseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not started' });
    }

    // Run Save Migrations
    let progress = result.rows[0];
    const { migratedSave, needsSave } = SaveManager.processLoadedSave(progress);
    if (needsSave) {
      await query(
        `UPDATE user_progress 
         SET world_state = $1, elapsed_time = $2, save_version = $3
         WHERE user_id = $4 AND case_id = $5`,
        [JSON.stringify(migratedSave.world_state), migratedSave.elapsed_time, migratedSave.save_version, userId, caseId]
      );
      progress = migratedSave;
    }

    // Load case config
    const caseData = CaseLoader.loadCase(caseId);

    // Calculate dynamic suspicions
    const calculatedSuspicion: Record<string, number> = {};
    const suspectsList = Object.keys(caseData.suspects).map(id => ({
      id,
      ...caseData.suspects[id]
    }));

    suspectsList.forEach((suspect) => {
      let score = suspect.initial_suspicion || 0;

      // Add clue impacts
      progress.discovered_evidence.forEach((clueId: string) => {
        const clue = caseData.effects[clueId]; // check in effects
        const clueMeta = caseData.interactables; // check in interactables
      });

      // Sum hardcoded triggers/contradictions inside world state if checked
      if (caseId === 'silent-manor') {
        if (progress.world_state.victor_gate_lie) score += 35;
        if (progress.world_state.james_study_lie) score += 25;
        if (progress.world_state.daniel_will_motive) score += 20;
      } else {
        if (progress.world_state.producer_gate_lie) score += 25;
        if (progress.world_state.chief_power_lie) score += 35;
        if (progress.world_state.politician_garage_lie) score += 30;
      }

      calculatedSuspicion[suspect.id] = Math.min(100, Math.max(0, score));
    });

    // Build people list mapping suspicion badge triggers
    const mappedPeople = suspectsList.map(suspect => {
      const suspicion = calculatedSuspicion[suspect.id] || 0;
      const isSuspect = suspicion >= suspect.threshold_reveal_suspect;
      return {
        id: suspect.id,
        name: suspect.name,
        isSuspect
      };
    });

    // Determine unlocked scenes list based on world state keys
    const unlockedScenesList = Object.keys(caseData.rooms).filter(roomId => {
      if (roomId === 'study' || roomId === 'kitchen' || roomId === 'gardens' || roomId === 'tv_studio' || roomId === 'editing_room' || roomId === 'parking_garage') {
        return true;
      }
      // Require world state key or evidence keys
      if (roomId === 'security_room' && progress.discovered_evidence.includes('hallway_logs')) return true;
      if (roomId === 'server_room' && progress.discovered_evidence.includes('voss_notebook')) return true;
      if (roomId === 'elena_apartment' && progress.discovered_evidence.includes('delayed_surveillance')) return true;
      return progress.world_state[`scene_unlocked_${roomId}`] === true;
    });

    const revealedSuspicionMeters = Object.keys(calculatedSuspicion).filter(
      (id) => (calculatedSuspicion[id] || 0) >= 25
    );

    const unlockedDialogues = Object.keys(progress.world_state.seen_dialogues || {});
    const discoveredContradictions = Object.keys(caseData.contradictions || {}).filter(
      (key) => progress.world_state[key] === true
    );

    res.json({
      progress: {
        ...progress,
        current_time: progress.elapsed_time,
        unlocked_people: mappedPeople,
        unlocked_scenes: unlockedScenesList,
        suspicion_scores: calculatedSuspicion,
        revealed_suspicion_meters: revealedSuspicionMeters,
        unlocked_dialogues: unlockedDialogues,
        discovered_contradictions: discoveredContradictions,
      },
      definitions: {
        evidence: caseData.evidence, // metadata maps
        suspects: caseData.suspects,
        rooms: caseData.rooms,
        hotspots: caseData.hotspots,
        interactables: caseData.interactables,
        puzzles: caseData.puzzles,
        manifest: caseData.manifest
      }
    });
  } catch (error) {
    next(error);
  }
});

// 4. Explore Hotspot
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
    const caseData = CaseLoader.loadCase(caseId);

    // Locate node in interactables
    const roomInteractables = caseData.interactables[locationId];
    if (!roomInteractables) {
      return res.status(400).json({ error: 'Invalid room location' });
    }

    // Traverse nodes recursively to find target and scan locks along the path
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

    if (roomInteractables[nodeId]) {
      targetNode = roomInteractables[nodeId];
    } else {
      Object.keys(roomInteractables).forEach((key) => {
        findNodeAndCheckLocks(roomInteractables[key], nodeId, false, '', false);
      });
    }

    if (!targetNode) {
      return res.status(404).json({ error: 'Investigation node not found' });
    }

    // Path locked validation
    if (isPathLocked) {
      if (requiredKey) return res.status(403).json({ error: 'Locked', requiresKey: requiredKey });
      if (requiredPassword) return res.status(403).json({ error: 'Locked', requiresPassword: true });
    }

    // Node locked validation
    if (targetNode.locked) {
      if (targetNode.requires_key && !progress.inventory.includes(targetNode.requires_key)) {
        return res.status(403).json({ error: 'Locked', requiresKey: targetNode.requires_key });
      }
      if (targetNode.requires_password && !progress.inventory.includes(targetNode.requires_password)) {
        return res.status(403).json({ error: 'Locked', requiresPassword: true });
      }
    }

    // Validate logic requirements
    const meetsRequirements = RequirementEngine.checkRequirements(
      targetNode.requires,
      progress.world_state,
      progress.inventory,
      progress.discovered_evidence,
      progress.completed_puzzles
    );
    if (!meetsRequirements) {
      return res.status(403).json({ error: 'Requirements not met to inspect this item.' });
    }

    // Execute consequences / rewards
    const ws = { ...progress.world_state };
    const inv = [...progress.inventory];
    const ev = [...progress.discovered_evidence];
    const puz = [...progress.completed_puzzles];

    let timeCost = targetNode.cost_minutes || (targetNode.is_red_herring ? 2 : 10);
    let message = targetNode.is_red_herring ? targetNode.description : 'Node investigated successfully';
    let unlockedMsg = '';

    // Apply direct rewards
    if (targetNode.inventory_reward && !inv.includes(targetNode.inventory_reward)) {
      inv.push(targetNode.inventory_reward);
      unlockedMsg += `Acquired Tool: ${targetNode.inventory_reward.replace('_', ' ').toUpperCase()}. `;
    }

    if (targetNode.evidence_reward && !ev.includes(targetNode.evidence_reward)) {
      ev.push(targetNode.evidence_reward);
      unlockedMsg += `Discovered Clue: ${targetNode.evidence_reward.replace('_', ' ').toUpperCase()}. `;

      // Add to Board Graph nodes
      const board = await getBoardState(userId!, caseId);
      if (!board.nodes.find((n: any) => n.id === targetNode.evidence_reward)) {
        board.nodes.push({
          id: targetNode.evidence_reward,
          type: 'evidence',
          label: targetNode.name,
          x: 100 + Math.random() * 400,
          y: 100 + Math.random() * 400
        });
        await saveBoardState(userId!, caseId, board.nodes, board.edges);
      }

      // Add Sherlock Thought to Journal
      const journalTitle = `Clue Discovered: ${targetNode.name}`;
      const journalContent = `Inspecting ${targetNode.name} has revealed new information. I must connect this with our suspect testimonies.`;
      await query(
        `INSERT INTO journal_entries (user_id, case_id, title, content, is_system, pinned)
         VALUES ($1, $2, $3, $4, true, false)`,
        [userId, caseId, journalTitle, journalContent]
      );
    }

    // Execute declarative side effects
    if (targetNode.effects) {
      EffectEngine.executeEffects(targetNode.effects, ws, inv, ev, puz);
    }

    // Process event-triggers (e.g. search complete trigger)
    const trigResult = TriggerEngine.evaluateTriggers(nodeId + '_searched', caseData.triggers, ws, inv, ev, puz);
    if (trigResult.newCards.length > 0) {
      const board = await getBoardState(userId!, caseId);
      trigResult.newCards.forEach(card => {
        if (!board.nodes.find((n: any) => n.id === card.id)) {
          board.nodes.push(card);
        }
      });
      await saveBoardState(userId!, caseId, board.nodes, board.edges);
    }

    const updatedTime = progress.elapsed_time + timeCost;

    // Save back to DB
    await query(
      `UPDATE user_progress 
       SET world_state = $1, inventory = $2, discovered_evidence = $3, elapsed_time = $4
       WHERE user_id = $5 AND case_id = $6`,
      [JSON.stringify(ws), JSON.stringify(inv), JSON.stringify(ev), updatedTime, userId, caseId]
    );

    res.json({
      message,
      unlockedMsg,
      timeElapsed: timeCost,
      inventory: inv,
      discovered_evidence: ev,
      current_time: updatedTime,
      isRedHerring: !!targetNode.is_red_herring
    });
  } catch (error) {
    next(error);
  }
});

// 5. Interrogation Dialogue
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
    const caseData = CaseLoader.loadCase(caseId);

    const suspectDialogues = caseData.dialogues[suspectId];
    if (!suspectDialogues) return res.status(400).json({ error: 'Invalid suspect ID' });

    const node = suspectDialogues[nodeKey];
    if (!node) return res.status(404).json({ error: 'Dialogue node not found' });

    const ws = { ...progress.world_state };
    const inv = [...progress.inventory];
    const ev = [...progress.discovered_evidence];
    const puz = [...progress.completed_puzzles];

    // Filter node choices
    const filteredChoices = DialogueEngine.filterChoices(node.choices, ws, inv, ev, puz);

    // Apply inline dialogue effects
    if (node.effects) {
      EffectEngine.executeEffects(node.effects, ws, inv, ev, puz);
    }

    // Add statement card to board
    const statementCardId = `${suspectId}_statement_${nodeKey}`;
    
    // Track statement in world state seen dialogues
    if (!ws.seen_dialogues) {
      ws.seen_dialogues = {};
    }
    ws.seen_dialogues[statementCardId] = true;

    const board = await getBoardState(userId!, caseId);
    if (!board.nodes.find((n: any) => n.id === statementCardId)) {
      board.nodes.push({
        id: statementCardId,
        type: 'theory',
        label: `${suspectId.toUpperCase()} Statement: "${node.text.slice(0, 30)}..."`,
        x: 100 + Math.random() * 400,
        y: 100 + Math.random() * 400
      });
      await saveBoardState(userId!, caseId, board.nodes, board.edges);
    }

    // Save elapsed time
    const timeCost = 5;
    const updatedTime = progress.elapsed_time + timeCost;

    await query(
      `UPDATE user_progress 
       SET world_state = $1, elapsed_time = $2
       WHERE user_id = $3 AND case_id = $4`,
      [JSON.stringify(ws), updatedTime, userId, caseId]
    );

    res.json({
      node: {
        ...node,
        choices: filteredChoices
      },
      timeElapsed: timeCost,
      current_time: updatedTime
    });
  } catch (error) {
    next(error);
  }
});

// 6. Cross-Examine (Contradiction Stamp)
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
    const caseData = CaseLoader.loadCase(caseId);

    // Find if contradiction is defined in contradiction.json
    const contradictionsConfig = caseData.contradictions;
    if (!contradictionsConfig) {
      return res.status(400).json({ error: 'Contradiction stamps not supported for this case.' });
    }

    // Match statement ID: suspect_statement_nodeKey
    const match = statementId.match(/^([a-z_]+)_statement_([a-z_]+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid statement tack' });

    const suspectId = match[1];
    const nodeKey = match[2];

    const dialogueNode = caseData.dialogues[suspectId]?.[nodeKey];
    
    // Check if dialogue conflicts with selected evidence
    // Old contradiction mappings: is mapped in dialogueNode.contradicts[evidenceId]
    let contradictionId = '';
    if (dialogueNode && dialogueNode.contradicts && dialogueNode.contradicts[evidenceId]) {
      contradictionId = dialogueNode.contradicts[evidenceId];
    } else {
      // Direct comparison with contradiction.json keys
      // Check if statement maps to key
      const key = `${suspectId}_${nodeKey}_vs_${evidenceId}`;
      if (contradictionsConfig[key] || contradictionsConfig[contradictionId]) {
        contradictionId = key;
      }
    }

    if (contradictionId && contradictionsConfig[contradictionId]) {
      const contradiction = contradictionsConfig[contradictionId];
      const ws = { ...progress.world_state };
      
      // Set contradiction flag in world state
      ws[contradictionId] = true;

      // Add contradiction card to corkboard
      const board = await getBoardState(userId!, caseId);
      if (!board.nodes.find((n: any) => n.id === contradictionId)) {
        board.nodes.push({
          id: contradictionId,
          type: 'evidence',
          label: `🚨 CONTRADICTION: ${contradiction.title}`,
          x: 200,
          y: 200
        });
        await saveBoardState(userId!, caseId, board.nodes, board.edges);
      }

      // Add Sherlock Thought Journal entry
      const journalTitle = `Contradiction Exposed: ${contradiction.title}`;
      await query(
        `INSERT INTO journal_entries (user_id, case_id, title, content, is_system, pinned)
         VALUES ($1, $2, $3, $4, true, false)`,
        [userId, caseId, journalTitle, contradiction.description]
      );

      // Save back to DB
      await query(
        `UPDATE user_progress SET world_state = $1 WHERE user_id = $2 AND case_id = $3`,
        [JSON.stringify(ws), userId, caseId]
      );

      return res.json({
        success: true,
        contradictionId,
        message: `🚨 CONTRADICTION EXPOSED: ${contradiction.title}!`
      });
    }

    res.json({
      success: false,
      message: 'This connection yields no immediate contradictions.'
    });
  } catch (error) {
    next(error);
  }
});

// 7. Generic Puzzle Solve Controller
router.post('/:caseId/puzzles/:puzzleId/solve', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  const { caseId, puzzleId } = req.params;
  const { answer } = req.body;
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
    const caseData = CaseLoader.loadCase(caseId);

    // Find puzzle definition
    const puzzle = caseData.puzzles[puzzleId];
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle configuration not found.' });
    }

    // Verify requirements
    const meetsRequirements = RequirementEngine.checkRequirements(
      puzzle.requirements,
      progress.world_state,
      progress.inventory,
      progress.discovered_evidence,
      progress.completed_puzzles
    );
    if (!meetsRequirements) {
      return res.status(403).json({ error: 'Puzzle is currently locked.' });
    }

    // Verify answer via PuzzleRegistry verifiers
    const isCorrect = PuzzleRegistry.verify(puzzle.type, answer, puzzle);
    if (!isCorrect) {
      return res.json({ success: false, message: 'Solution is incorrect. The gears grind, but do not unlock...' });
    }

    // Mutate state references
    const ws = { ...progress.world_state };
    const inv = [...progress.inventory];
    const ev = [...progress.discovered_evidence];
    const puz = [...progress.completed_puzzles];

    if (!puz.includes(puzzleId)) {
      puz.push(puzzleId);
    }

    // Execute rewards
    const rewardResult = EffectEngine.executeEffects(puzzle.rewards, ws, inv, ev, puz);

    // Pin reward cards to board if returned
    if (rewardResult.newCards.length > 0) {
      const board = await getBoardState(userId!, caseId);
      rewardResult.newCards.forEach((card) => {
        if (!board.nodes.find((n: any) => n.id === card.id)) {
          board.nodes.push(card);
        }
      });
      await saveBoardState(userId!, caseId, board.nodes, board.edges);
    }

    // Process puzzle solved trigger
    const triggerResult = TriggerEngine.evaluateTriggers(puzzleId + '_solved', caseData.triggers, ws, inv, ev, puz);
    if (triggerResult.newCards.length > 0) {
      const board = await getBoardState(userId!, caseId);
      triggerResult.newCards.forEach((card) => {
        if (!board.nodes.find((n: any) => n.id === card.id)) {
          board.nodes.push(card);
        }
      });
      await saveBoardState(userId!, caseId, board.nodes, board.edges);
    }

    // Save back to DB
    await query(
      `UPDATE user_progress 
       SET world_state = $1, inventory = $2, discovered_evidence = $3, completed_puzzles = $4
       WHERE user_id = $5 AND case_id = $6`,
      [JSON.stringify(ws), JSON.stringify(inv), JSON.stringify(ev), JSON.stringify(puz), userId, caseId]
    );

    res.json({
      success: true,
      message: `🎉 PUZZLE SOLVED: ${puzzle.title} restored!`,
      rewards: puzzle.rewards
    });
  } catch (error) {
    next(error);
  }
});

// 8. Accuse & Courtroom Presentation Table (Object-based slots verification)
router.post('/:caseId/accuse', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  const { caseId } = req.params;
  const playerAccusations = req.body; // e.g. { killer: "victor_hayes", weapon: "vial" }
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
    const caseData = CaseLoader.loadCase(caseId);
    const endingsConfig = caseData.endings;

    // Verify accusatorial slots object-by-object
    let correctCount = 0;
    const requiredSlots = endingsConfig.required; // array of {slot, correct}

    requiredSlots.forEach((reqSlot: any) => {
      const playerVal = playerAccusations[reqSlot.slot];
      if (playerVal && playerVal.trim() === reqSlot.correct.trim()) {
        correctCount++;
      }
    });

    const isAllCorrect = correctCount === requiredSlots.length;
    let endingId = 'wrong_culprit';
    let finalScore = 0;

    if (isAllCorrect) {
      endingId = 'conviction_true';
      finalScore = 100;
    } else if (correctCount >= 2) {
      endingId = 'weak_evidence';
      finalScore = 50;
    } else {
      endingId = 'insufficient_evidence';
      finalScore = 25;
    }

    // Apply time deductions
    const timeDeduction = Math.floor(progress.elapsed_time / 30) * 5;
    const hintDeduction = progress.hints_used * 10;
    finalScore = Math.max(10, finalScore - timeDeduction - hintDeduction);

    const ending = endingsConfig.endings[endingId];

    // Mark completed
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
        completedPuzzlesCount: progress.completed_puzzles.length
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
