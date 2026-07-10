// const Video = require('./Video');

const dummyVideos = [
  {
    _id: '1',
    title: 'Epic Fortnite Snipe',
    description: 'Unbelievable 360 no scope win!',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    likes: 1204,
    comments: 45
  },
  {
    _id: '2',
    title: 'Valorant Ace',
    description: '1v5 clutch on Bind',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    likes: 3450,
    comments: 112
  },
  {
    _id: '3',
    title: 'Minecraft Speedrun',
    description: 'New world record attempt',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    likes: 890,
    comments: 23
  }
];

const getVideos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const videos = dummyVideos.slice(skip, skip + limit);
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching videos' });
  }
};

module.exports = { getVideos };
