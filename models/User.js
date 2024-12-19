const mongoose = require('mongoose');

// 사용자 스키마 설정
const userSchema = new mongoose.Schema({
    id: String,
    password: String,
    name: String,
    phone: String
}, { versionKey: false });

const UserModel = mongoose.model('User', userSchema, 'customers'); // customers : db의 collection name

module.exports = UserModel; // UserModel을 내보내기
