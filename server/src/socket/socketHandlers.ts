import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true }
      });

      if (!user) {
        return next(new Error('Authentication error'));
      }

      socket.userId = user.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected`);

    // Join user to their personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Join chat rooms
    socket.on('join-chat', async (chatId: string) => {
      try {
        // Verify user is participant in this chat
        const chat = await prisma.chat.findFirst({
          where: {
            id: chatId,
            participants: { some: { userId: socket.userId } }
          }
        });

        if (chat) {
          socket.join(`chat:${chatId}`);
          console.log(`User ${socket.userId} joined chat ${chatId}`);
        }
      } catch (error) {
        console.error('Error joining chat:', error);
      }
    });

    // Leave chat room
    socket.on('leave-chat', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      console.log(`User ${socket.userId} left chat ${chatId}`);
    });

    // Handle new message
    socket.on('send-message', async (data: {
      chatId: string;
      content: string;
    }) => {
      try {
        // Verify user is participant
        const chat = await prisma.chat.findFirst({
          where: {
            id: data.chatId,
            participants: { some: { userId: socket.userId } }
          },
          include: {
            participants: { select: { userId: true } }
          }
        });

        if (!chat) {
          return socket.emit('error', { message: 'Chat not found' });
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            content: data.content,
            senderId: socket.userId!,
            chatId: data.chatId
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true
              }
            }
          }
        });

        // Update chat activity
        await prisma.chat.update({
          where: { id: data.chatId },
          data: {
            lastActivity: new Date(),
            lastMessage: data.content
          }
        });

        // Emit to all participants in the chat
        io.to(`chat:${data.chatId}`).emit('new-message', message);

        // Send notifications to offline users
        const otherParticipants = chat.participants.filter(
          p => p.userId !== socket.userId
        );

        for (const participant of otherParticipants) {
          io.to(`user:${participant.userId}`).emit('notification', {
            type: 'MESSAGE',
            content: 'sent you a message',
            sender: message.sender,
            chatId: data.chatId
          });
        }

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('user-typing', {
        userId: socket.userId,
        chatId
      });
    });

    socket.on('typing-stop', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('user-stop-typing', {
        userId: socket.userId,
        chatId
      });
    });

    // Handle real-time post updates
    socket.on('post-liked', (data: { postId: string; authorId: string }) => {
      // Notify post author about the like
      io.to(`user:${data.authorId}`).emit('notification', {
        type: 'LIKE',
        content: 'liked your post',
        postId: data.postId,
        senderId: socket.userId
      });
    });

    socket.on('post-commented', (data: { postId: string; authorId: string }) => {
      // Notify post author about the comment
      io.to(`user:${data.authorId}`).emit('notification', {
        type: 'COMMENT',
        content: 'commented on your post',
        postId: data.postId,
        senderId: socket.userId
      });
    });

    socket.on('user-followed', (data: { followedUserId: string }) => {
      // Notify followed user
      io.to(`user:${data.followedUserId}`).emit('notification', {
        type: 'FOLLOW',
        content: 'started following you',
        senderId: socket.userId
      });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });
};