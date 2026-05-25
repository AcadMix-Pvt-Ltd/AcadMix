import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { accreditationAPI } from '../services/api';
import { toast } from 'sonner';
import { FileText, Download, Loader2, AlertTriangle } from 'lucide-react';

export default function ReportDashboard({ user }: { user: any }) {
  const [collegeId] = useState(user?.college_id || 'AITS');
  const [academicYear] = useState('2024-2025');
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);

  // Fetch real-time preview data
  const { data: previewData, isLoading: isPreviewLoading } = useQuery({
    queryKey: ['nirfPreview', collegeId, academicYear],
    queryFn: async () => {
      const res = await accreditationAPI.getNirfPreview(collegeId, academicYear);
      return res.data.preview;
    }
  });

  // Poll for job status if we have a job ID
  const { data: jobStatusData } = useQuery({
    queryKey: ['reportJob', pollingJobId],
    queryFn: async () => {
      if (!pollingJobId) return null;
      const res = await accreditationAPI.getReportStatus(pollingJobId);
      return res.data;
    },
    enabled: !!pollingJobId,
    refetchInterval: (data: any) => {
      // Stop polling if completed or failed
      if (data?.status === 'COMPLETED' || data?.status === 'FAILED') {
        return false;
      }
      return 3000; // Poll every 3 seconds
    }
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await accreditationAPI.generateReport({
        report_type: 'NIRF',
        academic_year: academicYear
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success('Report generation triggered!');
      setPollingJobId(data.job_id);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to trigger report generation.');
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const isGenerating = generateMutation.isPending || 
    (jobStatusData && jobStatusData.status === 'PROCESSING') || 
    (jobStatusData && jobStatusData.status === 'PENDING');

  const downloadUrl = jobStatusData?.status === 'COMPLETED' ? jobStatusData.report_url : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] p-4 md:p-8 transition-colors text-slate-900 dark:text-slate-100 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Accreditation Command Center</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">NIRF 2024 Readiness & Generation Engine</p>
          </div>
          
          <div className="flex items-center gap-3">
            {downloadUrl ? (
              <a 
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
              >
                <Download size={18} />
                Download Official Report
              </a>
            ) : (
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || isPreviewLoading}
                className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors ${
                  (isGenerating || isPreviewLoading) ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                {isGenerating ? 'Generating PDF...' : 'Lock & Generate (ARQ)'}
              </button>
            )}
          </div>
        </div>

        {isPreviewLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
          </div>
        ) : previewData ? (
          <div className="flex flex-col gap-6">
            
            {/* Top Level Score */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl p-6 md:p-8 border border-indigo-100 dark:border-indigo-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">Estimated NIRF Score</h2>
                <p className="text-slate-500 dark:text-slate-400 m-0">Computed in real-time using Single Source of Truth (SSoT) engine.</p>
              </div>
              <div className="text-4xl md:text-5xl font-black text-indigo-600 dark:text-indigo-400">
                {previewData.final_score} <span className="text-xl font-semibold text-slate-400 dark:text-slate-500">/ 100</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* TLR Card */}
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold m-0">Teaching, Learning & Resources (TLR)</h3>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-lg">
                    {previewData.tlr.total_score} / 100
                  </span>
                </div>
                
                <div className="flex flex-col gap-4 text-sm mb-8">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">SS (Student Strength)</span>
                    <span className="font-semibold">{previewData.tlr.components.SS} / 20</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">FSR (Faculty-Student Ratio)</span>
                    <span className="font-semibold">{previewData.tlr.components.FSR} / 30</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">FQE (Qualification & Experience)</span>
                    <span className="font-semibold">{previewData.tlr.components.FQE} / 20</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">FRU (Financial Resources)</span>
                    <span className="font-semibold">{previewData.tlr.components.FRU} / 30</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-4">SSoT Data Drivers</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Faculty (F)</div>
                      <div className="font-bold text-lg">{previewData.tlr.raw_data.faculty_count}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Students (N)</div>
                      <div className="font-bold text-lg">{previewData.tlr.raw_data.student_count}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Ph.D. Percentage</div>
                      <div className="font-bold text-lg">{previewData.tlr.raw_data.phd_percentage.toFixed(1)}%</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg Experience</div>
                      <div className="font-bold text-lg">{previewData.tlr.raw_data.avg_experience.toFixed(1)} Yrs</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other metrics */}
              <div className="flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg m-0">RPII (20%)</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 m-0">Research & Professional Practice</p>
                  </div>
                  <span className="font-bold text-lg">{previewData.rp.total_score} / 100</span>
                </div>
                
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg m-0">GO (15%)</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 m-0">Graduation Outcomes</p>
                  </div>
                  <span className="font-bold text-lg">{previewData.go.total_score} / 100</span>
                </div>
                
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg m-0">OI (15%)</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 m-0">Outreach & Inclusivity</p>
                  </div>
                  <span className="font-bold text-lg">{previewData.oi.total_score} / 100</span>
                </div>
                
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg m-0">PR (10%)</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 m-0">Peer Perception</p>
                  </div>
                  <span className="font-bold text-lg">{previewData.pr.total_score} / 100</span>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
            <AlertTriangle size={32} className="mb-3 opacity-80" />
            <h3 className="font-semibold text-lg">Unable to load NIRF Data</h3>
            <p className="text-sm mt-1 opacity-80 max-w-sm">There was a problem communicating with the accreditation engine.</p>
          </div>
        )}
      </div>
    </div>
  );
}
