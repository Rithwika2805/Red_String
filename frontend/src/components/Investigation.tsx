import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { X, Map, MessageSquare, Key, ShieldAlert, CheckCircle2, Stamp, Terminal, Volume2, CalendarDays, ArrowUp, ArrowDown } from 'lucide-react';
import { Board } from './Board';

export const Investigation: React.FC<{ onClose: () => void; initialTab?: 'rooms' | 'board' | 'interview' | 'analysis' }> = ({ onClose, initialTab = 'rooms' }) => {
  const { progress, definitions, investigateNode, talkToSuspect, crossExamine, solvePuzzle, activeCaseId, triggerAudio, showAlert } = useGame();
  
  // Navigation tabs: 'rooms' | 'board' | 'interview' | 'analysis'
  const [activeTab, setActiveTab] = useState<'rooms' | 'board' | 'interview' | 'analysis'>(initialTab);
  
  // Sub-analysis tab: 'contradiction' | 'timeline' | 'audio' | 'decrypt'
  const [activeAnalysisSub, setActiveAnalysisSub] = useState<'contradiction' | 'timeline' | 'audio' | 'decrypt'>('contradiction');

  // Rooms tab states
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [activeSearchOutput, setActiveSearchOutput] = useState<string>('');
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [activeHotspotNode, setActiveHotspotNode] = useState<any | null>(null);
  const [closeupOpen, setCloseupOpen] = useState(false);
  const [inspectedRedHerrings, setInspectedRedHerrings] = useState<string[]>([]);

  // Interview tab states
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [activeDialogueNode, setActiveDialogueNode] = useState<any | null>(null);
  
  // Cross Examination / Contradiction states
  const [selectedStatementId, setSelectedStatementId] = useState<string>('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>('');
  const [crossResultMsg, setCrossResultMsg] = useState<string>('');
  const [stampActive, setStampActive] = useState(false);

  // Puzzle: Timeline State
  const [timelineAnswers, setTimelineAnswers] = useState<Record<string, string>>({});
  const [timelineSuccessMsg, setTimelineSuccessMsg] = useState('');

  // Puzzle: Audio State
  const [audioFragments, setAudioFragments] = useState<any[]>([]);
  const [audioSuccessMsg, setAudioSuccessMsg] = useState('');

  // Puzzle: Decrypt Terminal State
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'VOSS SECURE DRIVE MOUNTED.',
    'WARNING: Directory "Project_Red_String" is AES-256 encrypted.',
    'Enter 4-digit decryption pin code to unlock folder:'
  ]);
  const [terminalSuccess, setTerminalSuccess] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Load audio puzzle segments if definitions change
  useEffect(() => {
    const audioDef = definitions?.puzzles?.audio_voss;
    if (audioDef?.data?.segments) {
      setAudioFragments([...audioDef.data.segments]);
    }
  }, [definitions]);

  // Evaluate Condition Tree Recursively on frontend
  const checkConditionTree = (reqs: any): boolean => {
    if (!reqs) return true;

    // Backward compatibility for flat list of IDs
    if (Array.isArray(reqs)) {
      return (reqs as string[]).every(id => 
        progress?.inventory.includes(id) || 
        progress?.discovered_evidence.includes(id) || 
        progress?.world_state[id] === true
      );
    }

    if (reqs.all && Array.isArray(reqs.all)) {
      return reqs.all.every((subTree: any) => checkConditionTree(subTree));
    }
    if (reqs.any && Array.isArray(reqs.any)) {
      return reqs.any.some((subTree: any) => checkConditionTree(subTree));
    }
    if (reqs.not) {
      return !checkConditionTree(reqs.not);
    }

    // Leaf node evaluation
    const type = reqs.type;
    if (type === 'state') {
      const path = reqs.path || reqs.key;
      if (!path) return false;

      // Resolve nested dot property
      const parts = path.split('.');
      let val = progress?.world_state;
      for (const part of parts) {
        if (val === null || val === undefined) {
          val = undefined;
          break;
        }
        val = val[part];
      }

      const targetVal = reqs.equals !== undefined ? reqs.equals : reqs.value;
      if (reqs.gte !== undefined) return typeof val === 'number' && val >= reqs.gte;
      if (reqs.lte !== undefined) return typeof val === 'number' && val <= reqs.lte;
      return val === targetVal;
    }

    if (type === 'evidence') {
      const evid = reqs.id || reqs.path;
      return evid ? progress?.discovered_evidence.includes(evid) : false;
    }
    if (type === 'inventory') {
      const item = reqs.id || reqs.path;
      return item ? progress?.inventory.includes(item) : false;
    }
    if (type === 'puzzle') {
      const puzzleId = reqs.id || reqs.path;
      return puzzleId ? progress?.completed_puzzles.includes(puzzleId) : false;
    }

    return false;
  };

  const getUnresolvedStatementLabel = (statementId: string) => {
    const match = statementId.match(/^([a-z_]+)_statement_([a-z_]+)$/);
    if (!match) return statementId;
    const suspect = match[1].replace('_', ' ');
    const node = match[2].replace(/_/g, ' ');
    return `${suspect.toUpperCase()}: Statement about "${node}"`;
  };

  const handleRoomClick = (roomId: string) => {
    setSelectedRoomId(roomId);
    setActiveSearchOutput('');
    setActiveHotspotId(null);
    setActiveHotspotNode(null);
    setCloseupOpen(false);
    triggerAudio('door');
  };

  const handleNodeClick = async (roomId: string, nodeId: string) => {
    if (!activeCaseId) return;
    const res = await investigateNode(activeCaseId, roomId, nodeId);
    if (res && res.error) {
      if (res.requiresKey) {
        setActiveSearchOutput(`🔒 Locked: Requires ${res.requiresKey.replace('_', ' ').toUpperCase()}`);
      } else if (res.requiresPassword) {
        setActiveSearchOutput('🔒 Locked: Security computer requires maintenance login password.');
      } else {
        setActiveSearchOutput(`Error: ${res.error}`);
      }
    } else if (res) {
      const rewardText = res.unlockedMsg ? `\n\n💡 ${res.unlockedMsg}` : '';
      setActiveSearchOutput(`${res.message || 'Searched item.'} Spent ${res.timeElapsed} minutes.${rewardText}`);
      if (res.isRedHerring) {
        setInspectedRedHerrings((prev) => [...prev, nodeId]);
      }
    }
  };

  const handleSuspectClick = async (suspectId: string) => {
    if (!activeCaseId) return;
    setSelectedSuspectId(suspectId);
    const data = await talkToSuspect(activeCaseId, suspectId, 'root');
    if (data && data.node) {
      setActiveDialogueNode(data.node);
    }
  };

  const handleDialogueChoiceClick = async (choice: any) => {
    if (!activeCaseId || !selectedSuspectId) return;
    const data = await talkToSuspect(activeCaseId, selectedSuspectId, choice.next);
    if (data && data.node) {
      setActiveDialogueNode(data.node);
    }
  };

  const executeCrossExamine = async () => {
    if (!activeCaseId || !selectedStatementId || !selectedEvidenceId) return;
    
    setCrossResultMsg('Cross-examining...');
    const data = await crossExamine(activeCaseId, selectedStatementId, selectedEvidenceId);
    if (data) {
      if (data.success) {
        setStampActive(true);
        triggerAudio('stamp');
        setTimeout(() => setStampActive(false), 1200);
      }
      setCrossResultMsg(data.message);
    }
  };

  // Timeline Puzzle submission
  const handleVerifyTimeline = async () => {
    if (!activeCaseId) return;
    const res = await solvePuzzle(activeCaseId, 'timeline_voss', timelineAnswers);
    if (res && res.success) {
      setTimelineSuccessMsg('✓ Correct! The timeline logs align perfectly. Camera display timestamps were manipulated by 14 minutes. Clue pinned to Board.');
      triggerAudio('stamp');
    } else {
      showAlert(res?.message || 'Incorrect arrangement.');
    }
  };

  // Audio Puzzle rearranging
  const moveFragment = (index: number, direction: 'up' | 'down') => {
    const updated = [...audioFragments];
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= updated.length) return;
    
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    setAudioFragments(updated);
    triggerAudio('paper');
  };

  const handleVerifyAudio = async () => {
    if (!activeCaseId) return;
    const orderPayload = audioFragments.map(f => f.id);
    const res = await solvePuzzle(activeCaseId, 'audio_voss', orderPayload);
    if (res && res.success) {
      setAudioSuccessMsg('✓ Restored! Decrypted dialogue tape: "Elena: I know about Project Red String... Vance: You are playing a dangerous game..." Clue pinned to Board.');
      triggerAudio('stamp');
    } else {
      showAlert(res?.message || 'Incorrect order.');
    }
  };

  // Decrypt Terminal submission
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCaseId || !terminalInput) return;

    const res = await solvePuzzle(activeCaseId, 'decrypt_flashdrive', terminalInput);
    if (res && res.success) {
      setTerminalLogs(prev => [
        ...prev,
        `> ${terminalInput}`,
        'PIN DECRYPT SUCCESSFUL. AES KEY GENERATED.',
        'DECRYPTING DIRECTORY: /Project_Red_String/... Done.',
        'OPENING FILE: read_me_warning.txt...',
        definitions?.puzzles?.decrypt_flashdrive?.data?.fileContents || 'PROJECT RED STRING UNLOCKED.'
      ]);
      setTerminalSuccess(true);
      triggerAudio('typewriter');
    } else {
      setTerminalLogs(prev => [
        ...prev,
        `> ${terminalInput}`,
        '❌ ACCESS DENIED: INVALID KEY CRYPTO SIGNATURE.'
      ]);
      setTerminalInput('');
      triggerAudio('stamp');
    }
  };

  const activeModules = definitions?.manifest?.modules || ['contradiction'];

  return (
    <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="w-[1020px] h-[580px] bg-wood-900 border-4 border-wood-950 rounded-lg flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Unified Top Navbar */}
        <div className="w-full bg-noir-900 border-b border-wood-950 px-6 py-3 flex justify-between items-center z-10 shrink-0">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-typewriter uppercase tracking-wider ${
                activeTab === 'rooms' ? 'bg-wood-800 text-yellow-500 border border-yellow-600/40' : 'text-parchment-300 hover:text-white'
              }`}
            >
              <Map className="w-4 h-4" />
              Investigation Map
            </button>
            <button 
              onClick={() => setActiveTab('board')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-typewriter uppercase tracking-wider ${
                activeTab === 'board' ? 'bg-wood-800 text-yellow-500 border border-yellow-600/40' : 'text-parchment-300 hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Evidence Board
            </button>
            <button 
              onClick={() => setActiveTab('interview')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-typewriter uppercase tracking-wider ${
                activeTab === 'interview' ? 'bg-wood-800 text-yellow-500 border border-yellow-600/40' : 'text-parchment-300 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Interrogations
            </button>
            <button 
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-typewriter uppercase tracking-wider ${
                activeTab === 'analysis' ? 'bg-wood-800 text-yellow-500 border border-yellow-600/40' : 'text-parchment-300 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Analysis Lab
            </button>
          </div>

          <button 
            onClick={onClose}
            className="text-parchment-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Panels Viewport */}
        <div className="flex-1 w-full flex overflow-hidden">
          
          {/* TAB 1: INVESTIGATION MAP (ROOM POINT & CLICK) */}
          {activeTab === 'rooms' && (
            <div className="flex-1 flex overflow-hidden m-2 bg-parchment-100 paper-texture text-noir-900 rounded-b">
              {/* Left Column: Scene Nodes list */}
              <div className="w-1/3 border-r border-noir-900/10 p-4 overflow-y-auto">
                <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-noir-950 border-b border-noir-900/10 pb-2 mb-3">
                  Locations directory
                </h3>
                <div className="flex flex-col gap-2">
                  {progress?.unlocked_scenes.map((roomId: string) => {
                    const roomDef = definitions?.rooms[roomId];
                    if (!roomDef) return null;
                    return (
                      <button
                        key={roomId}
                        onClick={() => handleRoomClick(roomId)}
                        className={`w-full text-left p-3 rounded transition font-serif border ${
                          selectedRoomId === roomId 
                            ? 'bg-noir-900 text-parchment-100 border-noir-900 shadow'
                            : 'bg-noir-900/5 border-noir-900/10 hover:bg-noir-900/10'
                        }`}
                      >
                        <div className="font-bold text-sm">{roomDef.name}</div>
                        <div className="text-[10px] font-typewriter opacity-60 mt-0.5 truncate">{roomDef.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Visual Scene Viewport */}
              <div className="flex-1 p-5 flex flex-col justify-between overflow-hidden">
                {selectedRoomId ? (
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <div className="flex justify-between items-start border-b border-noir-900/10 pb-1.5">
                        <div>
                          <h4 className="font-serif text-lg font-bold text-noir-950">
                            {definitions?.rooms[selectedRoomId].name}
                          </h4>
                          <p className="font-typewriter text-[9px] text-noir-900/60 italic">
                            {definitions?.rooms[selectedRoomId].description}
                          </p>
                        </div>
                        {closeupOpen && (
                          <button
                            onClick={() => {
                              setCloseupOpen(false);
                              setActiveHotspotId(null);
                              setActiveHotspotNode(null);
                              setActiveSearchOutput('');
                            }}
                            className="bg-noir-900 hover:bg-noir-950 text-parchment-100 text-[10px] uppercase font-typewriter px-2 py-1 rounded shadow"
                          >
                            Back to Room
                          </button>
                        )}
                      </div>

                      {/* Viewport (16:9 Point-and-Click Canvas) */}
                      <div className="relative flex-1 bg-noir-950 border border-wood-950 rounded-lg overflow-hidden mt-3 shadow-inner group">
                        <img 
                          src={definitions?.rooms[selectedRoomId].bg_image || '/assets/scenes/study.jpg'} 
                          alt={definitions?.rooms[selectedRoomId].name}
                          className="w-full h-full object-cover opacity-90 transition duration-300 group-hover:opacity-100 select-none pointer-events-none"
                        />

                        {/* Coordinate Hotspot Buttons */}
                        {!closeupOpen && Object.keys(definitions?.hotspots[selectedRoomId] || {}).map((nodeId) => {
                          const hotspotData = definitions?.hotspots[selectedRoomId][nodeId];
                          const coords = hotspotData.hotspot;
                          if (!coords) return null;

                          // Evaluate node status from interactables schema
                          const node = definitions?.interactables[selectedRoomId]?.[nodeId] || hotspotData;
                          const alreadyDiscovered = (node.evidence_reward && progress?.discovered_evidence.includes(node.evidence_reward)) ||
                                                    (node.inventory_reward && progress?.inventory.includes(node.inventory_reward));
                          
                          let allSubDiscovered = false;
                          if (node.nodes) {
                            const subKeys = Object.keys(node.nodes);
                            allSubDiscovered = subKeys.length > 0 && subKeys.every(subId => {
                              const sub = node.nodes[subId];
                              return progress?.discovered_evidence.includes(sub.evidence_reward) ||
                                     progress?.inventory.includes(sub.inventory_reward);
                            });
                          }

                          const isDiscovered = alreadyDiscovered || allSubDiscovered || (node.is_red_herring && inspectedRedHerrings.includes(nodeId));
                          const isParentLocked = node.locked && !(
                            (node.requires_key && progress?.inventory.includes(node.requires_key)) ||
                            (node.requires_password && progress?.inventory.includes(node.requires_password))
                          );

                          return (
                            <button
                              key={nodeId}
                              onClick={() => {
                                triggerAudio('paper');
                                setActiveHotspotId(nodeId);
                                setActiveHotspotNode(node);
                                setCloseupOpen(true);
                                setActiveSearchOutput('');
                              }}
                              style={{
                                left: `${coords.x}%`,
                                top: `${coords.y}%`,
                                width: `${coords.w}%`,
                                height: `${coords.h}%`
                              }}
                              className="absolute transition border-2 border-transparent hover:border-dashed hover:border-yellow-600 hover:bg-yellow-600/10 cursor-zoom-in group/hotspot"
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-noir-950/90 text-parchment-100 text-[9px] rounded border border-wood-900/50 opacity-0 group-hover/hotspot:opacity-100 transition duration-150 whitespace-nowrap pointer-events-none font-typewriter z-30 shadow">
                                {node.name} {node.is_red_herring ? '(Detail)' : ''}
                              </div>
                              <div className="absolute top-1 right-1 flex gap-1 bg-noir-950/40 p-0.5 rounded">
                                {isDiscovered && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-noir-950" />}
                                {!isDiscovered && isParentLocked && <Key className="w-3 h-3 text-amber-500" />}
                              </div>
                            </button>
                          );
                        })}

                        {/* closeup overlay folder details */}
                        {closeupOpen && activeHotspotNode && (
                          <div className="absolute inset-x-0 bottom-0 top-1/4 bg-parchment-100 border-t-2 border-wood-950 p-4 flex flex-col justify-between z-20 shadow-2xl overflow-y-auto">
                            <div className="flex-1 flex gap-4 overflow-hidden">
                              <div className="flex-1 pr-2 border-r border-noir-900/10 overflow-y-auto">
                                <div className="font-serif text-sm font-bold text-noir-950 flex items-center justify-between">
                                  <span>{activeHotspotNode.name}</span>
                                </div>
                                <p className="font-typewriter text-xs text-noir-900/80 mt-2 leading-relaxed whitespace-pre-line">
                                  {activeHotspotNode.description}
                                </p>
                                {activeSearchOutput && (
                                  <div className="mt-3 bg-yellow-500/10 border border-yellow-600/20 p-2.5 rounded font-typewriter text-xs text-yellow-950 animate-fade-in leading-relaxed">
                                    {activeSearchOutput}
                                  </div>
                                )}
                              </div>

                              <div className="w-[300px] flex flex-col justify-start gap-2 overflow-y-auto">
                                <div className="text-[10px] font-bold text-noir-900/50 uppercase font-typewriter tracking-wider mb-1">
                                  Inspect Details
                                </div>

                                {/* Red Herring Action */}
                                {activeHotspotNode.is_red_herring && (
                                  <button
                                    disabled={inspectedRedHerrings.includes(activeHotspotId || '')}
                                    onClick={() => handleNodeClick(selectedRoomId, activeHotspotId || '')}
                                    className="w-full text-center bg-noir-900 text-parchment-100 hover:bg-noir-950 disabled:bg-noir-900/40 p-2 rounded text-xs font-typewriter uppercase shadow"
                                  >
                                    {inspectedRedHerrings.includes(activeHotspotId || '') ? '✓ Inspected' : 'Examine detail (+2 Mins)'}
                                  </button>
                                )}

                                {/* Flat node action */}
                                {!activeHotspotNode.nodes && !activeHotspotNode.is_red_herring && (
                                  <>
                                    {(() => {
                                      const isDiscovered = (activeHotspotNode.evidence_reward && progress?.discovered_evidence.includes(activeHotspotNode.evidence_reward)) ||
                                                           (activeHotspotNode.inventory_reward && progress?.inventory.includes(activeHotspotNode.inventory_reward));
                                      const isLocked = activeHotspotNode.locked && !(
                                        (activeHotspotNode.requires_key && progress?.inventory.includes(activeHotspotNode.requires_key)) ||
                                        (activeHotspotNode.requires_password && progress?.inventory.includes(activeHotspotNode.requires_password))
                                      );
                                      return (
                                        <>
                                          <button
                                            disabled={isDiscovered || isLocked}
                                            onClick={() => handleNodeClick(selectedRoomId, activeHotspotId || '')}
                                            className="w-full text-center bg-noir-900 text-parchment-100 hover:bg-noir-950 disabled:bg-noir-900/40 p-2 rounded text-xs font-typewriter uppercase shadow"
                                          >
                                            {isDiscovered ? '✓ Searched' : isLocked ? '🔒 Locked' : `Search Container (+${activeHotspotNode.cost_minutes || 10} Mins)`}
                                          </button>
                                          {isLocked && (
                                            <p className="text-[9px] font-typewriter text-red-700/80 italic text-center">
                                              Requires: {activeHotspotNode.requires_key?.replace('_', ' ').toUpperCase() || 'Password'}
                                            </p>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </>
                                )}

                                {/* Nested sub-items */}
                                {activeHotspotNode.nodes && Object.keys(activeHotspotNode.nodes).map(subId => {
                                  const sub = activeHotspotNode.nodes[subId];
                                  const subDiscovered = progress?.discovered_evidence.includes(sub.evidence_reward) ||
                                                        progress?.inventory.includes(sub.inventory_reward);
                                  const isParentLocked = activeHotspotNode.locked && !(
                                    (activeHotspotNode.requires_key && progress?.inventory.includes(activeHotspotNode.requires_key)) ||
                                    (activeHotspotNode.requires_password && progress?.inventory.includes(activeHotspotNode.requires_password))
                                  );

                                  return (
                                    <div key={subId} className="flex flex-col gap-1">
                                      <button
                                        disabled={isParentLocked || subDiscovered}
                                        onClick={() => handleNodeClick(selectedRoomId, subId)}
                                        className={`w-full text-left p-2 rounded border text-xs font-typewriter flex justify-between items-center ${
                                          isParentLocked
                                            ? 'bg-noir-900/5 border-noir-900/5 text-noir-900/30 cursor-not-allowed opacity-50'
                                            : subDiscovered
                                            ? 'bg-green-600/10 border-green-600/20 text-green-700 font-bold'
                                            : 'bg-noir-900/5 hover:bg-noir-900/10 border-noir-900/10 text-noir-900'
                                        }`}
                                      >
                                        <span>Inspect {sub.name}</span>
                                        {subDiscovered ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                        ) : isParentLocked ? (
                                          <Key className="w-3 h-3 text-amber-700" />
                                        ) : null}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-noir-900/10 rounded-lg p-6 bg-white/20">
                    <Map className="w-12 h-12 text-noir-900/30 stroke-1" />
                    <h5 className="font-serif text-lg font-bold text-noir-900/50 mt-4">No Scene Selected</h5>
                    <p className="font-typewriter text-xs text-noir-900/40 mt-1 max-w-[280px] text-center">
                      Select a crime scene from the left locations map directory to begin.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EVIDENCE BOARD EMBEDDED */}
          {activeTab === 'board' && (
            <div className="flex-1 m-2 bg-black border border-wood-950 rounded-b relative overflow-hidden flex flex-col">
              <Board onClose={() => {}} isEmbedded={true} />
            </div>
          )}

          {/* TAB 3: INTERROGATIONS */}
          {activeTab === 'interview' && (
            <div className="flex-1 flex overflow-hidden m-2 bg-wood-950/20 text-parchment-100 rounded-b">
              <div className="w-1/3 border-r border-wood-950 p-4 overflow-y-auto">
                <h3 className="font-serif text-sm text-yellow-500 tracking-wider font-bold uppercase border-b border-wood-950 pb-2 mb-3">
                  People directory
                </h3>
                <div className="flex flex-col gap-2">
                  {progress?.unlocked_people.map((person: any) => {
                    const suspectDef = definitions?.suspects[person.id];
                    if (!suspectDef || suspectDef.is_victim) return null;
                    const isSuspect = person.isSuspect;
                    const hasMeter = progress?.revealed_suspicion_meters?.includes(person.id) || false;
                    const suspicionScore = progress?.suspicion_scores[person.id] || 0;

                    return (
                      <button
                        key={person.id}
                        onClick={() => handleSuspectClick(person.id)}
                        className={`w-full text-left p-3 rounded border flex flex-col gap-1.5 ${
                          selectedSuspectId === person.id ? 'bg-wood-800 border-yellow-600' : 'bg-wood-950/40 border-wood-900 hover:bg-wood-800/40'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-serif text-sm font-bold text-parchment-100">{person.name}</span>
                          {isSuspect ? (
                            <span className="text-[8px] font-typewriter bg-red-950 border border-red-700 text-red-400 px-1.5 rounded-full uppercase tracking-wider font-bold">
                              Suspect
                            </span>
                          ) : (
                            <span className="text-[8px] font-typewriter bg-wood-900 border border-wood-800 text-parchment-300/40 px-1.5 rounded-full uppercase tracking-wider">
                              Person
                            </span>
                          )}
                        </div>

                        {hasMeter && (
                          <div className="w-full flex items-center gap-2">
                            <span className="text-[8px] font-typewriter text-parchment-300/50">SUSPICION:</span>
                            <div className="flex-1 h-1.5 bg-black/60 rounded overflow-hidden">
                              <div style={{ width: `${suspicionScore}%` }} className="h-full bg-red-600 shadow shadow-red-500" />
                            </div>
                            <span className="text-[8px] font-typewriter text-red-500 font-bold">{suspicionScore}%</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto bg-noir-900/60 relative">
                {selectedSuspectId ? (
                  <div className="flex-1 flex flex-col justify-between min-h-[300px]">
                    <div className="border-b border-wood-950 pb-2 mb-3">
                      <h4 className="font-serif text-lg font-bold text-yellow-500">
                        {definitions?.suspects[selectedSuspectId].name}
                      </h4>
                      <span className="text-[9px] font-typewriter text-parchment-300/50 uppercase tracking-widest">
                        {definitions?.suspects[selectedSuspectId].description}
                      </span>
                    </div>

                    <div className="flex-1 bg-noir-950 border border-wood-900 p-4 rounded font-typewriter text-xs text-parchment-200 leading-relaxed mb-4 h-36 overflow-y-auto">
                      <p className="indent-4">"{activeDialogueNode?.text}"</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-typewriter text-parchment-300/40 uppercase tracking-widest">Select Question:</span>
                      {activeDialogueNode?.choices && activeDialogueNode.choices.map((choice: any, idx: number) => {
                        const isVisible = checkConditionTree(choice.requires);
                        if (!isVisible) return null;

                        return (
                          <button
                            key={idx}
                            onClick={() => handleDialogueChoiceClick(choice)}
                            className="w-full text-left bg-wood-900/40 hover:bg-wood-800/40 border border-wood-850 p-2.5 rounded text-xs font-typewriter text-parchment-200 hover:text-yellow-500 transition"
                          >
                            &raquo; {choice.text}
                          </button>
                        );
                      })}
                      {activeDialogueNode && activeDialogueNode.choices?.length === 0 && (
                        <button
                          onClick={() => handleSuspectClick(selectedSuspectId)}
                          className="w-full text-left bg-wood-900 border border-wood-800 p-2 rounded text-xs font-typewriter text-yellow-500 hover:text-white transition"
                        >
                          &laquo; Return to introduction questions
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center font-typewriter text-sm text-parchment-300/30 gap-2">
                    <MessageSquare className="w-10 h-10 text-wood-900" />
                    <span>Choose a directory profile folder to begin cross interrogation</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ANALYSIS LAB (DYNAMIC PUZZLES SELECTION) */}
          {activeTab === 'analysis' && (
            <div className="flex-1 flex overflow-hidden m-2 bg-wood-950/20 text-parchment-100 rounded-b">
              {/* Left Sub-nav Column */}
              <div className="w-1/4 border-r border-wood-950 p-4 flex flex-col gap-2 shrink-0 overflow-y-auto">
                <div className="text-[10px] font-bold text-yellow-500 uppercase font-typewriter tracking-wider mb-2 border-b border-wood-950 pb-1.5">
                  Analysis Tools
                </div>
                
                <button
                  onClick={() => setActiveAnalysisSub('contradiction')}
                  className={`w-full text-left p-2.5 rounded border text-xs font-typewriter flex items-center gap-2 ${
                    activeAnalysisSub === 'contradiction' ? 'bg-wood-800 border-yellow-600 text-yellow-500' : 'bg-wood-950/40 border-wood-900 text-parchment-300'
                  }`}
                >
                  <Stamp className="w-4 h-4" />
                  Contradictions Desk
                </button>

                {/* Dynamic Timeline Module */}
                {activeModules.includes('timeline') && (
                  <button
                    disabled={!progress?.discovered_evidence.includes('server_power_logs')}
                    onClick={() => setActiveAnalysisSub('timeline')}
                    className={`w-full text-left p-2.5 rounded border text-xs font-typewriter flex items-center justify-between ${
                      !progress?.discovered_evidence.includes('server_power_logs')
                        ? 'opacity-40 border-wood-950 cursor-not-allowed'
                        : activeAnalysisSub === 'timeline'
                        ? 'bg-wood-800 border-yellow-600 text-yellow-500'
                        : 'bg-wood-950/40 border-wood-900 text-parchment-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      Video Timeline
                    </span>
                    {!progress?.discovered_evidence.includes('server_power_logs') && <Key className="w-3 h-3 text-amber-500" />}
                    {progress?.completed_puzzles.includes('timeline_voss') && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                  </button>
                )}

                {/* Dynamic Audio Restoration Module */}
                {activeModules.includes('audio') && (
                  <button
                    disabled={!progress?.discovered_evidence.includes('corrupted_audio_tape')}
                    onClick={() => setActiveAnalysisSub('audio')}
                    className={`w-full text-left p-2.5 rounded border text-xs font-typewriter flex items-center justify-between ${
                      !progress?.discovered_evidence.includes('corrupted_audio_tape')
                        ? 'opacity-40 border-wood-950 cursor-not-allowed'
                        : activeAnalysisSub === 'audio'
                        ? 'bg-wood-800 border-yellow-600 text-yellow-500'
                        : 'bg-wood-950/40 border-wood-900 text-parchment-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Audio Restoration
                    </span>
                    {!progress?.discovered_evidence.includes('corrupted_audio_tape') && <Key className="w-3 h-3 text-amber-500" />}
                    {progress?.completed_puzzles.includes('audio_voss') && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                  </button>
                )}

                {/* Dynamic Decrypt Terminal Module */}
                {activeModules.includes('terminal') && (
                  <button
                    disabled={!progress?.inventory.includes('red_string_flashdrive')}
                    onClick={() => setActiveAnalysisSub('decrypt')}
                    className={`w-full text-left p-2.5 rounded border text-xs font-typewriter flex items-center justify-between ${
                      !progress?.inventory.includes('red_string_flashdrive')
                        ? 'opacity-40 border-wood-950 cursor-not-allowed'
                        : activeAnalysisSub === 'decrypt'
                        ? 'bg-wood-800 border-yellow-600 text-yellow-500'
                        : 'bg-wood-950/40 border-wood-900 text-parchment-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      Decrypt Drive
                    </span>
                    {!progress?.inventory.includes('red_string_flashdrive') && <Key className="w-3 h-3 text-amber-500" />}
                    {progress?.completed_puzzles.includes('decrypt_flashdrive') && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                  </button>
                )}
              </div>

              {/* Center Content Workspace Column */}
              <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto bg-noir-900/60">
                
                {/* 1. CONTRADICTION STAMPS DESK */}
                {activeAnalysisSub === 'contradiction' && (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-lg text-yellow-500 font-bold uppercase tracking-wider border-b border-wood-950 pb-1.5">
                        Cross Interrogation Desk
                      </h4>
                      <p className="font-typewriter text-[11px] text-parchment-300/60 leading-relaxed mt-2">
                        Confront lies by matching suspect statements with discovered evidence.
                        If a contradiction exists, a contradiction stamp card will be pinned to the board.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 my-4 relative">
                      {stampActive && (
                        <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center rounded">
                          <div className="font-serif text-4xl font-extrabold text-red-600 border-8 border-red-600 p-4 rounded-lg uppercase tracking-widest rotate-12 scale-150 animate-ping">
                            EXPOSED
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-typewriter text-parchment-300/40 uppercase">Statement:</span>
                        <select
                          value={selectedStatementId}
                          onChange={(e) => setSelectedStatementId(e.target.value)}
                          className="w-full bg-noir-950 border border-wood-800 p-2 rounded text-xs font-typewriter text-parchment-100"
                        >
                          <option value="">-- Choose statement --</option>
                          {progress?.unlocked_dialogues?.map((statementId: string) => (
                            <option key={statementId} value={statementId}>
                              {getUnresolvedStatementLabel(statementId)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-typewriter text-parchment-300/40 uppercase">Clue / Evidence:</span>
                        <select
                          value={selectedEvidenceId}
                          onChange={(e) => setSelectedEvidenceId(e.target.value)}
                          className="w-full bg-noir-950 border border-wood-800 p-2 rounded text-xs font-typewriter text-parchment-100"
                        >
                          <option value="">-- Choose clue --</option>
                          {progress?.discovered_evidence.map((clueId: string) => {
                            const clue = definitions?.evidence?.[clueId]; // backward compatibility
                            return (
                              <option key={clueId} value={clueId}>
                                {clue?.title || clueId.replace(/_/g, ' ').toUpperCase()}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                      <button
                        disabled={!selectedStatementId || !selectedEvidenceId}
                        onClick={executeCrossExamine}
                        className="flex items-center gap-2 px-6 py-2.5 bg-crimson hover:bg-red-700 disabled:opacity-30 transition text-parchment-50 rounded shadow font-typewriter uppercase tracking-wider text-xs font-bold"
                      >
                        <Stamp className="w-4 h-4" />
                        Compare Clues
                      </button>

                      {crossResultMsg && (
                        <div className={`font-typewriter text-xs p-2.5 rounded border text-center w-full max-w-lg ${
                          crossResultMsg.includes('EXPOSED') ? 'bg-red-500/10 border-red-600/30 text-red-400 font-bold' : 'bg-wood-950/40 border-wood-900 text-parchment-300'
                        }`}>
                          {crossResultMsg}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. SURVEILLANCE TIMELINE RECONSTRUCTION */}
                {activeAnalysisSub === 'timeline' && (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-lg text-yellow-500 font-bold uppercase tracking-wider border-b border-wood-950 pb-1.5">
                        Surveillance Timeline Reconstruction
                      </h4>
                      <p className="font-typewriter text-[11px] text-parchment-300/60 leading-relaxed mt-2">
                        Reconstruct the sequence of events. The security monitors were delayed by 14 minutes.
                        Map each event to its corrected real-world time to expose the discrepancy.
                      </p>
                    </div>

                    {progress?.completed_puzzles.includes('timeline_voss') || timelineSuccessMsg ? (
                      <div className="my-6 p-4 bg-green-950/30 border border-green-600/40 rounded text-center">
                        <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="font-typewriter text-xs text-green-400 leading-relaxed">
                          {timelineSuccessMsg || '✓ Timeline solved! Vance\'s alibi is broken. The delayed footage discrepancy has been exposed.'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col justify-center gap-3 my-4">
                        {definitions?.puzzles?.timeline_voss?.data?.events.map((event: any) => (
                          <div key={event.id} className="flex justify-between items-center bg-noir-950 p-2 border border-wood-900 rounded">
                            <span className="font-typewriter text-xs text-parchment-100">{event.display} (Shown: {event.shownTime})</span>
                            <select
                              value={timelineAnswers[event.id] || ''}
                              onChange={(e) => setTimelineAnswers(prev => ({ ...prev, [event.id]: e.target.value }))}
                              className="bg-wood-900 border border-wood-850 p-1 rounded font-typewriter text-xs text-yellow-500 focus:outline-none"
                            >
                              <option value="">-- Correct Real Time --</option>
                              <option value="10:00 PM">10:00 PM</option>
                              <option value="10:09 PM">10:09 PM</option>
                              <option value="10:12 PM">10:12 PM</option>
                              <option value="10:14 PM">10:14 PM</option>
                              <option value="10:20 PM">10:20 PM</option>
                            </select>
                          </div>
                        ))}
                        <button
                          onClick={handleVerifyTimeline}
                          className="mx-auto mt-4 px-6 py-2 bg-yellow-600 hover:bg-yellow-700 transition text-noir-950 font-bold font-typewriter uppercase text-xs rounded shadow"
                        >
                          Verify Timeline
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. AUDIO RESTORATION */}
                {activeAnalysisSub === 'audio' && (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-lg text-yellow-500 font-bold uppercase tracking-wider border-b border-wood-950 pb-1.5">
                        Audio Restoration Suite
                      </h4>
                      <p className="font-typewriter text-[11px] text-parchment-300/60 leading-relaxed mt-2">
                        Rearrange these audio fragments in the correct order to reconstruct Elena Voss's last dialogue tape.
                      </p>
                    </div>

                    {progress?.completed_puzzles.includes('audio_voss') || audioSuccessMsg ? (
                      <div className="my-6 p-4 bg-green-950/30 border border-green-600/40 rounded text-center">
                        <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="font-typewriter text-xs text-green-400 leading-relaxed">
                          {audioSuccessMsg || '✓ Audio tape decrypted successfully! Vance threat dialogue unlocked.'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col justify-center gap-2 my-4">
                        {audioFragments.map((frag, idx) => (
                          <div key={frag.id} className="flex justify-between items-center bg-noir-950 p-2 border border-wood-900 rounded gap-4">
                            <span className="font-typewriter text-[10px] text-parchment-200 flex-1 leading-relaxed">
                              "{frag.text}"
                            </span>
                            <div className="flex flex-col gap-1">
                              <button 
                                disabled={idx === 0} 
                                onClick={() => moveFragment(idx, 'up')}
                                className="p-0.5 hover:bg-wood-800 text-yellow-500 disabled:opacity-20 rounded"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                disabled={idx === audioFragments.length - 1} 
                                onClick={() => moveFragment(idx, 'down')}
                                className="p-0.5 hover:bg-wood-800 text-yellow-500 disabled:opacity-20 rounded"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={handleVerifyAudio}
                          className="mx-auto mt-4 px-6 py-2 bg-yellow-600 hover:bg-yellow-700 transition text-noir-950 font-bold font-typewriter uppercase text-xs rounded shadow"
                        >
                          Restore Audio
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. DECRYPTION TERMINAL Retro CRT Console */}
                {activeAnalysisSub === 'decrypt' && (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-lg text-yellow-500 font-bold uppercase tracking-wider border-b border-wood-950 pb-1.5">
                        Secure Drive Terminal
                      </h4>
                      <p className="font-typewriter text-[11px] text-parchment-300/60 leading-relaxed mt-2">
                        Voss's encrypted flash drive console. Enter security key to unlock Project Red String files.
                      </p>
                    </div>

                    <div className="flex-1 bg-black border-2 border-green-950 rounded-lg p-3 font-mono text-[10px] text-green-500 overflow-y-auto h-48 mt-3 shadow-inner relative flex flex-col justify-between">
                      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {terminalLogs.map((log, index) => (
                          <div key={index} className="whitespace-pre-wrap leading-relaxed border-b border-green-950/20 pb-0.5">{log}</div>
                        ))}
                      </div>

                      {!terminalSuccess && (
                        <form onSubmit={handleTerminalSubmit} className="flex gap-2 items-center border-t border-green-950 pt-2 shrink-0">
                          <span>drive_auth_pin&gt;</span>
                          <input
                            type="text"
                            maxLength={8}
                            value={terminalInput}
                            onChange={(e) => setTerminalInput(e.target.value)}
                            className="bg-transparent border-b border-green-500 focus:outline-none text-green-400 font-mono text-[10px] flex-1"
                            placeholder="Enter password..."
                            autoFocus
                          />
                          <button type="submit" className="bg-green-800 text-black px-2 py-0.5 rounded text-[9px] uppercase font-bold hover:bg-green-700">
                            Decrypt
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
export default Investigation;
