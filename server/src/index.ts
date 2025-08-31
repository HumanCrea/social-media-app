import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import postRoutes from './routes/posts';
import chatRoutes from './routes/chats';
import notificationRoutes from './routes/notifications';
import uploadRoutes from './routes/upload';
import pollRoutes from './routes/polls';
import reportRoutes from './routes/reports';
import storyRoutes from './routes/stories';
import hashtagRoutes from './routes/hashtags';
import bookmarkRoutes from './routes/bookmarks';
import videoRoutes from './routes/videos';
import achievementRoutes from './routes/achievements';
import { setupSocketHandlers } from './socket/socketHandlers';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

export const prisma = new PrismaClient();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/hashtags', hashtagRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/achievements', achievementRoutes);

// Make Socket.IO available to routes
app.set('socketio', io);

// Socket.io setup
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});