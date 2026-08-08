import React from 'react';
import { FiCheck, FiShield } from 'react-icons/fi';

export default function AdoptionLegalBrief() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-900">
        <header className="mb-8 border-b-2 border-slate-200 pb-6 text-center dark:border-slate-800">
          <div className="mb-4 flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-civic-50 text-civic-700 dark:bg-civic-500/10 dark:text-civic-300">
              <FiShield className="h-8 w-8" />
            </span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900 dark:text-white">Legal Review Brief — Adoption Record</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">AI Powered Orphanage Child Safety Management System</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Generated: {new Date().toLocaleDateString('en-IN')} | CONFIDENTIAL</p>
        </header>

        <section className="mb-8">
          <h2 className="mb-4 border-b border-slate-200 pb-2 text-lg font-bold text-civic-700 dark:border-slate-800 dark:text-civic-400">1. RECORD IDENTIFICATION</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Adoption ID</p>
              <p className="font-medium text-slate-900 dark:text-white">ADO-2026-9F8A-7B2C</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Orphanage</p>
              <p className="font-medium text-slate-900 dark:text-white">Sunshine Children's Home</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Child</p>
              <p className="font-medium text-slate-900 dark:text-white">Ravi Kumar (CHD-0001)</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Adoptive Parent</p>
              <p className="font-medium text-slate-900 dark:text-white">Priya Sharma</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 border-b border-slate-200 pb-2 text-lg font-bold text-civic-700 dark:border-slate-800 dark:text-civic-400">2. KEY CLAUSES</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Legal Process Started</p>
              <p className="font-medium text-slate-900 dark:text-white">01 Jul 2026</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed Date</p>
              <p className="font-medium text-slate-900 dark:text-white">08 Aug 2026</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Court Name</p>
              <p className="font-medium text-slate-900 dark:text-white">District Family Court, New Delhi</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Court Case Number</p>
              <p className="font-medium text-slate-900 dark:text-white">ADO/2026/1234</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Court Order Date</p>
              <p className="font-medium text-slate-900 dark:text-white">15 Jul 2026</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">CARA Reference</p>
              <p className="font-medium text-slate-900 dark:text-white">CARA/2026/1234</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Required Documents</p>
              <p className="font-medium text-slate-900 dark:text-white">8 of 8 verified</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 border-b border-slate-200 pb-2 text-lg font-bold text-civic-700 dark:border-slate-800 dark:text-civic-400">3. VERIFICATION STATUS</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Adoption Status</p>
              <p className="font-bold text-green-600 dark:text-green-400">COMPLETED ✓</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Parent Verification</p>
              <p className="font-bold text-green-600 dark:text-green-400">APPROVED ✓</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Parent KYC</p>
              <p className="font-bold text-green-600 dark:text-green-400">APPROVED ✓</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Police Clearance</p>
              <p className="font-bold text-green-600 dark:text-green-400">CLEARED ✓</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 border-b border-slate-200 pb-2 text-lg font-bold text-civic-700 dark:border-slate-800 dark:text-civic-400">4. DETECTED ISSUES</h2>
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-300">
            <FiCheck className="h-5 w-5" />
            <span className="font-bold">No issues detected — all checks passed.</span>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 border-b border-slate-200 pb-2 text-lg font-bold text-civic-700 dark:border-slate-800 dark:text-civic-400">5. REVIEWER NOTES</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reviewed By</p>
              <p className="font-medium text-slate-900 dark:text-white">Admin Officer (System)</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Review Date</p>
              <p className="font-medium text-slate-900 dark:text-white">08 Aug 2026</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">General Notes</p>
              <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-4 italic text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                All documents verified and in order. The parent has passed all AI and background checks. Recommended for final approval.
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Police/Background Notes</p>
              <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-4 italic text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                Background check clear. No criminal record found across national database. Verification complete.
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <p>This is a system generated document and does not require a signature.</p>
          <p>Document ID: ADO-SAMPLE-123456</p>
        </footer>
      </div>
    </div>
  );
}
