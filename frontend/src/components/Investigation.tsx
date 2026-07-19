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

              {/* Right Column: Scene Inspector */}
              <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto">
                {selectedRoomId ? (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-2xl font-bold border-b border-noir-900/10 pb-2 text-noir-950">
                        {definitions?.exploration[selectedRoomId].name}
                      </h4>
                      <p className="font-typewriter text-xs text-noir-900/60 mt-2 italic">
                        {definitions?.exploration[selectedRoomId].description}
                      </p>

                      {/* Clickable Containers / Items */}
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        {Object.keys(definitions?.exploration[selectedRoomId].nodes || {}).map((nodeId) => {
                          const node = definitions?.exploration[selectedRoomId].nodes[nodeId];
                          const alreadyDiscovered = progress?.discovered_evidence.includes(node.evidence_reward) || 
                                                    progress?.inventory.includes(node.inventory_reward);
                          return (
                            <div 
                              key={nodeId}
                              className="border border-noir-900/10 p-4 rounded bg-white/40 flex flex-col justify-between hover:bg-white/60 transition shadow-sm"
                            >
                              <div className="min-w-0">
                                <div className="font-serif text-sm font-bold text-noir-900 flex justify-between">
                                  <span>{node.name}</span>
                                  {alreadyDiscovered && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                                </div>
                                <p className="font-typewriter text-[11px] text-noir-900/70 mt-1">
                                  {node.description}
                                </p>
                              </div>

                              {/* Nested items (e.g. study drawer inside desk) */}
                              {node.nodes && (
                                <div className="mt-3 pl-3 border-l-2 border-noir-900/15 flex flex-col gap-2">
                                  {Object.keys(node.nodes).map((subNodeId) => {
                                    const subNode = node.nodes[subNodeId];
                                    const subDiscovered = progress?.discovered_evidence.includes(subNode.evidence_reward) || 
                                                          progress?.inventory.includes(subNode.inventory_reward);
                                    const isParentLocked = node.locked && !(
                                      (node.requires_key && progress?.inventory.includes(node.requires_key)) ||
                                      (node.requires_password && progress?.inventory.includes(node.requires_password))
                                    );

                                    return (
                                      <button
                                        key={subNodeId}
                                        disabled={isParentLocked}
                                        onClick={() => handleNodeClick(selectedRoomId, subNodeId)}
                                        className={`w-full text-left p-2 rounded border text-xs font-typewriter flex justify-between items-center transition ${
                                          isParentLocked
                                            ? 'bg-noir-900/5 border-noir-900/5 text-noir-900/30 cursor-not-allowed opacity-50'
                                            : 'bg-noir-900/5 hover:bg-noir-900/10 border-noir-900/10 text-noir-900 hover:text-yellow-600'
                                        }`}
                                      >
                                        <span>Inspect {subNode.name}</span>
                                        {subDiscovered ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                        ) : (
                                          isParentLocked ? (
                                            <Key className="w-3 h-3 text-amber-700" />
                                          ) : (
                                            subNode.locked && <Key className="w-3 h-3 text-amber-700" />
                                          )
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {!node.nodes && (
                                <button
                                  onClick={() => handleNodeClick(selectedRoomId, nodeId)}
                                  className="mt-3 text-left w-max bg-noir-900 text-parchment-100 hover:bg-noir-950 p-1.5 px-3 rounded text-[10px] font-typewriter uppercase tracking-wider shadow"
                                >
                                  Search {node.name}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Investigation feedback */}
                    {activeSearchOutput && (
                      <div className="mt-6 bg-yellow-500/10 border border-yellow-600/30 p-3 rounded font-typewriter text-xs text-yellow-900">
                        {activeSearchOutput}
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center font-typewriter text-sm text-noir-900/30 gap-2">
                    <Map className="w-10 h-10 text-noir-900/15" />
                    <span>Select a room location map from the drawer folder</span>
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
