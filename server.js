require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require('path');
const { upload } = require('./config/cloudinary');

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



// Routes
app.get('/api/videos', getVideos);
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authMiddleware, getUserProfile);
app.put('/api/auth/profile', authMiddleware, upload.single('profilePicture'), updateProfile);
app.post('/api/auth/follow/:id', authMiddleware, followUser);

// Stories
app.post('/api/stories/upload', authMiddleware, upload.single('video'), uploadStory);
app.get('/api/stories/:userId', authMiddleware, getStory);
app.get('/api/stories/user/:userId/all', authMiddleware, getUserAllStories);

app.listen(process.env.PORT || 5000, () => {
  console.log("Server Running");
}); 
