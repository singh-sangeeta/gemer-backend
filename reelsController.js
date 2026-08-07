const Reel = require('./Reel');
const Like = require('./Like');
const Follow = require('./Follow');
const { upload } = require('./config/cloudinary');

exports.createReel = async (req, res) => {
  try {
    const { caption, hashtags } = req.body;
    
    if (!req.file || !req.file.mimetype.startsWith('video')) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    const reel = new Reel({
      user: req.user.id,
      videoUrl: req.file.path,
      caption,
      hashtags: hashtags ? JSON.parse(hashtags) : []
    });

    await reel.save();
    
    const populatedReel = await Reel.findById(reel._id).populate('user', 'username fullName profilePicture');
    res.status(201).json(populatedReel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getReels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Recommendation Engine for Reels (Mix of following and popular)
    const followingDocs = await Follow.find({ follower: req.user.id }).select('following');
    const followingIds = followingDocs.map(f => f.following);

    // Fetch reels: prioritizing following, then high engagement
    const reels = await Reel.aggregate([
      {
        $addFields: {
          score: {
            $add: [
              { $cond: [{ $in: ["$user", followingIds] }, 1000, 0] }, // heavy weight to following
              { $multiply: ["$likesCount", 2] },
              { $multiply: ["$commentsCount", 3] },
              "$viewsCount"
            ]
          }
        }
      },
      { $sort: { score: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    const populatedReels = await Reel.populate(reels, { path: 'user', select: 'username fullName profilePicture' });

    // Assuming Likes model handles both Posts and Reels, or we need a specific ReelLike model. 
    // To keep it simple, if Like is generic, we can use it, but Like schema requires 'post'. Let's reuse 'post' field for reel id.
    const reelIds = populatedReels.map(r => r._id);
    const likes = await Like.find({ user: req.user.id, post: { $in: reelIds } });
    const likedReelIds = new Set(likes.map(l => l.post.toString()));

    const feedReels = populatedReels.map(reel => ({
      ...reel,
      isLikedByMe: likedReelIds.has(reel._id.toString())
    }));

    res.json(feedReels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
