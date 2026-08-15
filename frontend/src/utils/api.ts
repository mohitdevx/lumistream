const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface Video {
  id: string;
  title: string;
  description?: string;
  hlsPath: string;
  thumbnailPath?: string;
  duration?: number;
  createdAt: string;
  userId?: string;
}

export interface Room {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  videoId: string;
  video: Video;
  createdAt: string;
  watchersCount?: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export const api = {
  getVideos: async (userId?: string): Promise<Video[]> => {
    const url = userId ? `${API_URL}/api/videos?userId=${userId}` : `${API_URL}/api/videos`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch videos');
    return res.json();
  },

  uploadVideo: async (formData: FormData): Promise<{ message: string; video: Video }> => {
    const res = await fetch(`${API_URL}/api/videos`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload video');
    }
    return res.json();
  },

  deleteVideo: async (videoId: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/api/videos/${videoId}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete video');
    }
    return res.json();
  },

  getRooms: async (): Promise<Room[]> => {
    const res = await fetch(`${API_URL}/api/rooms`);
    if (!res.ok) throw new Error('Failed to fetch rooms');
    return res.json();
  },

  getRoomDetails: async (roomId: string): Promise<Room> => {
    const res = await fetch(`${API_URL}/api/rooms/${roomId}`);
    if (!res.ok) throw new Error('Failed to fetch room details');
    return res.json();
  },

  createRoom: async (roomData: { title: string; description?: string; videoId: string; isPublic: boolean }): Promise<Room> => {
    const res = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(roomData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create room');
    }
    return res.json();
  },

  getRoomMessages: async (roomId: string): Promise<ChatMessage[]> => {
    const res = await fetch(`${API_URL}/api/rooms/${roomId}/messages`);
    if (!res.ok) throw new Error('Failed to fetch chat messages');
    return res.json();
  }
};
