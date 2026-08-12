import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize2, Settings, ShieldAlert } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  isHost: boolean;
  onPlay?: (time: number) => void;
  onPause?: (time: number) => void;
  onSeek?: (time: number) => void;
  playerRef: React.MutableRefObject<{
    play: () => void;
    pause: () => void;
    seekTo: (time: number) => void;
    getCurrentTime: () => number;
  } | null>;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  isHost,
  onPlay,
  onPause,
  onSeek,
  playerRef
}) => {
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [levels, setLevels] = useState<{ id: number; height: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = Auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false); // Guard flag to prevent event loops

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const fullSrc = src.startsWith('http') ? src : `${API_URL}${src}`;

  // Expose player controls to parent component
  useEffect(() => {
    playerRef.current = {
      play: () => {
        if (videoElementRef.current) {
          isSyncingRef.current = true;
          videoElementRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      },
      pause: () => {
        if (videoElementRef.current) {
          isSyncingRef.current = true;
          videoElementRef.current.pause();
          setIsPlaying(false);
        }
      },
      seekTo: (time: number) => {
        if (videoElementRef.current) {
          isSyncingRef.current = true;
          videoElementRef.current.currentTime = time;
          setCurrentTime(time);
        }
      },
      getCurrentTime: () => {
        return videoElementRef.current ? videoElementRef.current.currentTime : 0;
      }
    };

    return () => {
      playerRef.current = null;
    };
  }, [playerRef]);

  // HLS Setup
  useEffect(() => {
    const video = videoElementRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        maxMaxBufferLength: 30,
        enableWorker: true
      });
      hls.loadSource(fullSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const qualityLevels = data.levels.map((lvl, index) => ({
          id: index,
          height: lvl.height
        }));
        setLevels(qualityLevels);
        setErrorMsg(null);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS network error:', data);
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS media error:', data);
              hls?.recoverMediaError();
              break;
            default:
              setErrorMsg('Video playback error occurred');
              hls?.destroy();
              break;
          }
        }
      });

      // Save hls instance in window for quality switching
      (video as any)._hls = hls;

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (iOS/Safari)
      video.src = fullSrc;
      setErrorMsg(null);
    } else {
      setErrorMsg('Your browser does not support HLS streaming.');
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [fullSrc]);

  // Mouse movement checks to hide/show controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showQualityMenu) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, showQualityMenu]);

  // Player Event Listeners
  const handlePlay = () => {
    setIsPlaying(true);
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    if (isHost && onPlay) {
      onPlay(videoElementRef.current?.currentTime || 0);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    if (isHost && onPause) {
      onPause(videoElementRef.current?.currentTime || 0);
    }
  };

  const handleSeeked = () => {
    const time = videoElementRef.current?.currentTime || 0;
    setCurrentTime(time);
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    if (isHost && onSeek) {
      onSeek(time);
    }
  };

  const handleTimeUpdate = () => {
    if (videoElementRef.current) {
      setCurrentTime(videoElementRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoElementRef.current) {
      setDuration(videoElementRef.current.duration);
    }
  };

  // Control Functions
  const togglePlay = () => {
    if (!videoElementRef.current) return;
    // Non-hosts cannot control playback - they should match host state
    if (!isHost) return;

    if (isPlaying) {
      videoElementRef.current.pause();
    } else {
      videoElementRef.current.play().catch(() => {});
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoElementRef.current || !isHost) return;
    const time = parseFloat(e.target.value);
    videoElementRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoElementRef.current) {
      videoElementRef.current.volume = vol;
      videoElementRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    const nextMuteState = !isMuted;
    setIsMuted(nextMuteState);
    if (videoElementRef.current) {
      videoElementRef.current.muted = nextMuteState;
      if (!nextMuteState && volume === 0) {
        setVolume(0.5);
        videoElementRef.current.volume = 0.5;
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const changeQuality = (levelId: number) => {
    const video = videoElementRef.current;
    if (!video) return;
    const hls = (video as any)._hls as Hls | undefined;
    if (hls) {
      hls.currentLevel = levelId;
      setCurrentLevel(levelId);
    }
    setShowQualityMenu(false);
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const format = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${h}:${format(m)}:${format(s)}` : `${format(m)}:${format(s)}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative aspect-video w-full rounded-xl bg-black border border-border-main overflow-hidden group select-none"
    >
      {errorMsg ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-text-muted px-4 text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
          <h3 className="text-lg font-semibold text-text-main">Playback Error</h3>
          <p className="text-sm mt-1 max-w-sm">{errorMsg}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoElementRef}
            className="w-full h-full cursor-pointer object-contain"
            onClick={togglePlay}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeeked={handleSeeked}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            playsInline
          />

          {/* Sync status overlay for non-hosts */}
          {!isHost && (
            <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-bg-surface/90 border border-border-main/50 text-xs font-semibold flex items-center space-x-2 text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span>Synced with Host</span>
            </div>
          )}

          {/* Premium Custom Control Bar */}
          <div
            className={`absolute inset-0 z-10 flex flex-col justify-end p-4 transition-opacity duration-300 video-control-overlay ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Seeker Slider */}
            <div className="w-full flex items-center space-x-2 mb-3">
              <span className="text-xs font-mono text-text-main">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeekChange}
                disabled={!isHost}
                className={`flex-1 h-1 rounded bg-zinc-700 accent-primary cursor-pointer outline-none transition-all ${
                  isHost ? 'hover:h-2' : 'cursor-not-allowed opacity-80'
                }`}
              />
              <span className="text-xs font-mono text-text-muted">{formatTime(duration)}</span>
            </div>

            {/* Controls Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  disabled={!isHost}
                  className={`p-2 rounded-lg transition-colors ${
                    isHost 
                      ? 'bg-primary hover:bg-primary-hover text-bg-main cursor-pointer' 
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Volume Section */}
                <div className="flex items-center space-x-2">
                  <button onClick={toggleMute} className="text-text-main hover:text-primary transition-colors">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-24 h-1 rounded bg-zinc-700 accent-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4 relative">
                {/* Quality Selector */}
                {levels.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      className="p-1.5 rounded-lg border border-border-main hover:border-primary text-text-muted hover:text-text-main text-xs font-semibold flex items-center space-x-1 transition-all"
                    >
                      <Settings className="w-4 h-4 animate-spin-slow" />
                      <span>{currentLevel === -1 ? 'Auto' : `${levels[currentLevel]?.height}p`}</span>
                    </button>

                    {showQualityMenu && (
                      <div className="absolute bottom-10 right-10 z-30 bg-bg-surface border border-border-main rounded-lg py-1.5 w-32 shadow-xl">
                        <button
                          onClick={() => changeQuality(-1)}
                          className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-border-main/50 ${
                            currentLevel === -1 ? 'text-primary font-bold' : 'text-text-main'
                          }`}
                        >
                          Auto
                        </button>
                        {levels.map((lvl) => (
                          <button
                            key={lvl.id}
                            onClick={() => changeQuality(lvl.id)}
                            className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-border-main/50 ${
                              currentLevel === lvl.id ? 'text-primary font-bold' : 'text-text-main'
                            }`}
                          >
                            {lvl.height}p
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Fullscreen Button */}
                <button onClick={toggleFullscreen} className="text-text-main hover:text-primary transition-colors">
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
