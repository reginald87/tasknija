import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

const POLL_INTERVAL_MS = 4000;

function useConversationMessages(conversationId, initialMessages = []) {
  const [messages, setMessages] = useState(initialMessages);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return undefined;

    setMessages(initialMessages);

    let cancelled = false;

    async function poll() {
      try {
        const res = await api.get(`/messages/${conversationId}`);
        if (cancelled || !res?.success) return;
        const incoming = res.data || [];
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          for (const m of incoming) {
            if (!seen.has(m.id)) merged.push(m);
          }
          return merged;
        });
      } catch {
        /* ignore transient poll errors */
      }
    }

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [conversationId]);

  return [messages, setMessages];
}

export default function RealtimeMessages({ conversationId, onMessage, initialMessages = [] }) {
  const [messages, setMessages] = useConversationMessages(conversationId, initialMessages);

  // Notify parent of newly arrived messages.
  const prevIdsRef = useRef(new Set());
  useEffect(() => {
    if (!onMessage) return;
    const current = new Set(messages.map((m) => m.id));
    for (const m of messages) {
      if (!prevIdsRef.current.has(m.id)) onMessage(m);
    }
    prevIdsRef.current = current;
  }, [messages, onMessage]);

  return messages;
}

export function useRealtimeMessages(conversationId, initialMessages = []) {
  return useConversationMessages(conversationId, initialMessages);
}
