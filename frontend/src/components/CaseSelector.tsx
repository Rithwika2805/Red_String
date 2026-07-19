import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { X, FolderOpen, Play, CheckCircle } from 'lucide-react';

interface CaseItem {
  id: string;
  title: string;
  genre: string;
  description: string;
  startingTime: string;
  difficulty: string;
}

export const CaseSelector: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { token } = useAuth();
  const { startCase, activeCaseId, fetchProgress } = useGame();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  useEffect(() => {
    const fetchCasesList = async () => {
      try {
        const res = await fetch('/api/cases', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCases(data);
          if (data.length > 0) {
            setSelectedCase(data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch cases:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCasesList();
  }, [token]);

  const handleStart = async (caseId: string) => {
    if (activeCaseId === caseId) {
      // Just restore
      await fetchProgress(caseId);
      onClose();
    } else {
      if (activeCaseId) {
        const confirmReset = window.confirm(
          'Warning: Starting a new case will clear your current board and progress. Do you wish to proceed?'
        );
        if (!confirmReset) return;
      }
      await startCase(caseId);
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 bg-black/85 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="w-[850px] h-[500px] bg-wood-900 border-4 border-wood-950 rounded-lg flex shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-parchment-300 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Cases List folders */}
        <div className="w-1/3 border-r border-wood-950 p-6 flex flex-col gap-4 overflow-y-auto">
          <h2 className="font-serif text-lg text-yellow-500 tracking-wider font-bold uppercase border-b border-wood-950 pb-2">
            Active Files
          </h2>
          
          {loading ? (
            <div className="flex-1 flex justify-center items-center font-typewriter text-xs text-parchment-300/40">
              Reading file logs...
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cases.map((c) => (
                <div 
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`flex items-center gap-3 p-3 rounded cursor-pointer transition border ${
                    selectedCase?.id === c.id 
                      ? 'bg-wood-800 border-yellow-600' 
                      : 'bg-wood-950/40 border-wood-850 hover:bg-wood-800/40'
                  }`}
                >
                  <FolderOpen className={`w-5 h-5 ${selectedCase?.id === c.id ? 'text-yellow-500' : 'text-parchment-300/50'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-sm font-bold truncate">{c.title}</div>
                    <div className="text-[10px] font-typewriter text-parchment-300/50 uppercase tracking-widest">{c.genre}</div>
                  </div>
                </div>
              ))}

              {/* Locked upcoming chapters */}
              <div className="flex items-center gap-3 p-3 border border-dashed border-wood-800 opacity-45 select-none">
                <FolderOpen className="w-5 h-5 text-wood-700" />
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-sm font-bold text-wood-600">Chapter 2: The Crimson Quill</div>
                  <div className="text-[10px] font-typewriter text-wood-700 uppercase tracking-widest">LOCKED</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Case Dossier Sheet */}
        <div className="flex-1 p-8 flex flex-col justify-between bg-parchment-100 paper-texture text-noir-900 rounded-r m-1">
          {selectedCase ? (
            <div className="flex-1 flex flex-col justify-between">
              
              {/* Case Dossier Header */}
              <div className="flex flex-col border-b-2 border-noir-900/10 pb-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-serif text-2xl font-bold uppercase tracking-wider text-noir-950">
                    {selectedCase.title}
                  </h3>
                  <span className="font-typewriter text-xs bg-crimson text-white px-2 py-0.5 rounded shadow">
                    Dossier #0{selectedCase.id === 'silent-manor' ? '1' : '2'}
                  </span>
                </div>
                <div className="flex gap-4 mt-2 font-typewriter text-[10px] text-noir-900/60 uppercase">
                  <span>Genre: {selectedCase.genre}</span>
                  <span>Difficulty: {selectedCase.difficulty}</span>
                  <span>Start: {selectedCase.startingTime} PM</span>
                </div>
              </div>

              {/* Story Description */}
              <div className="flex-1 mt-6 font-typewriter text-sm leading-relaxed text-noir-800">
                <p className="indent-8 italic">
                  "{selectedCase.description}"
                </p>
                <div className="mt-6 border-l-2 border-crimson pl-4 text-xs font-sans text-noir-900/70">
                  <strong>Notes:</strong> Case involves potential staging. Detective Harris was dispatched, but is closing the file. High priority target of investigation.
                </div>
              </div>

              {/* Call to Action */}
              <div className="flex justify-end pt-4 border-t border-noir-900/10 gap-3">
                <button 
                  onClick={() => handleStart(selectedCase.id)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-noir-900 text-parchment-100 hover:bg-noir-950 transition rounded shadow text-sm font-typewriter uppercase tracking-wider"
                >
                  {activeCaseId === selectedCase.id ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Restore Investigation
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-yellow-500" />
                      Inspect Case File
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex justify-center items-center font-typewriter text-sm text-noir-900/30">
              Select a file folder from the cabinet
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
export default CaseSelector;
