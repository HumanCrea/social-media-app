import dotenv from 'dotenv';
dotenv.config();
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
    origin: ["http://localhost:5173", "https://social-media-app-client-tau.vercel.app"],
    methods: ["GET", "POST"]
  }
});

export const prisma = new PrismaClient();

app.use(cors({
  origin: ['http://localhost:5173', 'https://social-media-app-client-tau.vercel.app'],
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

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Initialize database schema
    try {
      // Try to access a table to see if schema exists
      await prisma.user.findFirst();
      console.log('✅ Database schema ready');
    } catch (error) {
      console.log('⚠️  Database schema not found, attempting to create...');
      try {
        // Run database push to create schema
        const { exec } = require('child_process');
        await new Promise((resolve, reject) => {
          exec('npx prisma db push --accept-data-loss', (error, stdout, stderr) => {
            if (error) {
              console.log('⚠️  Schema creation failed, but continuing:', error.message);
              resolve(null);
            } else {
              console.log('✅ Database schema created successfully');
              resolve(stdout);
            }
          });
        });
      } catch (migrationError) {
        console.log('⚠️  Migration failed, but server will continue...');
      }
    }
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});