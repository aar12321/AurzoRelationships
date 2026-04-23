import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDatesStore } from '@/stores/datesStore';
import { usePeopleStore } from '@/stores/peopleStore';
import {
  createThread, listMessages, listThreads, localAdvise, postMessage,
} from '@/services/advisorService';
import { aiAdviseStream } from '@/services/aiService';
import { SUGGESTED_PROMPTS } from '@/types/advisor';
import type { AdvisorMessage, AdvisorThread } from '@/types/advisor';

export default function AdvisorPage() {
  const { user } = useAuthStore();
  const people = usePeopleStore((s) => s.people);
  const loadPeople = usePeopleStore((s) => s.loadAll);
  const dates = useDatesStore((s) => s.dates);
  const loadDates = useDatesStore((s) => s.load);

  const [thread, setThread] = useState<AdvisorThread | null>(null);
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (people.length === 0) void loadPeople();
    if (dates.length === 0) void loadDates();
    void initThread();
  }, []); // eslint-disable-line

  async function initThread() {
    const threads = await listThreads();
    if (threads.length > 0) {
      setThread(threads[0]);
      setMessages(await listMessages(threads[0].id));
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function send(text: string) {
    if (!user || !text.trim()) return;
    setBusy(true);
    try {
      let t = thread;
      if (!t) {
        t = await createThread(user.id, text.slice(0, 48));
        setThread(t);
      }
      const userMsg = await postMessage(t.id, user.id, 'user', text.trim());
      setMessages((m) => [...m, userMsg]);
      setInput('');
      setStreamingText('');

      let reply = '';
      try {
        reply = await aiAdviseStream(text, people, dates, (chunk) => {
          setStreamingText((prev) => prev + chunk);
        });
      } catch {
        reply = localAdvise(text, people, dates);
      }
      setStreamingText('');
      if (!reply.trim()) reply = localAdvise(text, people, dates);
      const asstMsg = await postMessage(t.id, user.id, 'assistant', reply);
      setMessages((m) => [...m, asstMsg]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="animate-bloom">
      <header className="mb-6">
        <h1 className="text-4xl">Advisor</h1>
        <p className="text-charcoal-500 mt-1">
          Warm, specific guidance for the relationships in your life.
        </p>
      </header>

      <div className="card-journal flex flex-col h-[70vh]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-charcoal-700 mb-4">
                Ask anything — the more specific, the better I can help.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button key={p} onClick={() => void send(p)} className="chip hover:bg-cream-200">
                    {p}
                  </button>
                ))}
              </div>
              <p className="text-xs text-charcoal-500 mt-6 max-w-md mx-auto">
                Right now the advisor uses a local model trained on your data.
                When your Anthropic key is wired server-side, responses come
                from Claude with full context.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'text-right' : ''}>
                <div className={[
                  'inline-block max-w-[80%] rounded-journal px-3 py-2 text-left',
                  m.role === 'user'
                    ? 'bg-terracotta-600 text-ivory-50'
                    : 'bg-cream-100 text-charcoal-900',
                ].join(' ')}>
                  <pre className="whitespace-pre-wrap font-sans text-sm">{m.content}</pre>
                </div>
              </div>
            ))
          )}
          {streamingText && (
            <div>
              <div className="inline-block max-w-[80%] rounded-journal px-3 py-2
                              bg-cream-100 text-charcoal-900">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {streamingText}
                  <span className="inline-block w-2 h-4 bg-terracotta-500
                                   align-middle animate-pulse ml-0.5" />
                </pre>
              </div>
            </div>
          )}
          {busy && !streamingText && (
            <div className="text-charcoal-500 text-xs">Thinking…</div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void send(input); }}
          className="mt-4 pt-4 border-t border-cream-200 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="What's on your mind?"
            className="flex-1 rounded-journal border border-cream-200 bg-ivory-50 px-3 py-2
                       focus:outline-none focus:border-terracotta-500" />
          <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
