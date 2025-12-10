import mongoose, { Document, Schema } from 'mongoose';

/**
 * 프로젝트별 월 마감 자료
 */
export interface IProjectMonthlyClosing extends Document {
  project: mongoose.Types.ObjectId;
  closingMonth: string; // YYYY-MM 형식
  fileName: string;
  originalFileName: string;
  fileType: 'excel' | 'csv' | 'other';
  fileSize: number; // bytes
  filePath?: string; // 파일 저장 경로
  fileData?: Buffer; // 파일 데이터 (메모리 저장 시)

  // 업로드 정보
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;

  // 파일 내용 요약
  summary?: {
    totalRows: number;
    columns: string[];
    sampleData?: any[];
  };

  // 상태
  status: 'uploaded' | 'processed' | 'error';
  errorMessage?: string;

  // 메타데이터
  description?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const ProjectMonthlyClosingSchema = new Schema<IProjectMonthlyClosing>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    closingMonth: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/, // YYYY-MM 형식
    },
    fileName: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['excel', 'csv', 'other'],
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    filePath: String,
    fileData: Buffer,
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    summary: {
      totalRows: Number,
      columns: [String],
      sampleData: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processed', 'error'],
      default: 'uploaded',
    },
    errorMessage: String,
    description: String,
    notes: String,
  },
  {
    timestamps: true,
  }
);

// 인덱스
ProjectMonthlyClosingSchema.index({ project: 1, closingMonth: -1 });
ProjectMonthlyClosingSchema.index({ uploadedBy: 1 });

export default mongoose.model<IProjectMonthlyClosing>('ProjectMonthlyClosing', ProjectMonthlyClosingSchema);

