import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, QrCode, WarningCircle } from '@phosphor-icons/react';
import { feesAPI } from '../services/api';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

const ReceiptVerificationPage = () => {
  const { token } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    feesAPI.verifyReceipt(token)
      .then((res) => setReceipt(res.data))
      .catch(() => setError('Receipt verification failed'));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl soft-card p-8 text-center">
        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 ${error ? 'bg-rose-50 dark:bg-rose-500/15' : 'bg-emerald-50 dark:bg-emerald-500/15'}`}>
          {error ? <WarningCircle size={34} weight="duotone" className="text-rose-500" /> : <CheckCircle size={34} weight="duotone" className="text-emerald-500" />}
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">AcadMix Receipt Verification</p>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">{error || 'Receipt Verified'}</h1>
        {receipt ? (
          <div className="mt-8 text-left rounded-2xl bg-slate-50 dark:bg-white/[0.04] p-5 space-y-3">
            {[
              ['College', receipt.college_name],
              ['Receipt No', receipt.receipt_no],
              ['Invoice No', receipt.invoice_no || '-'],
              ['Student', `${receipt.student_name} (${receipt.student_id})`],
              ['Fee Head', receipt.fee_head],
              ['Amount', money(receipt.amount)],
              ['Mode', receipt.payment_mode],
              ['Paid At', receipt.paid_at ? new Date(receipt.paid_at).toLocaleString('en-IN') : '-'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-200/60 dark:border-white/10 pb-2 last:border-0 last:pb-0">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 text-right">{value}</span>
              </div>
            ))}
          </div>
        ) : !error ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm font-bold text-slate-500">
            <QrCode size={18} /> Verifying receipt...
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ReceiptVerificationPage;
