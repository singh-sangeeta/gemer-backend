const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  media: [{ 
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], default: 'image' }
  }],
  caption: { type: String, default: '' },
  location: { type: String, default: '' },
  hashtags: [{ type: String }],
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
