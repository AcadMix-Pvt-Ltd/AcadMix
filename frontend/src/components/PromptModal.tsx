// @ts-nocheck
import React, { useState } from 'react';
import { SignIn, X } from '@phosphor-icons/react';

/**
 * Premium neat style prompt modal for user inputs.
 */
interface PromptModalProps {
  open: boolean;
  title: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

const PromptModal: React.FC<PromptModalProps> = ({
  open, title, message, placeholder = 'Enter text...',
  confirmText = 'Confirm', cancelText = 'Cancel',
  onConfirm, onCancel,
}) => {
  const [value, setValue] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    if (value.trim()) {
      onConfirm(value.trim());
      setValue('');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-[#0F172A] border border-slate-700/50 rounded-[2rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] max-w-md w-full overflow-hidden"
        style={{ animation: 'promptScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
        
        {/* Header Area */}
        <div className="p-8 pb-4 relative">
          <button onClick={onCancel}
            className="absolute top-6 right-6 p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
            aria-label="Close">
            <X size={18} weight="bold" />
          </button>
          
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
              <SignIn size={32} weight="duotone" className="text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[280px]">{message}</p>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="px-8 py-4">
          <div className="relative group">
            <input 
              type="text" 
              autoFocus
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              className="w-full px-6 py-4 rounded-2xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-center text-lg font-bold tracking-wide"
            />
          </div>
        </div>

        {/* Actions Area */}
        <div className="p-8 pt-4 flex gap-4">
          <button onClick={onCancel}
            className="flex-1 py-4 rounded-2xl font-bold text-sm bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white transition-all border border-slate-700/50">
            {cancelText}
          </button>
          <button onClick={handleConfirm}
            className="flex-1 py-4 rounded-2xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]">
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes promptScaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1);    }
        }
      `}</style>
    </div>
  );
};

export default PromptModal;
