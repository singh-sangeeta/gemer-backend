const Story = require('./Story');

const uploadStory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No media file provided' });
    }

    const { mediaType, caption, songName } = req.body;
    // Get the Cloudinary URL from the uploaded file
    const videoUrl = req.file.path;

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
    // Find latest active story for user
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

module.exports = {
  uploadStory,
  getStory,
  getUserAllStories
};
