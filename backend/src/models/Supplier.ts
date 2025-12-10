import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplier extends Document {
  supplierCode: string; // 공급업체 코드 (A001, B001 등)
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactPerson?: string;
  paymentTerms?: string;
  category?: string; // 장비(asset), 설비(equipment), 부속품(parts), 서비스(service) 등
  // 지급 관련 정보
  paymentMethod?: string; // ACH, WIRE, Check, Bank Transfer 등
  bankInfo?: {
    bankName?: string; // 은행명
    accountNumber?: string; // 계좌번호
    routingNumber?: string; // 라우팅 번호 (ACH용)
    swiftCode?: string; // SWIFT 코드 (WIRE용)
    accountHolderName?: string; // 계좌 소유자명
    bankAddress?: string; // 은행 주소
    currency?: string; // 통화
  };
  attachments?: Array<{
    fileName: string;
    filePath?: string;
    fileSize?: number;
    fileType?: string; // VOID_CHECK, W9, BANK_LETTER 등
    uploadedAt: Date;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    supplierCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    contactPerson: String,
    paymentTerms: String,
    category: {
      type: String,
      enum: ['asset', 'equipment', 'parts', 'service', 'other'], // 장비, 설비, 부속품, 서비스, 기타
    },
    paymentMethod: {
      type: String,
      enum: ['ACH', 'WIRE', 'Check', 'Bank Transfer', 'Credit Card', 'Cash', 'Other'],
    },
    bankInfo: {
      bankName: String, // 은행명
      accountNumber: String, // 계좌번호
      routingNumber: String, // 라우팅 번호 (ACH용)
      swiftCode: String, // SWIFT 코드 (WIRE용)
      accountHolderName: String, // 계좌 소유자명
      bankAddress: String, // 은행 주소
      currency: String, // 통화 (USD, KRW, MXN 등)
    },
    attachments: [
      {
        fileName: String,
        filePath: String,
        fileSize: Number,
        fileType: {
          type: String,
          enum: ['VOID_CHECK', 'W9', 'BANK_LETTER', 'OTHER'],
        },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISupplier>('Supplier', SupplierSchema);

