const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    full_name: {
      type: String,
      required: true,
      maxLength: 200,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'accountant', 'designer'],
      default: 'designer',
    },
    phone: {
      type: String,
      default: '',
      maxLength: 20,
    },
    profile_image: {
      type: String,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: false, // 🚀 CHANGE: Naya user manager ke approve karne tak pending/inactive rahega
    },
    is_staff: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { 
      createdAt: 'created_at', 
      updatedAt: 'updated_at' 
    },
    collection: 'users'
  }
);

// Password Hashing
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Check Password
userSchema.methods.check_password = async function (entered_password) {
  return await bcrypt.compare(entered_password, this.password);
};

// Virtuals
userSchema.virtual('is_owner').get(function () {
  return this.role === 'owner';
});

userSchema.virtual('is_manager_or_above').get(function () {
  return ['owner', 'manager'].includes(this.role);
});

userSchema.virtual('is_finance_or_above').get(function () {
  return ['owner', 'manager', 'accountant'].includes(this.role);
});

// FIX: virtuals:true on toObject so req.user.is_owner resolves in middleware
// (previously only toJSON had virtuals:true, but Mongoose uses toObject internally)
userSchema.set('toObject', { virtuals: true });

userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    delete ret.__v;
  }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;