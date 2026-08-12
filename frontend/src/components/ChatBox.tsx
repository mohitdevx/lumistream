import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, MessageSquare } from 'lucide-react';
import { ChatMessage } from '../utils/api';

interface ChatBoxProps {
  messages: ChatMessage[];
  users: Array<{ socketId: string; username: string }>;
  username: string;
  onSendMessage: (msg: string) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  users,
  username,
  onSendMessage
}) => {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'watchers'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-[500px] lg:h-[600px] w-full rounded-xl bg-bg-surface border border-border-main overflow-hidden">
      {/* Tabs Header */}
      <div className="flex bg-bg-main border-b border-border-main p-1.5 space-x-1">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'chat'
              ? 'bg-bg-surface text-primary border border-border-main/50'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Live Chat ({messages.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('watchers')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'watchers'
              ? 'bg-bg-surface text-accent border border-border-main/50'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Watchers ({users.length})</span>
        </button>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {activeTab === 'chat' ? (
          <div className="space-y-3 flex flex-col justify-end">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-xs text-text-muted">
                Welcome to the watchroom! Send a message to start chatting.
              </div>
            ) : (
              messages.map((msg, index) => {
                const isSystem = msg.senderName === 'System';
                const isMe = msg.senderName === username;

                if (isSystem) {
                  return (
                    <div key={msg.id || index} className="text-center py-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-border-main/40 text-primary font-medium italic">
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id || index}
                    className={`flex flex-col max-w-[85%] ${
                      isMe ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1 px-1">
                      <span className={`text-[11px] font-bold ${isMe ? 'text-primary' : 'text-accent'}`}>
                        {msg.senderName}
                      </span>
                      <span className="text-[9px] text-text-muted">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                        isMe
                          ? 'bg-primary text-bg-main rounded-tr-none font-medium'
                          : 'bg-bg-card text-text-main rounded-tl-none border border-border-main/40'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Online Watchers
            </h4>
            {users.map((u, i) => (
              <div
                key={u.socketId || i}
                className="flex items-center justify-between p-2 rounded-lg bg-bg-card/50 border border-border-main/30"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-border-main text-text-main flex items-center justify-center font-bold text-[10px]">
                    {u.username[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-text-main">
                    {u.username} {u.username === username && '(You)'}
                  </span>
                </div>
                {i === 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary-light border border-primary/20 text-primary font-bold uppercase tracking-wider">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Form */}
      {activeTab === 'chat' && (
        <form onSubmit={handleSend} className="p-3 bg-bg-main border-t border-border-main flex items-center space-x-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-bg-surface border border-border-main focus:border-primary rounded-xl px-4 py-2.5 text-xs text-text-main placeholder-text-muted outline-none transition-colors"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover text-bg-main flex items-center justify-center transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
