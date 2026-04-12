const mongoose = require('mongoose');

const PetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  name: { type: String, required: true },
  species: { type: String, required: true },
  age: { type: Number },
  photoUrl: { type: String },
  lastVetVisit: { type: Date },
  nextVetVisit: { type: Date },
  lastWalk: { type: Date },
  nextWalk: { type: Date },
  lastFeeding: { type: Date },
  nextFeeding: { type: Date },
  notes: { type: String }
});

module.exports = mongoose.model('Pet', PetSchema, 'Pets');