import express from 'express'
import { z } from 'zod'
import { prisma } from '../index'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = express.Router()

const createReportSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(['user', 'post']),
  reason: z.string(),
  description: z.string().optional()
})

const blockUserSchema = z.object({
  userId: z.string()
})

// Create report
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { targetId, targetType, reason, description } = createReportSchema.parse(req.body)
    const reporterId = req.user!.id

    // Check if target exists
    if (targetType === 'user') {
      const user = await prisma.user.findUnique({ where: { id: targetId } })
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
    } else if (targetType === 'post') {
      const post = await prisma.post.findUnique({ where: { id: targetId } })
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }
    }

    // Check for duplicate reports
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        targetId,
        targetType
      }
    })

    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this' })
    }

    const report = await prisma.report.create({
      data: {
        targetId,
        targetType,
        reason,
        description,
        reporterId
      }
    })

    res.status(201).json(report)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message })
    }
    res.status(500).json({ error: 'Server error' })
  }
})

// Block user
router.post('/block', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId } = blockUserSchema.parse(req.body)
    const blockerId = req.user!.id

    if (blockerId === userId) {
      return res.status(400).json({ error: 'Cannot block yourself' })
    }

    // Check if already blocked
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userId
        }
      }
    })

    if (existingBlock) {
      return res.status(400).json({ error: 'User already blocked' })
    }

    // Create block
    await prisma.block.create({
      data: {
        blockerId,
        blockedId: userId
      }
    })

    // Remove any existing follows between the users
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: userId },
          { followerId: userId, followingId: blockerId }
        ]
      }
    })

    res.json({ message: 'User blocked successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message })
    }
    res.status(500).json({ error: 'Server error' })
  }
})

// Unblock user
router.delete('/block/:userId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params
    const blockerId = req.user!.id

    await prisma.block.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userId
        }
      }
    })

    res.json({ message: 'User unblocked successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Get blocked users
router.get('/blocked', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const blocks = await prisma.block.findMany({
      where: { blockerId: req.user!.id },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      }
    })

    res.json(blocks.map(block => block.blocked))
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router