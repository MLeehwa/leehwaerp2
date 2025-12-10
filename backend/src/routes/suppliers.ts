import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import Supplier from '../models/Supplier';

import { storageService } from '../services/StorageService';

const router = express.Router();

// 파일 업로드 설정 (StorageService 사용)
const upload = storageService.getMulterUpload();

// MongoDB 연결 확인 미들웨어
const checkDBConnection = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
  }
  next();
};

/**
 * GET /api/suppliers
 * 공급업체 목록 조회
 */
router.get('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { search, isActive, category } = req.query;

    const query: any = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (category) {
      query.category = category;
    }

    // 검색 필터링
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { supplierCode: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
        { contactPerson: searchRegex },
        { phone: searchRegex },
      ];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });

    res.json(suppliers);
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/suppliers/:id
 * 공급업체 상세 조회
 */
router.get('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: '공급업체를 찾을 수 없습니다.' });
    }

    res.json(supplier);
  } catch (error: any) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * 카테고리별 코드 prefix 매핑
 */
const CATEGORY_PREFIX: Record<string, string> = {
  asset: 'A',
  equipment: 'B',
  parts: 'C',
  service: 'D',
  other: 'E',
};

/**
 * 공급업체 코드 자동 생성
 */
async function generateSupplierCode(category?: string, manualCode?: string): Promise<string> {
  // 수동으로 코드를 입력한 경우
  if (manualCode && manualCode.trim()) {
    const code = manualCode.trim().toUpperCase();
    // 형식 검증: 영문자 1개 + 숫자 3자리 (예: A001)
    if (!/^[A-Z]\d{3}$/.test(code)) {
      throw new Error('공급업체 코드 형식이 올바르지 않습니다. (예: A001, B001)');
    }

    // 중복 체크
    const existing = await Supplier.findOne({ supplierCode: code });
    if (existing) {
      throw new Error(`이미 사용 중인 공급업체 코드입니다: ${code}`);
    }

    return code;
  }

  // 자동 생성: 카테고리별 prefix + 3자리 숫자
  const prefix = category && CATEGORY_PREFIX[category] ? CATEGORY_PREFIX[category] : 'E';

  // 해당 prefix로 시작하는 마지막 코드 찾기
  const lastSupplier = await Supplier.findOne({
    supplierCode: new RegExp(`^${prefix}\\d{3}$`),
  }).sort({ supplierCode: -1 });

  let nextNumber = 1;
  if (lastSupplier) {
    const lastNumber = parseInt(lastSupplier.supplierCode.substring(1));
    nextNumber = lastNumber + 1;
  }

  // 999를 초과하면 에러
  if (nextNumber > 999) {
    throw new Error(`${prefix} 카테고리의 코드가 모두 사용되었습니다.`);
  }

  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * POST /api/suppliers
 * 공급업체 생성
 */
router.post('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const {
      supplierCode,
      name,
      email,
      phone,
      address,
      contactPerson,
      paymentTerms,
      category,
      isActive,
    } = req.body;

    // 필수 필드 검증
    if (!name || !name.trim()) {
      return res.status(400).json({ message: '공급업체명을 입력하세요.' });
    }

    // 이메일 형식 검증
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: '유효한 이메일을 입력하세요.' });
    }

    // 공급업체 코드 생성 또는 검증
    const code = await generateSupplierCode(category, supplierCode);

    const supplier = new Supplier({
      supplierCode: code,
      name: name.trim(),
      email: email?.trim() || undefined,
      phone: phone?.trim() || undefined,
      address: address || undefined,
      contactPerson: contactPerson?.trim() || undefined,
      paymentTerms: paymentTerms?.trim() || undefined,
      category: category || undefined,
      isActive: isActive !== undefined ? isActive : true,
    });

    await supplier.save();
    res.status(201).json(supplier);
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '이미 존재하는 공급업체 코드 또는 이름입니다.' });
    }
    res.status(500).json({ message: error.message || '공급업체 생성에 실패했습니다.' });
  }
});

/**
 * PUT /api/suppliers/:id
 * 공급업체 업데이트
 */
router.put('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: '공급업체를 찾을 수 없습니다.' });
    }

    const {
      supplierCode,
      name,
      email,
      phone,
      address,
      contactPerson,
      paymentTerms,
      category,
      isActive,
    } = req.body;

    // 필수 필드 검증
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ message: '공급업체명을 입력하세요.' });
    }

    // 이메일 형식 검증
    if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: '유효한 이메일을 입력하세요.' });
    }

    // 공급업체 코드 업데이트 (변경된 경우에만)
    if (supplierCode !== undefined && supplierCode !== supplier.supplierCode) {
      const code = supplierCode.trim().toUpperCase();
      // 형식 검증
      if (!/^[A-Z]\d{3}$/.test(code)) {
        return res.status(400).json({ message: '공급업체 코드 형식이 올바르지 않습니다. (예: A001, B001)' });
      }
      // 중복 체크
      const existing = await Supplier.findOne({ supplierCode: code, _id: { $ne: supplier._id } });
      if (existing) {
        return res.status(400).json({ message: `이미 사용 중인 공급업체 코드입니다: ${code}` });
      }
      supplier.supplierCode = code;
    }

    // 업데이트
    if (name !== undefined) supplier.name = name.trim();
    if (email !== undefined) supplier.email = email?.trim() || undefined;
    if (phone !== undefined) supplier.phone = phone?.trim() || undefined;
    if (address !== undefined) supplier.address = address || undefined;
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson?.trim() || undefined;
    if (paymentTerms !== undefined) supplier.paymentTerms = paymentTerms?.trim() || undefined;
    if (category !== undefined) supplier.category = category || undefined;
    if (isActive !== undefined) supplier.isActive = isActive;

    await supplier.save();
    res.json(supplier);
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '이미 존재하는 공급업체명입니다.' });
    }
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/suppliers/:id
 * 공급업체 삭제 (소프트 삭제)
 */
router.delete('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: '공급업체를 찾을 수 없습니다.' });
    }

    supplier.isActive = false;
    await supplier.save();

    res.json({ message: '공급업체가 비활성화되었습니다.' });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/suppliers/:id/attachments
 * 공급업체에 파일 첨부
 */
router.post('/:id/attachments', upload.single('file'), checkDBConnection, async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: '파일을 선택하세요' });
    }

    const { fileType } = req.body; // VOID_CHECK, W9, BANK_LETTER, OTHER

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: '공급업체를 찾을 수 없습니다.' });
    }

    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `attachment_${timestamp}_${sanitizedOriginalName}`;

    // Upload to S3
    const uploadResult = await storageService.uploadFile(file, `suppliers/${req.params.id}`);
    const finalFilePath = uploadResult.location;

    const attachment = {
      fileName: file.originalname,
      filePath: finalFilePath,
      fileSize: file.size,
      fileType: fileType || 'OTHER',
      uploadedAt: new Date(),
    };

    if (!supplier.attachments) {
      supplier.attachments = [];
    }
    supplier.attachments.push(attachment);
    await supplier.save();

    res.status(201).json(attachment);
  } catch (error: any) {
    console.error('파일 첨부 오류:', error);
    res.status(500).json({ message: error.message || '파일 첨부에 실패했습니다' });
  }
});

/**
 * DELETE /api/suppliers/:id/attachments/:attachmentIndex
 * 공급업체에서 파일 삭제
 */
router.delete('/:id/attachments/:attachmentIndex', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: '공급업체를 찾을 수 없습니다.' });
    }

    const attachmentIndex = parseInt(req.params.attachmentIndex);
    if (!supplier.attachments || !supplier.attachments[attachmentIndex]) {
      return res.status(404).json({ message: '첨부파일을 찾을 수 없습니다' });
    }

    const attachment = supplier.attachments[attachmentIndex];

    // NAS/Storage에 저장된 파일 삭제
    if (attachment.filePath) {
      try {
        await storageService.deleteFile(attachment.filePath);
      } catch (e) {
        console.warn('Failed to delete file from storage:', e);
      }
    }

    supplier.attachments.splice(attachmentIndex, 1);
    await supplier.save();

    res.json({ message: '첨부파일이 삭제되었습니다' });
  } catch (error: any) {
    console.error('파일 삭제 오류:', error);
    res.status(500).json({ message: error.message || '파일 삭제에 실패했습니다' });
  }
});

/**
 * GET /api/suppliers/:id/attachments/:attachmentIndex/download
 * 첨부파일 다운로드
 */
router.get('/:id/attachments/:attachmentIndex/download', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: '공급업체를 찾을 수 없습니다.' });
    }

    const attachmentIndex = parseInt(req.params.attachmentIndex);
    if (!supplier.attachments || !supplier.attachments[attachmentIndex]) {
      return res.status(404).json({ message: '첨부파일을 찾을 수 없습니다' });
    }

    const attachment = supplier.attachments[attachmentIndex];
    let fileBuffer: Buffer;

    if (attachment.filePath) {
      fileBuffer = await storageService.downloadFile(attachment.filePath);
    } else {
      return res.status(404).json({ message: '파일 데이터를 찾을 수 없습니다' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
    res.setHeader('Content-Length', attachment.fileSize || fileBuffer.length);

    res.send(fileBuffer);
  } catch (error: any) {
    console.error('파일 다운로드 오류:', error);
    res.status(500).json({ message: error.message || '파일 다운로드에 실패했습니다' });
  }
});

export default router;
