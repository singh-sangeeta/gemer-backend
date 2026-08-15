const Story = require('./Story');
const StoryView = require('./StoryView');
const Follow = require('./Follow');
const User = require('./User');
const Notification = require('./Notification');

const uploadStory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No media file provided' });
    }

    const { mediaType, caption, songName } = req.body;
    const videoUrl = req.file.path.startsWith('http') ? req.file.path : '/uploads/' + req.file.filename;

    const newStory = new Story({
      user: req.user.id,
      videoUrl: videoUrl,
      mediaType: mediaType || 'video',
      caption: caption || '',
      songName: songName || ''
    });

    await newStory.save();

    res.status(201).json({ message: 'Story uploaded successfully', story: newStory });
  } catch (error) {
    console.error('Story upload error:', error);
    res.status(500).json({ error: 'Server error during upload' });
  }
};

const getStory = async (req, res) => {
  try {
    const story = await Story.findOne({ user: req.params.userId }).sort({ createdAt: -1 });
    if (!story) {
      return res.status(404).json({ error: 'No active story found' });
    }
    res.json(story);
  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({ error: 'Server error fetching story' });
  }
};

const getUserAllStories = async (req, res) => {
  try {
    const stories = await Story.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json(stories);
  } catch (error) {
    console.error('Get all stories error:', error);
    res.status(500).json({ error: 'Server error fetching stories' });
  }
};

const getFeedStories = async (req, res) => {
  try {
    // Get users I follow
    const following = await Follow.find({ follower: req.user.id }).select('following');
    const followingIds = following.map(f => f.following);

    // Also include own user id to fetch own stories
    followingIds.push(req.user.id);

    // Fetch active stories (last 24 hours, handled by Mongo TTL usually, or filter by date)
    const activeTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await Story.find({ 
      user: { $in: followingIds },
      createdAt: { $gt: activeTime }
    }).populate('user', 'username profilePicture').sort({ createdAt: -1 }).lean();

    // Group stories by user and check view status
    const userStoryMap = {};
    const myViews = await StoryView.find({ viewer: req.user.id });
    const viewedStoryIds = new Set(myViews.map(v => v.story.toString()));

    for (const story of stories) {
      const uId = story.user._id.toString();
      if (!userStoryMap[uId]) {
        userStoryMap[uId] = {
          user: story.user,
          stories: [],
          allSeen: true // will be false if any story is unseen
        };
      }
      const isSeen = viewedStoryIds.has(story._id.toString()) || story.user._id.toString() === req.user.id; // Mark own stories as seen
      story.isSeen = isSeen;
      if (!isSeen) {
        userStoryMap[uId].allSeen = false;
      }
      userStoryMap[uId].stories.push(story);
    }

    // Convert map to array and sort: own story first, then users with unseen stories, then seen
    let groupedStories = Object.values(userStoryMap).sort((a, b) => {
      if (a.user._id.toString() === req.user.id) return -1;
      if (b.user._id.toString() === req.user.id) return 1;
      if (a.allSeen === b.allSeen) return 0;
      return a.allSeen ? 1 : -1;
    });

    res.json(groupedStories);
  } catch (error) {
    console.error('Get feed stories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const viewStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    // Don't log views for owner
    if (story.user.toString() === req.user.id) {
      return res.json({ message: 'Owner view not counted' });
    }

    const existingView = await StoryView.findOne({ story: storyId, viewer: req.user.id });
    if (!existingView) {
      await StoryView.create({ story: storyId, viewer: req.user.id });
      
      await Notification.create({
        recipient: story.user,
        sender: req.user.id,
        type: 'story_view'
      });
    }

    res.json({ message: 'Story viewed' });
  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getStoryViewers = async (req, res) => {
  try {
    const storyId = req.params.id;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    // Only owner can see viewers
    if (story.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const views = await StoryView.find({ story: storyId }).populate('viewer', 'username fullName profilePicture').sort({ viewedAt: -1 });
    res.json({ viewsCount: views.length, viewers: views.map(v => ({ user: v.viewer, viewedAt: v.viewedAt })) });
  } catch (error) {
    console.error('Get story viewers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  uploadStory,
  getStory,
  getUserAllStories,
  getFeedStories,
  viewStory,
  getStoryViewers
};
