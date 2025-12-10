
import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  code?: string; // 회사 코드 (PO 생성 등에 사용)
  companyMessage?: string; // Slogan or internal message

  // Fiscal & Registration
  taxId: string; // Business Registration Number (사업자등록번호)
  ceoName: string; // Representative Name
  businessType?: string; // 업태 (e.g. Manufacturing)
  businessItem?: string; // 종목 (e.g. Electronics)

  // Contact & Address
  email: string;
  phone: string;
  fax?: string;
  address: string;
  website?: string;

  // System Defaults for this Company
  defaultCurrency: string;
  logoUrl?: string;

  // Meta
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, trim: true, uppercase: true },
  companyMessage: { type: String },

  taxId: { type: String },
  ceoName: { type: String },
  businessType: { type: String },
  businessItem: { type: String },

  email: { type: String },
  phone: { type: String },
  fax: { type: String },
  address: { type: String },
  website: { type: String },

  defaultCurrency: { type: String, default: 'KRW' },
  logoUrl: { type: String },

  isActive: { type: Boolean, default: true },
}, {
  timestamps: true
});

export default mongoose.model<ICompany>('Company', CompanySchema);
