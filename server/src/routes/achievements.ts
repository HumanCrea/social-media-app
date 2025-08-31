import express from 'express';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Predefined achievements
const DEFAULT_ACHIEVEMENTS = [
  {
    name: 'first_post',
    title: 'First Steps',
    description: 'Share your first post',
    icon: '👶',
    category: 'milestone',
    rarity: 'common',
    points: 10,
    requirement: JSON.stringify({ type: 'post_count', target: 1 })
  },
  {
    name: 'social_butterfly',
    title: 'Social Butterfly',
    description: 'Follow 10 users',
    icon: '🦋',
    category: 'social',
    rarity: 'common',
    points: 25,
    requirement: JSON.stringify({ type: 'following_count', target: 10 })
  },
  {
    name: 'content_creator',
    title: 'Content Creator',
    description: 'Share 50 posts',
    icon: '📝',
    category: 'content',
    rarity: 'rare',
    points: 100,
    requirement: JSON.stringify({ type: 'post_count', target: 50 })
  },
  {
    name: 'popular_post',
    title: 'Trending Creator',
    description: 'Get 100 likes on a single post',
    icon: '🔥',
    category: 'engagement',
    rarity: 'epic',
    points: 200,
    requirement: JSON.stringify({ type: 'post_likes', target: 100 })
  },
  {
    name: 'video_star',
    title: 'Video Star',
    description: 'Upload your first short video',
    icon: '🎬',
    category: 'content',
    rarity: 'common',
    points: 20,
    requirement: JSON.stringify({ type: 'video_count', target: 1 })
  },
  {
    name: 'viral_video',
    title: 'Viral Sensation',
    description: 'Get 1000 views on a video',
    icon: '🚀',
    category: 'engagement',
    rarity: 'legendary',
    points: 500,
    requirement: JSON.stringify({ type: 'video_views', target: 1000 })
  },
  {
    name: 'early_bird',
    title: 'Early Bird',
    description: 'Join the platform in its early days',
    icon: '🐦',
    category: 'milestone',
    rarity: 'rare',
    points: 50,
    requirement: JSON.stringify({ type: 'join_date', before: '2025-12-31' })
  },
  {
    name: 'storyteller',
    title: 'Storyteller',
    description: 'Share 10 stories',
    icon: '📖',
    category: 'content',
    rarity: 'common',
    points: 30,
    requirement: JSON.stringify({ type: 'story_count', target: 10 })
  },
  {
    name: 'trending_master',
    title: 'Trending Master',
    description: 'Use 20 different hashtags',
    icon: '#️⃣',
    category: 'engagement',
    rarity: 'rare',
    points: 75,
    requirement: JSON.stringify({ type: 'hashtag_usage', target: 20 })
  },
  {
    name: 'community_leader',
    title: 'Community Leader',
    description: 'Get 1000 followers',
    icon: '👑',
    category: 'social',
    rarity: 'legendary',
    points: 1000,
    requirement: JSON.stringify({ type: 'follower_count', target: 1000 })
  }
];

// Initialize achievements
router.post('/initialize', async (req, res) => {
  try {
    for (const achievement of DEFAULT_ACHIEVEMENTS) {
      await prisma.achievement.upsert({
        where: { name: achievement.name },
        update: {},
        create: achievement
      });
    }
    res.json({ message: 'Achievements initialized successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all achievements
router.get('/', async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { points: 'asc' }
      ]
    });

    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's achievements
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true
      },
      orderBy: {
        unlockedAt: 'desc'
      }
    });

    const totalPoints = userAchievements
      .filter(ua => ua.isCompleted)
      .reduce((sum, ua) => sum + ua.achievement.points, 0);

    res.json({
      achievements: userAchievements,
      totalPoints,
      completedCount: userAchievements.filter(ua => ua.isCompleted).length,
      totalCount: userAchievements.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user's achievements
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Check for new achievements
    await checkAndUnlockAchievements(userId);

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true
      },
      orderBy: {
        unlockedAt: 'desc'
      }
    });

    const totalPoints = userAchievements
      .filter(ua => ua.isCompleted)
      .reduce((sum, ua) => sum + ua.achievement.points, 0);

    res.json({
      achievements: userAchievements,
      totalPoints,
      completedCount: userAchievements.filter(ua => ua.isCompleted).length,
      totalCount: userAchievements.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Check for new achievements (called after user actions)
router.post('/check', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const newAchievements = await checkAndUnlockAchievements(req.user!.id);
    res.json({ newAchievements });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to check and unlock achievements
async function checkAndUnlockAchievements(userId: string) {
  const newAchievements = [];
  
  try {
    // Get user stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            posts: true,
            shortVideos: true,
            stories: true,
            following: true,
            followers: true
          }
        }
      }
    });

    if (!user) return newAchievements;

    // Get all achievements
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true }
    });

    // Check each achievement
    for (const achievement of achievements) {
      // Skip if user already has this achievement
      const existingUserAchievement = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id
          }
        }
      });

      if (existingUserAchievement?.isCompleted) continue;

      const requirement = JSON.parse(achievement.requirement);
      let shouldUnlock = false;
      let progress = 0;

      // Check different types of requirements
      switch (requirement.type) {
        case 'post_count':
          progress = user._count.posts;
          shouldUnlock = progress >= requirement.target;
          break;

        case 'video_count':
          progress = user._count.shortVideos;
          shouldUnlock = progress >= requirement.target;
          break;

        case 'story_count':
          progress = user._count.stories;
          shouldUnlock = progress >= requirement.target;
          break;

        case 'following_count':
          progress = user._count.following;
          shouldUnlock = progress >= requirement.target;
          break;

        case 'follower_count':
          progress = user._count.followers;
          shouldUnlock = progress >= requirement.target;
          break;

        case 'join_date':
          const joinDate = new Date(user.createdAt);
          const beforeDate = new Date(requirement.before);
          shouldUnlock = joinDate <= beforeDate;
          progress = shouldUnlock ? 1 : 0;
          break;

        case 'post_likes':
          // Check if any post has the required likes
          const popularPost = await prisma.post.findFirst({
            where: {
              authorId: userId,
              likes: {
                _count: {
                  gte: requirement.target
                }
              }
            }
          });
          shouldUnlock = !!popularPost;
          
          // Get max likes on any post for progress
          const maxLikesPost = await prisma.post.findFirst({
            where: { authorId: userId },
            include: {
              _count: {
                select: { likes: true }
              }
            },
            orderBy: {
              likes: {
                _count: 'desc'
              }
            }
          });
          progress = maxLikesPost?._count.likes || 0;
          break;

        case 'video_views':
          // Check if any video has the required views
          const popularVideo = await prisma.shortVideo.findFirst({
            where: {
              authorId: userId,
              views: {
                gte: requirement.target
              }
            }
          });
          shouldUnlock = !!popularVideo;
          
          // Get max views on any video for progress
          const maxViewsVideo = await prisma.shortVideo.findFirst({
            where: { authorId: userId },
            orderBy: {
              views: 'desc'
            }
          });
          progress = maxViewsVideo?.views || 0;
          break;
      }

      // Update or create user achievement
      if (existingUserAchievement) {
        await prisma.userAchievement.update({
          where: { id: existingUserAchievement.id },
          data: {
            progress,
            isCompleted: shouldUnlock,
            unlockedAt: shouldUnlock ? new Date() : existingUserAchievement.unlockedAt
          }
        });
      } else {
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
            progress,
            isCompleted: shouldUnlock
          }
        });
      }

      if (shouldUnlock && !existingUserAchievement?.isCompleted) {
        newAchievements.push(achievement);
      }
    }

    return newAchievements;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return newAchievements;
  }
}

export default router;