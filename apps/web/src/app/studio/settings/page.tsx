'use client';

import { useState, type FormEvent } from 'react';
import { AppShell } from '../../../components/shell/AppShell';
import { useAppSession } from '../../../components/shell/AppSession';

export default function SettingsPage() {
  return (
    <AppShell title="Studio Settings">
      <SettingsContent />
    </AppShell>
  );
}

function SettingsContent() {
  const { studio } = useAppSession();
  const [name, setName] = useState<string>(studio.name);
  const [branch, setBranch] = useState<string>('');
  const [timezone, setTimezone] = useState<string>(studio.timezone);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setSaved(true);
    globalThis.setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto gap-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              Studio Settings
            </h1>
            {studio.isSynthetic && (
              <span className="px-2.5 py-0.5 rounded-full bg-sage-tint border border-sage-border text-secondary font-label-sm text-label-sm font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                Synthetic Pilot Studio
              </span>
            )}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Configure studio brand profile, operating timezone, and attendance
            coverage rules.
          </p>
        </div>
        <span className="px-3 py-1 rounded-xl bg-surface-container border border-border-delicate font-mono text-label-sm text-on-surface-variant">
          ID: {studio.id.slice(0, 18)}...
        </span>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-sage-tint border border-sage-border text-secondary font-label-md text-label-md font-semibold flex items-center gap-2 shadow-xs">
          <span className="material-symbols-outlined text-[20px]">
            check_circle
          </span>
          <span>Studio settings saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-space-lg">
        {/* General Profile Section */}
        <div className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 md:p-8 shadow-xs flex flex-col gap-6">
          <div className="flex items-center gap-3 pb-3 border-b border-border-delicate">
            <span className="material-symbols-outlined text-primary text-[22px]">
              store
            </span>
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              Studio Identity & Location
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md font-medium text-on-surface">
                Studio Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md font-medium text-on-surface">
                Branch / Location
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md font-medium text-on-surface">
                Operating Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md"
              >
                <option value="Asia/Kolkata">
                  Asia/Kolkata (IST • UTC+05:30)
                </option>
                <option value="America/New_York">
                  America/New_York (EST • UTC-05:00)
                </option>
                <option value="Europe/London">
                  Europe/London (GMT • UTC+00:00)
                </option>
                <option value="Asia/Singapore">
                  Asia/Singapore (SGT • UTC+08:00)
                </option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md font-medium text-on-surface">
                Attendance Coverage Start
              </label>
              <input
                type="date"
                defaultValue=""
                className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container shadow-xs transition-all"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
