const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  refreshToken: {
    type: String,
    required: true,
  },
  lastChecked: {
    type: Date,
    default: Date.now,
  },
});
const Token = mongoose.model('Token', tokenSchema);
module.exports = Token;
