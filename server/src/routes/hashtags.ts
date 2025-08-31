import express from 'express';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get trending hashtags
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const hashtags = await prisma.hashtag.findMany({
      orderBy: [
        { count: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        count: true,
        updatedAt: true
      }
    });

    res.json(hashtags);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Search hashtags
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const hashtags = await prisma.hashtag.findMany({
      where: {
        name: {
          contains: query
        }
      },
      orderBy: [
        { count: 'desc' },
        { name: 'asc' }
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        count: true
      }
    });

    res.json(hashtags);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get posts by hashtag
router.get('/:hashtagName/posts', async (req, res) => {
  try {
    const { hashtagName } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Find hashtag
    const hashtag = await prisma.hashtag.findUnique({
      where: { name: hashtagName }
    });

    if (!hashtag) {
      return res.status(404).json({ error: 'Hashtag not found' });
    }

    // Get posts with this hashtag
    const posts = await prisma.post.findMany({
      where: {
        hashtags: {
          some: {
            hashtagId: hashtag.id
          }
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
        hashtags: {
          include: {
            hashtag: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    const totalPosts = await prisma.post.count({
      where: {
        hashtags: {
          some: {
            hashtagId: hashtag.id
          }
        }
      }
    });

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total: totalPosts,
        pages: Math.ceil(totalPosts / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get hashtag details
router.get('/:hashtagName', async (req, res) => {
  try {
    const { hashtagName } = req.params;
    
    const hashtag = await prisma.hashtag.findUnique({
      where: { name: hashtagName },
      select: {
        id: true,
        name: true,
        count: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!hashtag) {
      return res.status(404).json({ error: 'Hashtag not found' });
    }

    res.json(hashtag);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;