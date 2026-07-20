import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { X, Search, Pin, Trash2, Save, FileText, Sparkles, BookOpen } from 'lucide-react';

export const Notebook: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notes, saveNote, deleteNote, activeCaseId, showConfirm } = useGame();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Auto select first note if none selected
  useEffect(() => {
    if (notes.length > 0 && !selectedNote) {
      setSelectedNote(notes[0]);
    }
  }, [notes, selectedNote]);

  const handleSelectNote = (note: any) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    setSelectedNote({ id: null, title: 'New Entry', content: '', is_system: false });
    setNoteTitle('New Entry');
    setNoteContent('');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!activeCaseId) return;
    const payload = {
      id: selectedNote?.id || undefined,
      title: noteTitle,
      content: noteContent,
    };
    await saveNote(activeCaseId, payload);
    setIsEditing(false);
    setSelectedNote(null); // Force reload select
  };

  const handleDelete = async (noteId: string) => {
    if (!activeCaseId) return;
    const confirmDelete = await showConfirm('Delete this journal entry?');
    if (!confirmDelete) return;

    await deleteNote(activeCaseId, noteId);
    setSelectedNote(null);
  };

  const filteredNotes = notes.filter((n) => {
    const term = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term);
  });

  const systemNotes = filteredNotes.filter((n) => n.is_system);
  const playerNotes = filteredNotes.filter((n) => !n.is_system);

  return (
    <div className="absolute inset-0 bg-black/85 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="w-[950px] h-[550px] bg-wood-900 border-4 border-wood-950 rounded-lg flex shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-parchment-300 hover:text-white transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Column 1: Journal Index & Search */}
        <div className="w-2/5 border-r border-wood-950 p-6 flex flex-col gap-4 overflow-hidden">
          <h2 className="font-serif text-lg text-yellow-500 tracking-wider font-bold uppercase border-b border-wood-950 pb-2 flex justify-between items-center">
            <span>Journal Index</span>
            <button 
              onClick={handleCreateNew}
              className="text-xs font-typewriter bg-wood-850 hover:bg-wood-800 border border-wood-700/60 text-yellow-500 px-2 py-0.5 rounded"
            >
              + Add Page
            </button>
          </h2>

          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-parchment-300/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries..."
              className="w-full bg-noir-950 border border-wood-850 rounded-md pl-9 pr-3 py-1.5 font-typewriter text-xs text-parchment-100 focus:outline-none focus:border-yellow-600"
            />
          </div>

          {/* Lists */}
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
            
            {/* Sherlock Thoughts */}
            {systemNotes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-typewriter text-parchment-300/40 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
                  Sherlock's Log
                </span>
                {systemNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`p-2.5 rounded cursor-pointer transition border text-left flex items-start gap-2.5 ${
                      selectedNote?.id === note.id
                        ? 'bg-wood-800 border-yellow-600/40'
                        : 'bg-wood-950/20 border-wood-900 hover:bg-wood-800/20'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-serif text-xs font-bold text-yellow-500 truncate">{note.title}</div>
                      <div className="font-typewriter text-[10px] text-parchment-300/60 truncate mt-0.5">{note.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Player thoughts */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-typewriter text-parchment-300/40 uppercase tracking-widest flex items-center gap-1">
                <FileText className="w-3 h-3 text-parchment-300" />
                Detective Notes
              </span>
              {playerNotes.length === 0 ? (
                <div className="text-[10px] font-typewriter text-parchment-300/30 italic p-3 text-center">
                  No personal records written.
                </div>
              ) : (
                playerNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`p-2.5 rounded cursor-pointer transition border text-left flex items-start gap-2.5 ${
                      selectedNote?.id === note.id
                        ? 'bg-wood-800 border-yellow-600/40'
                        : 'bg-wood-950/20 border-wood-900 hover:bg-wood-800/20'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-parchment-300/50 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-xs font-bold text-parchment-200 truncate">{note.title}</div>
                      <div className="font-typewriter text-[10px] text-parchment-300/60 truncate mt-0.5">{note.content}</div>
                    </div>
                    {note.pinned && <Pin className="w-3 h-3 text-yellow-600 shrink-0 self-center" />}
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

        {/* Column 2: Paper Sheet Editor */}
        <div className="flex-1 p-8 flex flex-col justify-between bg-parchment-100 paper-texture text-noir-900 rounded-r m-1 relative">
          
          {selectedNote ? (
            <div className="flex-1 flex flex-col justify-between">
              
              {/* Note Header */}
              <div className="flex justify-between items-center border-b border-noir-900/10 pb-3">
                {isEditing ? (
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="font-serif text-xl font-bold bg-transparent border-b border-noir-900/20 focus:outline-none focus:border-noir-900 py-1 flex-1 mr-4"
                  />
                ) : (
                  <h3 className="font-serif text-xl font-bold uppercase tracking-wider text-noir-950 flex items-center gap-2">
                    {selectedNote.is_system && <Sparkles className="w-4 h-4 text-yellow-600" />}
                    {selectedNote.title}
                  </h3>
                )}
                
                {/* System notes are read-only */}
                {!selectedNote.is_system && (
                  <div className="flex gap-2">
                    {isEditing ? (
                      <button 
                        onClick={handleSave}
                        className="p-1.5 bg-noir-900 hover:bg-noir-950 text-white rounded shadow text-xs flex items-center gap-1 font-typewriter"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save
                      </button>
                    ) : (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 bg-noir-900/10 hover:bg-noir-900/20 text-noir-900 rounded text-xs flex items-center gap-1 font-typewriter"
                      >
                        Edit
                      </button>
                    )}
                    {selectedNote.id && (
                      <button 
                        onClick={() => handleDelete(selectedNote.id)}
                        className="p-1.5 bg-crimson hover:bg-red-700 text-white rounded text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Note Content */}
              <div className="flex-1 mt-6 overflow-y-auto">
                {isEditing ? (
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write observations..."
                    className="w-full h-full bg-transparent border-0 focus:ring-0 font-typewriter text-sm leading-relaxed text-noir-900 resize-none outline-none"
                  />
                ) : (
                  <div className="font-typewriter text-sm leading-relaxed text-noir-800 whitespace-pre-wrap">
                    {selectedNote.content}
                  </div>
                )}
              </div>

              {/* Note Footer */}
              <div className="pt-3 border-t border-noir-900/10 text-[9px] font-typewriter text-noir-900/50 flex justify-between">
                <span>Case File: {activeCaseId}</span>
                <span>Type: {selectedNote.is_system ? 'System Log' : 'Detective Note'}</span>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center font-typewriter text-sm text-noir-900/30 gap-2">
              <BookOpen className="w-10 h-10 text-noir-900/15" />
              <span>Select an entry or create a new page</span>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
export default Notebook;
