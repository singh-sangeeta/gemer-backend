const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  videoUrl: { type: String, required: true },
  mediaType: { type: String, default: 'video' },
  thumbnail: { type: String },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
