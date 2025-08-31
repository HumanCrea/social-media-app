import express from 'express'
import { z } from 'zod'
import { prisma } from '../index'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = express.Router()

const createStorySchema = z.object({
  mediaUrl: z.string().optional(),
  text: z.string().optional(),
  mediaType: z.enum(['image', 'video']).optional()
})

// Create story
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { mediaUrl, text, mediaType } = createStorySchema.parse(req.body)
    const authorId = req.user!.id

    if (!mediaUrl && !text) {
      return res.status(400).json({ error: 'Story must have media or text' })
    }

    // Set expiry to 24 hours from now
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const story = await prisma.story.create({
      data: {
        mediaUrl,
        text,
        mediaType,
        expiresAt,
        authorId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            views: true,
            likes: true
          }
        }
      }
    })

    res.status(201).json(story)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message })
    }
    res.status(500).json({ error: 'Server error' })
  }
})

// Get stories from followed users
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const now = new Date()

    // Get users that current user follows
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    })

    const followingIds = following.map(f => f.followingId)
    followingIds.push(userId) // Include own stories

    const stories = await prisma.story.findMany({
      where: {
        authorId: { in: followingIds },
        expiresAt: { gt: now } // Only active stories
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        },
        views: {
          where: { userId },
          select: { id: true }
        },
        _count: {
          select: {
            views: true,
            likes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Group stories by user and mark as viewed/unviewed
    const groupedStories = stories.reduce((acc, story) => {
      const userId = story.author.id
      if (!acc[userId]) {
        acc[userId] = {
          user: story.author,
          stories: [],
          hasUnviewed: false
        }
      }
      
      const isViewed = story.views.length > 0
      acc[userId].stories.push({ ...story, isViewed })
      
      if (!isViewed) {
        acc[userId].hasUnviewed = true
      }
      
      return acc
    }, {} as Record<string, any>)

    // Convert to array and sort (unviewed first)
    const result = Object.values(groupedStories).map((group: any) => ({
      id: group.user.id,
      user: group.user,
      isViewed: !group.hasUnviewed,
      storyCount: group.stories.length,
      latestStory: group.stories[0]
    })).sort((a: any, b: any) => {
      if (a.isViewed !== b.isViewed) {
        return a.isViewed ? 1 : -1 // Unviewed first
      }
      return new Date(b.latestStory.createdAt).getTime() - new Date(a.latestStory.createdAt).getTime()
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Get user stories
router.get('/user/:userId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params
    const now = new Date()

    const stories = await prisma.story.findMany({
      where: {
        authorId: userId,
        expiresAt: { gt: now }
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        },
        views: {
          where: { userId: req.user!.id },
          select: { id: true }
        },
        _count: {
          select: {
            views: true,
            likes: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    const storiesWithViewStatus = stories.map(story => ({
      ...story,
      isViewed: story.views.length > 0,
      views: undefined // Remove the views array from response
    }))

    res.json(storiesWithViewStatus)
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Mark story as viewed
router.post('/:storyId/view', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { storyId } = req.params
    const userId = req.user!.id

    // Check if story exists and is not expired
    const story = await prisma.story.findUnique({
      where: { id: storyId }
    })

    if (!story) {
      return res.status(404).json({ error: 'Story not found' })
    }

    if (new Date() > story.expiresAt) {
      return res.status(400).json({ error: 'Story has expired' })
    }

    // Don't track views for own stories
    if (story.authorId === userId) {
      return res.json({ message: 'Own story view not tracked' })
    }

    // Create view record (ignore if already exists)
    await prisma.storyView.upsert({
      where: {
        userId_storyId: { userId, storyId }
      },
      update: {},
      create: { userId, storyId }
    })

    res.json({ message: 'Story marked as viewed' })
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Like/unlike story
router.post('/:storyId/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { storyId } = req.params
    const userId = req.user!.id

    const existingLike = await prisma.storyLike.findUnique({
      where: {
        userId_storyId: { userId, storyId }
      }
    })

    if (existingLike) {
      await prisma.storyLike.delete({
        where: { userId_storyId: { userId, storyId } }
      })
      res.json({ liked: false })
    } else {
      await prisma.storyLike.create({
        data: { userId, storyId }
      })
      res.json({ liked: true })
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete story
router.delete('/:storyId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { storyId } = req.params
    const userId = req.user!.id

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true }
    })

    if (!story) {
      return res.status(404).json({ error: 'Story not found' })
    }

    if (story.authorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    await prisma.story.delete({
      where: { id: storyId }
    })

    res.json({ message: 'Story deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router