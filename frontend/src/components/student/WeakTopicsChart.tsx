// @ts-nocheck
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const getBarColor = (score) => {
  if (score >= 70) return '#10b981';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
};

export default function WeakTopicsChart({ data, isDark }) {
  if (!data || data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
        <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} />
        <YAxis type="category" dataKey="subject" width={90} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#475569', fontWeight: 600 }} />
        <Tooltip 
          cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white dark:bg-[#1A202C] rounded-xl p-3 shadow-lg shadow-indigo-500/10 dark:shadow-none border border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1.5">{label}</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor: payload[0].payload.fill || payload[0].color }}></span>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Avg Score: <span className="font-bold text-slate-900 dark:text-white">{payload[0].value}%</span>
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          }} 
        />
        <Bar dataKey="avg_score" radius={[0, 6, 6, 0]} barSize={20}>
          {data.map((entry, i) => (
            <Cell key={i} fill={getBarColor(entry.avg_score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
