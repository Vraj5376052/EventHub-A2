const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // 'admin' reads the audit trail (FR-10) and nothing else. It is absent
    // from the whitelist in registerUser on purpose, so nobody can sign
    // themselves up as one; an admin is created directly in the database.
    role: {
        type: String,
        enum: ['customer', 'organiser', 'admin'],
        required: [true, 'Role is required'],
    },
    university: { type: String },
    address: { type: String },
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);