const User = require('./User');
const Follow = require('./Follow');
const Notification = require('./Notification');
const Post = require('./Post');
const FollowRequest = require('./FollowRequest');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const followersCount = await Follow.countDocuments({ following: req.params.id });
    const followingCount = await Follow.countDocuments({ follower: req.params.id });
    const postsCount = await Post.countDocuments({ user: req.params.id });
    
    let isFollowing = false;
    let followRequested = false;
    if (req.user) {
      const follow = await Follow.findOne({ follower: req.user.id, following: req.params.id });
      isFollowing = !!follow;
      
      if (!isFollowing) {
        const reqPending = await FollowRequest.findOne({ sender: req.user.id, receiver: req.params.id, status: 'pending' });
        followRequested = !!reqPending;
      }
    }

    res.json({ 
      user, 
      stats: { followersCount, followingCount, postsCount },
      isFollowing,
      followRequested
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

    const userToFollow = await User.findById(req.params.id);
    if (!userToFollow) return res.status(404).json({ error: 'User not found' });

    const existingFollow = await Follow.findOne({ follower: req.user.id, following: req.params.id });
    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    if (userToFollow.isPrivate) {
      const existingReq = await FollowRequest.findOne({ sender: req.user.id, receiver: req.params.id, status: 'pending' });
      if (existingReq) return res.status(400).json({ error: 'Follow request already sent' });

      await FollowRequest.create({ sender: req.user.id, receiver: req.params.id, status: 'pending' });
      
      await Notification.create({
        recipient: req.params.id,
        sender: req.user.id,
        type: 'follow_request'
      });
      return res.json({ message: 'Follow request sent', status: 'requested' });
    }

    // Public account
    await Follow.create({ follower: req.user.id, following: req.params.id });
    
    // Also update User follower/following arrays to keep them in sync if used elsewhere
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { following: req.params.id } });
    await User.findByIdAndUpdate(req.params.id, { $addToSet: { followers: req.user.id } });

    await Notification.create({
      recipient: req.params.id,
      sender: req.user.id,
      type: 'follow'
    });

    res.json({ message: 'User followed successfully', status: 'following' });
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
    
    await User.findByIdAndUpdate(req.user.id, { $pull: { following: req.params.id } });
    await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user.id } });
    
    res.json({ message: 'User unfollowed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.acceptFollowRequest = async (req, res) => {
  try {
    const request = await FollowRequest.findOne({ _id: req.params.id, receiver: req.user.id, status: 'pending' });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    request.status = 'accepted';
    await request.save();
    
    await Follow.create({ follower: request.sender, following: request.receiver });
    await User.findByIdAndUpdate(request.sender, { $addToSet: { following: request.receiver } });
    await User.findByIdAndUpdate(request.receiver, { $addToSet: { followers: request.sender } });

    await Notification.create({
      recipient: request.sender,
      sender: request.receiver,
      type: 'follow_accept'
    });
    
    // Delete the original request notification if needed
    await Notification.findOneAndDelete({ recipient: request.receiver, sender: request.sender, type: 'follow_request' });

    res.json({ message: 'Request accepted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.rejectFollowRequest = async (req, res) => {
  try {
    const request = await FollowRequest.findOne({ _id: req.params.id, receiver: req.user.id, status: 'pending' });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    request.status = 'rejected';
    await request.save();

    await Notification.findOneAndDelete({ recipient: request.receiver, sender: request.sender, type: 'follow_request' });

    res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.cancelFollowRequest = async (req, res) => {
  try {
    const request = await FollowRequest.findOneAndDelete({ sender: req.user.id, receiver: req.params.id, status: 'pending' });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    await Notification.findOneAndDelete({ recipient: req.params.id, sender: req.user.id, type: 'follow_request' });
    
    res.json({ message: 'Request cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getFollowRequests = async (req, res) => {
  try {
    // Populate sender details including an array of follow requests if needed, but here just basic details
    const requests = await FollowRequest.find({ receiver: req.user.id, status: 'pending' }).populate('sender', 'username fullName profilePicture');
    res.json(requests);
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

exports.updatePrivacy = async (req, res) => {
  try {
    const { isPrivate } = req.body;
    const user = await User.findById(req.user.id);
    user.isPrivate = isPrivate;
    await user.save();
    res.json({ message: 'Privacy updated', isPrivate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const userToBlock = req.params.id;
    if (userToBlock === req.user.id) return res.status(400).json({ error: 'Cannot block yourself' });

    const user = await User.findById(req.user.id);
    if (!user.blockedUsers.includes(userToBlock)) {
      user.blockedUsers.push(userToBlock);
      // Unfollow logic
      user.following.pull(userToBlock);
      user.followers.pull(userToBlock);
      await user.save();
      
      const otherUser = await User.findById(userToBlock);
      if (otherUser) {
        otherUser.followers.pull(req.user.id);
        otherUser.following.pull(req.user.id);
        await otherUser.save();
      }
      
      // Also delete from Follow collection
      await Follow.findOneAndDelete({ follower: req.user.id, following: userToBlock });
      await Follow.findOneAndDelete({ follower: userToBlock, following: req.user.id });
      
      // Also delete FollowRequests
      await FollowRequest.findOneAndDelete({ sender: req.user.id, receiver: userToBlock });
      await FollowRequest.findOneAndDelete({ sender: userToBlock, receiver: req.user.id });
    }
    res.json({ message: 'User blocked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const userToUnblock = req.params.id;
    const user = await User.findById(req.user.id);
    user.blockedUsers.pull(userToUnblock);
    await user.save();
    res.json({ message: 'User unblocked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
