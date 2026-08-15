import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Share2, Copy, Check, ShieldAlert, Users, Calendar, ArrowLeft, XCircle } from 'lucide-react';
import { api, Room, ChatMessage } from '../utils/api';
import { socket } from '../utils/socket';
import { VideoPlayer } from '../components/VideoPlayer';
import { ChatBox } from '../components/ChatBox';
import { useUI } from '../context/UIContext';

export const Watchroom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { showToast } = useUI();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEndStreamConfirm, setShowEndStreamConfirm] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');
  const [approvalMessage, setApprovalMessage] = useState('Waiting for Host approval...');
  const [pendingApprovals, setPendingApprovals] = useState<{ socketId: string; username: string }[]>([]);

  // Username overlay input state
  const [username, setUsername] = useState(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        if (u && u.username) return u.username;
      } catch {}
    }
    return localStorage.getItem('watchroom_username') || '';
  });
  const [tempUsername, setTempUsername] = useState('');
  const [isUsernameSet, setIsUsernameSet] = useState(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        if (u && u.username) return true;
      } catch {}
    }
    return !!localStorage.getItem('watchroom_username');
  });

  // Socket state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<Array<{ socketId: string; username: string }>>([]);
  const [isHost, setIsHost] = useState(false);

  // Copy link status
  const [copied, setCopied] = useState(false);

  // Refs for programmatic video control
  const playerControlRef = useRef<{
    play: () => void;
    pause: () => void;
    seekTo: (time: number) => void;
    getCurrentTime: () => number;
  } | null>(null);

  // Host periodic sync heartbeat
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fullscreen and chat toggle state
  const [showChat, setShowChat] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (!workspaceRef.current) return;
    if (!document.fullscreenElement) {
      workspaceRef.current.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleToggleChat = () => {
    setShowChat(prev => !prev);
  };

  // 1. Fetch Room Data
  useEffect(() => {
    const fetchRoom = async () => {
      if (!roomId) return;
      try {
        setLoading(true);
        const data = await api.getRoomDetails(roomId);
        setRoom(data);
        
        // Determine initial approval status
        const userJson = localStorage.getItem('user');
        let isLocalHost = false;
        if (userJson) {
          try {
            const u = JSON.parse(userJson);
            if (u && u.id && data.video && data.video.userId === u.id) {
              isLocalHost = true;
              setIsHost(true);
            }
          } catch {}
        }

        if (data.isPublic || isLocalHost) {
          setApprovalStatus('approved');
        } else {
          setApprovalStatus('pending');
        }
        
        // Fetch last 50 chat messages from DB
        const history = await api.getRoomMessages(roomId);
        setMessages(history);
      } catch (err: any) {
        console.error('Error loading room:', err);
        setErrorMsg(err.message || 'Failed to load screening room');
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomId]);

  // 2. Disconnect socket only when component unmounts
  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, []);

  // 3. Setup WebSocket Connection once Username & Room are ready
  useEffect(() => {
    if (!isUsernameSet || !room || !roomId || !username) return;

    // Connect to WS server if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    // Emit join event
    socket.emit('join-room', { roomId, username });

    // WS Event Listeners
    socket.on('room-state', (state: { currentTime: number; isPlaying: boolean; isHost: boolean; users: any; pendingApprovals?: any[] }) => {
      setApprovalStatus('approved');
      setIsHost(state.isHost);
      setUsers(state.users);
      if (state.pendingApprovals) {
        setPendingApprovals(state.pendingApprovals);
      }
      
      // Sync player time & state if player is ready
      if (playerControlRef.current) {
        const player = playerControlRef.current;
        player.seekTo(state.currentTime);
        if (state.isPlaying) {
          player.play();
        } else {
          player.pause();
        }
      }
    });

    socket.on('room-users', (updatedUsers: Array<{ socketId: string; username: string }>) => {
      setUsers(updatedUsers);
    });

    // Listen for private room pending approval
    socket.on('approval-pending', ({ message }: { message: string }) => {
      setApprovalStatus('pending');
      setApprovalMessage(message);
    });

    // Listen for private room join approved
    socket.on('join-approved', (state: { currentTime: number; isPlaying: boolean; isHost: boolean; users: any }) => {
      setApprovalStatus('approved');
      setIsHost(state.isHost);
      setUsers(state.users);
      
      // Sync player time & state if player is ready
      if (playerControlRef.current) {
        const player = playerControlRef.current;
        player.seekTo(state.currentTime);
        if (state.isPlaying) {
          player.play();
        } else {
          player.pause();
        }
      }
    });

    // Listen for private room join rejected
    socket.on('join-rejected', ({ message }: { message: string }) => {
      setApprovalStatus('rejected');
      setApprovalMessage(message);
    });

    // Listen for watch-request (Host only)
    socket.on('watch-request', (data: { socketId: string; username: string }) => {
      setPendingApprovals(prev => {
        if (prev.some(p => p.socketId === data.socketId)) return prev;
        return [...prev, data];
      });
    });

    // Listen for watch-request-cancelled (Host only)
    socket.on('watch-request-cancelled', ({ socketId }: { socketId: string }) => {
      setPendingApprovals(prev => prev.filter(p => p.socketId !== socketId));
    });

    // Listen for watch-requests-list updates (Host only)
    socket.on('watch-requests-list', (list: Array<{ socketId: string; username: string }>) => {
      setPendingApprovals(list);
    });

    socket.on('host-status', ({ isHost: hostStatus }: { isHost: boolean }) => {
      setIsHost(hostStatus);
      const systemMessage: ChatMessage = {
        id: Math.random().toString(),
        roomId: roomId,
        senderName: 'System',
        message: hostStatus ? 'You are now the Host. You control video playback.' : 'Playback controls are now synced with Host.',
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, systemMessage]);
    });

    // Handle Host play/pause/seek controls
    socket.on('player-control', (data: { action: 'play' | 'pause' | 'seek' | 'speed'; currentTime: number; speed?: number; senderId: string }) => {
      if (!playerControlRef.current || isHost) return;

      const player = playerControlRef.current;
      console.log(`[Socket] Received play-control action: ${data.action} at ${data.currentTime}s (speed: ${data.speed})`);

      if (data.action === 'play') {
        player.seekTo(data.currentTime);
        player.play();
      } else if (data.action === 'pause') {
        player.pause();
        player.seekTo(data.currentTime);
      } else if (data.action === 'seek') {
        player.seekTo(data.currentTime);
      } else if (data.action === 'speed' && data.speed !== undefined) {
        if ((player as any).setSpeed) {
          (player as any).setSpeed(data.speed);
        }
      }
    });

    // Handle periodic host time synchronization
    socket.on('player-sync', (data: { currentTime: number; isPlaying: boolean; speed?: number }) => {
      if (!playerControlRef.current || isHost) return;

      const player = playerControlRef.current;
      
      // Update playback speed if it differs
      if (data.speed !== undefined && (player as any).setSpeed) {
        (player as any).setSpeed(data.speed);
      }

      const localTime = player.getCurrentTime();
      const difference = Math.abs(localTime - data.currentTime);

      // If local video drifts by more than 2 seconds, force sync it
      if (difference > 2) {
        console.log(`[Sync] Drift detected (${difference.toFixed(1)}s). Syncing with Host...`);
        player.seekTo(data.currentTime);
      }
    });

    // Handle incoming chat messages
    socket.on('new-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Handle stream-ended event
    socket.on('stream-ended', ({ message }: { message: string }) => {
      showToast(message, 'info');
      navigate('/');
    });

    return () => {
      socket.off('room-state');
      socket.off('room-users');
      socket.off('host-status');
      socket.off('player-control');
      socket.off('player-sync');
      socket.off('new-message');
      socket.off('stream-ended');
      socket.off('approval-pending');
      socket.off('join-approved');
      socket.off('join-rejected');
      socket.off('watch-request');
      socket.off('watch-request-cancelled');
      socket.off('watch-requests-list');
    };
  }, [isUsernameSet, room, roomId, username, isHost]);

  // 3. Periodic Host sync emitter
  useEffect(() => {
    if (!isHost || !roomId) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Set interval to send player time heartbeat every 2 seconds
    syncIntervalRef.current = setInterval(() => {
      if (playerControlRef.current) {
        const currentTime = playerControlRef.current.getCurrentTime();
        // Check local play status
        // Since we don't have explicit playback status, we can guess based on element state,
        // or check if it's changing. We will just pass the current local timestamp
        const video = document.querySelector('video') as HTMLVideoElement | null;
        const isPlaying = video ? !video.paused : false;
        const speed = video ? video.playbackRate : 1.0;

        socket.emit('player-sync', {
          roomId,
          currentTime,
          isPlaying,
          speed
        });
      }
    }, 2000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isHost, roomId]);

  // --- Handlers for Host Control Events ---
  const handleHostPlay = (time: number) => {
    if (!isHost || !roomId) return;
    socket.emit('player-control', { roomId, action: 'play', currentTime: time });
  };

  const handleHostPause = (time: number) => {
    if (!isHost || !roomId) return;
    socket.emit('player-control', { roomId, action: 'pause', currentTime: time });
  };

  const handleHostSeek = (time: number) => {
    if (!isHost || !roomId) return;
    socket.emit('player-control', { roomId, action: 'seek', currentTime: time });
  };

  const handleHostSpeedChange = (speed: number) => {
    if (!isHost || !roomId) return;
    const currentTime = playerControlRef.current?.getCurrentTime() || 0;
    socket.emit('player-control', { roomId, action: 'speed', currentTime, speed });
  };

  // --- Chat action ---
  const handleSendMessage = (text: string) => {
    if (!roomId) return;
    socket.emit('send-message', {
      roomId,
      message: text,
      senderName: username
    });
  };

  // --- Share Invite link ---
  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- End Stream (Host-only) ---
  const handleEndStream = () => {
    if (!roomId) return;
    setShowEndStreamConfirm(true);
  };

  // Save username handler
  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUsername.trim()) return;
    localStorage.setItem('watchroom_username', tempUsername.trim());
    setUsername(tempUsername.trim());
    setIsUsernameSet(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-text-muted">Loading watchroom data...</p>
      </div>
    );
  }

  if (errorMsg || !room) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-6">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-text-main">Screening Room Error</h2>
        <p className="text-sm text-text-muted">{errorMsg || 'The requested room was not found.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-lg bg-primary text-bg-main text-xs font-bold transition-all cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Username prompt overlay
  if (!isUsernameSet) {
    return (
      <div className="max-w-md mx-auto py-20">
        <div className="bg-bg-surface border border-border-main rounded-xl p-6 shadow-2xl space-y-6 text-left">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-text-main">Join Watchroom</h2>
            <p className="text-xs text-text-muted">Enter a nickname to participate in the real-time live chat.</p>
          </div>
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">Nickname</label>
              <input
                type="text"
                placeholder="e.g. CinemaLover"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                className="w-full bg-bg-main border border-border-main focus:border-primary rounded-lg px-4 py-2.5 text-xs text-text-main placeholder-text-muted outline-none transition-colors"
                required
                maxLength={20}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-bg-main text-xs font-bold transition-all cursor-pointer"
            >
              Enter Watchroom
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Access approval status overlay
  if (approvalStatus === 'pending') {
    return (
      <div className="max-w-md mx-auto py-20">
        <div className="bg-bg-surface border border-border-main rounded-xl p-8 shadow-2xl text-center space-y-6">
          <div className="flex justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-md font-bold text-text-main">Awaiting Admission</h2>
            <p className="text-xs text-text-muted">{approvalMessage}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 rounded-lg border border-border-main hover:bg-border-main/30 text-text-muted hover:text-text-main text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel and Return Home
          </button>
        </div>
      </div>
    );
  }

  if (approvalStatus === 'rejected') {
    return (
      <div className="max-w-md mx-auto py-20">
        <div className="bg-bg-surface border border-border-main rounded-xl p-8 shadow-2xl text-center space-y-6">
          <div className="flex justify-center">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-md font-bold text-text-main">Admission Declined</h2>
            <p className="text-xs text-text-muted">{approvalMessage}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-bg-main text-xs font-bold transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-auto w-full transition-all duration-500 ease-in-out ${isFullscreen ? '' : (showChat ? 'max-w-7xl' : 'max-w-5xl')} space-y-6`}>
      {/* Top Banner Control bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-main/50 pb-4">
        <div className="flex items-center space-x-3 text-left">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg border border-border-main hover:bg-bg-surface hover:text-primary transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                room.isPublic 
                  ? 'bg-accent/15 text-accent border border-accent/20' 
                  : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/25'
              }`}>
                {room.isPublic ? 'Public' : 'Private'}
              </span>
              <h1 className="text-lg font-bold text-text-main line-clamp-1">{room.title}</h1>
            </div>
            <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-1">
              Currently streaming: <span className="text-text-main font-medium">{room.video.title}</span>
            </p>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex items-center space-x-3 self-start md:self-auto">
          {isHost && (
            <button
              onClick={handleEndStream}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-750 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>End Stream</span>
            </button>
          )}
          <button
            onClick={copyInviteLink}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg border border-border-main hover:border-primary text-xs font-semibold text-text-main hover:text-primary transition-all cursor-pointer bg-bg-surface"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied Room Link!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Share Invite Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Watchroom Workspace Wrapper */}
      <div
        ref={workspaceRef}
        className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${
          isFullscreen
            ? 'fixed inset-0 z-50 bg-black flex flex-col md:flex-row'
            : 'flex flex-col lg:flex-row items-stretch'
        }`}
      >
        {/* Left Side: Video Player */}
        <div className={`transition-all duration-500 ease-in-out ${
          isFullscreen
            ? 'flex-1 h-full relative'
            : 'flex-1 min-w-0 space-y-4'
        }`}>
          <VideoPlayer
            src={room.video.hlsPath}
            isHost={isHost}
            onPlay={handleHostPlay}
            onPause={handleHostPause}
            onSeek={handleHostSeek}
            onSpeedChange={handleHostSpeedChange}
            playerRef={playerControlRef}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            showChat={showChat}
            onToggleChat={handleToggleChat}
          />
          
          {/* Room details - only visible when not fullscreen */}
          {!isFullscreen && (
            <div className="bg-bg-surface border border-border-main rounded-xl p-5 text-left space-y-4">
              <div>
                <h3 className="text-sm font-bold text-text-main">Room Info</h3>
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                  {room.description || 'No description set for this room.'}
                </p>
              </div>
              
              {/* Divider */}
              <div className="border-t border-border-main/50" />
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-text-muted">
                <div>
                  <p className="font-semibold text-text-main flex items-center space-x-1 mb-1">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Room Size</span>
                  </p>
                  <p>{users.length} participants</p>
                </div>
                <div>
                  <p className="font-semibold text-text-main flex items-center space-x-1 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>Hosted On</span>
                  </p>
                  <p>{new Date(room.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Chat System */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isFullscreen
            ? showChat
              ? 'absolute top-0 right-0 h-full w-80 sm:w-96 z-30 opacity-100'
              : 'absolute top-0 right-0 h-full w-0 z-30 opacity-0 pointer-events-none'
            : showChat
              ? 'relative w-full lg:w-[400px] min-h-[500px] opacity-100 lg:ml-6'
              : 'relative w-0 lg:w-0 min-h-0 h-0 lg:h-auto opacity-0 lg:ml-0 pointer-events-none'
        }`}>
          <div className={isFullscreen ? 'h-full w-full' : 'absolute inset-0 flex flex-col'}>
            <ChatBox
              messages={messages}
              users={users}
              username={username}
              onSendMessage={handleSendMessage}
              onClose={isFullscreen ? handleToggleChat : undefined}
              isFullscreen={isFullscreen}
              isHost={isHost}
              pendingApprovals={pendingApprovals}
              onApproveViewer={(viewerSocketId, approved) => socket.emit('approve-viewer', { roomId, viewerSocketId, approved })}
            />
          </div>
        </div>
      </div>

      {/* Monochromatic End Stream Confirmation Modal */}
      {showEndStreamConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-6 space-y-6 shadow-2xl animate-scale-up text-left">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">End Screening</h3>
              <p className="text-xs text-zinc-400">
                Are you sure you want to end this screening room? This will disconnect all viewers and delete the room from the database.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowEndStreamConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-350 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  socket.emit('end-stream', { roomId });
                  setShowEndStreamConfirm(false);
                }}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                End Stream
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
