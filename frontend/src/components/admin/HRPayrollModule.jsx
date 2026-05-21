import React, { useEffect, useMemo, useState } from 'react';
import {
  Bank,
  Briefcase,
  CheckCircle,
  CurrencyInr,
  IdentificationCard,
  LockKey,
  MagnifyingGlass,
  Printer,
  Receipt,
  Users,
} from '@phosphor-icons/react';
import { hrPayrollAPI } from '../../services/api';

const emptyStaffForm = {
  user_id: '',
  employee_code: '',
  department: '',
  designation: '',
  employment_type: 'full_time',
  joining_date: '',
  bank_account: '',
  ifsc: '',
  pan: '',
  pf_number: '',
  esi_number: '',
  status: 'active',
};

const emptySalaryForm = {
  basic: 0,
  hra: 0,
  da: 0,
  allowances: 0,
  pf: 0,
  esi: 0,
  tds: 0,
  other_deductions: 0,
  effective_from: new Date().toISOString().slice(0, 10),
};

const inr = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const currentMonth = () => new Date().toISOString().slice(0, 7);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{label}</span>
    {children}
  </label>
);

const TextInput = ({ suffix, className = '', ...props }) => (
  <div className="relative">
    <input {...props} className={`soft-input w-full ${suffix ? 'pr-14' : ''} ${className}`} />
    {suffix && (
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
        {suffix}
      </span>
    )}
  </div>
);

const StatCard = ({ icon: Icon, label, value, tone = 'indigo' }) => {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15',
    emerald: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15',
    cyan: 'bg-cyan-50 text-cyan-500 dark:bg-cyan-500/15',
    amber: 'bg-amber-50 text-amber-500 dark:bg-amber-500/15',
  };
  return (
    <div className="soft-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{label}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone] || tones.indigo}`}>
          <Icon size={20} weight="duotone" />
        </div>
      </div>
      <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
    </div>
  );
};

const HRPayrollModule = () => {
  const [summary, setSummary] = useState(null);
  const [staff, setStaff] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [salaryForm, setSalaryForm] = useState(emptySalaryForm);
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const salaryNet = useMemo(() => {
    const gross =
      Number(salaryForm.basic || 0) +
      Number(salaryForm.hra || 0) +
      Number(salaryForm.da || 0) +
      Number(salaryForm.allowances || 0);
    const deductions =
      Number(salaryForm.pf || 0) +
      Number(salaryForm.esi || 0) +
      Number(salaryForm.tds || 0) +
      Number(salaryForm.other_deductions || 0);
    return { gross, deductions, net: gross - deductions };
  }, [salaryForm]);

  const load = async () => {
    setError('');
    const [summaryRes, staffRes, runsRes] = await Promise.all([
      hrPayrollAPI.summary(),
      hrPayrollAPI.searchStaff(query),
      hrPayrollAPI.listRuns(),
    ]);
    setSummary(summaryRes.data);
    setStaff(staffRes.data || []);
    setRuns(runsRes.data || []);
  };

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.detail || 'Could not load HR payroll data'));
  }, []);

  const selectStaff = (person) => {
    setSelectedStaff(person);
    setStaffForm({
      ...emptyStaffForm,
      ...person,
      user_id: person.user_id,
      joining_date: person.joining_date || '',
      status: person.status === 'not_onboarded' ? 'active' : person.status,
    });
    setSalaryForm({
      ...emptySalaryForm,
      ...(person.salary || {}),
      effective_from: person.salary?.effective_from || emptySalaryForm.effective_from,
    });
  };

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await hrPayrollAPI.searchStaff(query);
      setStaff(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Staff search failed');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!staffForm.user_id) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await hrPayrollAPI.saveStaffProfile({ ...staffForm, joining_date: staffForm.joining_date || null });
      setSelectedStaff(res.data);
      setMessage('Staff profile saved');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save staff profile');
    } finally {
      setLoading(false);
    }
  };

  const saveSalary = async () => {
    if (!selectedStaff?.id) {
      setError('Save the staff profile before adding salary');
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await hrPayrollAPI.saveSalaryStructure(selectedStaff.id, {
        ...salaryForm,
        effective_from: salaryForm.effective_from || null,
      });
      setSelectedStaff(res.data);
      setMessage('Salary structure saved');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save salary structure');
    } finally {
      setLoading(false);
    }
  };

  const generateRun = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await hrPayrollAPI.generateRun({ month });
      setSelectedRun(res.data);
      setMessage(`Payroll generated for ${month}`);
      const runsRes = await hrPayrollAPI.listRuns();
      setRuns(runsRes.data || []);
      const summaryRes = await hrPayrollAPI.summary();
      setSummary(summaryRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not generate payroll');
    } finally {
      setLoading(false);
    }
  };

  const openRun = async (runId) => {
    setLoading(true);
    setError('');
    try {
      const res = await hrPayrollAPI.getRun(runId);
      setSelectedRun(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load payroll run');
    } finally {
      setLoading(false);
    }
  };

  const lockRun = async () => {
    if (!selectedRun?.id) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await hrPayrollAPI.lockRun(selectedRun.id);
      setSelectedRun(res.data);
      setMessage('Payroll run locked and payslips issued');
      const runsRes = await hrPayrollAPI.listRuns();
      setRuns(runsRes.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not lock payroll run');
    } finally {
      setLoading(false);
    }
  };

  const printPayslip = (slip) => {
    const win = window.open('', '_blank', 'width=760,height=900');
    if (!win) return;
    const earnings = slip.components?.earnings || {};
    const deductions = slip.components?.deductions || {};
    win.document.write(`
      <html><head><title>Payslip ${slip.employee_code}</title>
      <style>body{font-family:Inter,Arial,sans-serif;color:#0f172a;padding:32px}.card{border:1px solid #dbe3ef;border-radius:18px;padding:28px}h1{margin:0 0 8px;font-size:28px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border-bottom:1px solid #e2e8f0;padding:12px;text-align:left}.total{font-size:24px;font-weight:800;color:#059669}</style>
      </head><body><div class="card">
      <h1>AcadMix Payslip</h1><p>${slip.month} - ${slip.status}</p>
      <p><strong>${slip.name}</strong> - ${slip.employee_code} - ${slip.designation || 'Staff'}</p>
      <table><tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr>
      <tr><td>Basic</td><td>${inr(earnings.basic)}</td><td>PF</td><td>${inr(deductions.pf)}</td></tr>
      <tr><td>HRA</td><td>${inr(earnings.hra)}</td><td>ESI</td><td>${inr(deductions.esi)}</td></tr>
      <tr><td>DA</td><td>${inr(earnings.da)}</td><td>TDS</td><td>${inr(deductions.tds)}</td></tr>
      <tr><td>Allowances</td><td>${inr(earnings.allowances)}</td><td>Other</td><td>${inr(deductions.other)}</td></tr>
      </table><p class="total">Net Pay: ${inr(slip.net_pay)}</p></div></body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div
          className={`rounded-2xl border px-5 py-4 font-bold ${
            error
              ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="Active Staff" value={summary?.active_staff || 0} />
        <StatCard icon={CurrencyInr} label="Monthly Gross" value={inr(summary?.monthly_gross)} tone="emerald" />
        <StatCard icon={Bank} label="Monthly Net" value={inr(summary?.monthly_net)} tone="cyan" />
        <StatCard icon={Receipt} label="Draft Runs" value={summary?.draft_runs || 0} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <div className="soft-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/15">
              <MagnifyingGlass size={22} weight="duotone" className="text-indigo-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Staff Directory</h3>
              <p className="text-sm font-medium text-slate-500">Onboard existing users into payroll</p>
            </div>
          </div>
          <div className="mb-4 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Name, email, role"
              className="soft-input flex-1"
            />
            <button onClick={search} disabled={loading} className="btn-primary px-4">
              <MagnifyingGlass size={18} weight="bold" />
            </button>
          </div>
          <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
            {staff.map((person) => (
              <button
                key={person.user_id}
                onClick={() => selectStaff(person)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  selectedStaff?.user_id === person.user_id
                    ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10'
                    : 'border-slate-100 bg-white hover:border-slate-200 dark:border-white/10 dark:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900 dark:text-white">{person.name}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{person.role}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${
                      person.status === 'not_onboarded' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {person.status === 'not_onboarded' ? 'New' : person.status}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {person.employee_code || 'No employee code'} - {person.department || 'Department not set'}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="soft-card overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-6 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/15">
                  <IdentificationCard size={24} weight="duotone" className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Staff Profile</h3>
                  <p className="text-sm font-medium text-slate-500">
                    {selectedStaff ? selectedStaff.name : 'Select a staff user to edit HR details'}
                  </p>
                </div>
              </div>
              {selectedStaff?.salary && (
                <div className="hidden text-right md:block">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Current Net</p>
                  <p className="text-2xl font-black text-emerald-500">{inr(selectedStaff.salary.net)}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Employee Code">
                    <TextInput value={staffForm.employee_code} onChange={(e) => setStaffForm({ ...staffForm, employee_code: e.target.value })} />
                  </Field>
                  <Field label="Employment Type">
                    <select value={staffForm.employment_type} onChange={(e) => setStaffForm({ ...staffForm, employment_type: e.target.value })} className="soft-input w-full">
                      <option value="full_time">Full Time</option>
                      <option value="contract">Contract</option>
                      <option value="visiting">Visiting</option>
                      <option value="part_time">Part Time</option>
                    </select>
                  </Field>
                  <Field label="Department">
                    <TextInput value={staffForm.department} onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })} />
                  </Field>
                  <Field label="Designation">
                    <TextInput value={staffForm.designation} onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })} />
                  </Field>
                  <Field label="Joining Date">
                    <TextInput type="date" value={staffForm.joining_date || ''} onChange={(e) => setStaffForm({ ...staffForm, joining_date: e.target.value })} />
                  </Field>
                  <Field label="Status">
                    <select value={staffForm.status} onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })} className="soft-input w-full">
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="relieved">Relieved</option>
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Bank Account">
                    <TextInput value={staffForm.bank_account} onChange={(e) => setStaffForm({ ...staffForm, bank_account: e.target.value })} />
                  </Field>
                  <Field label="IFSC">
                    <TextInput value={staffForm.ifsc} onChange={(e) => setStaffForm({ ...staffForm, ifsc: e.target.value.toUpperCase() })} />
                  </Field>
                  <Field label="PAN">
                    <TextInput value={staffForm.pan} onChange={(e) => setStaffForm({ ...staffForm, pan: e.target.value.toUpperCase() })} />
                  </Field>
                  <Field label="PF / ESI">
                    <div className="grid grid-cols-2 gap-2">
                      <TextInput value={staffForm.pf_number} onChange={(e) => setStaffForm({ ...staffForm, pf_number: e.target.value })} placeholder="PF" />
                      <TextInput value={staffForm.esi_number} onChange={(e) => setStaffForm({ ...staffForm, esi_number: e.target.value })} placeholder="ESI" />
                    </div>
                  </Field>
                </div>
                <button onClick={saveProfile} disabled={!staffForm.user_id || loading} className="btn-primary w-full justify-center">
                  <CheckCircle size={18} weight="bold" /> Save Staff Profile
                </button>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-black/10">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-500/15">
                    <CurrencyInr size={20} weight="duotone" className="text-cyan-500" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white">Salary Structure</h4>
                    <p className="text-sm font-medium text-slate-500">Earnings, deductions and net pay</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['basic', 'Basic'],
                    ['hra', 'HRA'],
                    ['da', 'DA'],
                    ['allowances', 'Allowances'],
                    ['pf', 'PF'],
                    ['esi', 'ESI'],
                    ['tds', 'TDS'],
                    ['other_deductions', 'Other Ded.'],
                  ].map(([key, label]) => (
                    <Field key={key} label={label}>
                      <TextInput type="number" min="0" value={salaryForm[key]} onChange={(e) => setSalaryForm({ ...salaryForm, [key]: e.target.value })} suffix="INR" />
                    </Field>
                  ))}
                  <Field label="Effective From">
                    <TextInput type="date" value={salaryForm.effective_from || ''} onChange={(e) => setSalaryForm({ ...salaryForm, effective_from: e.target.value })} />
                  </Field>
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Computed Net</p>
                    <p className="text-2xl font-black text-emerald-500">{inr(salaryNet.net)}</p>
                  </div>
                </div>
                <button onClick={saveSalary} disabled={!selectedStaff?.id || loading} className="btn-primary mt-5 w-full justify-center">
                  <Briefcase size={18} weight="bold" /> Save Salary Structure
                </button>
              </div>
            </div>
          </div>

          <div className="soft-card overflow-hidden">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 dark:border-white/10 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-500/15">
                  <Receipt size={24} weight="duotone" className="text-violet-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Payroll Run</h3>
                  <p className="text-sm font-medium text-slate-500">Generate, review, lock and print payslips</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="soft-input w-44" />
                <button onClick={generateRun} disabled={loading} className="btn-primary whitespace-nowrap">Generate Run</button>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr]">
              <div className="space-y-2 border-r border-slate-100 p-5 dark:border-white/10">
                {runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => openRun(run.id)}
                    className={`w-full rounded-2xl border p-4 text-left ${
                      selectedRun?.id === run.id
                        ? 'border-violet-300 bg-violet-50 dark:border-violet-500/40 dark:bg-violet-500/10'
                        : 'border-slate-100 bg-white hover:border-slate-200 dark:border-white/10 dark:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-black text-slate-900 dark:text-white">{run.month}</p>
                      <span className={`text-[11px] font-black uppercase ${run.status === 'locked' ? 'text-emerald-500' : 'text-amber-500'}`}>{run.status}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">{run.payslip_count || 0} payslips - {inr(run.net_pay)}</p>
                  </button>
                ))}
              </div>

              <div className="p-5">
                {selectedRun ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Staff</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{selectedRun.payslip_count}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Gross</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{inr(selectedRun.gross_pay)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Deductions</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{inr(selectedRun.deductions)}</p>
                      </div>
                      <button onClick={lockRun} disabled={selectedRun.status === 'locked' || loading} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">
                        <LockKey size={18} weight="bold" /> {selectedRun.status === 'locked' ? 'Locked' : 'Lock Run'}
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-white/10">
                            <th className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Employee</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Department</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Gross</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Deductions</th>
                            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Net</th>
                            <th className="px-3 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedRun.payslips || []).map((slip) => (
                            <tr key={slip.id} className="border-b border-slate-50 dark:border-white/5">
                              <td className="px-3 py-3">
                                <p className="font-black text-slate-900 dark:text-white">{slip.name}</p>
                                <p className="text-xs font-bold text-slate-400">{slip.employee_code} - {slip.designation || 'Staff'}</p>
                              </td>
                              <td className="px-3 py-3 font-semibold text-slate-500">{slip.department || '-'}</td>
                              <td className="px-3 py-3 text-right font-bold text-slate-700 dark:text-slate-200">{inr(slip.gross_pay)}</td>
                              <td className="px-3 py-3 text-right font-bold text-slate-700 dark:text-slate-200">{inr(slip.deductions)}</td>
                              <td className="px-3 py-3 text-right font-black text-emerald-500">{inr(slip.net_pay)}</td>
                              <td className="px-3 py-3 text-right">
                                <button onClick={() => printPayslip(slip)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:text-indigo-500 dark:border-white/10">
                                  <Printer size={18} weight="duotone" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                    <Receipt size={42} weight="duotone" className="mb-3 text-slate-300" />
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">No payroll run selected</h4>
                    <p className="text-sm font-medium text-slate-500">Generate a monthly run or open an existing run to review payslips.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRPayrollModule;
