import mongoose, { Document, Schema } from 'mongoose';

/**
 * 프로젝트별 인보이스 기초 자료 파일
 */
export interface IProjectSourceFile extends Document {
  fileName: string;
  originalFileName: string;
  project: mongoose.Types.ObjectId;
  fileType: 'excel' | 'csv' | 'other';
  fileSize: number; // bytes
  filePath?: string; // 파일 저장 경로 (로컬 또는 URL)
  fileData?: Buffer; // 파일 데이터 (메모리 저장 시)
  
  // 업로드 정보
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
  
  // 파일 내용 요약 (엑셀 파싱 결과)
  summary?: {
    totalRows: number;
    columns: string[];
    sampleData?: any[]; // 처음 몇 줄 샘플
  };
  
  // 상태
  status: 'uploaded' | 'processed' | 'error';
  errorMessage?: string;
  
  // 메타데이터
  category: string; // 카테고리 (예: 'monthly_closing', 'delivery', 'labor', 'other')
  closingMonth?: string; // 마감월 (YYYY-MM 형식, 월 마감 자료인 경우)
  description?: string;
  tags?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSourceFileSchema = new Schema<IProjectSourceFile>(
  {
    fileName: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
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
    category: {
      type: String,
      required: true,
    },
    closingMonth: {
      type: String,
      match: /^\d{4}-\d{2}$/, // YYYY-MM 형식
    },
    description: String,
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// 인덱스
ProjectSourceFileSchema.index({ project: 1, uploadedAt: -1 });
ProjectSourceFileSchema.index({ uploadedBy: 1 });

export default mongoose.model<IProjectSourceFile>('ProjectSourceFile', ProjectSourceFileSchema);

