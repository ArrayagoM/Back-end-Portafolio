const mongoose = require('mongoose');

const ProyectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  technologies: { type: String, required: true },
  images: [{ type: String, required: true }],
  repositoryUrl: { type: String, required: true },
  deployUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Proyect = mongoose.model('Proyect', ProyectSchema);
module.exports = Proyect;
