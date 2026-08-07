const Post = require('./Post');
const View = require('./View');
const Follow = require('./Follow');
const Like = require('./Like');
const { upload } = require('./config/cloudinary');

// Upload single or multiple media? The setup might rely on Cloudinary uploader in route.
// Assuming req.files for multiple, or req.file for single.
exports.createPost = async (req, res) => {
  try {
    const { caption, location, hashtags } = req.body;
    
    // Construct media array
    const media = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        media.push({
          url: file.path,
          type: file.mimetype.startsWith('video') ? 'video' : 'image'
        });
      });
    } else if (req.file) {
      media.push({
        url: req.file.path,
        type: req.file.mimetype.startsWith('video') ? 'video' : 'image'
      });
    }

    const post = new Post({
      user: req.user.id,
      media,
      caption,
      location,
      hashtags: hashtags ? JSON.parse(hashtags) : []
    });

    await post.save();
    
    const populatedPost = await Post.findById(post._id).populate('user', 'username fullName profilePicture');
    res.status(201).json(populatedPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('user', 'username fullName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getHomeFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const followingDocs = await Follow.find({ follower: req.user.id }).select('following');
    const followingIds = followingDocs.map(f => f.following);

    if (followingIds.length === 0) {
      return res.json([]);
    }

    const posts = await Post.find({ user: { $in: followingIds } })
      .populate('user', 'username fullName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Check likes for current user
    const postIds = posts.map(p => p._id);
    const likes = await Like.find({ user: req.user.id, post: { $in: postIds } });
    const likedPostIds = new Set(likes.map(l => l.post.toString()));

    const feedPosts = posts.map(post => ({
      ...post,
      isLikedByMe: likedPostIds.has(post._id.toString()),
      isFollowedByMe: true // Since we only fetched following posts
    }));

    res.json(feedPosts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.id })
      .populate('user', 'username fullName profilePicture')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'username fullName profilePicture');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    await post.deleteOne();
    res.json({ message: 'Post removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.addView = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Prevent owner from increasing views
    if (post.user.toString() === req.user.id) {
      return res.json({ message: 'Owner view not counted' });
    }

    const existingView = await View.findOne({ post: req.params.id, user: req.user.id });
    if (!existingView) {
      await View.create({ post: req.params.id, user: req.user.id });
      post.viewsCount += 1;
      await post.save();
      return res.json({ message: 'View added', viewsCount: post.viewsCount });
    }

    res.json({ message: 'Already viewed', viewsCount: post.viewsCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getExploreFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 18;
    const skip = (page - 1) * limit;

    // Original Recommendation Engine for Explore
    // Weights: Likes (2x), Comments (3x), Views (1x)
    // We aggregate posts and calculate a score, then sort.
    const posts = await Post.aggregate([
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: ["$likesCount", 2] },
              { $multiply: ["$commentsCount", 3] },
              "$viewsCount"
            ]
          }
        }
      },
      { $sort: { engagementScore: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    const populatedPosts = await Post.populate(posts, { path: 'user', select: 'username fullName profilePicture' });

    // Check likes
    const postIds = populatedPosts.map(p => p._id);
    const likes = await Like.find({ user: req.user.id, post: { $in: postIds } });
    const likedPostIds = new Set(likes.map(l => l.post.toString()));

    const explorePosts = populatedPosts.map(post => ({
      ...post,
      isLikedByMe: likedPostIds.has(post._id.toString())
    }));

    res.json(explorePosts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
