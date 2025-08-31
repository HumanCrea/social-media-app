import express from 'express'
import { prisma } from '../index'
import { authenticateToken, AuthRequest } from '../middleware/auth'

const router = express.Router()

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { question, options, duration, allowMultipleVotes } = req.body
    const authorId = req.user!.id

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Invalid poll data' })
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + duration)

    const poll = await prisma.poll.create({
      data: {
        question,
        expiresAt,
        allowMultipleVotes,
        authorId,
        options: {
          create: options.map((text: string) => ({ text }))
        }
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
        options: true,
        _count: {
          select: {
            votes: true
          }
        }
      }
    })

    res.json(poll)
  } catch (error) {
    console.error('Error creating poll:', error)
    res.status(500).json({ error: 'Failed to create poll' })
  }
})

router.post('/:pollId/vote', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { pollId } = req.params
    const { optionIds } = req.body
    const userId = req.user!.id

    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      return res.status(400).json({ error: 'Invalid vote data' })
    }

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true }
    })

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' })
    }

    if (new Date() > poll.expiresAt) {
      return res.status(400).json({ error: 'Poll has expired' })
    }

    const existingVotes = await prisma.pollVote.findMany({
      where: { userId, option: { pollId } }
    })

    if (existingVotes.length > 0 && !poll.allowMultipleVotes) {
      return res.status(400).json({ error: 'You have already voted on this poll' })
    }

    if (!poll.allowMultipleVotes && optionIds.length > 1) {
      return res.status(400).json({ error: 'Multiple votes not allowed for this poll' })
    }

    await prisma.pollVote.deleteMany({
      where: { userId, option: { pollId } }
    })

    const votes = await Promise.all(
      optionIds.map((optionId: string) =>
        prisma.pollVote.create({
          data: { 
            userId,
            optionId,
            pollId
          }
        })
      )
    )

    res.json({ success: true, votes })
  } catch (error) {
    console.error('Error voting on poll:', error)
    res.status(500).json({ error: 'Failed to submit vote' })
  }
})

router.get('/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        },
        options: {
          include: {
            _count: {
              select: {
                votes: true
              }
            }
          }
        },
        _count: {
          select: {
            votes: true
          }
        }
      }
    })

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' })
    }

    const isExpired = new Date() > poll.expiresAt

    const pollData = {
      ...poll,
      isExpired,
      totalVotes: poll._count.votes,
      options: poll.options.map(option => ({
        ...option,
        votes: option._count.votes
      }))
    }

    res.json(pollData)
  } catch (error) {
    console.error('Error fetching poll:', error)
    res.status(500).json({ error: 'Failed to fetch poll' })
  }
})

export default router