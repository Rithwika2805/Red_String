import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface Card {
  id: string;
  type: 'evidence' | 'suspect' | 'theory';
  x: number;
  y: number;
  label: string;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  note: string;
  color: string;
}

interface GameContextType {
  activeCaseId: string | null;
  progress: any | null;
  definitions: {
    evidence: any;
    suspects: any;
    exploration: any;
  } | null;
  boardState: {
    cards: Card[];
    connections: Connection[];
    zoom: number;
    pan: { x: number; y: number };
  };
  notes: any[];
  loading: boolean;
  startCase: (caseId: string) => Promise<void>;
  fetchProgress: (caseId: string) => Promise<void>;
  investigateNode: (caseId: string, locationId: string, nodeId: string) => Promise<any>;
  talkToSuspect: (caseId: string, suspectId: string, nodeKey: string) => Promise<any>;
  crossExamine: (caseId: string, statementId: string, evidenceId: string) => Promise<any>;
  updateBoardState: (
    caseId: string,
    cards: Card[],
    connections: Connection[],
    zoom: number,
    pan: { x: number; y: number }
  ) => Promise<void>;
  fetchNotes: (caseId: string) => Promise<void>;
  saveNote: (caseId: string, note: { id?: string; title: string; content: string; pinned?: boolean }) => Promise<void>;
  deleteNote: (caseId: string, noteId: string) => Promise<void>;
  submitAccusation: (caseId: string, accusationPayload: any) => Promise<any>;
  triggerAudio: (soundType: 'pin' | 'paper' | 'string' | 'stamp' | 'typewriter' | 'door') => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [progress, setProgress] = useState<any | null>(null);
  const [definitions, setDefinitions] = useState<any | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [boardState, setBoardState] = useState<{
    cards: Card[];
    connections: Connection[];
    zoom: number;
    pan: { x: number; y: number };
  }>({
    cards: [],
    connections: [],
    zoom: 1.0,
    pan: { x: 0, y: 0 },
  });

  // Procedural Web Audio API sound generator (Zero media file footprint)
  const triggerAudio = useCallback((soundType: 'pin' | 'paper' | 'string' | 'stamp' | 'typewriter' | 'door') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;

      if (soundType === 'pin') {
        // High pitch metal ping
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (soundType === 'paper') {
        // Rustling noise (using brown noise or basic low frequencies)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (soundType === 'string') {
        // Rubber/guitar pluck
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.25);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (soundType === 'stamp') {
        // Bass heavy thud
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.3);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (soundType === 'typewriter') {
        // Sharp high tick
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (soundType === 'door') {
        // Squeaky creak followed by thud
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.linearRampToValueAtTime(270, now + 0.4);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  }, []);

  const fetchProgress = useCallback(async (caseId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/cases/${caseId}/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data.progress);
        setDefinitions(data.definitions);
        setActiveCaseId(caseId);

        // Fetch board state
        const boardRes = await fetch(`/api/board/${caseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (boardRes.ok) {
          const boardData = await boardRes.json();
          setBoardState({
            cards: boardData.cards || [],
            connections: boardData.connections || [],
            zoom: boardData.zoom || 1.0,
            pan: boardData.pan || { x: 0, y: 0 },
          });
        }
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  }, [token]);

  const startCase = async (caseId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      triggerAudio('door');
      const res = await fetch(`/api/cases/${caseId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchProgress(caseId);
        await fetchNotes(caseId);
      }
    } catch (err) {
      console.error('Error starting case:', err);
    } finally {
      setLoading(false);
    }
  };

  const investigateNode = async (caseId: string, locationId: string, nodeId: string) => {
    if (!token) return;
    try {
      triggerAudio('paper');
      const res = await fetch(`/api/cases/${caseId}/explore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ locationId, nodeId }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchProgress(caseId);
        await fetchNotes(caseId);
      }
      return data;
    } catch (err) {
      console.error('Error investigating node:', err);
    }
  };

  const talkToSuspect = async (caseId: string, suspectId: string, nodeKey: string) => {
    if (!token) return;
    try {
      triggerAudio('typewriter');
      const res = await fetch(`/api/cases/${caseId}/dialogue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ suspectId, nodeKey }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchProgress(caseId);
      }
      return data;
    } catch (err) {
      console.error('Error talking to suspect:', err);
    }
  };

  const crossExamine = async (caseId: string, statementId: string, evidenceId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/cases/${caseId}/cross-examine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statementId, evidenceId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerAudio('stamp');
        await fetchProgress(caseId);
        await fetchNotes(caseId);
      }
      return data;
    } catch (err) {
      console.error('Error cross-examining:', err);
    }
  };

  const updateBoardState = async (
    caseId: string,
    cards: Card[],
    connections: Connection[],
    zoom: number,
    pan: { x: number; y: number }
  ) => {
    if (!token) return;
    setBoardState({ cards, connections, zoom, pan });
    try {
      await fetch(`/api/board/${caseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cards, connections, zoom, pan }),
      });
    } catch (err) {
      console.error('Error saving board state:', err);
    }
  };

  const fetchNotes = useCallback(async (caseId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notes/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  }, [token]);

  const saveNote = async (caseId: string, notePayload: { id?: string; title: string; content: string; pinned?: boolean }) => {
    if (!token) return;
    try {
      triggerAudio('typewriter');
      const res = await fetch(`/api/notes/${caseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(notePayload),
      });
      if (res.ok) {
        await fetchNotes(caseId);
      }
    } catch (err) {
      console.error('Error saving note:', err);
    }
  };

  const deleteNote = async (caseId: string, noteId: string) => {
    if (!token) return;
    try {
      triggerAudio('paper');
      const res = await fetch(`/api/notes/${caseId}/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchNotes(caseId);
      }
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const submitAccusation = async (caseId: string, accusationPayload: any) => {
    if (!token) return;
    try {
      triggerAudio('stamp');
      const res = await fetch(`/api/cases/${caseId}/accuse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(accusationPayload),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchProgress(caseId);
      }
      return data;
    } catch (err) {
      console.error('Error submitting accusation:', err);
    }
  };

  return (
    <GameContext.Provider
      value={{
        activeCaseId,
        progress,
        definitions,
        boardState,
        notes,
        loading,
        startCase,
        fetchProgress,
        investigateNode,
        talkToSuspect,
        crossExamine,
        updateBoardState,
        fetchNotes,
        saveNote,
        deleteNote,
        submitAccusation,
        triggerAudio,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
