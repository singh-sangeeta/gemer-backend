require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require('path');
const { upload } = require('./config/cloudinary');

const connectDB = require("./db");
connectDB();

const { getVideos, uploadVideo, getUserVideos } = require('./videoController');
const authController = require('./authController');
const storyController = require('./storyController');
const postController = require('./postController');
const interactionController = require('./interactionController');
const userProfileController = require('./userProfileController');
const reelsController = require('./reelsController');
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
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authMiddleware, authController.getUserProfile);
app.put('/api/auth/profile', authMiddleware, upload.single('profilePicture'), authController.updateProfile);
app.put('/api/auth/password', authMiddleware, authController.changePassword);

// Instagram Profile System Routes

// Posts
app.post('/api/posts', authMiddleware, upload.array('media', 10), postController.createPost);
app.get('/api/posts/feed', authMiddleware, postController.getFeed);
app.get('/api/feed', authMiddleware, postController.getHomeFeed);
app.get('/api/explore', authMiddleware, postController.getExploreFeed);
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
app.post('/api/posts/:id/save', authMiddleware, interactionController.savePost);
app.delete('/api/posts/:id/save', authMiddleware, interactionController.unsavePost);
app.get('/api/saved', authMiddleware, interactionController.getSavedPosts);

// Profiles & Social
app.get('/api/profile/:id', authMiddleware, userProfileController.getProfile);
app.put('/api/profile/privacy', authMiddleware, userProfileController.updatePrivacy);
app.post('/api/profile/block/:id', authMiddleware, userProfileController.blockUser);
app.delete('/api/profile/block/:id', authMiddleware, userProfileController.unblockUser);

app.post('/api/follow/:id', authMiddleware, userProfileController.followUser);
app.delete('/api/follow/:id', authMiddleware, userProfileController.unfollowUser);
app.post('/api/follow/request/:id/accept', authMiddleware, userProfileController.acceptFollowRequest);
app.post('/api/follow/request/:id/reject', authMiddleware, userProfileController.rejectFollowRequest);
app.delete('/api/follow/request/:id', authMiddleware, userProfileController.cancelFollowRequest);
app.get('/api/follow/requests', authMiddleware, userProfileController.getFollowRequests);

app.get('/api/followers/:id', authMiddleware, userProfileController.getFollowers);
app.get('/api/following/:id', authMiddleware, userProfileController.getFollowing);
app.get('/api/notifications', authMiddleware, userProfileController.getNotifications);
app.get('/api/search/users', authMiddleware, userProfileController.searchUsers);

// Stories
app.post('/api/stories/upload', authMiddleware, upload.single('video'), storyController.uploadStory);
app.get('/api/stories/feed', authMiddleware, storyController.getFeedStories);
app.post('/api/stories/:id/view', authMiddleware, storyController.viewStory);
app.get('/api/stories/:id/viewers', authMiddleware, storyController.getStoryViewers);
app.get('/api/stories/:userId', authMiddleware, storyController.getStory);
app.get('/api/stories/user/:userId/all', authMiddleware, storyController.getUserAllStories);

// Reels
app.post('/api/reels', authMiddleware, upload.single('video'), reelsController.createReel);
app.get('/api/reels', authMiddleware, reelsController.getReels);

app.listen(process.env.PORT || 5000, () => {
  console.log("Server Running");
}); 
