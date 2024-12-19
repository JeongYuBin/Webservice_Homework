const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    title: { type: String, required: true },
    participants: { type: [String], default: [] },
    maxParticipants: { type: Number, default: 3 },
}, { versionKey: false });

const RoomModel = mongoose.model('Room', roomSchema, 'rooms'); // 'rooms' 컬렉션 지정

module.exports = RoomModel;
