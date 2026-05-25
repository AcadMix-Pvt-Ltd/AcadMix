// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash, FloppyDisk } from '@phosphor-icons/react';
import { api } from '../../services/api';

const DAYS_OF_WEEK = [
  { id: 'MON', label: 'Monday' },
  { id: 'TUE', label: 'Tuesday' },
  { id: 'WED', label: 'Wednesday' },
  { id: 'THU', label: 'Thursday' },
  { id: 'FRI', label: 'Friday' },
  { id: 'SAT', label: 'Saturday' },
  { id: 'SUN', label: 'Sunday' },
];

export default function TimetableSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    periods_per_day: 8,
    working_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    lab_consecutive_periods: 3,
    breaks: [
      { type: 'lunch', after_period: 4, duration_mins: 60 }
    ]
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/college/settings');
      const data = response.data.settings;
      if (data && data.timetable_config) {
        setSettings({
          periods_per_day: data.timetable_config.periods_per_day || 8,
          working_days: data.timetable_config.working_days || ['MON', 'TUE', 'WED', 'THU', 'FRI'],
          lab_consecutive_periods: data.timetable_config.lab_consecutive_periods || 3,
          breaks: data.timetable_config.breaks || []
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/college/settings', {
        timetable_config: settings
      });
      alert('Settings saved successfully!'); // Replace with custom alert later if needed
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDayToggle = (dayId) => {
    setSettings(prev => ({
      ...prev,
      working_days: prev.working_days.includes(dayId)
        ? prev.working_days.filter(d => d !== dayId)
        : [...prev.working_days, dayId]
    }));
  };

  const addBreak = () => {
    setSettings(prev => ({
      ...prev,
      breaks: [...prev.breaks, { type: 'short_break', after_period: 1, duration_mins: 15 }]
    }));
  };

  const removeBreak = (index) => {
    setSettings(prev => ({
      ...prev,
      breaks: prev.breaks.filter((_, i) => i !== index)
    }));
  };

  const updateBreak = (index, field, value) => {
    const updatedBreaks = [...settings.breaks];
    updatedBreaks[index][field] = value;
    setSettings({ ...settings, breaks: updatedBreaks });
  };

  if (loading) {
    return <div className="p-6 text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Timetable Configuration</h2>
        <p className="text-slate-400">Define your college's schedule rules. The Timetable Generator will use these constraints.</p>
      </div>

      {/* Basic Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
          <label className="block text-sm font-medium text-slate-300 mb-2">Periods Per Day</label>
          <input 
            type="number" 
            min="1" 
            max="12"
            value={settings.periods_per_day}
            onChange={(e) => setSettings({...settings, periods_per_day: parseInt(e.target.value) || 8})}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
          />
          <p className="text-xs text-slate-500 mt-2">Total number of academic periods in a standard day (excluding breaks).</p>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
          <label className="block text-sm font-medium text-slate-300 mb-2">Consecutive Periods for Labs</label>
          <input 
            type="number" 
            min="1" 
            max="4"
            value={settings.lab_consecutive_periods}
            onChange={(e) => setSettings({...settings, lab_consecutive_periods: parseInt(e.target.value) || 3})}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
          />
          <p className="text-xs text-slate-500 mt-2">How many periods the generator should group together for practical sessions.</p>
        </div>
      </div>

      {/* Working Days */}
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
        <label className="block text-sm font-medium text-slate-300 mb-4">Working Days</label>
        <div className="flex flex-wrap gap-3">
          {DAYS_OF_WEEK.map(day => (
            <button
              key={day.id}
              onClick={() => handleDayToggle(day.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                settings.working_days.includes(day.id)
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50'
                  : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Breaks */}
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
        <div className="flex justify-between items-center mb-6">
          <label className="block text-sm font-medium text-slate-300">Daily Breaks</label>
          <button 
            onClick={addBreak}
            className="flex items-center space-x-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
          >
            <Plus weight="bold" />
            <span>Add Break</span>
          </button>
        </div>

        <div className="space-y-4">
          {settings.breaks.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No breaks configured. The periods will run consecutively.</p>
          ) : (
            settings.breaks.map((brk, idx) => (
              <div key={idx} className="flex items-center space-x-4 bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Break Type</label>
                  <select 
                    value={brk.type}
                    onChange={(e) => updateBreak(idx, 'type', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded text-sm text-white px-3 py-2 outline-none focus:border-indigo-500"
                  >
                    <option value="short_break">Short Break</option>
                    <option value="lunch">Lunch</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Occurs After Period #</label>
                  <input 
                    type="number"
                    min="1"
                    max={settings.periods_per_day}
                    value={brk.after_period}
                    onChange={(e) => updateBreak(idx, 'after_period', parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-800 border border-slate-700 rounded text-sm text-white px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Duration (Mins)</label>
                  <input 
                    type="number"
                    min="5"
                    value={brk.duration_mins}
                    onChange={(e) => updateBreak(idx, 'duration_mins', parseInt(e.target.value) || 15)}
                    className="w-full bg-slate-800 border border-slate-700 rounded text-sm text-white px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </div>
                <button 
                  onClick={() => removeBreak(idx)}
                  className="mt-5 p-2 text-rose-400 hover:bg-rose-400/10 rounded transition-colors"
                >
                  <Trash size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <FloppyDisk weight="bold" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  );
}
