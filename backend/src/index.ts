import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import prisma from './utils/db';
import { transcodeToHLS } from './utils/transcoder';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // In production, replace with specific origins
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directories exist
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Serve uploaded HLS files and thumbnails
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer config for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500 MB limit
});

// Real-time Rooms State (in-memory cache for playback synchronization)
interface RoomState {
  currentTime: number;
  isPlaying: boolean;
  lastUpdated: number;
  hostSocketId: string | null;
  users: Array<{ socketId: string; username: string }>;
}
const activeRooms = new Map<string, RoomState>();

// --- REST API ROUTES ---

// 1. Upload Video and Transcode
app.post('/api/videos', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const videoId = uuidv4();
    const tempFilePath = req.file.path;
    const outputDir = path.join(UPLOADS_DIR, videoId);

    // Initial database entry with "processing" paths
    const video = await prisma.video.create({
      data: {
        id: videoId,
        title,
        description,
        hlsPath: 'processing',
        thumbnailPath: 'processing'
      }
    });

    // Start transcoding in the background
    transcodeToHLS({
      videoPath: tempFilePath,
      outputDir,
      videoId
    })
      .then(async (result) => {
        // Update database with transcoded paths and duration
        await prisma.video.update({
          where: { id: videoId },
          data: {
            hlsPath: result.hlsPath,
            thumbnailPath: result.thumbnailPath,
            duration: result.duration
          }
        });
        console.log(`[Server] Video ${videoId} successfully transcoded.`);
      })
      .catch(async (err) => {
        console.error(`[Server] Failed transcoding video ${videoId}:`, err);
        // Delete video record on transcoding failure or mark error
        await prisma.video.delete({ where: { id: videoId } }).catch(() => {});
        // Also cleanup temp files
        try {
          fs.unlinkSync(tempFilePath);
        } catch {}
      });

    res.status(202).json({
      message: 'Video uploaded and transcoding started',
      video
    });
  } catch (error: any) {
    console.error('Upload route error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2. List all Videos
app.get('/api/videos', async (req, res) => {
  try {
    // Return all videos that have completed transcoding
    const videos = await prisma.video.findMany({
      where: {
        NOT: {
          hlsPath: 'processing'
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(videos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Create a room
app.post('/api/rooms', async (req, res) => {
  try {
    const { title, description, videoId, isPublic } = req.body;
    if (!title || !videoId) {
      return res.status(400).json({ error: 'Title and videoId are required' });
    }

    const room = await prisma.room.create({
      data: {
        title,
        description,
        videoId,
        isPublic: isPublic !== undefined ? isPublic : true
      },
      include: {
        video: true
      }
    });

    res.status(201).json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get room details
app.get('/api/rooms/:id', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: {
        video: true
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Get public rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { isPublic: true },
      include: {
        video: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Append active watchers count
    const enrichedRooms = rooms.map(room => {
      const activeState = activeRooms.get(room.id);
      return {
        ...room,
        watchersCount: activeState ? activeState.users.length : 0
      };
    });

    res.json(enrichedRooms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Get room chat messages
app.get('/api/rooms/:id/messages', async (req, res) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { roomId: req.params.id },
      orderBy: { createdAt: 'asc' },
      take: 50 // Limit to last 50 messages
    });
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- WEBSOCKET REAL-TIME SYNC & CHAT ---

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Track room and user profile of current socket
  let currentRoomId: string | null = null;
  let currentUsername: string | null = null;

  // 1. Join Room
  socket.on('join-room', async ({ roomId, username }: { roomId: string; username: string }) => {
    try {
      currentRoomId = roomId;
      currentUsername = username;
      socket.join(roomId);

      // Verify if room exists in DB
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { video: true }
      });

      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      // Initialize or update room state
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          currentTime: 0,
          isPlaying: false,
          lastUpdated: Date.now(),
          hostSocketId: socket.id, // The creator or first person joining becomes the initial host
          users: []
        });
      }

      const roomState = activeRooms.get(roomId)!;
      
      // Assign host if none exists
      if (!roomState.hostSocketId) {
        roomState.hostSocketId = socket.id;
      }

      // Add user to room's active user list
      if (!roomState.users.some(u => u.socketId === socket.id)) {
        roomState.users.push({ socketId: socket.id, username });
      }

      console.log(`[Socket] User ${username} (${socket.id}) joined room ${roomId}. Host is ${roomState.hostSocketId}`);

      // Broadcast user joined chat notification
      const joinMsg = {
        id: uuidv4(),
        senderName: 'System',
        message: `${username} joined the screening.`,
        createdAt: new Date()
      };
      
      io.to(roomId).emit('new-message', joinMsg);

      // Send current state and client list to the joining user
      socket.emit('room-state', {
        currentTime: roomState.currentTime,
        isPlaying: roomState.isPlaying,
        isHost: roomState.hostSocketId === socket.id,
        users: roomState.users
      });

      // Notify all other clients of updated user list
      io.to(roomId).emit('room-users', roomState.users);

    } catch (err: any) {
      console.error('[Socket] Join room error:', err);
    }
  });

  // 2. Playback control (Play / Pause / Seek)
  socket.on('player-control', (data: { roomId: string; action: 'play' | 'pause' | 'seek'; currentTime: number }) => {
    const { roomId, action, currentTime } = data;
    const roomState = activeRooms.get(roomId);

    if (roomState) {
      // Update room state
      roomState.currentTime = currentTime;
      roomState.isPlaying = action === 'play';
      roomState.lastUpdated = Date.now();

      console.log(`[Socket] Control in ${roomId}: ${action} at ${currentTime}s by ${currentUsername}`);

      // Broadcast control event to everyone else in the room
      socket.to(roomId).emit('player-control', {
        action,
        currentTime,
        senderId: socket.id
      });
    }
  });

  // 3. Time Sync Heartbeat (Host sends periodic syncs to keep others aligned)
  socket.on('player-sync', (data: { roomId: string; currentTime: number; isPlaying: boolean }) => {
    const { roomId, currentTime, isPlaying } = data;
    const roomState = activeRooms.get(roomId);

    if (roomState && roomState.hostSocketId === socket.id) {
      roomState.currentTime = currentTime;
      roomState.isPlaying = isPlaying;
      roomState.lastUpdated = Date.now();

      // Broadcast sync information to other viewers
      socket.to(roomId).emit('player-sync', { currentTime, isPlaying });
    }
  });

  // 4. Live Chat Messaging
  socket.on('send-message', async (data: { roomId: string; message: string; senderName: string }) => {
    const { roomId, message, senderName } = data;

    try {
      // Save message to database
      const savedMsg = await prisma.chatMessage.create({
        data: {
          roomId,
          senderName,
          message
        }
      });

      // Broadcast message to everyone in the room
      io.to(roomId).emit('new-message', savedMsg);
    } catch (err) {
      console.error('[Socket] Error saving/sending message:', err);
    }
  });

  // 5. Handle Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);

    if (currentRoomId && activeRooms.has(currentRoomId)) {
      const roomState = activeRooms.get(currentRoomId)!;
      
      // Remove user from the list
      roomState.users = roomState.users.filter(u => u.socketId !== socket.id);

      // Notify room about user leaving
      const leaveMsg = {
        id: uuidv4(),
        senderName: 'System',
        message: `${currentUsername || 'A watcher'} left the screening.`,
        createdAt: new Date()
      };
      io.to(currentRoomId).emit('new-message', leaveMsg);

      // If this user was the host, reassign host
      if (roomState.hostSocketId === socket.id) {
        if (roomState.users.length > 0) {
          roomState.hostSocketId = roomState.users[0].socketId;
          console.log(`[Socket] Host disconnected. Reassigned host to ${roomState.users[0].username} in room ${currentRoomId}`);
          
          // Notify the new host
          io.to(roomState.hostSocketId).emit('host-status', { isHost: true });
        } else {
          roomState.hostSocketId = null;
        }
      }

      // If room is empty, we can clean up after a timeout or keep it
      if (roomState.users.length === 0) {
        activeRooms.delete(currentRoomId);
        console.log(`[Socket] Room ${currentRoomId} is now empty. Cleaned up state.`);
      } else {
        // Send updated user list to remaining clients
        io.to(currentRoomId).emit('room-users', roomState.users);
      }
    }
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`[Server] Lumistream backend running on port ${PORT}`);
});
