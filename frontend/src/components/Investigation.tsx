import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { X, Map, MessageSquare, Key, ShieldAlert, CheckCircle2, Stamp } from 'lucide-react';

export const Investigation: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { progress, definitions, investigateNode, talkToSuspect, crossExamine, activeCaseId, triggerAudio } = useGame();
  
  // Navigation tabs: 'rooms' | 'interview' | 'cross'
  const [activeTab, setActiveTab] = useState<'rooms' | 'interview' | 'cross'>('rooms');
  
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
  
  // Cross Examination states
  const [selectedStatementId, setSelectedStatementId] = useState<string>('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>('');
  const [crossResultMsg, setCrossResultMsg] = useState<string>('');
  const [stampActive, setStampActive] = useState(false);

  const getUnresolvedStatementLabel = (statementId: string) => {
    // statementId looks like "james_holloway_statement_james_alibi_tea"
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
        setActiveSearchOutput('🔒 Locked: Security computer requires password.');
      } else {
        setActiveSearchOutput(`Error: ${res.error}`);
      }
    } else if (res) {
      const rewardText = res.unlockedMsg ? `\n\n💡 ${res.unlockedMsg}` : '';
      setActiveSearchOutput(`Searched item. Spent ${res.timeElapsed} minutes.${rewardText}`);
      if (res.isRedHerring) {
        setInspectedRedHerrings((prev) => [...prev, nodeId]);
      }
    }
  };

  const handleSuspectClick = async (suspectId: string) => {
    if (!activeCaseId) return;
    setSelectedSuspectId(suspectId);
    
    // Check if suspect is angry/cold based on memory
    const memory = progress?.npc_memories?.[suspectId];
    const initialNode = memory?.accused ? 'james_hallway_confront' : 'root';
    
    const data = await talkToSuspect(activeCaseId, suspectId, initialNode);
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

  return (
    <div className="absolute inset-0 bg-black/85 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="w-[1000px] h-[550px] bg-wood-900 border-4 border-wood-950 rounded-lg flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Top Navbar */}
        <div className="w-full bg-noir-900 border-b border-wood-950 px-6 py-3 flex justify-between items-center z-10 shrink-0">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-typewriter uppercase tracking-wider ${
                activeTab === 'rooms' ? 'bg-wood-800 text-yellow-500 border border-yellow-600/40' : 'text-parchment-300 hover:text-white'
              }`}
            >
              <Map className="w-4 h-4" />
              Crime Scenes
            </button>
            <button 
              onClick={() => setActiveTab('interview')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-typewriter uppercase tracking-wider ${
                activeTab === 'interview' ? 'bg-wood-800 text-yellow-500 border border-yellow-600/40' : 'text-parchment-300 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Interview Suspects
            </button>
            <button 
              onClick={() => setActiveTab('cross')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-typewriter uppercase tracking-wider ${
                activeTab === 'cross' ? 'bg-wood-800 text-yellow-500 border border-yellow-600/40' : 'text-parchment-300 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Cross Examination
            </button>
          </div>

          <button 
            onClick={onClose}
            className="text-parchment-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Panel Content */}
        <div className="flex-1 w-full flex overflow-hidden">
          
          {/* TAB 1: ROOMS POINT AND CLICK */}
          {activeTab === 'rooms' && (
            <div className="flex-1 flex overflow-hidden m-2 bg-parchment-100 paper-texture text-noir-900 rounded-b">
              
              {/* Left Column: Scene Nodes list */}
              <div className="w-1/3 border-r border-noir-900/10 p-5 overflow-y-auto">
                <h3 className="font-serif text-base font-bold uppercase tracking-wider text-noir-950 border-b border-noir-900/10 pb-2 mb-3">
                  Locations map
                </h3>
                <div className="flex flex-col gap-2">
                  {progress?.unlocked_scenes.map((roomId: string) => {
                    const roomDef = definitions?.exploration[roomId];
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

              {/* Right Column: Visual Scene Inspector */}
              <div className="flex-1 p-6 flex flex-col justify-between overflow-hidden">
                {selectedRoomId ? (
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <div className="flex justify-between items-start border-b border-noir-900/10 pb-2">
                        <div>
                          <h4 className="font-serif text-xl font-bold text-noir-950">
                            {definitions?.exploration[selectedRoomId].name}
                          </h4>
                          <p className="font-typewriter text-[10px] text-noir-900/60 italic mt-0.5">
                            {definitions?.exploration[selectedRoomId].description}
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

                      {/* Viewport Viewport (16:9 Point-and-Click Visual Scene) */}
                      <div className="relative flex-1 bg-noir-950 border border-wood-950 rounded-lg overflow-hidden mt-4 shadow-inner group">
                        
                        {/* Room background scene image */}
                        <img 
                          src={definitions?.exploration[selectedRoomId].bg_image || '/assets/scenes/study.jpg'} 
                          alt={definitions?.exploration[selectedRoomId].name}
                          className="w-full h-full object-cover opacity-90 transition duration-300 group-hover:opacity-100 select-none pointer-events-none"
                        />

                        {/* Hotspot triggers overlay */}
                        {!closeupOpen && Object.keys(definitions?.exploration[selectedRoomId].nodes || {}).map((nodeId) => {
                          const node = definitions?.exploration[selectedRoomId].nodes[nodeId];
                          const hotspot = node.hotspot;
                          if (!hotspot) return null;

                          // Check discovery state
                          const alreadyDiscovered = (node.evidence_reward && progress?.discovered_evidence.includes(node.evidence_reward)) ||
                                                    (node.inventory_reward && progress?.inventory.includes(node.inventory_reward));
                          
                          // Check sub-nodes discovery
                          let allSubDiscovered = false;
                          if (node.nodes) {
                            const subKeys = Object.keys(node.nodes);
                            allSubDiscovered = subKeys.length > 0 && subKeys.every(subId => {
                              const sub = node.nodes[subId];
                              return progress?.discovered_evidence.includes(sub.evidence_reward) ||
                                     progress?.inventory.includes(sub.inventory_reward);
                            });
                          }

                          const isRedHerringInspected = node.is_red_herring && inspectedRedHerrings.includes(nodeId);

                          const isDiscovered = alreadyDiscovered || allSubDiscovered || isRedHerringInspected;

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
                                left: `${hotspot.x}%`,
                                top: `${hotspot.y}%`,
                                width: `${hotspot.w}%`,
                                height: `${hotspot.h}%`
                              }}
                              className="absolute transition border-2 border-transparent hover:border-dashed hover:border-yellow-600 hover:bg-yellow-600/10 cursor-zoom-in group/hotspot"
                            >
                              {/* Hover Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-noir-950/90 text-parchment-100 text-[9px] rounded border border-wood-900/50 opacity-0 group-hover/hotspot:opacity-100 transition duration-150 whitespace-nowrap pointer-events-none font-typewriter z-30 shadow">
                                {node.name} {node.is_red_herring ? '(Detail)' : ''}
                              </div>

                              {/* Status Indicators */}
                              <div className="absolute top-1 right-1 flex gap-1 bg-noir-950/40 p-0.5 rounded backdrop-blur-[1px]">
                                {isDiscovered && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-noir-950" />}
                                {!isDiscovered && isParentLocked && <Key className="w-3 h-3 text-amber-500" />}
                              </div>
                            </button>
                          );
                        })}

                        {/* Closeup folder inspect card overlay */}
                        {closeupOpen && activeHotspotNode && (
                          <div className="absolute inset-x-0 bottom-0 top-1/4 bg-parchment-100 border-t-2 border-wood-950 p-4 flex flex-col justify-between z-20 shadow-2xl overflow-y-auto">
                            <div className="flex-1 flex gap-4 overflow-hidden">
                              
                              {/* Left side: descriptions */}
                              <div className="flex-1 pr-2 border-r border-noir-900/10 overflow-y-auto">
                                <div className="font-serif text-sm font-bold text-noir-950 flex items-center justify-between">
                                  <span>{activeHotspotNode.name}</span>
                                  {activeHotspotNode.is_red_herring && (
                                    <span className="text-[9px] bg-noir-900/10 text-noir-900/60 font-typewriter uppercase px-1.5 py-0.5 rounded">
                                      Room Feature
                                    </span>
                                  )}
                                </div>
                                <p className="font-typewriter text-xs text-noir-900/80 mt-2 leading-relaxed whitespace-pre-line">
                                  {activeHotspotNode.description}
                                </p>

                                {/* Active output dialogue */}
                                {activeSearchOutput && (
                                  <div className="mt-3 bg-yellow-500/10 border border-yellow-600/20 p-2.5 rounded font-typewriter text-xs text-yellow-950 animate-fade-in leading-relaxed whitespace-pre-line">
                                    {activeSearchOutput}
                                  </div>
                                )}
                              </div>

                              {/* Right side: Action list */}
                              <div className="w-[300px] flex flex-col justify-start gap-2 overflow-y-auto">
                                <div className="text-[10px] font-bold text-noir-900/50 uppercase font-typewriter tracking-wider mb-1">
                                  Examination Log
                                </div>

                                {/* Red Herring Action */}
                                {activeHotspotNode.is_red_herring && (
                                  <div className="flex flex-col gap-2">
                                    <p className="text-[11px] font-typewriter text-noir-900/60 italic">
                                      "This detail doesn't seem to be a crucial clue, but examining it might give context."
                                    </p>
                                    <button
                                      disabled={inspectedRedHerrings.includes(activeHotspotId || '')}
                                      onClick={() => handleNodeClick(selectedRoomId, activeHotspotId || '')}
                                      className="w-full text-center bg-noir-900 text-parchment-100 hover:bg-noir-950 disabled:bg-noir-900/40 disabled:text-parchment-100/50 p-2 rounded text-xs font-typewriter uppercase tracking-wider shadow"
                                    >
                                      {inspectedRedHerrings.includes(activeHotspotId || '')
                                        ? '✓ Inspected'
                                        : `Examine Detail (+2 Mins)`}
                                    </button>
                                  </div>
                                )}

                                {/* Single Clue Action (no nodes & not red herring) */}
                                {!activeHotspotNode.nodes && !activeHotspotNode.is_red_herring && (
                                  <div className="flex flex-col gap-2">
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
                                            className="w-full text-center bg-noir-900 text-parchment-100 hover:bg-noir-950 disabled:bg-noir-900/40 disabled:text-parchment-100/50 p-2 rounded text-xs font-typewriter uppercase tracking-wider shadow"
                                          >
                                            {isDiscovered
                                              ? '✓ Searched'
                                              : isLocked
                                              ? '🔒 Locked'
                                              : `Search Container (+${activeHotspotNode.cost_minutes || 10} Mins)`}
                                          </button>
                                          {isLocked && (
                                            <p className="text-[10px] font-typewriter text-red-700/80 italic text-center">
                                              Requires: {activeHotspotNode.requires_key?.replace('_', ' ').toUpperCase() || 'Password'}
                                            </p>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}

                                {/* Container with child nodes (Nested) */}
                                {activeHotspotNode.nodes && (
                                  <div className="flex flex-col gap-2">
                                    {Object.keys(activeHotspotNode.nodes).map((subNodeId) => {
                                      const subNode = activeHotspotNode.nodes[subNodeId];
                                      const subDiscovered = progress?.discovered_evidence.includes(subNode.evidence_reward) || 
                                                            progress?.inventory.includes(subNode.inventory_reward);
                                      const isParentLocked = activeHotspotNode.locked && !(
                                        (activeHotspotNode.requires_key && progress?.inventory.includes(activeHotspotNode.requires_key)) ||
                                        (activeHotspotNode.requires_password && progress?.inventory.includes(activeHotspotNode.requires_password))
                                      );

                                      return (
                                        <div key={subNodeId} className="flex flex-col gap-1">
                                          <button
                                            disabled={isParentLocked || subDiscovered}
                                            onClick={() => handleNodeClick(selectedRoomId, subNodeId)}
                                            className={`w-full text-left p-2 rounded border text-xs font-typewriter flex justify-between items-center transition ${
                                              isParentLocked
                                                ? 'bg-noir-900/5 border-noir-900/5 text-noir-900/30 cursor-not-allowed opacity-50'
                                                : subDiscovered
                                                ? 'bg-green-600/10 border-green-600/20 text-green-700 font-bold'
                                                : 'bg-noir-900/5 hover:bg-noir-900/10 border-noir-900/10 text-noir-900 hover:text-yellow-600'
                                            }`}
                                          >
                                            <span className="truncate">Inspect {subNode.name}</span>
                                            {subDiscovered ? (
                                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                            ) : (
                                              isParentLocked ? (
                                                <Key className="w-3 h-3 text-amber-700 shrink-0" />
                                              ) : (
                                                subNode.locked && <Key className="w-3 h-3 text-amber-700 shrink-0" />
                                              )
                                            )}
                                          </button>
                                          {isParentLocked && (
                                            <div className="text-[8px] font-typewriter text-red-700/60 italic px-1">
                                              Container is locked. Requires key or password.
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
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
                      Select a crime scene from the map to begin your investigation.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: INTERVIEW SUSPECTS */}
          {activeTab === 'interview' && (
            <div className="flex-1 flex overflow-hidden m-2 bg-wood-950/20 text-parchment-100 rounded-b">
              
              {/* Left Column: Suspect Profiles */}
              <div className="w-1/3 border-r border-wood-950 p-5 overflow-y-auto">
                <h3 className="font-serif text-base text-yellow-500 tracking-wider font-bold uppercase border-b border-wood-950 pb-2 mb-3">
                  People Directory
                </h3>
                <div className="flex flex-col gap-2">
                  {progress?.unlocked_people.map((person: any) => {
                    const suspectDef = definitions?.suspects[person.id];
                    if (!suspectDef || suspectDef.is_victim) return null;
                    const isSuspect = person.isSuspect;
                    const hasMeter = progress?.revealed_suspicion_meters.includes(person.id);
                    const suspicionScore = progress?.suspicion_scores[person.id] || 0;

                    return (
                      <button
                        key={person.id}
                        onClick={() => handleSuspectClick(person.id)}
                        className={`w-full text-left p-3 rounded transition border flex flex-col gap-1.5 ${
                          selectedSuspectId === person.id
                            ? 'bg-wood-800 border-yellow-600'
                            : 'bg-wood-950/40 border-wood-900 hover:bg-wood-800/40'
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

                        {/* Suspicion Meter (hidden initially) */}
                        {hasMeter ? (
                          <div className="w-full flex items-center gap-2">
                            <span className="text-[8px] font-typewriter text-parchment-300/50 uppercase">Suspicion:</span>
                            <div className="flex-1 h-1.5 bg-black/60 rounded overflow-hidden">
                              <div 
                                style={{ width: `${suspicionScore}%` }}
                                className="h-full bg-red-600 shadow shadow-red-500 animate-pulse" 
                              />
                            </div>
                            <span className="text-[8px] font-typewriter text-red-500 font-bold">{suspicionScore}%</span>
                          </div>
                        ) : (
                          <span className="text-[8px] font-typewriter text-parchment-300/30 italic">Suspicion meter: LOCKED</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Dialogue Interface */}
              <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto bg-noir-900/60 relative">
                {selectedSuspectId ? (
                  <div className="flex-1 flex flex-col justify-between min-h-[300px]">
                    
                    {/* Suspect Info */}
                    <div className="border-b border-wood-950 pb-3 mb-4">
                      <h4 className="font-serif text-xl font-bold text-yellow-500">
                        {definitions?.suspects[selectedSuspectId].name}
                      </h4>
                      <span className="text-[10px] font-typewriter text-parchment-300/50 uppercase tracking-widest">
                        {definitions?.suspects[selectedSuspectId].role}
                      </span>
                    </div>

                    {/* Chat Bubble */}
                    <div className="flex-1 bg-noir-950 border border-wood-900 p-4 rounded font-typewriter text-sm text-parchment-200 leading-relaxed mb-6 h-40 overflow-y-auto relative">
                      <div className="absolute top-2 right-2 text-[8px] text-wood-500 font-bold uppercase tracking-wider">Statement Logged</div>
                      <p className="indent-4">
                        "{activeDialogueNode?.text}"
                      </p>
                    </div>

                    {/* Dialogue Choices */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-typewriter text-parchment-300/40 uppercase tracking-widest">Select Question:</span>
                      
                      {activeDialogueNode?.choices && activeDialogueNode.choices.map((choice: any, index: number) => {
                        // Check choice conditions (e.g. has evidence card)
                        let isVisible = true;
                        if (choice.conditions) {
                          if (choice.conditions.discovered_evidence) {
                            choice.conditions.discovered_evidence.forEach((cId: string) => {
                              if (!progress?.discovered_evidence.includes(cId)) isVisible = false;
                            });
                          }
                          if (choice.conditions.inventory) {
                            choice.conditions.inventory.forEach((iId: string) => {
                              if (!progress?.inventory.includes(iId)) isVisible = false;
                            });
                          }
                        }

                        if (!isVisible) return null;

                        return (
                          <button
                            key={index}
                            onClick={() => handleDialogueChoiceClick(choice)}
                            className="w-full text-left bg-wood-900/40 hover:bg-wood-800/40 border border-wood-850 p-2.5 rounded text-xs font-typewriter text-parchment-200 hover:text-yellow-500 transition"
                          >
                            &raquo; {choice.text}
                          </button>
                        );
                      })}

                      {/* Reset choice to root dialog */}
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
                    <span>Choose a suspect folder from directory to begin cross interrogation</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: CROSS EXAMINATION CONTRADICTION STAMP */}
          {activeTab === 'cross' && (
            <div className="flex-1 flex flex-col justify-between m-2 p-6 bg-noir-900/60 rounded text-parchment-200 overflow-y-auto">
              
              <div className="flex flex-col gap-2">
                <h3 className="font-serif text-lg text-yellow-500 font-bold uppercase tracking-wider border-b border-wood-950 pb-2">
                  Cross Interrogation Desk
                </h3>
                <p className="font-typewriter text-xs text-parchment-300/60 leading-relaxed">
                  Confront lies by matching suspect statements with physical evidence.
                  If a contradiction exists, the statement will be stamped and exposed.
                </p>
              </div>

              {/* Selection Desk Slots */}
              <div className="grid grid-cols-2 gap-6 my-6 relative">
                
                {/* Stamp Animation Overlay */}
                {stampActive && (
                  <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center rounded">
                    <div className="font-serif text-5xl font-extrabold text-red-600 border-8 border-red-600 p-6 rounded-lg uppercase tracking-widest rotate-12 scale-150 animate-ping flex items-center gap-2">
                      <Stamp className="w-12 h-12" />
                      EXPOSED
                    </div>
                  </div>
                )}

                {/* Statement Selector */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-typewriter text-parchment-300/40 uppercase tracking-widest">Select Suspect Statement:</span>
                  <select
                    value={selectedStatementId}
                    onChange={(e) => setSelectedStatementId(e.target.value)}
                    className="w-full bg-noir-950 border border-wood-800 p-2.5 rounded text-xs font-typewriter text-parchment-100 focus:outline-none focus:border-yellow-600"
                  >
                    <option value="">-- Choose statement --</option>
                    {progress?.unlocked_dialogues.map((statementId: string) => (
                      <option key={statementId} value={statementId}>
                        {getUnresolvedStatementLabel(statementId)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Evidence Selector */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-typewriter text-parchment-300/40 uppercase tracking-widest">Select Clue/Evidence:</span>
                  <select
                    value={selectedEvidenceId}
                    onChange={(e) => setSelectedEvidenceId(e.target.value)}
                    className="w-full bg-noir-950 border border-wood-800 p-2.5 rounded text-xs font-typewriter text-parchment-100 focus:outline-none focus:border-yellow-600"
                  >
                    <option value="">-- Choose clue --</option>
                    {progress?.discovered_evidence.map((clueId: string) => {
                      const clue = definitions?.evidence[clueId];
                      return (
                        <option key={clueId} value={clueId}>
                          {clue?.title} ({clue?.location})
                        </option>
                      );
                    })}
                  </select>
                </div>

              </div>

              {/* Output / Stamp Button */}
              <div className="flex flex-col items-center gap-4">
                <button
                  disabled={!selectedStatementId || !selectedEvidenceId}
                  onClick={executeCrossExamine}
                  className="flex items-center gap-2 px-8 py-3 bg-crimson hover:bg-red-700 disabled:opacity-30 transition text-parchment-50 rounded shadow font-typewriter uppercase tracking-wider text-sm font-bold"
                >
                  <Stamp className="w-4 h-4" />
                  Compare Clues
                </button>

                {crossResultMsg && (
                  <div className={`mt-2 font-typewriter text-xs p-3 rounded border text-center w-full max-w-lg ${
                    crossResultMsg.includes('EXPOSED')
                      ? 'bg-red-500/10 border-red-600/30 text-red-400 font-bold'
                      : 'bg-wood-950/40 border-wood-900 text-parchment-300'
                  }`}>
                    {crossResultMsg}
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
