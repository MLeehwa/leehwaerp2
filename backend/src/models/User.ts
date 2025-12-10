import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'employee'; // 기존 호환성을 위한 필드 (deprecated)
  roles: mongoose.Types.ObjectId[]; // 다중 역할 지원
  firstName: string;
  lastName: string;
  isActive: boolean;
  allowedMenus?: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'employee'],
      default: 'employee',
    },
    roles: [{
      type: Schema.Types.ObjectId,
      ref: 'Role',
    }],
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    allowedMenus: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// 비밀번호 해싱 (평문 비밀번호만 해싱)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  // 이미 해싱된 비밀번호인지 확인 (bcrypt 해시는 항상 $2a$ 또는 $2b$로 시작)
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return next(); // 이미 해싱된 비밀번호는 다시 해싱하지 않음
  }
  
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 비밀번호 비교 메서드
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);

