const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], default: 'video' },
  caption: { type: String, default: '' },
  songName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Expires in 24 hours
});

module.exports = mongoose.model('Story', storySchema);
