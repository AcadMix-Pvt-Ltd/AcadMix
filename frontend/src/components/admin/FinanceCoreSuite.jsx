import React, { useEffect, useMemo, useState } from 'react';
import {
  Bank,
  Calculator,
  CheckCircle,
  CreditCard,
  CurrencyInr,
  MagnifyingGlass,
  Money,
  Printer,
  QrCode,
  Receipt,
  ShieldCheck,
  UploadSimple,
  WarningCircle,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { feesAPI } from '../../services/api';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
const shortDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

const modeLabels = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank',
  cheque: 'Cheque',
  adjustment: 'Adjustment',
};

const StatCard = ({ label, value, icon: Icon, tone = 'indigo' }) => (
  <div className="soft-card p-5">
    <div className="flex items-center justify-between mb-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${tone}-50 dark:bg-${tone}-500/15`}>
        <Icon size={20} weight="duotone" className={`text-${tone}-500`} />
      </div>
    </div>
    <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
  </div>
);

const ReceiptPanel = ({ receipt }) => {
  if (!receipt) return null;
  const verifyUrl = receipt.verification_token
    ? `${window.location.origin}/fees/verify/${receipt.verification_token}`
    : '';

  const printReceipt = () => {
    const lines = [
      'ACADMIX FEE RECEIPT',
      `Receipt No: ${receipt.receipt_no}`,
      `Invoice No: ${receipt.invoice_no || '-'}`,
      `Student: ${receipt.student_name} (${receipt.student_id})`,
      `Fee: ${receipt.fee_head}`,
      `Amount: ${money(receipt.amount)}`,
      `Mode: ${receipt.payment_mode}`,
      `Paid At: ${receipt.paid_at ? new Date(receipt.paid_at).toLocaleString('en-IN') : '-'}`,
      `Verify: ${verifyUrl}`,
    ].join('\n');
    const popup = window.open('', '_blank', 'width=720,height=760');
    if (!popup) return;
    popup.document.write(`<pre style="font: 15px/1.6 system-ui; padding: 32px; white-space: pre-wrap;">${lines}</pre>`);
    popup.document.close();
    popup.print();
  };

  return (
    <div className="soft-card p-5 border border-emerald-100 dark:border-emerald-500/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Verified Receipt</p>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">{receipt.receipt_no}</h3>
          <p className="text-sm font-semibold text-slate-500 mt-1">{receipt.student_name} - {receipt.fee_head}</p>
        </div>
        <button onClick={printReceipt} className="btn-primary flex items-center gap-2">
          <Printer size={16} weight="bold" /> Print
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-sm">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</p>
          <p className="font-black text-slate-900 dark:text-white">{money(receipt.amount)}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mode</p>
          <p className="font-black text-slate-900 dark:text-white">{modeLabels[receipt.payment_mode] || receipt.payment_mode}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice</p>
          <p className="font-black text-slate-900 dark:text-white">{receipt.invoice_no || '-'}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
          <p className="font-black text-emerald-500">Verified</p>
        </div>
      </div>
      {verifyUrl && (
        <div className="mt-5 flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.04]">
          <div className="w-20 h-20 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] grid grid-cols-5 gap-0.5 p-2">
            {Array.from({ length: 25 }).map((_, i) => {
              const filled = (receipt.verification_token.charCodeAt(i % receipt.verification_token.length) + i) % 3 !== 0;
              return <span key={i} className={`rounded-[2px] ${filled ? 'bg-slate-900 dark:bg-white' : 'bg-transparent'}`} />;
            })}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><QrCode size={14} /> Verification Link</p>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 break-all mt-1">{verifyUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const CashierWorkspace = () => {
  const [session, setSession] = useState(null);
  const [openingCash, setOpeningCash] = useState('0');
  const [actualCash, setActualCash] = useState('');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [dayClose, setDayClose] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadSession = async () => {
    const [{ data: sessionRes }, { data: closeRes }] = await Promise.all([
      feesAPI.currentCashierSession(),
      feesAPI.cashierDayClose(),
    ]);
    setSession(sessionRes.session);
    setDayClose(closeRes);
  };

  useEffect(() => { loadSession().catch(() => {}); }, []);

  const openSession = async () => {
    setBusy(true);
    try {
      await feesAPI.openCashierSession({ opening_cash: Number(openingCash || 0) });
      toast.success('Cash counter opened');
      await loadSession();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not open counter');
    }
    setBusy(false);
  };

  const closeSession = async () => {
    setBusy(true);
    try {
      await feesAPI.closeCashierSession({ actual_cash: Number(actualCash || 0), notes: 'Closed from cashier dashboard' });
      toast.success('Cash counter closed');
      setActualCash('');
      await loadSession();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not close counter');
    }
    setBusy(false);
  };

  const findStudents = async () => {
    const { data } = await feesAPI.searchStudents(search);
    setStudents(data || []);
  };

  const loadLedger = async (student) => {
    const { data } = await feesAPI.studentLedger(student.id);
    setLedger(data);
    const firstDue = (data.invoices || []).find((inv) => inv.due > 0);
    setSelectedInvoice(firstDue?.invoice_id || '');
    setAmount(firstDue ? String(firstDue.due) : '');
    setReceivedFrom(data.student?.name || '');
  };

  const collect = async () => {
    if (!selectedInvoice) return toast.error('Select an invoice');
    setBusy(true);
    try {
      const { data } = await feesAPI.collectCashierFee({
        invoice_id: selectedInvoice,
        amount: Number(amount || 0),
        payment_mode: paymentMode,
        received_from: receivedFrom,
        remarks: 'Cashier collection',
      });
      setReceipt(data);
      toast.success('Payment collected');
      await loadSession();
      if (ledger?.student?.id) {
        const refreshed = await feesAPI.studentLedger(ledger.student.id);
        setLedger(refreshed.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Collection failed');
    }
    setBusy(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
      <div className="space-y-5">
        <div className="soft-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center">
              <Money size={20} weight="duotone" className="text-emerald-500" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">Cash Counter</h3>
              <p className="text-xs font-semibold text-slate-500">{session ? 'Session is open' : 'Open a session to collect'}</p>
            </div>
          </div>
          {!session ? (
            <div className="space-y-3">
              <input className="soft-input w-full" type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} placeholder="Opening cash" />
              <button disabled={busy} onClick={openSession} className="btn-primary w-full">Open Counter</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Opening</p>
                  <p className="font-black">{money(session.opening_cash)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Collected</p>
                  <p className="font-black">{money(dayClose?.total)}</p>
                </div>
              </div>
              <input className="soft-input w-full" type="number" value={actualCash} onChange={(e) => setActualCash(e.target.value)} placeholder="Actual closing cash" />
              <button disabled={busy || !actualCash} onClick={closeSession} className="w-full px-4 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black">Close Counter</button>
            </div>
          )}
        </div>

        <div className="soft-card p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-3">Student Search</h3>
          <div className="flex gap-2">
            <input className="soft-input flex-1" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, ID, roll no" />
            <button onClick={findStudents} className="px-4 rounded-xl bg-indigo-500 text-white"><MagnifyingGlass weight="bold" /></button>
          </div>
          <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
            {students.map((s) => (
              <button key={s.id} onClick={() => loadLedger(s)} className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-sm text-slate-900 dark:text-white">{s.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{s.roll_number || s.college_id} {s.department ? `- ${s.department}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-black ${Number(s.total_due || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{money(s.total_due)}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.due_invoice_count || 0} due</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {ledger ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Student" value={ledger.student.name} icon={ShieldCheck} tone="indigo" />
              <StatCard label="Total Billed" value={money(ledger.summary.total_billed)} icon={Calculator} tone="amber" />
              <StatCard label="Total Paid" value={money(ledger.summary.total_paid)} icon={CheckCircle} tone="emerald" />
              <StatCard label="Total Due" value={money(ledger.summary.total_due)} icon={WarningCircle} tone="rose" />
            </div>
            <div className="soft-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                <h3 className="font-black text-slate-900 dark:text-white">Student Ledger</h3>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{ledger.student.college_id}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      {['Invoice', 'Fee', 'Due Date', 'Amount', 'Paid', 'Due', 'Status'].map((h) => <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {ledger.invoices.map((inv) => (
                      <tr key={inv.invoice_id}>
                        <td className="px-4 py-3 font-bold">{inv.invoice_no || '-'}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold">{inv.fee_type}</p>
                          {inv.description && <p className="text-xs text-slate-400 mt-0.5">{inv.description}</p>}
                        </td>
                        <td className="px-4 py-3">{shortDate(inv.due_date)}</td>
                        <td className="px-4 py-3">{money(inv.total_amount)}</td>
                        <td className="px-4 py-3 text-emerald-500 font-bold">{money(inv.paid)}</td>
                        <td className="px-4 py-3 text-rose-500 font-bold">{money(inv.due)}</td>
                        <td className="px-4 py-3">{inv.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="soft-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10">
                <h3 className="font-black text-slate-900 dark:text-white">Payment History</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {(ledger.payments || []).length ? ledger.payments.map((payment) => (
                  <div key={payment.payment_id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black text-sm text-slate-900 dark:text-white">{payment.receipt_no || 'Pending receipt'}</p>
                      <p className="text-xs font-semibold text-slate-500">{modeLabels[payment.payment_mode] || payment.payment_mode} - {shortDate(payment.paid_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-500">{money(payment.amount)}</p>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{payment.status}</p>
                    </div>
                  </div>
                )) : (
                  <div className="px-5 py-6 text-sm font-semibold text-slate-500">No payment records yet.</div>
                )}
              </div>
            </div>

            <div className="soft-card p-5">
              <h3 className="font-black text-slate-900 dark:text-white mb-4">Collect Payment</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <select className="soft-input md:col-span-2" value={selectedInvoice} onChange={(e) => {
                  setSelectedInvoice(e.target.value);
                  const inv = ledger.invoices.find((x) => x.invoice_id === e.target.value);
                  if (inv) setAmount(String(inv.due));
                }}>
                  {ledger.invoices.filter((inv) => inv.due > 0).map((inv) => <option key={inv.invoice_id} value={inv.invoice_id}>{inv.fee_type} - {money(inv.due)}</option>)}
                </select>
                <input className="soft-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
                <select className="soft-input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                  {Object.entries(modeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button disabled={busy || !session} onClick={collect} className="btn-primary">Collect</button>
              </div>
              {!session && <p className="text-xs font-bold text-rose-500 mt-3">Open a cashier session before collecting fees.</p>}
            </div>
          </>
        ) : (
          <div className="soft-card p-12 text-center">
            <Receipt size={44} weight="duotone" className="mx-auto text-slate-300 mb-3" />
            <h3 className="font-black text-xl text-slate-900 dark:text-white">Search a student to start collection</h3>
            <p className="text-sm font-semibold text-slate-500 mt-1">Ledger, dues, partial payments, and receipts appear here.</p>
          </div>
        )}
        <ReceiptPanel receipt={receipt} />
      </div>
    </div>
  );
};

const FinanceWorkspace = () => {
  const [summary, setSummary] = useState(null);
  const [structure, setStructure] = useState({ name: 'Tuition Fee 2026-27', academic_year: '2026-27', department: '', batch: '', category: 'General', status: 'active' });
  const [createdStructure, setCreatedStructure] = useState(null);
  const [item, setItem] = useState({ fee_head: 'Tuition Fee', amount: '85000', refundable: false, sort_order: 1 });
  const [allocationStudents, setAllocationStudents] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [financeStudents, setFinanceStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [concession, setConcession] = useState({ student_id: '', invoice_id: '', amount: '', reason: '' });
  const [refund, setRefund] = useState({ student_id: '', invoice_id: '', payment_id: '', amount: '', reason: '' });
  const [receiptNo, setReceiptNo] = useState('');
  const [receipt, setReceipt] = useState(null);

  const loadSummary = async () => {
    const { data } = await feesAPI.financeSummary();
    setSummary(data);
  };

  useEffect(() => { loadSummary().catch(() => {}); }, []);

  const createStructure = async () => {
    const { data } = await feesAPI.createFeeStructure(structure);
    setCreatedStructure(data);
    toast.success('Fee structure created');
  };

  const addItem = async () => {
    if (!createdStructure?.id) return toast.error('Create a fee structure first');
    await feesAPI.addFeeStructureItem(createdStructure.id, { ...item, amount: Number(item.amount), sort_order: Number(item.sort_order || 0) });
    toast.success('Fee head added');
  };

  const allocate = async () => {
    if (!createdStructure?.id) return toast.error('Create a fee structure first');
    const student_ids = allocationStudents.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean);
    if (!student_ids.length) return toast.error('Select or paste at least one student');
    const { data } = await feesAPI.generateAllocations({ structure_id: createdStructure.id, student_ids });
    toast.success(`Generated ${data.created} invoices`);
    loadSummary();
  };

  const searchFinanceStudents = async () => {
    const { data } = await feesAPI.searchStudents(studentSearch);
    setFinanceStudents(data || []);
  };

  const addAllocationStudent = (student) => {
    const existing = allocationStudents.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean);
    if (!existing.includes(student.id)) {
      setAllocationStudents([...existing, student.id].join('\n'));
    }
  };

  const openStudentLedger = async (student) => {
    const { data } = await feesAPI.studentLedger(student.id);
    setSelectedStudent(data);
    const firstDue = (data.invoices || []).find((inv) => inv.due > 0) || data.invoices?.[0];
    if (firstDue) {
      setConcession((prev) => ({ ...prev, student_id: data.student.id, invoice_id: firstDue.invoice_id }));
      setRefund((prev) => ({ ...prev, student_id: data.student.id, invoice_id: firstDue.invoice_id }));
    }
  };

  const submitConcession = async () => {
    await feesAPI.createConcession({ ...concession, amount: Number(concession.amount) });
    toast.success('Concession request recorded');
    setConcession({ student_id: '', invoice_id: '', amount: '', reason: '' });
    loadSummary();
  };

  const submitRefund = async () => {
    await feesAPI.createRefund({ ...refund, payment_id: refund.payment_id || null, amount: Number(refund.amount) });
    toast.success('Refund request recorded');
    setRefund({ student_id: '', invoice_id: '', payment_id: '', amount: '', reason: '' });
    loadSummary();
  };

  const lookupReceipt = async () => {
    const { data } = await feesAPI.getReceipt(receiptNo);
    setReceipt(data);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Billed" value={money(summary?.total_billed)} icon={Calculator} tone="indigo" />
        <StatCard label="Collected" value={money(summary?.total_collected)} icon={CurrencyInr} tone="emerald" />
        <StatCard label="Pending Due" value={money(summary?.total_due)} icon={WarningCircle} tone="rose" />
        <StatCard label="Collection Rate" value={`${summary?.collection_rate || 0}%`} icon={Bank} tone="amber" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Invoices" value={summary?.invoice_count || 0} icon={Receipt} tone="slate" />
        <StatCard label="Students With Dues" value={summary?.students_with_dues || 0} icon={ShieldCheck} tone="indigo" />
        <StatCard label="Overdue Invoices" value={summary?.overdue_invoices || 0} icon={WarningCircle} tone="rose" />
        <StatCard label="Concessions" value={money(summary?.approved_concessions)} icon={CheckCircle} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <div className="soft-card p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-4">Student Fee Lookup</h3>
          <div className="flex gap-2">
            <input className="soft-input flex-1" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Name, roll no, college ID" />
            <button onClick={searchFinanceStudents} className="px-4 rounded-xl bg-indigo-500 text-white"><MagnifyingGlass weight="bold" /></button>
          </div>
          <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
            {financeStudents.map((student) => (
              <div key={student.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => openStudentLedger(student)} className="text-left min-w-0">
                    <p className="font-black text-sm text-slate-900 dark:text-white">{student.name}</p>
                    <p className="text-xs font-semibold text-slate-500 truncate">{student.roll_number || student.college_id} {student.department ? `- ${student.department}` : ''}</p>
                  </button>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${Number(student.total_due || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{money(student.total_due)}</p>
                    <button onClick={() => addAllocationStudent(student)} className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Add</button>
                  </div>
                </div>
              </div>
            ))}
            {!financeStudents.length && <p className="text-sm font-semibold text-slate-500 py-4">Search students to view existing fee records.</p>}
          </div>
        </div>

        <div className="soft-card overflow-hidden">
          {selectedStudent ? (
            <>
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">{selectedStudent.student.name}</h3>
                  <p className="text-xs font-bold text-slate-500">{selectedStudent.student.roll_number || selectedStudent.student.college_id} - {selectedStudent.student.department || 'Department not set'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outstanding</p>
                  <p className="text-xl font-black text-rose-500">{money(selectedStudent.summary.total_due)}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-white/5">
                    <tr>
                      {['Invoice', 'Fee', 'Billed', 'Paid', 'Due', 'Status'].map((h) => <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {(selectedStudent.invoices || []).map((inv) => (
                      <tr key={inv.invoice_id}>
                        <td className="px-4 py-3 font-bold">{inv.invoice_no || '-'}</td>
                        <td className="px-4 py-3">{inv.fee_type}</td>
                        <td className="px-4 py-3">{money(inv.total_amount)}</td>
                        <td className="px-4 py-3 text-emerald-500 font-bold">{money(inv.paid)}</td>
                        <td className="px-4 py-3 text-rose-500 font-bold">{money(inv.due)}</td>
                        <td className="px-4 py-3">{inv.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-10 text-center">
              <Receipt size={42} weight="duotone" className="mx-auto text-slate-300 mb-3" />
              <h3 className="font-black text-xl text-slate-900 dark:text-white">Select a student ledger</h3>
              <p className="text-sm font-semibold text-slate-500 mt-1">Existing invoices, paid amounts, dues, and receipts will appear here.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="soft-card p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-4">Fee Structure Builder</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="soft-input" value={structure.name} onChange={(e) => setStructure({ ...structure, name: e.target.value })} placeholder="Structure name" />
            <input className="soft-input" value={structure.academic_year} onChange={(e) => setStructure({ ...structure, academic_year: e.target.value })} placeholder="Academic year" />
            <input className="soft-input" value={structure.department} onChange={(e) => setStructure({ ...structure, department: e.target.value })} placeholder="Department filter" />
            <input className="soft-input" value={structure.batch} onChange={(e) => setStructure({ ...structure, batch: e.target.value })} placeholder="Batch filter" />
          </div>
          <button onClick={createStructure} className="btn-primary mt-4">Create Structure</button>
          {createdStructure && <p className="text-xs font-bold text-emerald-500 mt-3">Active draft: {createdStructure.name}</p>}

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/10">
            <h4 className="font-black text-sm text-slate-700 dark:text-slate-200 mb-3">Add Fee Head</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input className="soft-input md:col-span-2" value={item.fee_head} onChange={(e) => setItem({ ...item, fee_head: e.target.value })} placeholder="Fee head" />
              <input className="soft-input" type="number" value={item.amount} onChange={(e) => setItem({ ...item, amount: e.target.value })} placeholder="Amount" />
              <button onClick={addItem} className="px-4 py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black">Add</button>
            </div>
          </div>
        </div>

        <div className="soft-card p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-4">Allocation Generator</h3>
          <textarea className="soft-input w-full min-h-32" value={allocationStudents} onChange={(e) => setAllocationStudents(e.target.value)} placeholder="Student IDs selected from lookup appear here. You can also paste UUIDs separated by comma or newline." />
          <button onClick={allocate} className="btn-primary mt-4 flex items-center gap-2"><UploadSimple size={16} /> Generate Invoices</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="soft-card p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-4">Dues By Department</h3>
          <div className="space-y-3">
            {(summary?.by_department || []).map((row) => (
              <div key={row.department} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-sm text-slate-900 dark:text-white">{row.department}</p>
                  <p className="font-black text-sm">{money(row.billed)}</p>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">{row.invoice_count} invoices</p>
              </div>
            ))}
            {!summary?.by_department?.length && <p className="text-sm font-semibold text-slate-500">No department fee data yet.</p>}
          </div>
        </div>

        <div className="soft-card p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-4">Fee Head Mix</h3>
          <div className="space-y-3">
            {(summary?.by_fee_type || []).map((row) => (
              <div key={row.fee_type} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-sm text-slate-900 dark:text-white">{row.fee_type}</p>
                  <p className="font-black text-sm">{money(row.billed)}</p>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">{row.invoice_count} invoices</p>
              </div>
            ))}
            {!summary?.by_fee_type?.length && <p className="text-sm font-semibold text-slate-500">No fee heads found.</p>}
          </div>
        </div>

        <div className="soft-card p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-4">Recent Collections</h3>
          <div className="space-y-3">
            {(summary?.recent_payments || []).map((payment) => (
              <div key={payment.payment_id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-sm text-slate-900 dark:text-white">{payment.student_name}</p>
                    <p className="text-xs font-semibold text-slate-500">{payment.receipt_no || payment.fee_type} - {shortDate(payment.paid_at)}</p>
                  </div>
                  <p className="font-black text-emerald-500">{money(payment.amount)}</p>
                </div>
              </div>
            ))}
            {!summary?.recent_payments?.length && <p className="text-sm font-semibold text-slate-500">No successful collections yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="soft-card p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-4">Concession Request</h3>
          <div className="space-y-3">
            {selectedStudent && (
              <select className="soft-input w-full" value={concession.invoice_id} onChange={(e) => {
                const inv = selectedStudent.invoices.find((x) => x.invoice_id === e.target.value);
                setConcession({ ...concession, student_id: selectedStudent.student.id, invoice_id: e.target.value, amount: concession.amount || String(Math.min(inv?.due || 0, inv?.total_amount || 0)) });
              }}>
                {(selectedStudent.invoices || []).map((inv) => <option key={inv.invoice_id} value={inv.invoice_id}>{inv.fee_type} - due {money(inv.due)}</option>)}
              </select>
            )}
            {['student_id', 'invoice_id', 'amount', 'reason'].map((key) => (
              <input key={key} className="soft-input w-full" value={concession[key]} onChange={(e) => setConcession({ ...concession, [key]: e.target.value })} placeholder={key.replace('_', ' ')} />
            ))}
            <button onClick={submitConcession} className="btn-primary w-full">Record Concession</button>
          </div>
        </div>

        <div className="soft-card p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-4">Refund Request</h3>
          <div className="space-y-3">
            {selectedStudent && (
              <select className="soft-input w-full" value={refund.payment_id} onChange={(e) => {
                const payment = (selectedStudent.payments || []).find((x) => x.payment_id === e.target.value);
                setRefund({
                  ...refund,
                  student_id: selectedStudent.student.id,
                  invoice_id: payment?.invoice_id || refund.invoice_id,
                  payment_id: e.target.value,
                  amount: refund.amount || String(payment?.amount || ''),
                });
              }}>
                <option value="">Select paid receipt</option>
                {(selectedStudent.payments || []).filter((p) => p.status === 'success').map((p) => <option key={p.payment_id} value={p.payment_id}>{p.receipt_no || p.payment_id} - {money(p.amount)}</option>)}
              </select>
            )}
            {['student_id', 'invoice_id', 'payment_id', 'amount', 'reason'].map((key) => (
              <input key={key} className="soft-input w-full" value={refund[key]} onChange={(e) => setRefund({ ...refund, [key]: e.target.value })} placeholder={key.replace('_', ' ')} />
            ))}
            <button onClick={submitRefund} className="btn-primary w-full">Record Refund</button>
          </div>
        </div>

        <div className="soft-card p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-4">Receipt Search</h3>
          <div className="flex gap-2">
            <input className="soft-input flex-1" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder="RCPT-26-000001" />
            <button onClick={lookupReceipt} className="px-4 rounded-xl bg-indigo-500 text-white"><MagnifyingGlass weight="bold" /></button>
          </div>
          <div className="mt-4">
            <ReceiptPanel receipt={receipt} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function FinanceCoreSuite({ defaultView = 'cashier', allowedViews = ['cashier', 'finance'] }) {
  const [view, setView] = useState(defaultView);
  const visibleViews = useMemo(() => allowedViews, [allowedViews]);

  return (
    <div className="space-y-6">
      {visibleViews.length > 1 && (
        <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-xl w-fit">
          {visibleViews.map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2 ${view === v ? 'bg-white dark:bg-[#1A202C] text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
              {v === 'cashier' ? <CreditCard size={16} /> : <Bank size={16} />} {v === 'cashier' ? 'Cashier Counter' : 'Finance Office'}
            </button>
          ))}
        </div>
      )}
      {view === 'cashier' ? <CashierWorkspace /> : <FinanceWorkspace />}
    </div>
  );
}
