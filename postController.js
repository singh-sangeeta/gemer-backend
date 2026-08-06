const Post = require('./Post');
const View = require('./View');
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
