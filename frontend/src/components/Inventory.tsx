import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { X, Info, Compass, Calendar, AlertTriangle } from 'lucide-react';

export const Inventory: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { progress, definitions } = useGame();
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string>('All');

  const tags = ['All', 'Physical', 'Financial', 'Digital', 'Forensic', 'Timeline', 'Personal'];

  // Combine actual evidence clues and general inventory tools (like key)
  const collectedEvidenceList = progress?.discovered_evidence.map((id: string) => {
    const clue = definitions?.evidence[id];
    return {
      id,
      title: clue?.title || id,
      type: 'clue',
      tags: clue?.tags || [],
      location: clue?.location || 'Unknown',
      reliability: clue?.reliability || 'Unknown',
      description: clue?.description || '',
      importance: clue?.importance || 'medium',
      unlocked_by: clue?.unlocked_by || 'Unknown',
      possible_uses: clue?.possible_uses || 'Unknown',
    };
  }) || [];

  const inventoryItemsList = progress?.inventory.map((id: string) => {
    // Basic item parsing
    const label = id.replace('_', ' ').toUpperCase();
    return {
      id,
      title: label,
      type: 'tool',
      tags: ['Physical'],
      location: 'Found during search',
      reliability: 'Very Reliable',
      description: `A key tool in your possession. Fits lock patterns matching ${label}.`,
      importance: 'high',
      unlocked_by: 'Searching containers',
      possible_uses: 'Unlocking drawers or accessing locked data nodes.',
    };
  }) || [];

  const allItems = [...collectedEvidenceList, ...inventoryItemsList];

  const filteredItems = allItems.filter(item => {
    if (filterTag === 'All') return true;
    return item.tags.includes(filterTag);
  });

  const getReliabilityColor = (rel: string) => {
    if (rel === 'Very Reliable') return 'text-green-600 bg-green-50';
    if (rel === 'Reliable') return 'text-blue-600 bg-blue-50';
    if (rel === 'Questionable') return 'text-amber-600 bg-amber-50';
    return 'text-noir-500 bg-noir-50';
  };

  return (
    <div className="absolute inset-0 bg-black/85 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="w-[900px] h-[520px] bg-wood-900 border-4 border-wood-950 rounded-lg flex shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-parchment-300 hover:text-white transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Grid & Category Filters */}
        <div className="w-1/2 border-r border-wood-950 p-6 flex flex-col gap-4 overflow-hidden">
          <h2 className="font-serif text-lg text-yellow-500 tracking-wider font-bold uppercase border-b border-wood-950 pb-2">
            Drawer Inventory
          </h2>

          {/* Tag filters */}
          <div className="flex flex-wrap gap-1.5 border-b border-wood-950 pb-3">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setFilterTag(tag);
                  setSelectedItemId(null);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-typewriter uppercase border ${
                  filterTag === tag
                    ? 'bg-yellow-500 text-noir-950 border-yellow-500 font-bold'
                    : 'bg-noir-950 text-parchment-300/60 border-wood-850 hover:text-white'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3 pr-1">
            {filteredItems.length === 0 ? (
              <div className="col-span-3 text-center text-xs font-typewriter text-parchment-300/20 italic p-6">
                No items matching category collected yet.
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-3 border rounded cursor-pointer transition flex flex-col justify-between items-center text-center select-none shadow-sm relative group h-24 ${
                    selectedItemId === item.id
                      ? 'bg-wood-800 border-yellow-600'
                      : 'bg-wood-950/40 border-wood-900 hover:bg-wood-800/40'
                  }`}
                >
                  <span className="text-[8px] font-typewriter uppercase tracking-widest text-parchment-300/35 border-b border-wood-850/40 pb-0.5 mb-1.5 w-full block">
                    {item.type}
                  </span>
                  <div className="font-serif text-xs font-bold leading-tight flex-1 flex items-center justify-center text-parchment-200">
                    {item.title}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Skeuomorphic Dossier Card */}
        <div className="flex-1 p-8 flex flex-col justify-between bg-parchment-100 paper-texture text-noir-900 rounded-r m-1 overflow-y-auto">
          {selectedItemId ? (() => {
            const item = allItems.find(i => i.id === selectedItemId);
            if (!item) return null;
            return (
              <div className="flex-1 flex flex-col justify-between min-h-[350px]">
                
                {/* Dossier Header */}
                <div className="flex flex-col border-b border-noir-900/10 pb-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-serif text-lg font-bold uppercase tracking-wider text-noir-950">
                      {item.title}
                    </h3>
                    <span className="text-[9px] font-typewriter bg-noir-900 text-white px-2 py-0.5 rounded shadow">
                      {item.type}
                    </span>
                  </div>
                  <div className="flex gap-2.5 mt-2 flex-wrap">
                    {item.tags.map((t: string) => (
                      <span key={t} className="text-[9px] font-typewriter bg-noir-900/5 border border-noir-900/10 px-1.5 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Dossier Details Grid */}
                <div className="flex-1 my-5 flex flex-col gap-3 font-typewriter text-xs text-noir-800">
                  <p className="indent-4 italic bg-white/40 p-3 rounded border border-noir-900/5 leading-relaxed text-noir-950">
                    "{item.description}"
                  </p>

                  <div className="grid grid-cols-2 gap-3 pl-1">
                    <div className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-noir-900/40" />
                      <span><strong>Found:</strong> {item.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-noir-900/40" />
                      <span>
                        <strong>Reliability:</strong> 
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${getReliabilityColor(item.reliability)}`}>
                          {item.reliability}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Calendar className="w-3.5 h-3.5 text-noir-900/40" />
                      <span><strong>Unlocked via:</strong> {item.unlocked_by}</span>
                    </div>
                  </div>

                  <div className="mt-2 border-t border-dashed border-noir-900/10 pt-2.5 flex flex-col gap-1.5 text-[11px] text-noir-900/70">
                    <div><strong>Importance:</strong> {item.importance.toUpperCase()}</div>
                    <div><strong>Deductive Uses:</strong> {item.possible_uses}</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-noir-900/10 text-[9px] font-typewriter text-noir-900/40">
                  Red String Dossier reference index: {item.id}
                </div>

              </div>
            );
          })() : (
            <div className="flex-1 flex flex-col items-center justify-center font-typewriter text-sm text-noir-900/30 gap-2">
              <Info className="w-10 h-10 text-noir-900/15" />
              <span>Select an item card from the drawers to read investigation dossier logs</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
export default Inventory;
