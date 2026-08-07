const mongoose = require('mongoose');

const storyViewSchema = new mongoose.Schema({
  story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewedAt: { type: Date, default: Date.now }
});

storyViewSchema.index({ story: 1, viewer: 1 }, { unique: true });

module.exports = mongoose.model('StoryView', storyViewSchema);
