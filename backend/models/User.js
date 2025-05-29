const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  email : { type: String, required: true, unique: true},
  password : {type: String, required: true},
  name: String,
  skills: [String],
  experience: String,
  careerGoals: String,
  resume: String,
  profileImage: String,
  profileCompleted: { type: Boolean, default: false },
});

module.exports = mongoose.model('User', userSchema);