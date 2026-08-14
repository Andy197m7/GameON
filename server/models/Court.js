const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  address: { type: String, required: true },
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  surface:   { type: String, enum: ['hard', 'clay', 'grass'], default: 'hard' },
  litCourts: { type: Boolean, default: false },
  indoor:    { type: Boolean, default: false },
  numCourts: { type: Number, default: 1 },
  googlePlaceId: { type: String },
  phone:     { type: String },
  website:   { type: String },
}, {
  timestamps: true,
});

courtSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Court', courtSchema);
