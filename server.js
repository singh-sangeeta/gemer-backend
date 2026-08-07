require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require('path');
const { upload } = require('./config/cloudinary');

const connectDB = require("./db");
connectDB();

const { getVideos, uploadVideo, getUserVideos } = require('./videoController');
const { register, login, getUserProfile, updateProfile, followUser } = require('./authController');
const { uploadStory, getStory, getUserAllStories } = require('./storyController');
const postController = require('./postController');
const interactionController = require('./interactionController');
const userProfileController = require('./userProfileController');
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
app.post('/api/videos/upload', authMiddleware, upload.single('media'), uploadVideo);
app.get('/api/videos/user/:userId', authMiddleware, getUserVideos);
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authMiddleware, getUserProfile);
app.put('/api/auth/profile', authMiddleware, upload.single('profilePicture'), updateProfile);
app.post('/api/auth/follow/:id', authMiddleware, followUser);

// Instagram Profile System Routes

// Posts
app.post('/api/posts', authMiddleware, upload.array('media', 10), postController.createPost);
app.get('/api/posts/feed', authMiddleware, postController.getFeed);
app.get('/api/feed', authMiddleware, postController.getHomeFeed);
app.get('/api/posts/user/:id', authMiddleware, postController.getUserPosts);
app.get('/api/posts/:id', authMiddleware, postController.getPost);
app.delete('/api/posts/:id', authMiddleware, postController.deletePost);
app.post('/api/posts/:id/view', authMiddleware, postController.addView);

// Interactions
app.post('/api/posts/:id/like', authMiddleware, interactionController.likePost);
app.delete('/api/posts/:id/like', authMiddleware, interactionController.unlikePost);
app.post('/api/posts/:id/comment', authMiddleware, interactionController.addComment);
app.delete('/api/comments/:id', authMiddleware, interactionController.deleteComment);
app.get('/api/posts/:id/comments', authMiddleware, interactionController.getComments);

// Profiles & Social
app.get('/api/profile/:id', authMiddleware, userProfileController.getProfile);
app.post('/api/follow/:id', authMiddleware, userProfileController.followUser);
app.delete('/api/follow/:id', authMiddleware, userProfileController.unfollowUser);
app.get('/api/followers/:id', authMiddleware, userProfileController.getFollowers);
app.get('/api/following/:id', authMiddleware, userProfileController.getFollowing);
app.get('/api/notifications', authMiddleware, userProfileController.getNotifications);
app.get('/api/search/users', authMiddleware, userProfileController.searchUsers);

// Stories
app.post('/api/stories/upload', authMiddleware, upload.single('video'), uploadStory);
app.get('/api/stories/:userId', authMiddleware, getStory);
app.get('/api/stories/user/:userId/all', authMiddleware, getUserAllStories);

app.listen(process.env.PORT || 5000, () => {
  console.log("Server Running");
}); 
