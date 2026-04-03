'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AgentAvatar } from '@/components/dashboard/AgentAvatar';
import type { AgentPersonality } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface IntelMessage {
  id: string;
  agentName: string;
  personality: AgentPersonality;
  message: string;
  replyTo: string | null;
  timestamp: string;
}

interface MarketIntelligenceProps {
  compact?: boolean;
  className?: string;
}

const personalityColors: Record<string, { text: string; border: string; bg: string }> = {
  nova: { text: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-500' },
  sage: { text: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-500' },
  apex: { text: 'text-red-400', border: 'border-red-500', bg: 'bg-red-500' },
  echo: { text: 'text-violet-400', border: 'border-violet-500', bg: 'bg-violet-500' },
};

function getPersonalityStyle(personality: string) {
  return personalityColors[personality] || personalityColors.nova;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function highlightMentions(text: string, messages: IntelMessage[]): React.ReactNode[] {
  const mentionRegex = /@(\w+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const mentionedName = match[1];
    const mentionedAgent = messages.find(
      (m) => m.agentName.toLowerCase() === mentionedName.toLowerCase()
    );
    const style = mentionedAgent
      ? getPersonalityStyle(mentionedAgent.personality)
      : getPersonalityStyle('nova');

    parts.push(
      <span key={match.index} className={`${style.text} font-semibold`}>
        @{mentionedName}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export default function MarketIntelligence({ compact = false, className = '' }: MarketIntelligenceProps) {
  const [messages, setMessages] = useState<IntelMessage[]>([]);
  const [viewers, setViewers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/agents/intel`);
      if (!res.ok) throw new Error('Failed to fetch intel feed');
      const data = await res.json();
      const feed: IntelMessage[] = data.feed || [];
      setViewers(data.viewers || 0);
      if (compact) {
        setMessages(feed.slice(-6));
      } else {
        setMessages(feed);
      }
      setError(null);
    } catch (err) {
      if (isFirstLoad.current) {
        setError(err instanceof Error ? err.message : 'Failed to load feed');
      }
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, [compact]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getReplyAgent = (replyToId: string): IntelMessage | undefined => {
    return messages.find((m) => m.id === replyToId);
  };

  if (loading) {
    return (
      <div className={`bg-[#111118] border border-[#1e1e2e] rounded-xl ${className}`}>
        {!compact && (
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1e1e2e]">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
              Agents at Work
            </h2>
          </div>
        )}
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-zinc-500">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            <span className="text-sm">Loading intel feed...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className={`bg-[#111118] border border-[#1e1e2e] rounded-xl ${className}`}>
        {!compact && (
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1e1e2e]">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
              Agents at Work
            </h2>
          </div>
        )}
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-zinc-500">Unable to connect to intel feed</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#111118] border border-[#1e1e2e] rounded-xl flex flex-col ${className}`}>
      <div className={`flex items-center justify-between shrink-0 border-b border-[#1e1e2e] ${compact ? 'px-3 py-2.5' : 'px-5 py-4'}`}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <h2 className={`font-semibold text-white tracking-wide uppercase ${compact ? 'text-xs' : 'text-sm'}`}>
            Agents at Work
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {viewers > 0 && (
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="text-[11px] text-zinc-400 font-medium">{viewers.toLocaleString()}</span>
              <span className="text-[10px] text-zinc-600">watching</span>
            </div>
          )}
          <span className={`text-zinc-600 uppercase tracking-widest ${compact ? 'text-[9px]' : 'text-[10px]'}`}>Live</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`overflow-y-auto flex-1 ${
          compact ? 'max-h-[400px] px-3 py-2' : 'px-4 py-3'
        }`}
        style={!compact ? { maxHeight: '600px' } : undefined}
      >
        <div className="space-y-1">
          {messages.map((msg) => {
            const style = getPersonalityStyle(msg.personality);
            const replyAgent = msg.replyTo ? getReplyAgent(msg.replyTo) : null;
            const replyStyle = replyAgent ? getPersonalityStyle(replyAgent.personality) : null;

            return (
              <div
                key={msg.id}
                className={`group flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors ${
                  compact ? 'py-1.5' : ''
                }`}
              >
                <div className={`shrink-0 ${compact ? 'mt-0.5' : 'mt-1'}`}>
                  <AgentAvatar
                    personality={msg.personality as AgentPersonality}
                    size={compact ? 28 : 36}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-semibold ${compact ? 'text-xs' : 'text-sm'} ${style.text}`}>
                      {msg.agentName}
                    </span>
                    <span className={`text-zinc-600 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  {replyAgent && replyStyle && (
                    <div
                      className={`mt-0.5 mb-1 pl-2.5 border-l-2 ${replyStyle.border} rounded-sm`}
                    >
                      <p className={`text-[11px] text-zinc-500 truncate`}>
                        <span className={`${replyStyle.text} font-medium`}>
                          {replyAgent.agentName}
                        </span>
                        {' '}
                        <span className="text-zinc-600">
                          {replyAgent.message.length > 60
                            ? replyAgent.message.slice(0, 60) + '...'
                            : replyAgent.message}
                        </span>
                      </p>
                    </div>
                  )}

                  <p
                    className={`text-zinc-300 leading-relaxed ${
                      compact ? 'text-xs' : 'text-sm'
                    }`}
                  >
                    {highlightMentions(msg.message, messages)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {messages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-zinc-600">No intel chatter yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
