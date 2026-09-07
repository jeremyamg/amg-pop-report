'use client';
import { useState } from 'react';

type Status = { kind: 'ok' | 'error'; text: string };

export default function SubscribeEmail() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inputText }),
      });

      if (response.ok) {
        setInputText('');
        setStatus({ kind: 'ok', text: 'Subscribed!' });
      } else if (response.status >= 500) {
        // A server or config problem on our side, not something the reader can fix.
        setStatus({ kind: 'error', text: 'Something went wrong on our end. Please try again later.' });
      } else {
        const body = await response.json().catch(() => null);
        setStatus({ kind: 'error', text: body?.error || 'Subscription failed. Please try again.' });
      }
    } catch {
      setStatus({ kind: 'error', text: 'Could not reach the server. Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="border border-white rounded-lg w-full lg:w-[310px] mt-[10px] pl-3 sm:pl-6 flex justify-between">
        <input
          required
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          type="email"
          className="bg-transparent w-full py-3 placeholder:text-white text-[16px]"
          placeholder="Email Address"
        />
        <button
          type="submit"
          disabled={loading}
          className="text-[14px] flex items-center justify-center w-[140px] border-l border-l-white px-2 disabled:opacity-60"
        >
          {loading ? '...' : 'Subscribe'}
        </button>
      </div>
      {status && (
        <p
          role="status"
          aria-live="polite"
          className={`text-[14px] mt-2 ${status.kind === 'error' ? 'text-red-300' : 'text-white'}`}
        >
          {status.text}
        </p>
      )}
    </form>
  );
}
