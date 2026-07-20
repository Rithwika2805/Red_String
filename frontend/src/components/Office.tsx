import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { LogOut, Clock, ClipboardList, BookOpen, Briefcase, HelpCircle } from 'lucide-react';
import Board from './Board';
import Notebook from './Notebook';
import Investigation from './Investigation';
import Inventory from './Inventory';
import AccusationTable from './AccusationTable';
import CaseSelector from './CaseSelector';

export const Office: React.FC = () => {
  const { logout, user } = useAuth();
  const { progress, activeCaseId, triggerAudio, showAlert } = useGame();
  
  // Active overlay state: 'board' | 'notebook' | 'investigation' | 'inventory' | 'accusation' | 'cases' | null
  const [activeOverlay, setActiveOverlay] = useState<'board' | 'notebook' | 'investigation' | 'inventory' | 'accusation' | 'cases' | null>('cases');
  const [investigationTab, setInvestigationTab] = useState<'rooms' | 'board' | 'interview' | 'analysis'>('rooms');

  const formatGameTime = (minutesElapsed: number) => {
    // Game starts at 9:00 PM (21:00)
    const totalMinutes = 21 * 60 + minutesElapsed;
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} PM`;
  };

  const handleObjectClick = (overlay: 'board' | 'notebook' | 'investigation' | 'inventory' | 'accusation' | 'cases') => {
    if (!activeCaseId && overlay !== 'cases') {
      showAlert('Please open Case Files first and start a mystery!');
      return;
    }
    triggerAudio('paper');
    if (overlay === 'board') {
      setInvestigationTab('board');
      setActiveOverlay('investigation');
    } else if (overlay === 'investigation') {
      setInvestigationTab('rooms');
      setActiveOverlay('investigation');
    } else {
      setActiveOverlay(overlay);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-wood-950 flex flex-col items-center justify-between p-6 select-none">
      {/* Lamp Light Glow Overlays */}
      <div className="lamp-glow-overlay absolute inset-0 z-10" />

      {/* Retro Header (Detective HUD) */}
      <header className="relative w-full z-20 flex justify-between items-center bg-noir-900/80 border border-wood-800 px-6 py-3 rounded shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-2xl tracking-widest text-parchment-300 font-bold uppercase">
            Red String <span className="text-sm font-sans font-normal lowercase tracking-normal text-wood-500">detective engine</span>
          </h1>
          {activeCaseId && (
            <div className="flex items-center gap-2 bg-wood-950 px-3 py-1 rounded border border-wood-800/60 font-typewriter text-sm text-yellow-500">
              <Clock className="w-4 h-4" />
              <span>Time: {formatGameTime(progress?.current_time || 0)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="font-typewriter text-xs text-parchment-300/70">
            Inspector: <span className="text-parchment-100">{user?.username}</span>
          </span>
          <button 
            onClick={() => {
              triggerAudio('door');
              logout();
            }}
            className="flex items-center gap-2 px-3 py-1 bg-crimson hover:bg-red-700 transition text-parchment-50 rounded text-xs font-sans"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit Office
          </button>
        </div>
      </header>

      {/* Interactive 2D Detective Office Workspace */}
      <main className="relative flex-1 w-full max-w-6xl mx-auto flex items-center justify-center p-4 z-10">
        <div className="relative w-[1000px] h-[550px] bg-wood-900 border-8 border-wood-950 rounded-lg shadow-2xl desk-texture flex flex-col justify-between overflow-hidden">
          
          {/* Top Wall: Huge Corkboard Section */}
          <div 
            onClick={() => handleObjectClick('board')}
            className="w-full h-[220px] corkboard-texture border-b-4 border-wood-950 p-4 relative group cursor-pointer flex flex-col justify-center items-center hover:brightness-110 transition"
          >
            {/* Skeuomorphic board hints */}
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition duration-300" />
            <div className="absolute top-2 left-2 text-[10px] font-typewriter text-parchment-300/40 uppercase tracking-widest">Investigation Board</div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-48 h-32 border border-wood-800 bg-wood-900/60 p-2 rotate-2 shadow-paper flex flex-col justify-between">
                <div className="absolute -top-1.5 left-[47%] w-3 h-3 bg-red-600 rounded-full shadow border border-red-800" />
                <div className="border-b border-wood-800/40 pb-1 text-[9px] font-typewriter text-yellow-500">CLUE MATRIX</div>
                <div className="flex-1 flex flex-col justify-center gap-1.5">
                  <div className="h-1 bg-red-600/30 w-3/4 rounded" />
                  <div className="h-1 bg-red-600/30 w-1/2 rounded" />
                  <div className="h-1 bg-red-600/30 w-5/6 rounded" />
                </div>
                <span className="text-[8px] font-sans text-center text-parchment-300/30 italic">Click to Inspect Pins</span>
              </div>
            </div>
          </div>

          {/* Bottom Desk Surface: Clickable Objects */}
          <div className="relative flex-1 w-full p-6 flex justify-around items-end bg-gradient-to-t from-wood-950 via-wood-900 to-wood-900/80">
            
            {/* Case File Folders */}
            <div 
              onClick={() => handleObjectClick('cases')}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div className="relative w-28 h-20 bg-amber-900/40 border border-wood-700/60 rounded-t shadow-lg flex items-center justify-center -rotate-6 group-hover:-translate-y-2 transition duration-300">
                <Briefcase className="w-8 h-8 text-parchment-200 group-hover:text-yellow-500 transition" />
                <span className="absolute bottom-2 font-typewriter text-[9px] text-parchment-300/60">CASE FILES</span>
              </div>
              <span className="text-xs font-typewriter text-parchment-300/80 mt-2">Manila Folders</span>
            </div>

            {/* Investigation Scene Notebook */}
            <div 
              onClick={() => handleObjectClick('investigation')}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div className="relative w-28 h-20 bg-noir-800 border border-wood-800 rounded shadow-lg flex items-center justify-center rotate-3 group-hover:-translate-y-2 transition duration-300">
                <ClipboardList className="w-8 h-8 text-parchment-200 group-hover:text-yellow-500 transition" />
                <span className="absolute bottom-2 font-typewriter text-[9px] text-parchment-300/60">INVESTIGATE</span>
              </div>
              <span className="text-xs font-typewriter text-parchment-300/80 mt-2">Crime Scene Map</span>
            </div>

            {/* Detective Notebook */}
            <div 
              onClick={() => handleObjectClick('notebook')}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div className="relative w-24 h-22 bg-amber-50 border border-wood-800 rounded-sm shadow-lg flex items-center justify-center -rotate-3 group-hover:-translate-y-2 transition duration-300">
                <div className="absolute inset-0 border-l-[8px] border-amber-900/30" />
                <BookOpen className="w-8 h-8 text-wood-900 group-hover:text-yellow-700 transition" />
                <span className="absolute bottom-2 font-typewriter text-[9px] text-wood-800">JOURNAL</span>
              </div>
              <span className="text-xs font-typewriter text-parchment-300/80 mt-2">Deduction Notes</span>
            </div>

            {/* Inventory Cabinet drawer */}
            <div 
              onClick={() => handleObjectClick('inventory')}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div className="relative w-24 h-18 bg-noir-900 border border-wood-700 rounded-b shadow-lg flex flex-col items-center justify-center group-hover:-translate-y-2 transition duration-300">
                <div className="w-8 h-2 bg-wood-800 rounded-full border border-wood-700 shadow-inner mt-2 flex justify-center items-center">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className="font-typewriter text-[9px] text-parchment-300/40">INVENTORY</span>
                </div>
              </div>
              <span className="text-xs font-typewriter text-parchment-300/80 mt-2">Desk Drawers</span>
            </div>

            {/* Accusation Table */}
            <div 
              onClick={() => handleObjectClick('accusation')}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div className="relative w-28 h-20 bg-crimson/25 border border-red-900/40 rounded shadow-lg flex items-center justify-center rotate-6 group-hover:-translate-y-2 transition duration-300 hover:bg-crimson/40">
                <div className="absolute -top-1 right-2 bg-red-600 w-2.5 h-2.5 rounded-full animate-pulse" />
                <ClipboardList className="w-8 h-8 text-red-500 group-hover:text-red-400 transition" />
                <span className="absolute bottom-2 font-typewriter text-[9px] text-red-400">ACCUSATION</span>
              </div>
              <span className="text-xs font-typewriter text-parchment-300/80 mt-2">Verdict Table</span>
            </div>

          </div>
        </div>
      </main>

      {/* Footer Notes / Help */}
      <footer className="relative w-full z-20 flex justify-between items-center text-[10px] font-typewriter text-parchment-300/50 mt-4 px-4">
        <span>&copy; 2026 Red String Mystery Engine</span>
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          Clues + Contradictions = True Case Resolution
        </span>
      </footer>

      {/* Dynamic Overlays */}
      {activeOverlay === 'cases' && (
        <CaseSelector onClose={() => setActiveOverlay(null)} />
      )}
      {activeOverlay === 'board' && (
        <Board onClose={() => setActiveOverlay(null)} />
      )}
      {activeOverlay === 'notebook' && (
        <Notebook onClose={() => setActiveOverlay(null)} />
      )}
      {activeOverlay === 'investigation' && (
        <Investigation onClose={() => setActiveOverlay(null)} initialTab={investigationTab} />
      )}
      {activeOverlay === 'inventory' && (
        <Inventory onClose={() => setActiveOverlay(null)} />
      )}
      {activeOverlay === 'accusation' && (
        <AccusationTable onClose={() => setActiveOverlay(null)} />
      )}
    </div>
  );
};
export default Office;
