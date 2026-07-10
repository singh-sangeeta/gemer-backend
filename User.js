const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  mobileNumber: { 
    type: String, 
    unique: true,
    sparse: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  fullName: {
    type: String,
    trim: true,
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  gender: {
    type: String,
    default: 'Prefer not to say'
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
