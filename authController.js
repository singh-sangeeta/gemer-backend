const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_in_production';

const register = async (req, res) => {
  try {
    let { email, mobileNumber, password, fullName, username } = req.body;

    if (email === '') email = undefined;
    if (mobileNumber === '') mobileNumber = undefined;
    if (username === '') username = undefined;

    if (!email && !mobileNumber) {
      return res.status(400).json({ error: 'Please provide either email or mobile number' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user exists
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email is already registered' });
      }
    }
    if (mobileNumber) {
      const existingMobile = await User.findOne({ mobileNumber });
      if (existingMobile) {
        return res.status(400).json({ error: 'Mobile number is already registered' });
      }
    }
    if (username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      email,
      mobileNumber,
      password: hashedPassword,
      fullName,
      username
    });

    const savedUser = await newUser.save();

    // Create JWT
    const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, { expiresIn: '7d' });

    const userResponse = await User.findById(savedUser._id).select('-password');

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    // We can accept 'email' or 'contact' from the frontend for backwards compatibility
    const contact = req.body.contact || req.body.email;
    const password = req.body.password;

    // Validation
    if (!contact || !password) {
      return res.status(400).json({ error: 'Please provide contact info and password' });
    }

    // Find user by either email, mobile, or username
    const user = await User.findOne({
      $or: [
        { email: contact },
        { mobileNumber: contact },
        { username: contact }
      ]
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create JWT
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    const userResponse = await User.findById(user._id).select('-password');

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error while fetching profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    let { bio, profilePicture, fullName, username, gender } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (bio !== undefined) user.bio = bio;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (fullName !== undefined) user.fullName = fullName;
    if (gender !== undefined) user.gender = gender;

    if (username !== undefined && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error while updating profile' });
  }
};

const followUser = async (req, res) => {
  try {
    const userToFollowId = req.params.id;
    const currentUserId = req.user.id;

    if (userToFollowId === currentUserId) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    const userToFollow = await User.findById(userToFollowId);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFollowing = currentUser.following.includes(userToFollowId);

    if (isFollowing) {
      // Unfollow
      currentUser.following.pull(userToFollowId);
      userToFollow.followers.pull(currentUserId);
    } else {
      // Follow
      currentUser.following.push(userToFollowId);
      userToFollow.followers.push(currentUserId);
    }

    await currentUser.save();
    await userToFollow.save();

    const updatedUser = await User.findById(currentUserId).select('-password');
    res.json(updatedUser);
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Server error while following user' });
  }
};

module.exports = {
  register,
  login,
  getUserProfile,
  updateProfile,
  followUser
};
