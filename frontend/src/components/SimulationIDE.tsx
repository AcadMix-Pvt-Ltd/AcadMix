// @ts-nocheck
import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Download, TerminalWindow, CornersIn } from '@phosphor-icons/react';

interface SimulationIDEProps {
  language: 'verilog' | 'spice' | 'python';
  defaultCode: string;
  onSimulate: (code: string) => void;
  isSimulating: boolean;
  output?: string | React.ReactNode;
  isFullScreen?: boolean;
  onExitFullScreen?: () => void;
}

export default function SimulationIDE({
  language,
  defaultCode,
  onSimulate,
  isSimulating,
  output,
  isFullScreen,
  onExitFullScreen
}: SimulationIDEProps) {
  const [code, setCode] = useState(defaultCode);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          {isFullScreen && onExitFullScreen && (
            <button 
              onClick={onExitFullScreen}
              title="Exit Full Screen"
              className="mr-2 flex h-9 w-9 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-100"
            >
              <CornersIn size={16} weight="bold" />
            </button>
          )}
          <TerminalWindow size={20} className="text-gray-500" />
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Native {language.toUpperCase()} Simulator
          </span>
        </div>
        
        <button
          onClick={() => onSimulate(code)}
          disabled={isSimulating}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-500/20"
        >
          <Play size={16} weight="fill" />
          {isSimulating ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>

      {/* Split Pane */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Editor Pane */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-800 h-full">
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        {/* Output/Visualization Pane */}
        <div className="w-1/2 p-6 flex flex-col h-full min-h-0 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Simulation Output
            </h3>
            {output && (
              <button 
                title="Download Output"
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all active:scale-95 shadow-sm hover:shadow"
              >
                <Download size={18} weight="duotone" />
              </button>
            )}
          </div>
          
          <div className="w-full flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-inner flex flex-col overflow-hidden">
            {output ? (
              typeof output === 'string' ? (
                <pre className="font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap h-full overflow-y-auto">
                  {output}
                </pre>
              ) : (
                output
              )
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 flex-col gap-3">
                <Play size={32} weight="duotone" className="opacity-50" />
                <p>Run simulation to view waveforms and output</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
