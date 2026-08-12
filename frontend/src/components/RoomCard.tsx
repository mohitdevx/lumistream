import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Play } from 'lucide-react';
import { Room } from '../utils/api';

interface RoomCardProps {
  room: Room;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  // Resolve thumbnail path
  const thumbnailSrc = room.video.thumbnailPath && room.video.thumbnailPath !== 'processing'
    ? (room.video.thumbnailPath.startsWith('http') ? room.video.thumbnailPath : `${API_URL}${room.video.thumbnailPath}`)
    : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=640&auto=format&fit=crop'; // fallback elegant cinema image

  return (
    <div className="group relative bg-bg-surface border border-border-main/50 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 flex flex-col h-full shadow-lg hover:shadow-primary/5">
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
        <img
          src={thumbnailSrc}
          alt={room.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Hover overlay with quick play button */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
          <div className="p-3.5 rounded-full bg-primary text-bg-main transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 fill-current" />
          </div>
        </div>

        {/* Watchers Badge */}
        <div className="absolute bottom-2.5 right-2.5 z-10 px-2 py-1 rounded-md bg-bg-main/80 backdrop-blur-sm border border-border-main/40 text-[10px] font-bold flex items-center space-x-1.5 text-text-main">
          <Users className="w-3.5 h-3.5 text-accent" />
          <span>{room.watchersCount || 0} watching</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-main group-hover:text-primary transition-colors line-clamp-1">
            {room.title}
          </h3>
          <p className="text-xs text-text-muted mt-1.5 line-clamp-2 leading-relaxed">
            {room.description || 'No description provided.'}
          </p>
        </div>

        {/* Footer info & trigger */}
        <div className="mt-4 pt-3.5 border-t border-border-main/40 flex items-center justify-between">
          <div className="text-[10px] text-text-muted truncate max-w-[150px]">
            Video: <span className="font-semibold text-text-main">{room.video.title}</span>
          </div>
          <Link
            to={`/room/${room.id}`}
            className="px-3.5 py-1.5 rounded-lg bg-border-main hover:bg-primary hover:text-bg-main text-xs font-semibold text-text-main transition-all duration-200"
          >
            Join Room
          </Link>
        </div>
      </div>
    </div>
  );
};
