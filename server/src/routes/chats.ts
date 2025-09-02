import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(['image', 'video', 'document']).optional(),
  receiverId: z.string().optional(),
  chatId: z.string().optional()
});

const createChatSchema = z.object({
  participantIds: z.array(z.string()),
  name: z.string().optional(),
  isGroupChat: z.boolean().default(false)
});

// Get user's chats
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: { userId: req.user!.id }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        }
      },
      orderBy: { lastActivity: 'desc' }
    });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or get existing chat
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { participantIds, name, isGroupChat } = createChatSchema.parse(req.body);
    const allParticipants = [...participantIds, req.user!.id];

    // For direct messages, check if chat already exists
    if (!isGroupChat && participantIds.length === 1) {
      const existingChat = await prisma.chat.findFirst({
        where: {
          isGroupChat: false,
          AND: [
            { participants: { some: { userId: req.user!.id } } },
            { participants: { some: { userId: participantIds[0] } } }
          ]
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true
                }
              }
            }
          }
        }
      });

      if (existingChat) {
        return res.json(existingChat);
      }
    }

    // Create new chat
    const chat = await prisma.chat.create({
      data: {
        name,
        isGroupChat,
        participants: {
          create: allParticipants.map(userId => ({ userId }))
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(chat);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Get chat messages
router.get('/:chatId/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { chatId } = req.params;
    const { page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Verify user is participant
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: { some: { userId: req.user!.id } }
      }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string)
    });

    res.json(messages.reverse()); // Return in chronological order
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Send message
router.post('/:chatId/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { chatId } = req.params;
    const { content, mediaUrl, mediaType } = sendMessageSchema.parse(req.body);

    // Verify user is participant
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: { some: { userId: req.user!.id } }
      },
      include: {
        participants: { select: { userId: true } }
      }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const message = await prisma.message.create({
      data: {
        content,
        mediaUrl,
        mediaType,
        senderId: req.user!.id,
        chatId
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

    // Update chat last activity
    await prisma.chat.update({
      where: { id: chatId },
      data: { 
        lastActivity: new Date(),
        lastMessage: content
      }
    });

    // Create notifications for other participants
    const otherParticipants = chat.participants.filter(p => p.userId !== req.user!.id);
    await Promise.all(
      otherParticipants.map(participant =>
        prisma.notification.create({
          data: {
            type: 'MESSAGE',
            content: 'sent you a message',
            senderId: req.user!.id,
            receiverId: participant.userId
          }
        })
      )
    );

    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark messages as read
router.put('/:chatId/read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { chatId } = req.params;

    await prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: req.user!.id },
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;