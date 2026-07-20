import React, { useState } from 'react';

interface GameModalProps {
  type: 'alert' | 'confirm' | 'prompt';
  message: string;
  defaultValue?: string;
  onClose: (value: any) => void;
}

export const GameModal: React.FC<GameModalProps> = ({ type, message, defaultValue = '', onClose }) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (type === 'prompt') {
      onClose(inputValue);
    } else if (type === 'confirm') {
      onClose(true);
    } else {
      onClose(void 0);
    }
  };

  const handleCancel = () => {
    if (type === 'prompt') {
      onClose(null);
    } else if (type === 'confirm') {
      onClose(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/85 flex items-center justify-center p-6 backdrop-blur-sm"
      style={{ zIndex: 9999 }}
    >
      <div className="w-[420px] bg-parchment-100 border-4 border-wood-950 p-6 rounded shadow-2xl flex flex-col gap-4 text-noir-900 relative border-double paper-texture">
        {/* Retro Header */}
        <div className="text-[9px] font-bold text-noir-900/40 uppercase font-typewriter tracking-widest border-b border-noir-900/10 pb-1.5 flex justify-between select-none">
          <span>Deduction Notification</span>
          <span>Red String Engine</span>
        </div>

        <p className="font-typewriter text-xs text-noir-900/90 leading-relaxed whitespace-pre-wrap">
          {message}
        </p>

        {type === 'prompt' && (
          <form onSubmit={handleSubmit} className="w-full">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-white/80 border border-noir-900/20 rounded p-2 font-typewriter text-xs text-noir-950 focus:outline-none focus:border-yellow-600 shadow-inner"
              autoFocus
            />
          </form>
        )}

        <div className="flex justify-end gap-2 text-[10px] font-bold font-typewriter uppercase tracking-wider mt-2 select-none">
          {(type === 'confirm' || type === 'prompt') && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-noir-900/5 hover:bg-noir-900/10 border border-noir-900/20 text-noir-900 rounded transition"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => handleSubmit()}
            className="px-4 py-2 bg-noir-900 text-parchment-100 hover:bg-noir-950 rounded shadow transition"
          >
            {type === 'alert' ? 'Acknowledge' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default GameModal;
