// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Plus, Trash, Check, TreeStructure, WarningCircle, FloppyDisk, MagicWand } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { facultyPanelAPI, outcomesAPI } from '../../services/api';
import AlertModal from '../AlertModal';

const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };

const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyse', 'Evaluate', 'Create'];

const FacultyCourseSetup = ({ onDirtyChange }) => {
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [step, setStep] = useState(1); // 1 = COs, 2 = Matrix
  
  // Matrix Base Data
  const [programOutcomes, setProgramOutcomes] = useState([]);
  
  // Local editable state
  const [localCOs, setLocalCOs] = useState([]);
  const [localMappings, setLocalMappings] = useState({}); // format: `${coId}_${poId} : strength`
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '', type: 'info', onConfirm: null });
  const showAlert = (title, message, type = 'info') => setAlertModal({ open: true, title, message, type, onConfirm: null });
  const closeAlert = () => setAlertModal(prev => ({ ...prev, open: false }));

  useEffect(() => {
    onDirtyChange && onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    // Prevent accidental page reloads
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    facultyPanelAPI.ciaDashboard()
      .then(res => {
        setCourses(res.data || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingCourses(false));
  }, []);

  const handleSelectCourse = async (course) => {
    setSelectedCourse(course);
    setLoadingMatrix(true);
    setStep(1);
    try {
      const res = await outcomesAPI.getMatrix(course.course_id); // using course_id from faculty map
      setProgramOutcomes(res.data.program_outcomes || []);
      
      const loadedCOs = res.data.course_outcomes || [];
      // Assign fake temp IDs to new ones, keep real UUIDs for db ones
      setLocalCOs(loadedCOs.map(co => ({ ...co, _key: co.id })));
      
      const mapObj = {};
      (res.data.mappings || []).forEach(m => {
        mapObj[`${m.co_id}_${m.po_id}`] = m.strength;
      });
      setLocalMappings(mapObj);
      setIsDirty(false);
    } catch(err) {
      showAlert('Error', 'Failed to load matrix data', 'danger');
      setSelectedCourse(null);
    }
    setLoadingMatrix(false);
  };

  const generateTempId = () => `new_${Math.random().toString(36).substr(2, 9)}`;

  const addCO = () => {
    const nextNum = localCOs.length + 1;
    setLocalCOs([...localCOs, { _key: generateTempId(), id: null, code: `CO${nextNum}`, description: '', bloom_level: 'Apply' }]);
    setIsDirty(true);
  };

  const removeCO = (index) => {
    const newCOs = [...localCOs];
    newCOs.splice(index, 1);
    setLocalCOs(newCOs);
    setIsDirty(true);
  };

  const updateCO = (index, field, value) => {
    const newCOs = [...localCOs];
    newCOs[index][field] = value;
    setLocalCOs(newCOs);
    setIsDirty(true);
  };

  const handleStep2 = () => {
    if (localCOs.length === 0) {
      showAlert('Empty Outcomes', "Define at least one Course Outcome before mapping.", 'warning');
      return;
    }
    const emptyCodes = localCOs.filter(c => !c.code.trim() || !c.description.trim());
    if (emptyCodes.length > 0) {
      showAlert('Incomplete COs', "Please fill in all Course Outcome codes and descriptions.", 'warning');
      return;
    }
    setStep(2);
  };

  const handleAIGenerate = async () => {
    try {
      toast.loading('AI is analyzing the syllabus to generate COs and Mappings...', { id: 'ai_generate' });
      const res = await outcomesAPI.generateAIOutcomes(selectedCourse.course_id);
      const data = res.data || res;
      
      if (data.course_outcomes && data.course_outcomes.length > 0) {
        // Map COs
        const generatedCOs = data.course_outcomes.map(co => ({
          _key: generateTempId(),
          id: null,
          code: co.code,
          description: co.description,
          bloom_level: co.bloom_level
        }));
        setLocalCOs(generatedCOs);

        // Map strengths
        const newMappings = {};
        if (data.mappings) {
           data.mappings.forEach(m => {
              // Find the generated CO's _key using its code
              const matchedCO = generatedCOs.find(c => c.code === m.co_code);
              if (matchedCO) {
                 newMappings[`${matchedCO._key}_${m.po_id}`] = m.strength;
              }
           });
        }
        setLocalMappings(newMappings);
        setIsDirty(true);
        toast.success('AI successfully generated outcomes and mappings! Please review them.', { id: 'ai_generate' });
      } else {
        toast.error('AI failed to generate outcomes.', { id: 'ai_generate' });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to auto-generate mapping. Please try again.', { id: 'ai_generate' });
    }
  };

  const toggleMapping = (coKey, poId) => {
    const mapKey = `${coKey}_${poId}`;
    const current = localMappings[mapKey] || 0;
    const nextVal = current === 0 ? 1 : current === 1 ? 2 : current === 2 ? 3 : 0;
    
    setLocalMappings(prev => {
      const copy = { ...prev };
      if (nextVal === 0) {
        delete copy[mapKey];
      } else {
        copy[mapKey] = nextVal;
      }
      return copy;
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const mappingsList = [];
      Object.keys(localMappings).forEach(key => {
        const [coKey, poId] = key.split('_');
        // If coKey is an existing UUID, it maps perfectly. If it's a "new_xxx", we pass it and backend swaps it.
        mappingsList.push({
          co_id: coKey,
          po_id: poId,
          strength: localMappings[key]
        });
      });

      const payload = {
        course_outcomes: localCOs.map(co => ({
          id: co.id, // null if newly created
          code: co.code,
          description: co.description,
          bloom_level: co.bloom_level
        })),
        mappings: mappingsList
      };

      await outcomesAPI.saveMatrix(selectedCourse.course_id, payload);
      showAlert('Success', "CO/PO Matrix successfully synchronized", 'success');
      setIsDirty(false);
      // Reload strictly from DB to flush local cache
      await handleSelectCourse(selectedCourse); 
    } catch(err) {
      if (err.response?.status === 409) {
        showAlert('Conflict', "Cannot delete a CO that is already referenced by existing Assessments.", 'danger');
      } else {
        showAlert('Error', "Failed to save matrix structure.", 'danger');
      }
    }
    setSaving(false);
  };

  if (!selectedCourse) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-4">
        <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          Select Subject Configuration
        </h3>
        {loadingCourses ? (
          <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c, i) => (
              <motion.div key={i} whileHover={{ y: -2 }} onClick={() => handleSelectCourse(c)}
                className="soft-card p-5 cursor-pointer border border-slate-100 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{c.subject}</h4>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{c.subject_code} • Sem {c.semester}</p>
                  </div>
                  <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/15 rounded-full flex items-center justify-center">
                    <TreeStructure size={16} className="text-indigo-500" weight="bold" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full relative min-h-screen">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between mb-6 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-4">
           <button onClick={() => {
             if(isDirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
             setSelectedCourse(null);
             setIsDirty(false);
           }} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 shadow-sm hover:bg-slate-100 transition-colors">
              <ArrowLeft size={16} weight="bold" />
           </button>
           <div>
             <h3 className="font-extrabold text-slate-800 dark:text-slate-100 leading-tight">Outcomes Settings: {selectedCourse.subject}</h3>
             <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{selectedCourse.subject_code}</p>
           </div>
        </div>
        
        {/* Wizard Progress */}
        <div className="hidden sm:flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${step === 1 ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>1. Define COs</span>
            <ArrowRight size={14} className="text-slate-300 dark:text-slate-600" />
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${step === 2 ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>2. Matrix Grid</span>
        </div>
      </div>

      {loadingMatrix ? (
         <div className="flex justify-center p-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 max-w-5xl mx-auto pb-24">
               {/* Step 1 UI */}
               <div className="flex justify-between items-end mb-4">
                 <div>
                   <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">Define Course Outcomes</h4>
                   <p className="text-sm text-slate-500 dark:text-slate-400">Establish the specific syllabus outcomes for this active course.</p>
                 </div>
                 <div className="flex items-center gap-3">
                   <button onClick={handleAIGenerate} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                      <MagicWand size={16} weight="fill" /> Auto-Generate with AI
                   </button>
                   <button onClick={addCO} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 hover:shadow-sm px-4 py-2 rounded-xl text-sm font-bold transition-all">
                      <Plus size={16} weight="bold" /> Add CO
                   </button>
                 </div>
               </div>

               <div className="bg-white dark:bg-[#1A202C] border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
                 {localCOs.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                      <WarningCircle size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="font-semibold text-sm">No Course Outcomes Defined</p>
                      <p className="text-xs mt-1">Please add at least one outcome to begin mapping.</p>
                    </div>
                 )}
                 {localCOs.map((co, index) => (
                    <div key={co._key} className="flex items-start gap-4 p-4 border-b border-slate-50 dark:border-white/5 last:border-b-0">
                       <div className="w-16">
                         <input type="text" value={co.code} onChange={(e) => updateCO(index, 'code', e.target.value)} 
                           className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm font-bold text-center py-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500" placeholder="CO1" />
                       </div>
                       <div className="flex-1">
                          <textarea value={co.description} onChange={(e) => updateCO(index, 'description', e.target.value)}
                           className="w-full bg-slate-50 dark:bg-slate-800 border border-transparent rounded-lg text-sm p-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 min-h-[60px] resize-y" placeholder="Describe the outcome expected from the student..." />
                       </div>
                       <div className="w-40">
                         <select value={co.bloom_level} onChange={(e) => updateCO(index, 'bloom_level', e.target.value)}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm font-semibold p-2.5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500">
                           {BLOOM_LEVELS.map(L => <option key={L} value={L}>{L}</option>)}
                         </select>
                       </div>
                       <button onClick={() => removeCO(index)} className="mt-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                         <Trash size={18} weight="bold" />
                       </button>
                    </div>
                 ))}
               </div>

               <div className="mt-6 flex justify-end">
                   <button onClick={handleStep2} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 shadow-lg text-white px-6 py-3 rounded-xl text-sm font-bold transition-all">
                      Continue to PO Mapping <ArrowRight size={16} weight="bold" />
                   </button>
               </div>
            </motion.div>
          )}

          {step === 2 && (
             <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4 pb-24 relative">
                {/* Step 2 Legend */}
                <div className="bg-white dark:bg-[#1A202C] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                   <div>
                     <h4 className="font-extrabold text-slate-800 dark:text-slate-100">CO-PO Matrix Configuration</h4>
                     <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Click cells to toggle correlation strength.</p>
                   </div>
                   <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"></span> None</span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded flex items-center justify-center bg-indigo-50 text-indigo-500 border border-indigo-200">1</span> Low</span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded flex items-center justify-center bg-indigo-100 text-indigo-600 border border-indigo-300">2</span> Medium</span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded flex items-center justify-center bg-indigo-500 text-white border border-indigo-600">3</span> High</span>
                   </div>
                </div>

                {/* The Matrix Grid */}
                <div className="w-full overflow-x-auto bg-white dark:bg-[#1A202C] border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm">
                   <table className="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-white/5">
                          <th className="p-3 font-bold text-slate-500 dark:text-slate-400 text-xs text-center border-r border-slate-100 dark:border-white/5 w-16">CO</th>
                          {programOutcomes.map(po => (
                            <th key={po.id} className="p-3 text-center border-r border-slate-100 dark:border-white/5 last:border-r-0" title={po.description}>
                               <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">{po.code}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {localCOs.map(co => (
                           <tr key={co._key} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="p-2 border-r border-slate-100 dark:border-white/5 text-center align-middle" title={co.description}>
                                 <span className="text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg inline-block">{co.code}</span>
                              </td>
                              {programOutcomes.map(po => {
                                 const val = localMappings[`${co._key || co.id}_${po.id}`] || 0;
                                 let themeClasses = "bg-slate-50/50 text-transparent border-transparent hover:border-slate-200";
                                 if (val === 1) themeClasses = "bg-indigo-50 border-indigo-200 text-indigo-500 font-bold dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300";
                                 if (val === 2) themeClasses = "bg-indigo-100 border-indigo-300 text-indigo-600 font-extrabold dark:bg-indigo-500/30 dark:border-indigo-500/40 dark:text-indigo-200";
                                 if (val === 3) themeClasses = "bg-indigo-500 border-indigo-600 text-white font-black shadow-sm dark:bg-indigo-500 dark:border-indigo-400";
                                 
                                 return (
                                   <td key={po.id} className="p-1 border-r border-slate-50 dark:border-white/5 align-middle text-center" onClick={() => toggleMapping(co._key || co.id, po.id)}>
                                       <div className={`mx-auto w-8 h-8 rounded-lg border-2 flex items-center justify-center cursor-pointer select-none transition-all scale-100 active:scale-90 ${themeClasses}`}>
                                          {val ? val : ''}
                                       </div>
                                   </td>
                                 );
                              })}
                           </tr>
                        ))}
                      </tbody>
                   </table>
                </div>

                {/* Fixed FAB for saving */}
                <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-6 right-6 lg:right-10 z-50 flex items-center gap-3">
                   {isDirty && <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse hidden sm:block">Unsaved Changes</span>}
                   <button onClick={() => setStep(1)} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 px-5 py-3 rounded-2xl font-bold shadow-lg border border-slate-100 dark:border-slate-700 transition-all flex items-center gap-2">
                       <ArrowLeft size={16} weight="bold" /> Back
                   </button>
                   <button onClick={handleSave} disabled={saving || !isDirty} className={`px-6 py-3 rounded-2xl font-extrabold shadow-xl flex items-center gap-2 transition-all ${saving ? 'bg-indigo-400 text-white cursor-wait' : isDirty ? 'bg-indigo-500 hover:bg-indigo-600 text-white hover:-translate-y-1' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                       {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <FloppyDisk size={18} weight="fill" />}
                       {saving ? "Saving Matrix..." : isDirty ? "Save Matrix" : "Matrix Saved"}
                   </button>
                </motion.div>
             </motion.div>
          )}
        </AnimatePresence>
      )}
      
      <AlertModal
        open={alertModal.open}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        onConfirm={closeAlert}
        onCancel={closeAlert}
      />
    </div>
  );
};

export default FacultyCourseSetup;
