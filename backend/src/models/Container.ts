import mongoose, { Document, Schema } from 'mongoose';

export interface IContainer extends Document {
  containerNumber?: string; // 컨테이너 번호 (해상 운송용)
  trackingNumber?: string; // 추적 번호 (항공 운송용)
  shippingType: 'sea' | 'air'; // 운송 유형
  project?: mongoose.Types.ObjectId; // 프로젝트 (팔렛트 프로젝트 또는 일반 프로젝트)
  palletProject?: mongoose.Types.ObjectId; // 팔렛트 프로젝트
  company?: mongoose.Types.ObjectId; // 법인
  shipmentType: 'project' | 'general'; // 선적 유형: 프로젝트 선적 또는 일반 선적
  origin: string; // 출발지 (예: 한국)
  destination: string; // 도착지
  shippingLine?: string; // 선사 (해상 운송)
  airline?: string; // 항공사 (항공 운송)
  vesselName?: string; // 선박명
  flightNumber?: string; // 항공편명 (항공 운송)
  voyageNumber?: string; // 항차
  etd?: Date; // 예상 출발일 (Estimated Time of Departure)
  portEta?: Date; // 항구 예상 도착일
  factoryEta?: Date; // 공장 예상 도착일
  atd?: Date; // 실제 출발일 (Actual Time of Departure)
  ata?: Date; // 실제 도착일 (Actual Time of Arrival)
  status: 'pending' | 'in-transit' | 'arrived' | 'delivered' | 'cancelled'; // 상태
  palletCount?: number; // 파렛트 수량
  partCount?: number; // 부품 수량
  weight?: number; // 중량 (kg)
  volume?: number; // 부피 (m³)
  sealNumber?: string; // 봉인 번호
  customsStatus?: string; // 통관 상태
  notes?: string; // 비고
  documents?: Array<{
    fileName: string;
    filePath?: string;
    fileType: string;
    uploadedAt: Date;
  }>; // 관련 문서
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const ContainerSchema = new Schema<IContainer>(
  {
    containerNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
    shippingType: {
      type: String,
      enum: ['sea', 'air'],
      default: 'sea',
      required: true,
    },
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
    shipmentType: {
      type: String,
      enum: ['project', 'general'],
      default: 'project',
      required: true,
    },
    origin: {
      type: String,
      required: true,
      default: 'Korea',
    },
    destination: {
      type: String,
      required: true,
    },
    shippingLine: String,
    airline: String,
    vesselName: String,
    flightNumber: String,
    voyageNumber: String,
    etd: Date,
    portEta: Date,
    factoryEta: Date,
    atd: Date,
    ata: Date,
    status: {
      type: String,
      enum: ['pending', 'in-transit', 'arrived', 'delivered', 'cancelled'],
      default: 'pending',
    },
    palletCount: Number,
    partCount: Number,
    weight: Number,
    volume: Number,
    sealNumber: String,
    customsStatus: String,
    notes: String,
    documents: [
      {
        fileName: String,
        filePath: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// containerNumber 또는 trackingNumber 중 하나는 필수
ContainerSchema.pre('validate', function (next) {
  if (!this.containerNumber && !this.trackingNumber) {
    return next(new Error('컨테이너 번호 또는 추적 번호 중 하나는 필수입니다'));
  }
  next();
});

// containerNumber와 trackingNumber의 고유성 검증
ContainerSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('containerNumber') || this.isModified('trackingNumber')) {
    const query: any = {};
    if (this.containerNumber) {
      query.containerNumber = this.containerNumber;
    }
    if (this.trackingNumber) {
      query.trackingNumber = this.trackingNumber;
    }
    
    const existing = await mongoose.model('Container').findOne({
      ...query,
      _id: { $ne: this._id },
    });
    
    if (existing) {
      return next(new Error('이미 존재하는 컨테이너 번호 또는 추적 번호입니다'));
    }
  }
  next();
});

// 인덱스
ContainerSchema.index({ containerNumber: 1 });
ContainerSchema.index({ trackingNumber: 1 });
ContainerSchema.index({ project: 1 });
ContainerSchema.index({ palletProject: 1 });
ContainerSchema.index({ company: 1 });
ContainerSchema.index({ shipmentType: 1 });
ContainerSchema.index({ shippingType: 1 });
ContainerSchema.index({ status: 1 });
ContainerSchema.index({ portEta: 1 });
ContainerSchema.index({ factoryEta: 1 });
ContainerSchema.index({ etd: 1 });

export default mongoose.model<IContainer>('Container', ContainerSchema);

