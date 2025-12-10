import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  title: string; // 알림 제목
  message: string; // 알림 내용
  type: 'info' | 'warning' | 'error' | 'success'; // 알림 타입
  section: string; // 표시할 섹션 (예: 'sales', 'accounting', 'all')
  priority: 'low' | 'medium' | 'high' | 'urgent'; // 우선순위
  dueDate?: Date; // 마감일/임박일
  isResolved: boolean; // 해결 여부
  resolvedAt?: Date; // 해결 일시
  resolvedBy?: mongoose.Types.ObjectId; // 해결한 사용자
  relatedEntity?: {
    type: string; // 관련 엔티티 타입 (예: 'invoice', 'payment')
    id: mongoose.Types.ObjectId; // 관련 엔티티 ID
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'error', 'success'],
      default: 'info',
    },
    section: {
      type: String,
      required: true,
      enum: ['sales', 'accounting', 'purchase', 'operation', 'master-data', 'admin', 'all'],
      lowercase: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    dueDate: Date,
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: Date,
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    relatedEntity: {
      type: {
        type: String,
      },
      id: {
        type: Schema.Types.ObjectId,
      },
    },
  },
  {
    timestamps: true,
  }
);

// 인덱스
NotificationSchema.index({ section: 1, isResolved: 1, dueDate: 1 });
NotificationSchema.index({ isResolved: 1, priority: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);

