const mongoose = require('mongoose');

const eloHistorySchema = new mongoose.Schema({
  elo:       { type: Number, required: true },
  delta:     { type: Number, required: true },
  matchId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
  recordedAt:{ type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  clerkId:    { type: String, required: true, unique: true, index: true },
  email:      { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  avatar:     { type: String },
  phone:      { type: String },

  // Elo
  elo:            { type: Number, default: 1200 },
  eloHistory:     { type: [eloHistorySchema], default: [] },
  matchesPlayed:  { type: Number, default: 0 },
  wins:           { type: Number, default: 0 },
  losses:         { type: Number, default: 0 },

  // Location — GeoJSON Point for $geoNear queries
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  city:      { type: String },
  zipCode:   { type: String },

  // Preferences
  preferredSurface: { type: String, enum: ['hard', 'clay', 'grass', 'any'], default: 'any' },
  preferredDistance:{ type: Number, default: 10 }, // miles
  availability:     { type: [String], default: [] }, // e.g. ['monday_morning', 'saturday_afternoon']

  isAvailable: { type: Boolean, default: true },
  lastSeen:    { type: Date, default: Date.now },
  weeklyEloSnapshot: { type: Number, default: 1200 }, // for weekly email diff
}, {
  timestamps: true,
});

// Geospatial index — required for $geoNear
userSchema.index({ location: '2dsphere' });
userSchema.index({ elo: 1 });
userSchema.index({ isAvailable: 1 });

module.exports = mongoose.model('User', userSchema);
