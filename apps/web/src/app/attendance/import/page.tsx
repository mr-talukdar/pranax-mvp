'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../components/shell/AppShell';

export default function AttendanceImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const sampleCsvData = [
    { row: 1, name: 'Sarah Jenkins', email: 'sarah.jenkins@example.com', date: '2026-06-25 09:30', class: 'Advanced Reformer Flow', status: 'MATCHED' },
    { row: 2, name: 'David Miller', email: 'david.miller@example.com', date: '2026-06-25 10:45', class: 'Tower & Core Sculpt', status: 'MATCHED' },
    { row: 3, name: 'Ayesha Morgan', email: 'ayesha.m@example.com', date: '2026-06-25 11:30', class: 'Sunrise Mat Pilates', status: 'MATCHED' },
    { row: 4, name: 'Unknown Visitor', email: 'unknown.guest@mail.com', date: '2026-06-25 12:00', class: 'Reformer 8-Pack Block', status: 'UNMATCHED' },
  ];

  const handleSimulateFile = () => {
    setFileName('mindbody_export_june2026.csv');
    setStep(2);
  };

  const handleExecuteImport = () => {
    setImporting(true);
    globalThis.setTimeout(() => {
      setImporting(false);
      setStep(3);
    }, 1200);
  };

  return (
    <AppShell title="Import Attendance">
      <div className="flex flex-col w-full max-w-4xl mx-auto gap-space-lg">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
          <Link href="/attendance" className="hover:text-on-surface transition-colors">
            Attendance
          </Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">CSV Import Wizard</span>
        </div>

        {/* Wizard Header */}
        <div className="flex flex-col">
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
            Import Attendance Records
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Batch-upload historic attendance records from Mindbody, Glofox, Mariana Tek, or custom CSV logs.
          </p>
        </div>

        {/* Stepper Bar */}
        <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl border border-border-delicate shadow-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-label-sm ${
                step >= 1 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              1
            </span>
            <span className="font-label-md text-label-md font-semibold text-on-surface">
              Upload File
            </span>
          </div>

          <div className="h-0.5 flex-1 mx-4 bg-border-delicate" />

          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-label-sm ${
                step >= 2 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              2
            </span>
            <span className="font-label-md text-label-md font-semibold text-on-surface">
              Review & Map
            </span>
          </div>

          <div className="h-0.5 flex-1 mx-4 bg-border-delicate" />

          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-label-sm ${
                step === 3 ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              3
            </span>
            <span className="font-label-md text-label-md font-semibold text-on-surface">
              Summary
            </span>
          </div>
        </div>

        {/* STEP 1: UPLOAD FILE */}
        {step === 1 && (
          <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-8 shadow-xs flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[36px]">upload_file</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Select or Drop CSV File
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              CSV file must contain columns: <code className="bg-surface-container px-1 py-0.5 rounded text-sm">email</code>,{' '}
              <code className="bg-surface-container px-1 py-0.5 rounded text-sm">checkedInAt</code>, and{' '}
              <code className="bg-surface-container px-1 py-0.5 rounded text-sm">className</code>.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-2">
              <button
                type="button"
                onClick={handleSimulateFile}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container shadow-xs transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">folder_open</span>
                <span>Select Sample Export (mindbody_export.csv)</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW & MAP */}
        {step === 2 && (
          <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 md:p-8 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-border-delicate">
              <div>
                <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  File Preview: {fileName}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Inspected 4 rows. 3 matched active studio members, 1 unmatched row flagged.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-sage-tint text-secondary font-label-sm font-semibold">
                Ready for Import
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-body-md text-body-md">
                <thead>
                  <tr className="border-b border-border-delicate text-on-surface-variant font-label-sm">
                    <th className="py-2.5 font-semibold">Row</th>
                    <th className="py-2.5 font-semibold">Member</th>
                    <th className="py-2.5 font-semibold">Email</th>
                    <th className="py-2.5 font-semibold">Date & Time</th>
                    <th className="py-2.5 font-semibold">Class</th>
                    <th className="py-2.5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-delicate">
                  {sampleCsvData.map((row) => (
                    <tr key={row.row} className="hover:bg-surface-bright">
                      <td className="py-3 font-mono text-text-muted">{row.row}</td>
                      <td className="py-3 font-semibold text-on-surface">{row.name}</td>
                      <td className="py-3 text-on-surface-variant">{row.email}</td>
                      <td className="py-3">{row.date}</td>
                      <td className="py-3">{row.class}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                            row.status === 'MATCHED'
                              ? 'bg-sage-tint text-secondary'
                              : 'bg-rose-tint text-rose-soft'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border-delicate">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border border-border-delicate hover:bg-surface-container font-label-md text-label-md text-on-surface"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container shadow-xs transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {importing ? 'hourglass_empty' : 'cloud_upload'}
                </span>
                <span>{importing ? 'Importing Batch...' : 'Execute Import (3 Records)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUMMARY */}
        {step === 3 && (
          <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-8 shadow-xs flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-sage-tint flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[36px]">task_alt</span>
            </div>
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
              Import Batch Completed
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              Batch #ATT-20260625-01 was successfully committed. 3 attendance records were linked to member profiles and queued for daily retention score updates.
            </p>

            <div className="flex items-center gap-3 mt-4">
              <Link
                href="/attendance"
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container shadow-xs transition-all"
              >
                Go to Attendance Desk
              </Link>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-border-delicate hover:bg-surface-container text-on-surface font-label-md text-label-md font-medium"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
