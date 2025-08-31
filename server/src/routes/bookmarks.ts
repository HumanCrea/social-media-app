import express from 'express';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Add/remove bookmark
router.post('/:postId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user!.id;

    // Check if already bookmarked
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: { userId, postId }
      }
    });

    if (existingBookmark) {
      // Remove bookmark
      await prisma.bookmark.delete({
        where: { userId_postId: { userId, postId } }
      });
      res.json({ bookmarked: false });
    } else {
      // Add bookmark
      await prisma.bookmark.create({
        data: { userId, postId }
      });
      res.json({ bookmarked: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's bookmarks
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        post: {
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
            bookmarks: {
              where: { userId },
              select: { id: true }
            },
            likes: {
              where: { userId },
              select: { id: true }
            },
            _count: {
              select: {
                likes: true,
                comments: true,
                bookmarks: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: parseInt(limit as string)
    });

    const total = await prisma.bookmark.count({
      where: { userId }
    });

    const postsWithBookmarkStatus = bookmarks.map(bookmark => ({
      ...bookmark.post,
      isLiked: bookmark.post.likes.length > 0,
      isBookmarked: true, // All posts in this response are bookmarked
      likes: undefined,
      bookmarks: undefined
    }));

    res.json({
      posts: postsWithBookmarkStatus,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if post is bookmarked
router.get('/check/:postId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user!.id;

    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: { userId, postId }
      }
    });

    res.json({ bookmarked: !!bookmark });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove bookmark
router.delete('/:postId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user!.id;

    await prisma.bookmark.deleteMany({
      where: {
        userId,
        postId
      }
    });

    res.json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;