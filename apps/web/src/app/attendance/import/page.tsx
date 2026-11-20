'use client';

import { useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../components/shell/AppShell';
import { importAttendanceCsvApi } from '../../../lib/api';

interface PreviewRow {
  row: number;
  identifier: string;
  date: string;
  classType: string;
}

export default function AttendanceImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    batchId: string;
    totalRows: number;
    importedCount: number;
    errorCount: number;
    duplicateCount: number;
    errors: Array<{ rowNumber: number; reason: string }>;
  } | null>(null);

  const sampleCsv = `email,occurredAt,className
member-1@example.com,2026-06-25T09:30:00.000Z,Advanced Reformer Flow
member-2@example.com,2026-06-25T10:45:00.000Z,Tower & Core Sculpt
member-3@example.com,2026-06-25T11:30:00.000Z,Sunrise Mat Pilates`;

  const processCsvText = (text: string, name: string) => {
    setCsvContent(text);
    setFileName(name);
    setImportError(null);

    const lines = text.trim().split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setImportError('CSV file must have a header row and at least one data row.');
      return;
    }

    const rows: PreviewRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      rows.push({
        row: i,
        identifier: parts[0] || 'Unknown',
        date: parts[1] || new Date().toISOString(),
        classType: parts[2] || 'Studio Session',
      });
    }

    setPreviewRows(rows);
    setStep(2);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCsvText(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleUseSample = () => {
    processCsvText(sampleCsv, 'mindbody_export_june2026.csv');
  };

  const handleExecuteImport = async () => {
    setImporting(true);
    setImportError(null);

    try {
      const res = await importAttendanceCsvApi({
        csvContent,
        sourceName: fileName || 'import.csv',
      });
      setImportResult(res);
      setStep(3);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
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

        {importError && (
          <div className="p-4 rounded-xl bg-error-container text-on-error-container font-label-md flex items-center gap-2 shadow-xs">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{importError}</span>
          </div>
        )}

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
              CSV file must contain columns: <code className="bg-surface-container px-1 py-0.5 rounded text-sm">email</code> (or member_id),{' '}
              <code className="bg-surface-container px-1 py-0.5 rounded text-sm">occurredAt</code> (or checkedInAt), and{' '}
              <code className="bg-surface-container px-1 py-0.5 rounded text-sm">className</code>.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-3">
              <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container shadow-xs transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">file_upload</span>
                <span>Choose Local CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                type="button"
                onClick={handleUseSample}
                className="px-4 py-2.5 rounded-xl border border-border-delicate hover:bg-surface-container font-label-md text-label-md text-on-surface flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">draft</span>
                <span>Load Sample CSV</span>
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
                  Inspected {previewRows.length} data rows from file. Ready for server ingestion.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-sage-tint text-secondary font-label-sm font-semibold">
                Ready for Import
              </span>
            </div>

            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left border-collapse font-body-md text-body-md">
                <thead>
                  <tr className="border-b border-border-delicate text-on-surface-variant font-label-sm sticky top-0 bg-surface-container-lowest">
                    <th className="py-2.5 font-semibold">Row</th>
                    <th className="py-2.5 font-semibold">Identifier</th>
                    <th className="py-2.5 font-semibold">Date & Time</th>
                    <th className="py-2.5 font-semibold">Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-delicate">
                  {previewRows.map((row) => (
                    <tr key={row.row} className="hover:bg-surface-bright">
                      <td className="py-3 font-mono text-text-muted">{row.row}</td>
                      <td className="py-3 font-semibold text-on-surface">{row.identifier}</td>
                      <td className="py-3 font-mono text-body-sm">{row.date}</td>
                      <td className="py-3">{row.classType}</td>
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
                <span>{importing ? 'Importing Batch...' : `Execute Import (${previewRows.length} Rows)`}</span>
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
              Batch #{importResult?.batchId ? importResult.batchId.slice(0, 8).toUpperCase() : 'ATT-SYNC'} was committed.
            </p>

            <div className="grid grid-cols-3 gap-4 w-full max-w-md my-2">
              <div className="p-3 rounded-xl bg-surface-bright border border-border-delicate">
                <span className="font-label-sm text-text-muted block">Imported</span>
                <span className="font-headline-md font-bold text-secondary">{importResult?.importedCount ?? 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-bright border border-border-delicate">
                <span className="font-label-sm text-text-muted block">Duplicates</span>
                <span className="font-headline-md font-bold text-on-surface">{importResult?.duplicateCount ?? 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-bright border border-border-delicate">
                <span className="font-label-sm text-text-muted block">Errors</span>
                <span className="font-headline-md font-bold text-error">{importResult?.errorCount ?? 0}</span>
              </div>
            </div>

            {importResult?.errors && importResult.errors.length > 0 && (
              <div className="w-full max-w-md text-left p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-mono max-h-36 overflow-y-auto">
                <p className="font-bold mb-1">Row Errors:</p>
                {importResult.errors.map((err, idx) => (
                  <p key={idx}>Row {err.rowNumber}: {err.reason}</p>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <Link
                href="/attendance"
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container shadow-xs transition-all"
              >
                Go to Attendance Desk
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setCsvContent('');
                  setFileName(null);
                  setPreviewRows([]);
                  setImportResult(null);
                }}
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
