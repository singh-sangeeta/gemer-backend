const Post = require('./Post');
const Like = require('./Like');
const Comment = require('./Comment');
const Notification = require('./Notification');
const SavedPost = require('./SavedPost');

exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Prevent duplicate likes
    const existingLike = await Like.findOne({ post: req.params.id, user: req.user.id });
    if (existingLike) {
      return res.status(400).json({ error: 'Post already liked' });
    }

    await Like.create({ post: req.params.id, user: req.user.id });
    
    post.likesCount += 1;
    await post.save();

    // Create notification if not own post
    if (post.user.toString() !== req.user.id) {
      await Notification.create({
        recipient: post.user,
        sender: req.user.id,
        type: 'like',
        post: post._id
      });
    }

    res.json({ message: 'Post liked', likesCount: post.likesCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.unlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const like = await Like.findOneAndDelete({ post: req.params.id, user: req.user.id });
    if (!like) {
      return res.status(400).json({ error: 'Post has not yet been liked' });
    }

    post.likesCount = Math.max(0, post.likesCount - 1);
    await post.save();

    res.json({ message: 'Post unliked', likesCount: post.likesCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const newComment = new Comment({
      text: req.body.text,
      post: req.params.id,
      user: req.user.id
    });

    const savedComment = await newComment.save();
    
    post.commentsCount += 1;
    await post.save();

    if (post.user.toString() !== req.user.id) {
      await Notification.create({
        recipient: post.user,
        sender: req.user.id,
        type: 'comment',
        post: post._id
      });
    }

    const populatedComment = await savedComment.populate('user', 'username fullName profilePicture');
    res.status(201).json(populatedComment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ error: 'Not authorized to delete this comment' });
    }

    const post = await Post.findById(comment.post);
    await comment.deleteOne();

    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }

    res.json({ message: 'Comment removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate('user', 'username fullName profilePicture')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.savePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existing = await SavedPost.findOne({ post: req.params.id, user: req.user.id });
    if (existing) {
      return res.status(400).json({ error: 'Post already saved' });
    }

    await SavedPost.create({ post: req.params.id, user: req.user.id });
    res.json({ message: 'Post saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.unsavePost = async (req, res) => {
  try {
    const saved = await SavedPost.findOneAndDelete({ post: req.params.id, user: req.user.id });
    if (!saved) return res.status(400).json({ error: 'Post not saved' });
    res.json({ message: 'Post unsaved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getSavedPosts = async (req, res) => {
  try {
    const saved = await SavedPost.find({ user: req.user.id })
      .populate({
        path: 'post',
        populate: { path: 'user', select: 'username fullName profilePicture' }
      })
      .sort({ createdAt: -1 });
    
    res.json(saved.map(s => s.post));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
