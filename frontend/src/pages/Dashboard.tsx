import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Film, Compass, Info, Loader2, ArrowRight, RotateCw } from 'lucide-react';
import { api, Room, Video } from '../utils/api';
import { RoomCard } from '../components/RoomCard';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(true);
  
  // Modal State for creating a room
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [submittingRoom, setSubmittingRoom] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const activeRooms = await api.getRooms();
      setRooms(activeRooms);
    } catch (err) {
      console.error('Failed fetching rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchVideos = async () => {
    try {
      setLoadingVideos(true);
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      const readyVideos = await api.getVideos(user?.id);
      setVideos(readyVideos);
    } catch (err) {
      console.error('Failed fetching videos:', err);
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchDashboardData = () => {
    fetchRooms();
    fetchVideos();
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitle.trim() || !selectedVideoId) {
      setModalError('Please fill in the room title and select a video.');
      return;
    }

    try {
      setSubmittingRoom(true);
      setModalError(null);
      
      const newRoom = await api.createRoom({
        title: roomTitle,
        description: roomDesc,
        videoId: selectedVideoId,
        isPublic
      });

      setShowCreateModal(false);
      // Reset form
      setRoomTitle('');
      setRoomDesc('');
      setSelectedVideoId('');
      setIsPublic(true);

      // Redirect to the watchroom!
      navigate(`/room/${newRoom.id}`);
    } catch (err: any) {
      setModalError(err.message || 'Failed to create watchroom.');
    } finally {
      setSubmittingRoom(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Banner / Hero Section */}
      <div className="relative rounded-2xl bg-gradient-to-r from-bg-surface to-bg-card border border-border-main p-6 md:p-8 flex flex-col md:flex-row items-center justify-between overflow-hidden">
        <div className="space-y-4 max-w-lg text-left">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Watch Movies Together, <span className="text-primary text-glow">Synchronized.</span>
          </h1>
          <p className="text-xs md:text-sm text-text-muted leading-relaxed">
            Host a private screening with a secret link, or open a public watchroom where anyone can join and chat in real-time. Experience zero lag with adaptive HLS streaming.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-bg-main text-xs font-bold transition-all shadow-lg shadow-primary/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Watchroom</span>
            </button>
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl border border-border-main hover:border-primary text-text-main text-xs font-semibold transition-all cursor-pointer"
            >
              <Film className="w-4 h-4" />
              <span>Upload Movie</span>
            </button>
          </div>
        </div>
        <div className="hidden md:block w-72 h-44 bg-zinc-900 border border-border-main rounded-xl overflow-hidden shadow-inner relative flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/10 pointer-events-none" />
          <Film className="w-16 h-16 text-border-active animate-pulse" />
        </div>
      </div>

      {/* Main Grid: Active Rooms & Video Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* Left 2 Columns: Active Watchrooms Card */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 flex flex-col justify-between h-full space-y-6 text-left">
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-border-main/50 pb-4">
              <h2 className="text-md font-semibold flex items-center space-x-2 text-white">
                <Compass className="w-4 h-4 text-primary" />
                <span>Live Public Screening Rooms</span>
              </h2>
              <button 
                onClick={fetchRooms}
                disabled={loadingRooms}
                className="flex items-center space-x-1.5 text-xs text-primary hover:text-primary-hover disabled:text-zinc-600 font-semibold transition-colors cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Rooms content */}
            <div className="flex-1 flex flex-col justify-start">
              {loadingRooms ? (
                <div className="flex items-center justify-center h-[500px] flex-1">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center h-[500px] border border-dashed border-border-main rounded-xl bg-bg-surface/30 flex-1 flex flex-col items-center justify-center">
                  <Film className="w-10 h-10 text-text-muted mb-3" />
                  <h3 className="text-xs font-semibold text-text-main">No Live Rooms Found</h3>
                  <p className="text-[11px] text-text-muted mt-1.5 max-w-xs mx-auto">
                    No one is hosting a public show right now. Be the first to start a screening room!
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 inline-flex items-center space-x-1 px-3.5 py-2 rounded-lg bg-primary-light hover:bg-primary/20 text-primary text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span>Create a room</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="h-[500px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {rooms.map((room) => (
                      <RoomCard key={room.id} room={room} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Video Inventory Card */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 flex flex-col justify-between h-full space-y-6 text-left">
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-border-main/50 pb-4">
              <h2 className="text-md font-semibold flex items-center space-x-2 text-white">
                <Film className="w-4 h-4 text-accent" />
                <span>Uploaded Movies</span>
              </h2>
              <div className="flex items-center">
                <button 
                  onClick={fetchVideos}
                  disabled={loadingVideos}
                  className="flex items-center space-x-1 text-xs text-accent hover:text-accent-hover disabled:text-zinc-600 font-semibold transition-colors cursor-pointer"
                  title="Refresh Uploaded Movies"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingVideos ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Videos content */}
            <div className="flex-1 flex flex-col justify-start">
              {loadingVideos ? (
                <div className="flex items-center justify-center h-[500px] flex-1">
                  <Loader2 className="w-6 h-6 text-accent animate-spin" />
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center h-[500px] border border-dashed border-border-main rounded-xl bg-bg-surface/30 flex-1 flex flex-col items-center justify-center">
                  <Info className="w-8 h-8 text-text-muted mx-auto mb-3" />
                  <h3 className="text-xs font-semibold text-text-main">No Movies Uploaded</h3>
                  <p className="text-[11px] text-text-muted mt-1 max-w-[200px] mx-auto">
                    You need to upload a movie file before hosting a screening.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 h-[500px] overflow-y-auto pr-1">
                  {videos.map((vid) => (
                    <div
                      key={vid.id}
                      className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 flex items-center space-x-3 transition-all"
                    >
                      <div className="w-16 aspect-video bg-zinc-900 rounded overflow-hidden flex-shrink-0 relative border border-border-main/50">
                        {vid.thumbnailPath && vid.thumbnailPath !== 'processing' ? (
                          <img
                            src={vid.thumbnailPath.startsWith('http') ? vid.thumbnailPath : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${vid.thumbnailPath}`}
                            alt={vid.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-text-muted font-bold">
                            HLS
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <h4 className="text-xs font-semibold text-text-main truncate">{vid.title}</h4>
                        <p className="text-[10px] text-text-muted mt-1 truncate">
                          {vid.duration ? `${Math.round(vid.duration / 60)} min` : 'Duration unknown'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedVideoId(vid.id);
                          setRoomTitle(`Let's watch ${vid.title}`);
                          setShowCreateModal(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-black text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Host
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE ROOM MODAL DIALOG */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-xl bg-bg-surface border border-border-main shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border-main/50 pb-3">
              <h3 className="text-md font-bold text-text-main">Create Watchroom</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setModalError(null);
                }}
                className="text-text-muted hover:text-text-main text-sm font-bold transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-400 font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4">
              {/* Room Title */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-text-muted">Room Title</label>
                <input
                  type="text"
                  placeholder="e.g. Saturday Night Movie Club"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  className="w-full bg-bg-main border border-border-main focus:border-primary rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-muted outline-none transition-colors"
                  required
                />
              </div>

              {/* Room Description */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-text-muted">Description (Optional)</label>
                <textarea
                  placeholder="Tell people what you are screening..."
                  value={roomDesc}
                  onChange={(e) => setRoomDesc(e.target.value)}
                  className="w-full bg-bg-main border border-border-main focus:border-primary rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-muted outline-none resize-none h-20 transition-colors"
                />
              </div>

              {/* Video Selector */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-text-muted">Select Movie to Host</label>
                <select
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  className="w-full bg-bg-main border border-border-main focus:border-primary rounded-lg px-3 py-2 text-xs text-text-main outline-none transition-colors"
                  required
                >
                  <option value="" disabled>-- Select a Movie --</option>
                  {videos.map((vid) => (
                    <option key={vid.id} value={vid.id}>
                      {vid.title}
                    </option>
                  ))}
                </select>
                {videos.length === 0 && (
                  <p className="text-[10px] text-red-400 mt-1">
                    No videos available. Please upload a video first.
                  </p>
                )}
              </div>

              {/* Public/Private Room Setting */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-main/50 border border-border-main/30">
                <div className="text-left">
                  <h4 className="text-xs font-semibold text-text-main">Public Room</h4>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Visible on dashboard. Anyone can discover and join.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setModalError(null);
                  }}
                  className="flex-1 py-2 px-4 rounded-lg border border-border-main hover:bg-border-main/30 text-xs font-semibold text-text-muted hover:text-text-main transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRoom}
                  className="flex-1 py-2 px-4 rounded-lg bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-bg-main text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {submittingRoom && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Start Room</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
