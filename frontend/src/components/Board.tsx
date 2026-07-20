import React, { useState, useRef, useEffect } from 'react';
import { useGame, Card, Connection } from '../context/GameContext';
import { X, ZoomIn, ZoomOut, Maximize2, Trash2, Edit3, Link2, PlusCircle } from 'lucide-react';
import useZoomPan from '../hooks/useZoomPan';

export const Board: React.FC<{ onClose: () => void; isEmbedded?: boolean }> = ({ onClose, isEmbedded = false }) => {
  const { boardState, updateBoardState, activeCaseId, triggerAudio, showAlert, showConfirm, showPrompt } = useGame();
  
  const {
    zoom,
    setZoom,
    pan,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoomPan,
  } = useZoomPan(boardState.zoom, boardState.pan);

  const [cards, setCards] = useState<Card[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement | null>(null);

  // Connection Builder State
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

  // Custom Theory Builder State
  const [showTheoryModal, setShowTheoryModal] = useState(false);
  const [newTheoryText, setNewTheoryText] = useState('');

  // Sync state with context
  useEffect(() => {
    setCards(boardState.cards);
    setConnections(boardState.connections);
  }, [boardState]);

  // Center coordinates helper
  const getCardCenter = (card: Card) => {
    // Card width = 200, height estimate = 100
    return {
      x: card.x + 100,
      y: card.y + 50
    };
  };

  // Card dragging
  const handleCardMouseDown = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Only left click
    
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // Calculate click offset relative to card top-left, scaled
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };

    setDraggedCardId(cardId);
    triggerAudio('paper');
  };

  const handleBoardMouseMove = (e: React.MouseEvent) => {
    if (draggedCardId) {
      // Update dragged card coordinates relative to board container
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      
      const mouseXOnBoard = (e.clientX - rect.left - pan.x) / zoom;
      const mouseYOnBoard = (e.clientY - rect.top - pan.y) / zoom;

      setCards(prevCards => 
        prevCards.map(c => 
          c.id === draggedCardId 
            ? { ...c, x: Math.max(0, mouseXOnBoard - dragOffset.current.x), y: Math.max(0, mouseYOnBoard - dragOffset.current.y) }
            : c
        )
      );
    } else {
      // Handle pan logic
      handleMouseMove(e);
    }
  };

  const handleBoardMouseUp = () => {
    if (draggedCardId && activeCaseId) {
      updateBoardState(activeCaseId, cards, connections, zoom, pan);
      setDraggedCardId(null);
    }
    handleMouseUp();
  };

  // Connection Creation
  const handleCardLinkClick = async (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    if (linkingSourceId) {
      if (linkingSourceId === cardId) {
        setLinkingSourceId(null);
        return;
      }
      
      // Double checking if connection exists
      const exists = connections.find(
        conn => (conn.sourceId === linkingSourceId && conn.targetId === cardId) ||
                (conn.sourceId === cardId && conn.targetId === linkingSourceId)
      );

      if (exists) {
        showAlert('A connection already exists between these nodes.');
        setLinkingSourceId(null);
        return;
      }

      // Add connection
      const note = (await showPrompt('Enter a notes/theory for this connection (optional):')) || '';
      const color = (await showPrompt('Choose connection color (red, blue, green):', 'red')) || 'red';

      const newConn: Connection = {
        id: `conn_${Date.now()}`,
        sourceId: linkingSourceId,
        targetId: cardId,
        note,
        color: ['red', 'blue', 'green'].includes(color) ? color : 'red'
      };

      const updatedConnections = [...connections, newConn];
      setConnections(updatedConnections);
      setLinkingSourceId(null);
      triggerAudio('string');

      if (activeCaseId) {
        updateBoardState(activeCaseId, cards, updatedConnections, zoom, pan);
      }
    } else {
      setLinkingSourceId(cardId);
    }
  };

  const handleConnectionClick = (conn: Connection) => {
    setSelectedConnection(conn);
    triggerAudio('string');
  };

  const deleteConnection = (connId: string) => {
    const updated = connections.filter(c => c.id !== connId);
    setConnections(updated);
    setSelectedConnection(null);
    triggerAudio('paper');
    if (activeCaseId) {
      updateBoardState(activeCaseId, cards, updated, zoom, pan);
    }
  };

  const editConnectionNote = async (connId: string) => {
    const conn = connections.find(c => c.id === connId);
    if (!conn) return;

    const newNote = await showPrompt('Edit connection notes:', conn.note);
    if (newNote === null) return;

    const updated = connections.map(c => 
      c.id === connId ? { ...c, note: newNote } : c
    );
    setConnections(updated);
    setSelectedConnection(updated.find(c => c.id === connId) || null);
    if (activeCaseId) {
      updateBoardState(activeCaseId, cards, updated, zoom, pan);
    }
  };

  // Custom Theory Spawner
  const handleAddTheory = () => {
    if (!newTheoryText.trim()) return;
    
    // Spawn theory card at center of board
    const centerPoint = {
      x: Math.max(50, -pan.x / zoom + 300),
      y: Math.max(50, -pan.y / zoom + 150)
    };

    const newCard: Card = {
      id: `theory_${Date.now()}`,
      type: 'theory',
      x: centerPoint.x,
      y: centerPoint.y,
      label: `Speculation: "${newTheoryText}"`
    };

    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
    setShowTheoryModal(false);
    setNewTheoryText('');
    triggerAudio('pin');

    if (activeCaseId) {
      updateBoardState(activeCaseId, updatedCards, connections, zoom, pan);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!cardId.startsWith('theory_')) {
      showAlert('Only custom theories/speculations can be deleted from the board. Core clues are immutable.');
      return;
    }
    const confirmDelete = await showConfirm('Delete this theory card and all associated links?');
    if (!confirmDelete) return;

    const updatedCards = cards.filter(c => c.id !== cardId);
    const updatedConnections = connections.filter(c => c.sourceId !== cardId && c.targetId !== cardId);

    setCards(updatedCards);
    setConnections(updatedConnections);
    triggerAudio('paper');

    if (activeCaseId) {
      updateBoardState(activeCaseId, updatedCards, updatedConnections, zoom, pan);
    }
  };

  return (
    <div className={isEmbedded ? "w-full h-full flex flex-col relative bg-wood-950/90" : "absolute inset-0 bg-wood-950/95 z-40 flex flex-col backdrop-blur-md"}>
      
      {/* Top Controller HUD */}
      <div className="w-full bg-noir-900 border-b border-wood-800 px-6 py-3 flex justify-between items-center z-55">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-lg text-yellow-500 font-bold uppercase tracking-wider">
            Case Board
          </h2>
          <span className="text-xs font-typewriter text-parchment-300/40">
            [Left-Click + Drag: Move Cards | Scroll: Zoom | Middle-Click / Space+Drag: Pan]
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowTheoryModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/40 text-xs font-typewriter"
          >
            <PlusCircle className="w-4 h-4" />
            Pin New Theory
          </button>
          
          <div className="h-6 w-px bg-wood-800 mx-2" />

          <button onClick={() => setZoom(prev => Math.min(2.0, prev + 0.1))} className="p-1.5 bg-wood-850 hover:bg-wood-800 rounded border border-wood-800 text-parchment-300">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(prev => Math.max(0.4, prev - 0.1))} className="p-1.5 bg-wood-850 hover:bg-wood-800 rounded border border-wood-800 text-parchment-300">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={resetZoomPan} className="p-1.5 bg-wood-850 hover:bg-wood-800 rounded border border-wood-800 text-parchment-300">
            <Maximize2 className="w-4 h-4" />
          </button>

          {!isEmbedded && (
            <>
              <div className="h-6 w-px bg-wood-800 mx-2" />
              <button onClick={onClose} className="p-1.5 bg-crimson hover:bg-red-700 rounded text-white transition">
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Board Container */}
      <div 
        ref={boardRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleBoardMouseMove}
        onMouseUp={handleBoardMouseUp}
        className="flex-1 w-full relative overflow-hidden corkboard-texture cursor-grab active:cursor-grabbing select-none"
      >
        {/* Zoomed/Paged Inner Canvas */}
        <div 
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0px 0px',
            width: '3000px',
            height: '2000px',
          }}
          className="absolute inset-0 pointer-events-none"
        >
          {/* SVG Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-auto z-10">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
              </marker>
            </defs>
            {connections.map((conn) => {
              const cardA = cards.find(c => c.id === conn.sourceId);
              const cardB = cards.find(c => c.id === conn.targetId);
              if (!cardA || !cardB) return null;

              const centerA = getCardCenter(cardA);
              const centerB = getCardCenter(cardB);

              const strokeColors: Record<string, string> = {
                red: '#ef4444',
                blue: '#3b82f6',
                green: '#10b981',
              };

              const stroke = strokeColors[conn.color] || '#ef4444';
              const isSelected = selectedConnection?.id === conn.id;

              return (
                <g key={conn.id}>
                  {/* Invisible broad click target to make selection easy */}
                  <line
                    x1={centerA.x}
                    y1={centerA.y}
                    x2={centerB.x}
                    y2={centerB.y}
                    stroke="transparent"
                    strokeWidth="15"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnectionClick(conn);
                    }}
                  />
                  {/* String */}
                  <line
                    x1={centerA.x}
                    y1={centerA.y}
                    x2={centerB.x}
                    y2={centerB.y}
                    stroke={stroke}
                    strokeWidth={isSelected ? "4" : "2"}
                    strokeDasharray={conn.color === 'blue' ? "4" : undefined}
                    className="cursor-pointer transition opacity-85 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnectionClick(conn);
                    }}
                  />
                  {/* Pin tack circles at endpoints */}
                  <circle cx={centerA.x} cy={centerA.y} r="4" fill="#111" stroke="#ccc" strokeWidth="1" />
                  <circle cx={centerB.x} cy={centerB.y} r="4" fill="#111" stroke="#ccc" strokeWidth="1" />
                </g>
              );
            })}
          </svg>

          {/* Absolute HTML Cards */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {cards.map((card) => {
              const isLinkingSource = linkingSourceId === card.id;
              const isTheory = card.id.startsWith('theory_');
              const isContradiction = card.id.startsWith('james_hallway_lie') || card.id.startsWith('victor_gate_lie') || card.id.startsWith('eleanor_will_lie') || card.id.startsWith('daniel_will_motive');

              return (
                <div
                  key={card.id}
                  style={{
                    left: `${card.x}px`,
                    top: `${card.y}px`,
                    width: '200px',
                  }}
                  onMouseDown={(e) => handleCardMouseDown(e, card.id)}
                  className={`absolute p-3 rounded shadow-paper cursor-move border select-none pointer-events-auto flex flex-col justify-between group ${
                    isLinkingSource 
                      ? 'border-yellow-400 bg-yellow-950/90 text-yellow-100 ring-2 ring-yellow-500' 
                      : isContradiction
                      ? 'border-red-500/80 bg-red-950/90 text-red-100 shadow-red-glow font-typewriter'
                      : isTheory 
                      ? 'border-blue-500/50 bg-noir-800 text-parchment-200 border-dashed'
                      : card.id === 'arthur_blackwood'
                      ? 'border-wood-500 bg-wood-950 text-parchment-200'
                      : 'border-wood-700 bg-parchment-100 text-noir-900'
                  }`}
                >
                  {/* Metal Pin Tack */}
                  <div className="absolute -top-2 left-[45%] w-3 h-3 rounded-full bg-red-700 border border-red-800 shadow shadow-black flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full opacity-60" />
                  </div>

                  {/* Header/Type */}
                  <div className="text-[8px] font-typewriter uppercase tracking-widest text-right opacity-60 border-b border-black/10 pb-1 mb-1.5">
                    {card.type}
                  </div>

                  {/* Label */}
                  <div className={`text-xs font-medium leading-tight ${isContradiction ? 'text-center font-bold text-red-400 py-1' : ''}`}>
                    {card.label}
                  </div>

                  {/* Action overlays visible on hover */}
                  <div className="mt-2.5 pt-1.5 border-t border-black/5 flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition duration-200">
                    <button
                      onClick={(e) => handleCardLinkClick(e, card.id)}
                      title="Link to another card"
                      className="p-1 rounded bg-black/10 hover:bg-black/25 text-[10px] flex items-center gap-1 font-typewriter"
                    >
                      <Link2 className="w-2.5 h-2.5" />
                      Link
                    </button>
                    {isTheory && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCard(card.id);
                        }}
                        title="Delete Theory"
                        className="p-1 rounded bg-crimson/10 hover:bg-crimson text-crimson hover:text-white transition"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Selected Connection Inspector Drawer */}
      {selectedConnection && (
        <div className="absolute bottom-6 left-6 w-[350px] bg-noir-900 border border-wood-850 p-4 rounded-lg shadow-2xl z-55 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-wood-800 pb-2">
            <span className="font-serif text-sm text-yellow-500 font-bold uppercase tracking-wider">
              Thread Notes
            </span>
            <button 
              onClick={() => setSelectedConnection(null)}
              className="text-parchment-300 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs font-typewriter leading-relaxed text-parchment-200 bg-noir-950 p-2.5 rounded border border-wood-800/40">
            {selectedConnection.note || <span className="italic text-parchment-300/40">No speculation written.</span>}
          </div>

          <div className="flex gap-2 justify-end text-xs">
            <button 
              onClick={() => editConnectionNote(selectedConnection.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-wood-800 hover:bg-wood-700 text-parchment-100 rounded"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Write Note
            </button>
            <button 
              onClick={() => deleteConnection(selectedConnection.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-crimson hover:bg-red-700 text-white rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Cut Thread
            </button>
          </div>
        </div>
      )}

      {/* Pin New Theory Modal */}
      {showTheoryModal && (
        <div className="absolute inset-0 bg-black/75 z-60 flex items-center justify-center p-6">
          <div className="w-[450px] bg-noir-900 border border-wood-800 p-6 rounded shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-wood-800 pb-2">
              <h3 className="font-serif text-base text-yellow-500 uppercase tracking-wider">
                Create Speculation Card
              </h3>
              <button onClick={() => setShowTheoryModal(false)} className="text-parchment-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={newTheoryText}
              onChange={(e) => setNewTheoryText(e.target.value)}
              placeholder="Record a hypothesis... e.g. 'Victor poisoned the wine before 10 PM?'"
              rows={3}
              maxLength={80}
              className="w-full bg-noir-950 border border-wood-800 rounded p-2.5 font-typewriter text-xs text-parchment-100 focus:outline-none focus:border-yellow-600 resize-none"
            />

            <div className="flex justify-end gap-2 text-xs">
              <button 
                onClick={() => setShowTheoryModal(false)}
                className="px-3 py-1.5 bg-wood-800 hover:bg-wood-700 text-parchment-100 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddTheory}
                className="px-3 py-1.5 bg-yellow-500 text-noir-950 font-bold rounded hover:bg-yellow-400 transition"
              >
                Pin Card
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default Board;
