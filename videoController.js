const Video = require('./Video');

const getVideos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const videos = await Video.find()
      .populate('user', 'username profilePicture fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Server error fetching videos' });
  }
};

const getUserVideos = async (req, res) => {
  try {
    const videos = await Video.find({ user: req.params.userId })
      .populate('user', 'username profilePicture fullName')
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    console.error('Error fetching user videos:', error);
    res.status(500).json({ error: 'Server error fetching user videos' });
  }
};

const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No media file provided' });
    }

    const { title, description, mediaType } = req.body;
    const videoUrl = req.file.path;

    const newVideo = new Video({
      user: req.user.id,
      title: title || 'Untitled Post',
      description: description || '',
      videoUrl: videoUrl,
      mediaType: mediaType || 'video',
    });

    await newVideo.save();

    res.status(201).json({ message: 'Post created successfully', video: newVideo });
  } catch (error) {
    console.error('Post upload error:', error);
    res.status(500).json({ error: 'Server error during upload' });
  }
};

module.exports = { getVideos, getUserVideos, uploadVideo };
