import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import prisma from './utils/db';
import { transcodeToHLS } from './utils/transcoder';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
app.use(express.json({ limit: '10mb' }));

// Helper to hash password
function hashPassword(password: string): string {
  const salt = 'lumistream_salt_secure_123';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// --- AUTHENTICATION API ROUTES ---

// Signup Route
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { firstName, lastName, username, email, password } = req.body;

    if (!firstName || !username || !email || !password) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword
      }
    });

    res.status(201).json({
      message: 'Signup successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const identifier = usernameOrEmail.toLowerCase().trim();

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Verify password
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        facebook: user.facebook,
        twitter: user.twitter,
        github: user.github,
        instagram: user.instagram,
        website: user.website
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get User Profile Details
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        facebook: user.facebook,
        twitter: user.twitter,
        github: user.github,
        instagram: user.instagram,
        website: user.website,
        createdAt: user.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Update User Profile
app.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, bio, facebook, twitter, github, instagram, website, avatar } = req.body;
    if (!firstName) {
      return res.status(400).json({ error: 'First name is required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let avatarUrl = existingUser.avatarUrl;

    if (avatar) {
      // Check if it's a new base64 image
      if (avatar.startsWith('data:image')) {
        try {
          const uploadRes = await cloudinary.uploader.upload(avatar, {
            folder: 'lumistream_avatars',
            resource_type: 'image'
          });
          avatarUrl = uploadRes.secure_url;
        } catch (uploadErr: any) {
          console.error('Cloudinary upload error:', uploadErr);
          return res.status(500).json({ error: uploadErr.message || 'Failed to upload avatar to Cloudinary' });
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName: lastName || null,
        bio: bio || null,
        facebook: facebook || null,
        twitter: twitter || null,
        github: github || null,
        instagram: instagram || null,
        website: website || null,
        avatarUrl
      }
    });
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        username: updated.username,
        email: updated.email,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio,
        facebook: updated.facebook,
        twitter: updated.twitter,
        github: updated.github,
        instagram: updated.instagram,
        website: updated.website
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Change Password
app.put('/api/users/:userId/password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Verify current password
    if (user.password !== hashPassword(currentPassword)) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }
    // Update to new password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashPassword(newPassword)
      }
    });
    res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

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
  pendingApprovals: Array<{ socketId: string; username: string }>;
  approvedUsernames?: Set<string>; // Persistent approval register
  emptyTimeoutId?: NodeJS.Timeout;
}
const activeRooms = new Map<string, RoomState>();

interface TranscodeState {
  videoId: string;
  title: string;
  progress: number;
  status: 'processing' | 'success' | 'error';
  error?: string;
}
const activeTranscodes = new Map<string, TranscodeState>();

// --- REST API ROUTES ---

// 1. Upload Video and Transcode
app.post('/api/videos', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { title, description, userId } = req.body;
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
        thumbnailPath: 'processing',
        userId: userId || null
      }
    });

    // Add to active transcodes
    const transcodeState: TranscodeState = {
      videoId,
      title,
      progress: 0,
      status: 'processing'
    };
    activeTranscodes.set(videoId, transcodeState);
    io.emit('transcode-progress', transcodeState);

    // Start transcoding in the background
    transcodeToHLS({
      videoPath: tempFilePath,
      outputDir,
      videoId,
      onProgress: (progress) => {
        const state = activeTranscodes.get(videoId);
        if (state) {
          state.progress = progress;
          io.emit('transcode-progress', state);
        }
      }
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

        const state = activeTranscodes.get(videoId);
        if (state) {
          state.progress = 100;
          state.status = 'success';
          io.emit('transcode-progress', state);

          // Keep in map for 2 minutes to show final status, then delete
          setTimeout(() => {
            activeTranscodes.delete(videoId);
          }, 2 * 60 * 1000);
        }
        console.log(`[Server] Video ${videoId} successfully transcoded.`);
      })
      .catch(async (err) => {
        console.error(`[Server] Failed transcoding video ${videoId}:`, err);

        const state = activeTranscodes.get(videoId);
        if (state) {
          state.status = 'error';
          state.error = err.message || 'Transcoding failed';
          io.emit('transcode-progress', state);

          // Keep in map for 5 minutes, then delete
          setTimeout(() => {
            activeTranscodes.delete(videoId);
          }, 5 * 60 * 1000);
        }

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
    const { userId } = req.query;
    // Return all videos that have completed transcoding, optionally scoped to uploader
    const videos = await prisma.video.findMany({
      where: {
        NOT: {
          hlsPath: 'processing'
        },
        ...(userId ? { userId: userId as string } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(videos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2b. List active transcodes
app.get('/api/videos/transcoding', (req, res) => {
  res.json(Array.from(activeTranscodes.values()));
});

// 2c. Delete Video
app.delete('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the video first
    const video = await prisma.video.findUnique({
      where: { id }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete representation files folder from storage
    const videoDir = path.join(UPLOADS_DIR, id);
    if (fs.existsSync(videoDir)) {
      fs.rmSync(videoDir, { recursive: true, force: true });
      console.log(`[Server] Deleted HLS assets directory: ${videoDir}`);
    }

    // Delete record from database
    await prisma.video.delete({
      where: { id }
    });

    res.json({ message: 'Video deleted successfully' });
  } catch (error: any) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 3. Create a room
app.post('/api/rooms', async (req, res) => {
  try {
    const { title, description, videoId, isPublic } = req.body;
    if (!title || !videoId) {
      return res.status(400).json({ error: 'Title and videoId are required' });
    }
    if (description && description.length > 100) {
      return res.status(400).json({ error: 'Description cannot exceed 100 characters' });
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
  
  socket.onAny((event, ...args) => {
    console.log(`[Socket debug] Event '${event}' from ${socket.id}:`, JSON.stringify(args));
  });
  
  // Send list of active transcodes on connection
  socket.emit('active-transcodes', Array.from(activeTranscodes.values()));

  // Track room and user profile of current socket
  let currentRoomId: string | null = null;
  let currentUsername: string | null = null;

  // 1. Join Room
  socket.on('join-room', async ({ roomId, username }: { roomId: string; username: string }) => {
    try {
      // Verify if room exists in DB
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { 
          video: {
            include: {
              user: true
            }
          }
        }
      });

      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      const uploaderUsername = room.video.user?.username;
      const uploaderEmail = room.video.user?.email;
      let isHost = false;

      if (uploaderUsername || uploaderEmail) {
        isHost = (username === uploaderUsername) || (username === uploaderEmail);
      } else {
        // Fallback: first user to join becomes host if uploader is unknown
        if (!activeRooms.has(roomId)) {
          isHost = true;
        } else {
          isHost = activeRooms.get(roomId)?.hostSocketId === socket.id;
        }
      }

      // Initialize or update room state
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          currentTime: 0,
          isPlaying: false,
          lastUpdated: Date.now(),
          hostSocketId: isHost ? socket.id : null,
          users: [],
          pendingApprovals: [],
          approvedUsernames: new Set<string>()
        });
      }

      const roomState = activeRooms.get(roomId)!;
      
      // If there's an active empty auto-deletion timeout, clear it!
      if (roomState.emptyTimeoutId) {
        clearTimeout(roomState.emptyTimeoutId);
        delete roomState.emptyTimeoutId;
        console.log(`[Socket] Room ${roomId} is active again. Cleared auto-deletion timeout.`);
      }

      if (!roomState.pendingApprovals) {
        roomState.pendingApprovals = [];
      }
      
      // Assign host if this user is host
      if (isHost) {
        roomState.hostSocketId = socket.id;
      }

      // Initialize approvedUsernames Set if undefined
      if (!roomState.approvedUsernames) {
        roomState.approvedUsernames = new Set<string>();
      }

      // Check if user has already been approved previously
      const isApprovedBefore = roomState.approvedUsernames.has(username);

      // Check private room entry admission
      if (!room.isPublic && !isHost && !isApprovedBefore) {
        if (!roomState.pendingApprovals.some(p => p.socketId === socket.id)) {
          roomState.pendingApprovals.push({ socketId: socket.id, username });
        }

        // Notify Host if online
        if (roomState.hostSocketId) {
          io.to(roomState.hostSocketId).emit('watch-request', {
            socketId: socket.id,
            username
          });

          // Also sync the host's requests tab instantly
          io.to(roomState.hostSocketId).emit('watch-requests-list', roomState.pendingApprovals);
        }

        // Notify viewer
        socket.emit('approval-pending', { message: 'Waiting for Host approval...' });
        console.log(`[Socket] Private entry request from ${username} (${socket.id}) in room ${roomId}`);
        return;
      }

      // Allowed (is public or is host)
      currentRoomId = roomId;
      currentUsername = username;
      socket.join(roomId);

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
        isHost,
        users: roomState.users,
        pendingApprovals: isHost ? (roomState.pendingApprovals || []) : []
      });

      // Notify all other clients of updated user list
      io.to(roomId).emit('room-users', roomState.users);

    } catch (err: any) {
      console.error('[Socket] Join room error:', err);
    }
  });

  // Approve or reject pending watcher
  socket.on('approve-viewer', ({ roomId, viewerSocketId, approved }: { roomId: string; viewerSocketId: string; approved: boolean }) => {
    const roomState = activeRooms.get(roomId);
    if (!roomState || roomState.hostSocketId !== socket.id) return;

    if (!roomState.pendingApprovals) {
      roomState.pendingApprovals = [];
    }

    const index = roomState.pendingApprovals.findIndex(p => p.socketId === viewerSocketId);
    if (index === -1) return;

    const viewer = roomState.pendingApprovals[index];
    roomState.pendingApprovals.splice(index, 1);

    // Sync updated pending request list to the host immediately
    socket.emit('watch-requests-list', roomState.pendingApprovals);

    const viewerSocket = io.sockets.sockets.get(viewerSocketId);

    if (approved) {
      // Add viewer's username to the persistent approval list
      if (!roomState.approvedUsernames) {
        roomState.approvedUsernames = new Set<string>();
      }
      roomState.approvedUsernames.add(viewer.username);

      if (!roomState.users.some(u => u.socketId === viewerSocketId)) {
        roomState.users.push(viewer);
      }

      if (viewerSocket) {
        (viewerSocket as any).currentRoomId = roomId;
        (viewerSocket as any).currentUsername = viewer.username;
        viewerSocket.join(roomId);

        // Tell viewer they are approved and transmit current room state
        viewerSocket.emit('join-approved', {
          currentTime: roomState.currentTime,
          isPlaying: roomState.isPlaying,
          isHost: false,
          users: roomState.users
        });

        // Broadcast user joined chat notification
        const joinMsg = {
          id: uuidv4(),
          senderName: 'System',
          message: `${viewer.username} joined the screening.`,
          createdAt: new Date()
        };
        io.to(roomId).emit('new-message', joinMsg);
        io.to(roomId).emit('room-users', roomState.users);
      }
    } else {
      if (viewerSocket) {
        viewerSocket.emit('join-rejected', { message: 'Access denied. The host has declined your request.' });
      }
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

  // 4b. End Stream (Host-only)
  socket.on('end-stream', async ({ roomId }: { roomId: string }) => {
    try {
      const roomState = activeRooms.get(roomId);
      // Validate: only the current room host is allowed to close it
      if (roomState && roomState.hostSocketId === socket.id) {
        console.log(`[Socket] Host ended stream in room ${roomId}. Deleting from DB...`);
        
        // Clear any pending empty auto-deletion timeouts
        if (roomState.emptyTimeoutId) {
          clearTimeout(roomState.emptyTimeoutId);
        }

        // Notify all clients in the room to leave
        io.to(roomId).emit('stream-ended', { message: 'The host has ended this screening session.' });

        // Delete room from database (cascades to chat messages)
        await prisma.room.delete({
          where: { id: roomId }
        });

        // Delete from active rooms cache
        activeRooms.delete(roomId);
      }
    } catch (err) {
      console.error('[Socket] End stream error:', err);
    }
  });

  // 5. Handle Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);

    // Scan rooms to remove from pendingApprovals
    activeRooms.forEach((roomState, rId) => {
      if (roomState.pendingApprovals) {
        const index = roomState.pendingApprovals.findIndex(p => p.socketId === socket.id);
        if (index !== -1) {
          roomState.pendingApprovals.splice(index, 1);
          if (roomState.hostSocketId) {
            io.to(roomState.hostSocketId).emit('watch-request-cancelled', { socketId: socket.id });
            io.to(roomState.hostSocketId).emit('watch-requests-list', roomState.pendingApprovals);
          }
        }
      }
    });

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

      // If room is empty, start 5-minute auto-deletion countdown
      if (roomState.users.length === 0) {
        const rId = currentRoomId;
        console.log(`[Socket] Room ${rId} is now empty. Starting 5-minute auto-deletion timer.`);
        
        roomState.emptyTimeoutId = setTimeout(async () => {
          try {
            console.log(`[Server] Room ${rId} has been empty for 5 minutes. Deleting from database...`);
            await prisma.room.delete({
              where: { id: rId }
            });
            activeRooms.delete(rId);
          } catch (dbErr) {
            console.error(`[Server] Error auto-deleting empty room ${rId}:`, dbErr);
          }
        }, 5 * 60 * 1000); // 5 minutes
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
