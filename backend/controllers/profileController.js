const User = require('../models/User');

// UPDATE PROFILE
const updateProfile = async (req, res) => {
  try {
    const { name, skills, experience, careerGoals } = req.body;
    const resume = req.files?.resume ? `/uploads/${req.files.resume[0].filename}` : undefined;
    const profileImage = req.files?.profileImage ? `/uploads/${req.files.profileImage[0].filename}` : undefined;

    const updates = {
      name,
      skills: skills ? skills.split(',').map(s => s.trim()) : undefined,
      experience,
      careerGoals,
      profileCompleted: true,
    };

    if (resume) updates.resume = resume;
    if (profileImage) updates.profileImage = profileImage;

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });

    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
};

// GET PROFILE
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

module.exports = { updateProfile, getProfile };
