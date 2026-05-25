// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { assessmentsAPI } from '../../services/api';
import AlertModal from '../AlertModal';

const FacultyAssessmentGenerator = ({ isOpen, onClose, courseId, academicSubjectName, onGenerationComplete }) => {
  const [promptText, setPromptText] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingText, setLoadingText] = useState('Generating syllabus map...');

  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '', type: 'info', onConfirm: null });
  const showAlert = (title, message, type = 'info') => setAlertModal({ open: true, title, message, type, onConfirm: null });
  const closeAlert = () => setAlertModal(prev => ({ ...prev, open: false }));

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      showAlert('Prompt Required', 'Please enter a description for the assessment.', 'warning');
      return;
    }
    
    setIsGenerating(true);
    setLoadingText('Connecting to Vertex AI...');

    try {
      const payload = {
        prompt: promptText,
        num_questions: parseInt(numQuestions, 10),
        include_mcq: true,
        include_short: true
      };
      
      const interval = setInterval(() => {
        setLoadingText(prev => prev === 'Connecting to Vertex AI...' ? 'Reasoning over CO-PO Matrix...' : prev === 'Reasoning over CO-PO Matrix...' ? 'Formatting structurally...' : 'Almost done...');
      }, 2500);

      const res = await assessmentsAPI.generate(courseId, payload);
      clearInterval(interval);
      
      const { assessment, warnings } = res.data;
      
      // We pass the success state back visually via the parent component's Toast/Alert.
      onGenerationComplete(assessment, warnings);
      onClose();
      
    } catch(err) {
      showAlert('Generation Failed', err.response?.data?.detail || "Ami Generation failed. The Vertex endpoint may be unreachable.", 'danger');
    } finally {
      setIsGenerating(false);
      setLoadingText('Generating syllabus map...');
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-[#1A202C] rounded-3xl shadow-2xl overflow-hidden max-w-xl w-full border border-slate-100 dark:border-slate-800">
           
           <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-600">
                    <Sparkle size={24} weight="fill" />
                 </div>
                 <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">Generate Assessment</h3>
                    <p className="text-xs font-bold text-slate-500">{academicSubjectName || 'Selected Subject'}</p>
                 </div>
              </div>
              <button onClick={onClose} disabled={isGenerating} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                 <X size={20} weight="bold" />
              </button>
           </div>
           
           {isGenerating ? (
             <div className="p-12 flex flex-col items-center justify-center text-center">
                 <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-100 dark:border-purple-900/30"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
                    <Sparkle size={24} weight="fill" className="absolute inset-0 m-auto text-purple-500 animate-pulse" />
                 </div>
                 <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg mb-1">{loadingText}</h4>
                 <p className="text-sm text-slate-500 max-w-xs mx-auto">Gemini 2.0 Flash is analyzing your prompt against the active curriculum mapping...</p>
             </div>
           ) : (
             <div className="p-6 space-y-5">
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Assessment Prompt</label>
                   <p className="text-xs text-slate-500 mb-2">Describe the specific topic, difficulty, or focus for your evaluation.</p>
                   <textarea 
                     value={promptText}
                     onChange={(e) => setPromptText(e.target.value)}
                     className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 min-h-[120px] resize-y"
                     placeholder="E.g., Generate a midterm quiz focusing on recursive functions, time complexity, and memory mapping. Ensure it challenges applying memory maps..."
                   />
                </div>
                
                <div className="flex items-center gap-6">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Question Count:</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-2">
                       <button onClick={() => setNumQuestions(Math.max(1, numQuestions - 1))} className="p-2 text-slate-400 hover:text-purple-500">-</button>
                       <span className="w-12 text-center font-extrabold text-sm text-slate-700 dark:text-slate-200">{numQuestions}</span>
                       <button onClick={() => setNumQuestions(Math.min(20, numQuestions + 1))} className="p-2 text-slate-400 hover:text-purple-500">+</button>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                    <button onClick={handleGenerate} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-md shadow-purple-500/20 text-white font-extrabold flex items-center gap-2 transition-all hover:scale-[1.02]">
                       Generate structured assessment <Sparkle size={16} weight="fill" />
                    </button>
                </div>
             </div>
           )}

        </motion.div>
      </motion.div>
      
      <AlertModal
        open={alertModal.open}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        onConfirm={closeAlert}
        onCancel={closeAlert}
      />
    </AnimatePresence>
  );
};

export default FacultyAssessmentGenerator;
