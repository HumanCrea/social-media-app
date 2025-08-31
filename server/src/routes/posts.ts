import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

const createPostSchema = z.object({
  content: z.string().min(1).max(500),
  imageUrl: z.string().optional()
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(280)
});

// Helper function to extract hashtags from text
const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
};

// Create post
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content, imageUrl } = createPostSchema.parse(req.body);

    // Extract hashtags from content
    const hashtagNames = extractHashtags(content);

    const post = await prisma.post.create({
      data: {
        content,
        imageUrl,
        authorId: req.user!.id
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
            comments: true,
            bookmarks: true
          }
        }
      }
    });

    // Process hashtags
    for (const hashtagName of hashtagNames) {
      // Find or create hashtag
      let hashtag = await prisma.hashtag.findUnique({
        where: { name: hashtagName }
      });

      if (!hashtag) {
        hashtag = await prisma.hashtag.create({
          data: {
            name: hashtagName,
            count: 1
          }
        });
      } else {
        // Increment hashtag count
        await prisma.hashtag.update({
          where: { id: hashtag.id },
          data: {
            count: { increment: 1 },
            updatedAt: new Date()
          }
        });
      }

      // Link post to hashtag
      await prisma.postHashtag.create({
        data: {
          postId: post.id,
          hashtagId: hashtag.id
        }
      });
    }

    res.status(201).json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Get feed (posts and polls from followed users + own posts)
router.get('/feed', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get users that current user follows
    const following = await prisma.follow.findMany({
      where: { followerId: req.user!.id },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);
    followingIds.push(req.user!.id); // Include own posts

    const posts = await prisma.post.findMany({
      where: {
        authorId: { in: followingIds }
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
        likes: {
          where: { userId: req.user!.id },
          select: { id: true }
        },
        bookmarks: {
          where: { userId: req.user!.id },
          select: { id: true }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string)
    });

    const polls = await prisma.poll.findMany({
      where: {
        authorId: { in: followingIds }
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
        options: {
          include: {
            votes: {
              where: { userId: req.user!.id },
              select: { id: true }
            },
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
      },
      orderBy: { createdAt: 'desc' }
    });

    const postsWithLikeStatus = posts.map(post => ({
      ...post,
      type: 'post',
      isLiked: post.likes.length > 0,
      isBookmarked: post.bookmarks.length > 0,
      likes: undefined,
      bookmarks: undefined
    }));

    const pollsWithVoteStatus = polls.map(poll => ({
      ...poll,
      type: 'poll',
      isExpired: new Date() > poll.expiresAt,
      hasVoted: poll.options.some(option => option.votes.length > 0),
      totalVotes: poll._count.votes,
      options: poll.options.map(option => ({
        ...option,
        votes: option._count.votes,
        voted: option.votes.length > 0,
        _count: undefined
      }))
    }));

    // Combine and sort by creation date
    const combinedFeed = [...postsWithLikeStatus, ...pollsWithVoteStatus]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(skip, skip + parseInt(limit as string));

    res.json(combinedFeed);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all posts and polls (public timeline)
router.get('/', async (req, res) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const posts = await prisma.post.findMany({
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
            comments: true,
            bookmarks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const polls = await prisma.poll.findMany({
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
      },
      orderBy: { createdAt: 'desc' }
    });

    const postsWithType = posts.map(post => ({
      ...post,
      type: 'post'
    }));

    const pollsWithType = polls.map(poll => ({
      ...poll,
      type: 'poll',
      isExpired: new Date() > poll.expiresAt,
      hasVoted: false,
      totalVotes: poll._count.votes,
      options: poll.options.map(option => ({
        ...option,
        votes: option._count.votes,
        voted: false,
        _count: undefined
      }))
    }));

    // Combine and sort by creation date
    const combinedFeed = [...postsWithType, ...pollsWithType]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(skip, skip + parseInt(limit as string));

    res.json(combinedFeed);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's posts
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '10' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const posts = await prisma.post.findMany({
      where: { authorId: userId },
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
            comments: true,
            bookmarks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string)
    });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Like/unlike post
router.post('/:postId/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user!.id;

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { userId_postId: { userId, postId } }
      });
      res.json({ liked: false });
    } else {
      // Like
      await prisma.like.create({
        data: { userId, postId }
      });

      // Create notification for post author
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true }
      });

      if (post && post.authorId !== userId) {
        await prisma.notification.create({
          data: {
            type: 'LIKE',
            content: 'liked your post',
            senderId: userId,
            receiverId: post.authorId,
            postId
          }
        });
      }

      res.json({ liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment
router.post('/:postId/comments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const { content } = createCommentSchema.parse(req.body);

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: req.user!.id
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      }
    });

    // Create notification for post author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (post && post.authorId !== req.user!.id) {
      await prisma.notification.create({
        data: {
          type: 'COMMENT',
          content: 'commented on your post',
          senderId: req.user!.id,
          receiverId: post.authorId,
          postId,
          commentId: comment.id
        }
      });
    }

    res.status(201).json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Get post comments
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update post
router.put('/:postId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const { content, imageUrl } = req.body;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content,
        imageUrl,
        updatedAt: new Date()
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
            likes: true,
            comments: true,
            bookmarks: true
          }
        }
      }
    });

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete post
router.delete('/:postId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.post.delete({
      where: { id: postId }
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add live reaction to post
router.post('/:postId/reaction', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Valid emoji is required' });
    }

    // Broadcast reaction via WebSocket if available
    const io = (req as any).app.get('socketio');
    if (io) {
      io.emit('live_reaction', {
        postId,
        emoji,
        userId: req.user!.id,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, emoji });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;