import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

const createVideoSchema = z.object({
  title: z.string().max(150).optional(),
  description: z.string().max(500).optional(),
  videoUrl: z.string().min(1),
  thumbnailUrl: z.string().optional(),
  duration: z.number().positive()
});

// Helper function to extract hashtags from text
const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
};

// Create short video
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, description, videoUrl, thumbnailUrl, duration } = createVideoSchema.parse(req.body);

    // Extract hashtags from title and description
    const titleHashtags = title ? extractHashtags(title) : [];
    const descriptionHashtags = description ? extractHashtags(description) : [];
    const hashtagNames = [...new Set([...titleHashtags, ...descriptionHashtags])];

    const video = await prisma.shortVideo.create({
      data: {
        title,
        description,
        videoUrl,
        thumbnailUrl,
        duration,
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
            viewLogs: true
          }
        }
      }
    });

    // Process hashtags
    for (const hashtagName of hashtagNames) {
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
        await prisma.hashtag.update({
          where: { id: hashtag.id },
          data: {
            count: { increment: 1 },
            updatedAt: new Date()
          }
        });
      }

      await prisma.videoHashtag.create({
        data: {
          videoId: video.id,
          hashtagId: hashtag.id
        }
      });
    }

    res.status(201).json(video);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Get videos feed with infinite scroll
router.get('/feed', async (req, res) => {
  try {
    const { page = '1', limit = '10', cursor } = req.query;
    const pageSize = parseInt(limit as string);

    let videos;
    if (cursor) {
      videos = await prisma.shortVideo.findMany({
        cursor: {
          id: cursor as string
        },
        skip: 1, // Skip the cursor
        take: pageSize,
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
              viewLogs: true,
              comments: true,
              bookmarks: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      videos = await prisma.shortVideo.findMany({
        take: pageSize,
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
              viewLogs: true,
              comments: true,
              bookmarks: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    const nextCursor = videos.length === pageSize ? videos[videos.length - 1].id : null;

    res.json({
      videos,
      nextCursor,
      hasMore: videos.length === pageSize
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get authenticated user's feed
router.get('/feed/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { cursor, limit = '10' } = req.query;
    const pageSize = parseInt(limit as string);

    // Get users that current user follows
    const following = await prisma.follow.findMany({
      where: { followerId: req.user!.id },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);
    followingIds.push(req.user!.id); // Include own videos

    let videos;
    if (cursor) {
      videos = await prisma.shortVideo.findMany({
        cursor: {
          id: cursor as string
        },
        skip: 1,
        take: pageSize,
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
              viewLogs: true,
              comments: true,
              bookmarks: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      videos = await prisma.shortVideo.findMany({
        take: pageSize,
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
              viewLogs: true,
              comments: true,
              bookmarks: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    const videosWithLikeStatus = videos.map(video => ({
      ...video,
      isLiked: video.likes.length > 0,
      isBookmarked: video.bookmarks.length > 0,
      likes: undefined,
      bookmarks: undefined
    }));

    const nextCursor = videos.length === pageSize ? videos[videos.length - 1].id : null;

    res.json({
      videos: videosWithLikeStatus,
      nextCursor,
      hasMore: videos.length === pageSize
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Like/unlike video
router.post('/:videoId/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user!.id;

    const existingLike = await prisma.videoLike.findUnique({
      where: {
        userId_videoId: { userId, videoId }
      }
    });

    if (existingLike) {
      await prisma.videoLike.delete({
        where: { userId_videoId: { userId, videoId } }
      });
      res.json({ liked: false });
    } else {
      await prisma.videoLike.create({
        data: { userId, videoId }
      });
      res.json({ liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Record video view
router.post('/:videoId/view', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { videoId } = req.params;
    const { watchTime = 0 } = req.body;

    await prisma.videoView.create({
      data: {
        videoId,
        userId: req.user!.id,
        watchTime
      }
    });

    // Increment view count
    await prisma.shortVideo.update({
      where: { id: videoId },
      data: {
        views: { increment: 1 }
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's videos
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { cursor, limit = '20' } = req.query;
    const pageSize = parseInt(limit as string);

    let videos;
    if (cursor) {
      videos = await prisma.shortVideo.findMany({
        cursor: {
          id: cursor as string
        },
        skip: 1,
        take: pageSize,
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
          _count: {
            select: {
              likes: true,
              viewLogs: true,
              comments: true,
              bookmarks: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      videos = await prisma.shortVideo.findMany({
        take: pageSize,
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
          _count: {
            select: {
              likes: true,
              viewLogs: true,
              comments: true,
              bookmarks: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    const nextCursor = videos.length === pageSize ? videos[videos.length - 1].id : null;

    res.json({
      videos,
      nextCursor,
      hasMore: videos.length === pageSize
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete video
router.delete('/:videoId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { videoId } = req.params;

    const video = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { authorId: true }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.authorId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.shortVideo.delete({
      where: { id: videoId }
    });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Video Comments endpoints

// Add comment to video
router.post('/:videoId/comments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = await prisma.videoComment.create({
      data: {
        content: content.trim(),
        authorId: req.user!.id,
        videoId
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

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get comments for video
router.get('/:videoId/comments', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const comments = await prisma.videoComment.findMany({
      where: { videoId },
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
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: parseInt(limit as string)
    });

    const total = await prisma.videoComment.count({
      where: { videoId }
    });

    res.json({
      comments,
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

// Delete comment (author only)
router.delete('/comments/:commentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { commentId } = req.params;

    const comment = await prisma.videoComment.findUnique({
      where: { id: commentId },
      select: { authorId: true }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.authorId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.videoComment.delete({
      where: { id: commentId }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Video Bookmarks endpoints

// Bookmark/unbookmark video
router.post('/:videoId/bookmark', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user!.id;

    const existingBookmark = await prisma.videoBookmark.findUnique({
      where: {
        userId_videoId: { userId, videoId }
      }
    });

    if (existingBookmark) {
      await prisma.videoBookmark.delete({
        where: { userId_videoId: { userId, videoId } }
      });
      res.json({ bookmarked: false });
    } else {
      await prisma.videoBookmark.create({
        data: { userId, videoId }
      });
      res.json({ bookmarked: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's bookmarked videos
router.get('/bookmarks/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const bookmarks = await prisma.videoBookmark.findMany({
      where: { userId },
      include: {
        video: {
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
                bookmarks: true,
                viewLogs: true
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

    const total = await prisma.videoBookmark.count({
      where: { userId }
    });

    const videosWithBookmarkStatus = bookmarks.map(bookmark => ({
      ...bookmark.video,
      isBookmarked: true,
      isLiked: false // Would need to check this separately if needed
    }));

    res.json({
      videos: videosWithBookmarkStatus,
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

// Check if video is bookmarked
router.get('/:videoId/bookmark/check', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user!.id;

    const bookmark = await prisma.videoBookmark.findUnique({
      where: {
        userId_videoId: { userId, videoId }
      }
    });

    res.json({ bookmarked: !!bookmark });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;