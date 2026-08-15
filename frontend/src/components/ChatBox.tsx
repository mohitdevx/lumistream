import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, MessageSquare, Crown, Smile } from 'lucide-react';
import { ChatMessage } from '../utils/api';

interface ChatBoxProps {
  messages: ChatMessage[];
  users: Array<{ socketId: string; username: string }>;
  username: string;
  onSendMessage: (msg: string) => void;
  // Optional prop to support closing chat in overlays
  onClose?: () => void;
  isFullscreen?: boolean;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  users,
  username,
  onSendMessage,
  onClose,
  isFullscreen
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

  // Generate a consistent HSL color based on username for avatar backgrounds
  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 60%, 45%)`;
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`flex flex-col h-full w-full bg-bg-surface/85 backdrop-blur-lg overflow-hidden transition-all duration-200 ${
      isFullscreen
        ? 'border-l border-t-0 border-r-0 border-b-0 border-border-main/60 rounded-none shadow-none'
        : 'rounded-2xl border border-border-main/60 shadow-xl min-h-[400px]'
    }`}>
      {/* Tabs Header */}
      <div className="flex bg-bg-main/30 border-b border-border-main/50 p-2.5 space-x-1.5 items-center justify-between">
        <div className="flex space-x-1 flex-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-2 rounded-xl text-[11px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-primary-light text-primary border border-primary/20'
                : 'text-text-muted hover:text-text-main hover:bg-bg-surface/30'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat ({messages.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('watchers')}
            className={`px-3.5 py-2 rounded-xl text-[11px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeTab === 'watchers'
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-text-muted hover:text-text-main hover:bg-bg-surface/30'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Watchers ({users.length})</span>
          </button>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border-main/60 hover:bg-bg-surface hover:text-primary transition-all text-text-muted cursor-pointer text-[10px]"
          >
            Close
          </button>
        )}
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0 custom-scrollbar space-y-4">
        {activeTab === 'chat' ? (
          <div className="space-y-4 flex flex-col justify-end">
            {messages.length === 0 ? (
              <div className="text-center py-16 text-[11px] text-text-muted space-y-1">
                <p className="font-semibold text-text-main">Welcome to the Screening Room!</p>
                <p>Send a message below to start chatting with your friends.</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isSystem = msg.senderName === 'System';
                const isMe = msg.senderName === username;

                if (isSystem) {
                  return (
                    <div key={msg.id || index} className="text-center py-1.5">
                      <span className="text-[10px] px-3 py-1 rounded-full bg-primary-light/5 border border-primary/10 text-primary font-semibold italic">
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id || index}
                    className={`flex items-start space-x-2.5 max-w-[90%] ${
                      isMe ? 'self-end flex-row-reverse space-x-reverse' : 'self-start'
                    }`}
                  >
                    {/* User Avatar */}
                    {!isMe && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: getAvatarColor(msg.senderName) }}
                      >
                        {getInitials(msg.senderName)}
                      </div>
                    )}

                    {/* Message Bubble Column */}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline space-x-1.5 mb-1 px-1">
                        <span className={`text-[10px] font-bold ${isMe ? 'text-primary' : 'text-accent'}`}>
                          {msg.senderName}
                        </span>
                        <span className="text-[8px] text-text-muted font-medium">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                          isMe
                            ? 'bg-primary-light/20 border border-primary/20 text-text-main rounded-tr-none'
                            : 'bg-bg-card/40 border border-border-main/50 text-text-main rounded-tl-none'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3 px-1">
              Online Watchers
            </h4>
            {users.map((u, i) => (
              <div
                key={u.socketId || i}
                className="flex items-center justify-between p-2.5 rounded-xl bg-bg-card/30 border border-border-main/40 hover:border-border-active transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white"
                    style={{ backgroundColor: getAvatarColor(u.username) }}
                  >
                    {getInitials(u.username)}
                  </div>
                  <span className="text-xs font-semibold text-text-main">
                    {u.username} {u.username === username && <span className="text-[10px] text-text-muted font-normal">(You)</span>}
                  </span>
                </div>
                {i === 0 && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-primary-light border border-primary/20 text-primary font-bold flex items-center space-x-1">
                    <Crown className="w-3 h-3" />
                    <span>Host</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Form */}
      {activeTab === 'chat' && (
        <form onSubmit={handleSend} className="p-3.5 bg-bg-main/30 border-t border-border-main/50 flex flex-col space-y-2">
          <div className="flex items-center bg-bg-card/40 backdrop-blur-md border border-border-main/70 rounded-2xl p-1.5 transition-all duration-300 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 focus-within:bg-bg-card/65 focus-within:shadow-[0_0_15px_rgba(16,185,129,0.07)]">
            <button
              type="button"
              className="p-2 rounded-xl text-text-muted hover:text-primary transition-all duration-200 hover:bg-bg-surface/50 cursor-pointer"
              title="Add Emoji"
              onClick={() => setInputText(prev => prev + '😊')}
            >
              <Smile className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:border-transparent px-2.5 py-2 text-xs text-text-main placeholder-text-muted/60"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all duration-300 shadow-md ${
                inputText.trim()
                  ? 'bg-primary hover:bg-primary-hover text-bg-main cursor-pointer hover:scale-105 active:scale-95 shadow-primary/20'
                  : 'bg-border-main/40 text-text-muted/40 cursor-not-allowed shadow-none'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
