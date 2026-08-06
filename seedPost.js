const mongoose = require('mongoose');
const User = require('./User');
const Video = require('./Video');

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/gamer-app', { family: 4 });
  console.log("✅ MongoDB Connected for script");
  
  let user = await User.findOne();
  if (!user) {
    console.log("No user found. Creating a dummy user...");
    user = new User({
      email: 'dummy@example.com',
      password: 'password123',
      fullName: 'Dummy User',
      username: 'dummy_user',
      profilePicture: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=100'
    });
    await user.save();
  }
  
  const newPost = new Video({
    user: user._id,
    title: 'New Feature Test Post',
    description: 'This is a sample image post added automatically to test the new feature.',
    videoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
    mediaType: 'image'
  });
  
  await newPost.save();
  console.log("New post added successfully! Title: " + newPost.title);
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
