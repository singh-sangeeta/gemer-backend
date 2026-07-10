require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require('path');
const multer = require('multer');

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const connectDB = require("./db");
connectDB();

const { getVideos } = require('./videoController');
const { register, login, getUserProfile, updateProfile, followUser } = require('./authController');
const { uploadStory, getStory, getUserAllStories } = require('./storyController');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();

app.use(cors());
app.use(express.json({ limit: '16mb' }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/api/videos', getVideos);
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authMiddleware, getUserProfile);
app.put('/api/auth/profile', authMiddleware, updateProfile);
app.post('/api/auth/follow/:id', authMiddleware, followUser);

// Stories
app.post('/api/stories/upload', authMiddleware, upload.single('video'), uploadStory);
app.get('/api/stories/:userId', authMiddleware, getStory);
app.get('/api/stories/user/:userId/all', authMiddleware, getUserAllStories);

app.listen(process.env.PORT || 5000, () => {
  console.log("Server Running");
}); 
