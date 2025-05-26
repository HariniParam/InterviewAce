const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generating JWT Token
const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// SIGNUP
const signup = async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const newUser = await User.create({ email, password });
    const token = createToken(newUser._id);

    res.status(201).json({ token, user: { id: newUser._id, email: newUser.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// SIGNIN
const signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = createToken(user._id);
    res.status(200).json({ token, user: { id: user._id, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

module.exports = { signup, signin };
