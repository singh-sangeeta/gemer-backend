const User = require('./User');
const Follow = require('./Follow');
const Notification = require('./Notification');
const Post = require('./Post');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const followersCount = await Follow.countDocuments({ following: req.params.id });
    const followingCount = await Follow.countDocuments({ follower: req.params.id });
    const postsCount = await Post.countDocuments({ user: req.params.id });
    
    let isFollowing = false;
    if (req.user) {
      const follow = await Follow.findOne({ follower: req.user.id, following: req.params.id });
      isFollowing = !!follow;
    }

    res.json({ 
      user, 
      stats: { followersCount, followingCount, postsCount },
      isFollowing 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.followUser = async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const existingFollow = await Follow.findOne({ follower: req.user.id, following: req.params.id });
    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    await Follow.create({ follower: req.user.id, following: req.params.id });

    await Notification.create({
      recipient: req.params.id,
      sender: req.user.id,
      type: 'follow'
    });

    res.json({ message: 'User followed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const follow = await Follow.findOneAndDelete({ follower: req.user.id, following: req.params.id });
    if (!follow) {
      return res.status(400).json({ error: 'Not following this user' });
    }
    res.json({ message: 'User unfollowed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const followers = await Follow.find({ following: req.params.id })
      .populate('follower', 'username fullName profilePicture');
    res.json(followers.map(f => f.follower));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const following = await Follow.find({ follower: req.params.id })
      .populate('following', 'username fullName profilePicture');
    res.json(following.map(f => f.following));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'username fullName profilePicture')
      .populate('post', 'media')
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Mark as read optionally
    await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json([]);
    
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } }
      ]
    }).select('username fullName profilePicture').limit(20);
    
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
