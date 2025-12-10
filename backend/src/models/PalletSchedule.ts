import mongoose, { Document, Schema } from 'mongoose';

export interface IPalletSchedule extends Document {
  project?: mongoose.Types.ObjectId; // 프로젝트 (선택사항 - 전체 일정인 경우 null)
  palletProject?: mongoose.Types.ObjectId; // 팔렛트 프로젝트 (생산 관리용)
  company?: mongoose.Types.ObjectId; // 법인 (법인별 일정인 경우 필수)
  scheduleType: 'general' | 'project' | 'personal' | 'company'; // 전체 일정, 프로젝트별 일정, 개인 일정, 법인별 일정
  category?: mongoose.Types.ObjectId; // 카테고리 (일정 분류용)
  title: string; // 일정 제목
  description?: string; // 설명
  startDate: Date; // 시작일
  endDate?: Date; // 종료일
  allDay: boolean; // 종일 일정 여부
  palletCount?: number; // 파렛트 수량
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'; // 상태
  priority?: 'low' | 'medium' | 'high'; // 우선순위
  assignedTo?: mongoose.Types.ObjectId; // 담당자
  location?: string; // 위치
  relatedContainer?: mongoose.Types.ObjectId; // 관련 컨테이너
  color?: string; // 캘린더 표시 색상
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const PalletScheduleSchema = new Schema<IPalletSchedule>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    palletProject: {
      type: Schema.Types.ObjectId,
      ref: 'PalletProject',
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
    },
    scheduleType: {
      type: String,
      enum: ['general', 'project', 'personal', 'company'],
      default: 'general',
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    startDate: {
      type: Date,
      required: true,
    },
    endDate: Date,
    allDay: {
      type: Boolean,
      default: false,
    },
    palletCount: Number,
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    location: String,
    relatedContainer: {
      type: Schema.Types.ObjectId,
      ref: 'Container',
    },
    color: {
      type: String,
      default: '#1890ff', // 기본 파란색
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// 인덱스
PalletScheduleSchema.index({ project: 1, startDate: 1 });
PalletScheduleSchema.index({ palletProject: 1, startDate: 1 });
PalletScheduleSchema.index({ company: 1, startDate: 1 });
PalletScheduleSchema.index({ scheduleType: 1 });
PalletScheduleSchema.index({ category: 1 });
PalletScheduleSchema.index({ status: 1 });
PalletScheduleSchema.index({ assignedTo: 1 });
PalletScheduleSchema.index({ createdBy: 1 });

export default mongoose.model<IPalletSchedule>('PalletSchedule', PalletScheduleSchema);

