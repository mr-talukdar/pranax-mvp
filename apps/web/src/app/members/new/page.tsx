'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../components/shell/AppShell';
import { createMemberApi } from '../../../lib/api';

export default function NewMemberPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState('Unlimited Reformer Monthly');
  const [startDate, setStartDate] = useState('2026-06-25');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [healthNotes, setHealthNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createMemberApi({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      router.push(`/members/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register member.');
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Add New Member">
      <div className="flex flex-col w-full max-w-4xl mx-auto gap-space-lg">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
          <Link href="/members" className="hover:text-on-surface transition-colors">
            Members
          </Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">New Registration</span>
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between pb-2">
          <div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
              Add New Member
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Create a member record for class bookings, attendance check-ins, and retention scoring.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-error-container text-on-error-container font-body-md text-body-md flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-lg">
          {/* Section 1: Basic Identity & Contact */}
          <section className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 md:p-8 flex flex-col gap-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border-delicate">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                    Basic Identity & Contact Details
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Core profile information for roster management and notifications.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-surface-container border border-border-delicate font-label-sm text-label-sm text-on-surface-variant font-medium">
                Section 01 / 02
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-medium text-on-surface">
                  First Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Elena"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-outline"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-medium text-on-surface">
                  Last Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Rostova"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-outline"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-medium text-on-surface">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elena.r@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-outline"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-medium text-on-surface">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98300 12345"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-outline"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Membership & Passes */}
          <section className="bg-surface-container-lowest rounded-2xl border border-border-delicate p-6 md:p-8 flex flex-col gap-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border-delicate">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">card_membership</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                    Initial Membership Pass
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Assign a pass or pack to unlock immediate booking and check-in rights.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-surface-container border border-border-delicate font-label-sm text-label-sm text-on-surface-variant font-medium">
                Section 02 / 02
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-medium text-on-surface">
                  Select Membership Tier / Pack
                </label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                >
                  <option value="Unlimited Reformer Monthly">Unlimited Reformer Monthly — ₹12,500/mo</option>
                  <option value="Mat & Tower 10-Pack">Mat & Tower 10-Pack — ₹8,500 (60 days)</option>
                  <option value="Monthly All-Access">Monthly All-Access — ₹15,000/mo</option>
                  <option value="Reformer 8-Pack">Reformer 8-Pack — ₹7,500 (45 days)</option>
                  <option value="Quarterly Unlimited">Quarterly Unlimited — ₹32,000</option>
                  <option value="Trial 14-Day Pass">Trial 14-Day Pass — ₹1,999</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-medium text-on-surface">
                  Membership Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Emergency Contact Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-medium text-on-surface">
                  Emergency Contact Name (Optional)
                </label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="e.g. Marcus Morgan (Spouse)"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-medium text-on-surface">
                  Emergency Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+91 98765 01234"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Health & Movement Notes */}
            <div className="flex flex-col gap-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md font-medium text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    health_and_safety
                  </span>
                  Movement & Health Considerations (Optional)
                </label>
                <span className="font-label-sm text-label-sm text-secondary font-medium">
                  Visible to Instructors
                </span>
              </div>
              <textarea
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                placeholder="Document modifications, injuries (e.g. tight hamstrings, avoid cervical spine loading, prenatal modifications)..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-bright border border-border-delicate text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-outline resize-none"
              />
            </div>
          </section>

          {/* Sticky Action Footer */}
          <div className="sticky bottom-4 z-30 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-5 border border-border-delicate shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[18px] text-outline">lock</span>
              <span>Drafting member profile for ARS Pilates & Fitness roster.</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Link
                href="/members"
                className="px-5 py-2.5 rounded-xl border border-border-delicate bg-surface-container-lowest text-on-surface font-label-md text-label-md font-medium hover:bg-surface-container transition-colors text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary font-label-md text-label-md font-medium text-on-primary hover:bg-primary-container shadow-xs transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {submitting ? 'hourglass_empty' : 'check'}
                </span>
                <span>{submitting ? 'Saving Member...' : 'Register Member'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
