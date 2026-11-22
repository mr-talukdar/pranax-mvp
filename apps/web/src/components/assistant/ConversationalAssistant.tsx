'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  assistantAnswerSchema,
  assistantSuggestionsResponseSchema,
  type AssistantAnswer,
  type AssistantOperation,
  type AssistantSuggestionsResponse,
} from '@pranax/contracts';

interface ConversationEntry {
  role: 'user' | 'assistant';
  content: string;
  operation?: AssistantOperation | null;
  scope?: AssistantAnswer['scope'];
  evidence?: AssistantAnswer['evidence'];
  mode?: AssistantAnswer['mode'];
}

function getResponseData(value: unknown): unknown {
  if (
    typeof value === 'object' &&
    value !== null &&
    'data' in value
  ) {
    return value.data;
  }
  return undefined;
}

function getResponseError(value: unknown): string | null {
  if (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  ) {
    return value.error;
  }
  return null;
}

export function ConversationalAssistant() {
  const [suggestions, setSuggestions] = useState<
    AssistantSuggestionsResponse['suggestions']
  >([]);
  const [suggestionMode, setSuggestionMode] =
    useState<AssistantSuggestionsResponse['mode']>('DETERMINISTIC');
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggestionRefresh, setSuggestionRefresh] = useState(0);
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSuggestionError(null);
    globalThis
      .fetch('/api/assistant', {
        credentials: 'include',
        cache: 'no-store',
      })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            getResponseError(payload) ??
              'Studio suggestions could not be loaded.',
          );
        }
        const parsed = assistantSuggestionsResponseSchema.safeParse(
          getResponseData(payload),
        );
        if (!parsed.success) {
          throw new Error('The assistant returned invalid suggestions.');
        }
        if (active) {
          setSuggestions(parsed.data.suggestions);
          setSuggestionMode(parsed.data.mode);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setSuggestionError(
            loadError instanceof Error
              ? loadError.message
              : 'Studio suggestions could not be loaded.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [suggestionRefresh]);

  async function ask(questionText: string) {
    const nextQuestion = questionText.trim();
    if (!nextQuestion || busy) return;

    const priorHistory = entries
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));
    setEntries((current) => [
      ...current,
      { role: 'user', content: nextQuestion },
    ]);
    setQuestion('');
    setBusy(true);
    setError(null);

    try {
      const response = await globalThis.fetch('/api/assistant', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: nextQuestion, history: priorHistory }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          getResponseError(payload) ?? 'The assistant could not answer right now.',
        );
      }
      const parsed = assistantAnswerSchema.safeParse(getResponseData(payload));
      if (!parsed.success) {
        throw new Error('The assistant returned an invalid answer.');
      }
      setEntries((current) => [
        ...current,
        {
          role: 'assistant',
          content: parsed.data.answer,
          operation: parsed.data.operation,
          scope: parsed.data.scope,
          evidence: parsed.data.evidence,
          mode: parsed.data.mode,
        },
      ]);
    } catch (askError) {
      setError(
        askError instanceof Error
          ? askError.message
          : 'The assistant could not answer right now.',
      );
    } finally {
      setBusy(false);
    }
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px] text-primary">
            auto_awesome
          </span>
          <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
            Studio assistant
          </h1>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Ask about your studio’s attendance, membership status, retention
          priorities, or overall dashboard.
        </p>
      </div>

      <div className="rounded-2xl border border-border-delicate bg-surface-container-lowest shadow-xs">
        <div
          className="flex min-h-[360px] flex-col gap-4 p-4 sm:p-6"
          aria-live="polite"
          aria-relevant="additions text"
          role="log"
          aria-label="Studio assistant conversation"
        >
          {entries.length === 0 ? (
            <div className="my-auto rounded-xl bg-surface-container-low px-5 py-6 text-center sm:px-8">
              <span className="material-symbols-outlined text-[30px] text-primary">
                auto_awesome
              </span>
              <h2 className="mt-2 font-headline-sm text-headline-sm font-semibold text-on-surface">
                A clearer view of your studio
              </h2>
              <p className="mx-auto mt-2 max-w-2xl font-body-sm text-body-sm leading-6 text-on-surface-variant">
                I use approved, read-only studio analytics. I don’t access
                individual member details, make changes, or answer general
                questions. Every answer includes the figures it used.
              </p>
            </div>
          ) : (
            entries.map((entry, index) => (
              <article
                key={`${entry.role}-${index}`}
                className={`max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[82%] ${
                  entry.role === 'user'
                    ? 'self-end rounded-br-md bg-primary text-on-primary'
                    : 'self-start rounded-bl-md bg-surface-container-low text-on-surface'
                }`}
              >
                {entry.role === 'assistant' && entry.scope && (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                      {entry.scope === 'OUT_OF_SCOPE'
                        ? 'Out of scope'
                        : entry.mode === 'GEMINI'
                          ? 'Gemini grounded'
                          : 'Analytics summary'}
                    </span>
                  </div>
                )}
                <p className="whitespace-pre-wrap font-body-md text-body-md leading-6">
                  {entry.content}
                </p>
                {entry.evidence && entry.evidence.length > 0 && (
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    {entry.evidence.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border-delicate bg-surface-container-lowest px-3 py-2"
                      >
                        <dt className="font-label-sm text-label-sm text-on-surface-variant">
                          {item.label}
                        </dt>
                        <dd className="mt-0.5 font-label-md text-label-md font-semibold text-on-surface">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </article>
            ))
          )}
          {busy && (
            <div
              className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md bg-surface-container-low px-4 py-3 text-on-surface-variant"
              role="status"
            >
              <span className="material-symbols-outlined animate-pulse text-[18px] text-primary">
                auto_awesome
              </span>
              <span className="font-body-sm text-body-sm">
                Checking your studio analytics…
              </span>
            </div>
          )}
        </div>

        {error && (
          <div
            className="mx-4 mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:mx-6"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="border-t border-border-delicate p-4 sm:p-6">
          <form onSubmit={submitQuestion} className="flex items-end gap-2">
            <label className="flex-1">
              <span className="sr-only">Ask about your studio</span>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value.slice(0, 500))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void ask(question);
                  }
                }}
                maxLength={500}
                rows={2}
                placeholder="Ask about attendance, memberships, or retention…"
                className="max-h-36 min-h-12 w-full resize-y rounded-xl border border-border-delicate bg-surface-container-low px-4 py-3 font-body-md text-body-md text-on-surface outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !question.trim()}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-label-md text-label-md font-semibold text-on-primary transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="hidden sm:inline">Ask</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_upward
              </span>
            </button>
          </form>
          <p className="mt-2 text-right font-label-sm text-label-sm text-on-surface-variant">
            {question.length}/500 · Enter to send · Shift+Enter for a new line
          </p>
        </div>
      </div>

      <section aria-labelledby="suggested-questions-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="suggested-questions-heading"
              className="font-headline-sm text-headline-sm font-semibold text-on-surface"
            >
              Suggested for your studio
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {suggestionMode === 'GEMINI'
                ? 'Gemini selected these from your current analytics.'
                : 'Suggestions are based on your current analytics.'}
            </p>
          </div>
          {suggestionError && (
            <button
              type="button"
              onClick={() => setSuggestionRefresh((value) => value + 1)}
              className="font-label-sm text-label-sm font-semibold text-primary hover:underline"
            >
              Retry suggestions
            </button>
          )}
        </div>
        {suggestionError ? (
          <p className="rounded-xl border border-border-delicate bg-surface-container-lowest p-4 font-body-sm text-body-sm text-on-surface-variant">
            {suggestionError}
          </p>
        ) : suggestions.length === 0 ? (
          <p className="rounded-xl border border-border-delicate bg-surface-container-lowest p-4 font-body-sm text-body-sm text-on-surface-variant">
            Loading questions for your studio…
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.operation}
                type="button"
                disabled={busy}
                onClick={() => void ask(suggestion.question)}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border-delicate bg-surface-container-lowest px-4 py-3 text-left shadow-xs transition hover:border-primary/30 hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="font-label-md text-label-md font-medium text-on-surface">
                  {suggestion.question}
                </span>
                <span className="material-symbols-outlined shrink-0 text-[18px] text-primary transition-transform group-hover:translate-x-0.5">
                  arrow_forward
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
