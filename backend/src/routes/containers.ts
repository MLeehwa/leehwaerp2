import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import Container from '../models/Container';
import Project from '../models/Project';
import PalletProject from '../models/PalletProject';
import Company from '../models/Company';
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
 * GET /api/containers
 * 컨테이너 목록 조회
 */
router.get('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      palletProjectId,
      companyId,
      status,
      origin,
      destination,
      shipmentType,
      shippingType
    } = req.query;

    const query: any = {};
    if (projectId) query.project = projectId;
    if (palletProjectId) query.palletProject = palletProjectId;
    if (companyId) query.company = companyId;
    if (status) query.status = status;
    if (origin) query.origin = origin;
    if (destination) query.destination = destination;
    if (shipmentType) query.shipmentType = shipmentType;
    if (shippingType) query.shippingType = shippingType;

    const containers = await Container.find(query)
      .populate('project', 'projectCode projectName')
      .populate('palletProject', 'projectCode projectName')
      .populate('company', 'code name')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json(containers);
  } catch (error: any) {
    console.error('Error fetching containers:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/containers/:id
 * 컨테이너 상세 조회
 */
router.get('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const container = await Container.findById(req.params.id)
      .populate('project', 'projectCode projectName')
      .populate('palletProject', 'projectCode projectName')
      .populate('company', 'code name')
      .populate('createdBy', 'username');

    if (!container) {
      return res.status(404).json({ message: '컨테이너를 찾을 수 없습니다' });
    }

    res.json(container);
  } catch (error: any) {
    console.error('Error fetching container:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/containers
 * 컨테이너 생성
 */
router.post('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const {
      containerNumber,
      trackingNumber,
      shippingType,
      project,
      palletProject,
      company,
      shipmentType,
      origin,
      destination,
      shippingLine,
      airline,
      vesselName,
      flightNumber,
      voyageNumber,
      etd,
      portEta,
      factoryEta,
      status,
      palletCount,
      partCount,
      weight,
      volume,
      sealNumber,
      customsStatus,
      notes,
    } = req.body;

    // 필수 필드 검증
    if (!containerNumber && !trackingNumber) {
      return res.status(400).json({ message: '컨테이너 번호 또는 추적 번호 중 하나는 필수입니다' });
    }
    if (!origin || !destination) {
      return res.status(400).json({ message: '출발지와 도착지는 필수입니다' });
    }
    if (!shippingType || !['sea', 'air'].includes(shippingType)) {
      return res.status(400).json({ message: '운송 유형(sea/air)은 필수입니다' });
    }
    if (shippingType === 'sea' && !containerNumber) {
      return res.status(400).json({ message: '해상 운송의 경우 컨테이너 번호는 필수입니다' });
    }
    if (shippingType === 'air' && !trackingNumber) {
      return res.status(400).json({ message: '항공 운송의 경우 추적 번호는 필수입니다' });
    }

    // 중복 체크
    const query: any = {};
    if (containerNumber) {
      query.containerNumber = containerNumber.toUpperCase();
    }
    if (trackingNumber) {
      query.trackingNumber = trackingNumber;
    }
    const existing = await Container.findOne(query);
    if (existing) {
      return res.status(400).json({ message: '이미 존재하는 컨테이너 번호 또는 추적 번호입니다' });
    }

    const container = new Container({
      containerNumber: containerNumber ? containerNumber.toUpperCase() : undefined,
      trackingNumber,
      shippingType,
      project,
      palletProject,
      company,
      shipmentType: shipmentType || 'project',
      origin,
      destination,
      shippingLine,
      airline,
      vesselName,
      flightNumber,
      voyageNumber,
      etd: etd ? new Date(etd) : undefined,
      portEta: portEta ? new Date(portEta) : undefined,
      factoryEta: factoryEta ? new Date(factoryEta) : undefined,
      status: status || 'pending',
      palletCount,
      partCount,
      weight,
      volume,
      sealNumber,
      customsStatus,
      notes,
    });

    await container.save();
    await container.populate('project', 'projectCode projectName');
    await container.populate('palletProject', 'projectCode projectName');
    await container.populate('company', 'code name');

    res.status(201).json(container);
  } catch (error: any) {
    console.error('Error creating container:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '이미 존재하는 컨테이너 번호 또는 추적 번호입니다' });
    }
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/containers/:id
 * 컨테이너 수정
 */
router.put('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const container = await Container.findById(req.params.id);

    if (!container) {
      return res.status(404).json({ message: '컨테이너를 찾을 수 없습니다' });
    }

    const {
      containerNumber,
      trackingNumber,
      shippingType,
      project,
      palletProject,
      company,
      shipmentType,
      origin,
      destination,
      shippingLine,
      airline,
      vesselName,
      flightNumber,
      voyageNumber,
      etd,
      portEta,
      factoryEta,
      atd,
      ata,
      status,
      palletCount,
      partCount,
      weight,
      volume,
      sealNumber,
      customsStatus,
      notes,
    } = req.body;

    if (containerNumber !== undefined && containerNumber !== container.containerNumber) {
      // 중복 체크
      const existing = await Container.findOne({
        containerNumber: containerNumber.toUpperCase(),
        _id: { $ne: container._id }
      });
      if (existing) {
        return res.status(400).json({ message: '이미 존재하는 컨테이너 번호입니다' });
      }
      container.containerNumber = containerNumber ? containerNumber.toUpperCase() : undefined;
    }
    if (trackingNumber !== undefined && trackingNumber !== container.trackingNumber) {
      const existing = await Container.findOne({
        trackingNumber,
        _id: { $ne: container._id }
      });
      if (existing) {
        return res.status(400).json({ message: '이미 존재하는 추적 번호입니다' });
      }
      container.trackingNumber = trackingNumber;
    }
    if (shippingType !== undefined) container.shippingType = shippingType;
    if (project !== undefined) container.project = project;
    if (palletProject !== undefined) container.palletProject = palletProject;
    if (company !== undefined) container.company = company;
    if (shipmentType !== undefined) container.shipmentType = shipmentType;
    if (origin !== undefined) container.origin = origin;
    if (destination !== undefined) container.destination = destination;
    if (shippingLine !== undefined) container.shippingLine = shippingLine;
    if (airline !== undefined) container.airline = airline;
    if (vesselName !== undefined) container.vesselName = vesselName;
    if (flightNumber !== undefined) container.flightNumber = flightNumber;
    if (voyageNumber !== undefined) container.voyageNumber = voyageNumber;
    if (etd !== undefined) container.etd = etd ? new Date(etd) : undefined;
    if (portEta !== undefined) container.portEta = portEta ? new Date(portEta) : undefined;
    if (factoryEta !== undefined) container.factoryEta = factoryEta ? new Date(factoryEta) : undefined;
    if (atd !== undefined) container.atd = atd ? new Date(atd) : undefined;
    if (ata !== undefined) container.ata = ata ? new Date(ata) : undefined;
    if (status !== undefined) container.status = status;
    if (palletCount !== undefined) container.palletCount = palletCount;
    if (partCount !== undefined) container.partCount = partCount;
    if (weight !== undefined) container.weight = weight;
    if (volume !== undefined) container.volume = volume;
    if (sealNumber !== undefined) container.sealNumber = sealNumber;
    if (customsStatus !== undefined) container.customsStatus = customsStatus;
    if (notes !== undefined) container.notes = notes;

    await container.save();
    await container.populate('project', 'projectCode projectName');
    await container.populate('palletProject', 'projectCode projectName');
    await container.populate('company', 'code name');

    res.json(container);
  } catch (error: any) {
    console.error('Error updating container:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '이미 존재하는 컨테이너 번호입니다' });
    }
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/containers/:id
 * 컨테이너 삭제
 */
router.delete('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const container = await Container.findByIdAndDelete(req.params.id);

    if (!container) {
      return res.status(404).json({ message: '컨테이너를 찾을 수 없습니다' });
    }

    res.json({ message: '컨테이너가 삭제되었습니다' });
  } catch (error: any) {
    console.error('Error deleting container:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/containers/:id/documents
 * 컨테이너에 문서 첨부
 */
router.post('/:id/documents', upload.single('file'), checkDBConnection, async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: '파일을 선택하세요' });
    }

    const { fileType } = req.body;

    const container = await Container.findById(req.params.id);
    if (!container) {
      return res.status(404).json({ message: '컨테이너를 찾을 수 없습니다' });
    }

    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `document_${timestamp}_${sanitizedOriginalName}`;

    // Upload to S3
    const uploadResult = await storageService.uploadFile(file, `containers/${req.params.id}`);
    const finalFilePath = uploadResult.location;

    const document = {
      fileName: file.originalname,
      filePath: finalFilePath,
      fileType: fileType || 'OTHER',
      uploadedAt: new Date(),
    };

    if (!container.documents) {
      container.documents = [];
    }
    container.documents.push(document);
    await container.save();

    res.status(201).json(document);
  } catch (error: any) {
    console.error('파일 첨부 오류:', error);
    res.status(500).json({ message: error.message || '파일 첨부에 실패했습니다' });
  }
});

/**
 * POST /api/containers/bulk-upload
 * Excel 파일로 컨테이너 일괄 등록/수정
 */
router.post('/bulk-upload', upload.single('file'), checkDBConnection, async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: '파일을 선택하세요' });
    }

    // Read buffer from file
    const buffer = file.buffer;
    if (!buffer) {
      return res.status(400).json({ message: '파일 버퍼를 읽을 수 없습니다' });
    }

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: 'Excel 파일에 데이터가 없습니다' });
    }

    // 프로젝트 코드로 프로젝트 ID 매핑 생성
    const projects = await Project.find({}, '_id projectCode');
    const projectMap = new Map<string, string>();
    projects.forEach((p: any) => {
      projectMap.set(p.projectCode, p._id.toString());
    });

    const results = {
      success: [] as any[],
      errors: [] as any[],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNum = i + 2; // 헤더 제외, 1-based index

      try {
        // 필수 필드 검증
        if (!row['컨테이너번호'] && !row['Container Number']) {
          results.errors.push({
            row: rowNum,
            containerNumber: row['컨테이너번호'] || row['Container Number'] || '',
            message: '컨테이너 번호가 없습니다',
          });
          continue;
        }

        const containerNumber = (row['컨테이너번호'] || row['Container Number'] || '').toString().toUpperCase().trim();
        const projectCode = (row['프로젝트코드'] || row['Project Code'] || '').toString().trim();

        if (!projectCode) {
          results.errors.push({
            row: rowNum,
            containerNumber,
            message: '프로젝트 코드가 없습니다',
          });
          continue;
        }

        const projectId = projectMap.get(projectCode);
        if (!projectId) {
          results.errors.push({
            row: rowNum,
            containerNumber,
            message: `프로젝트 코드 "${projectCode}"를 찾을 수 없습니다`,
          });
          continue;
        }

        // 날짜 파싱 헬퍼
        const parseDate = (dateStr: string | undefined): Date | undefined => {
          if (!dateStr) return undefined;
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? undefined : date;
        };

        // 숫자 파싱 헬퍼
        const parseNumber = (numStr: string | undefined): number | undefined => {
          if (!numStr) return undefined;
          const num = parseFloat(numStr.toString().replace(/,/g, ''));
          return isNaN(num) ? undefined : num;
        };

        // 상태 매핑
        const statusMap: Record<string, string> = {
          '대기중': 'pending',
          '운송중': 'in-transit',
          '도착': 'arrived',
          '인도완료': 'delivered',
          '취소': 'cancelled',
          'pending': 'pending',
          'in-transit': 'in-transit',
          'arrived': 'arrived',
          'delivered': 'delivered',
          'cancelled': 'cancelled',
        };
        const statusText = (row['상태'] || row['Status'] || '대기중').toString().trim();
        const status = statusMap[statusText] || 'pending';

        const containerData: any = {
          containerNumber,
          project: projectId,
          origin: (row['출발지'] || row['Origin'] || 'Korea').toString().trim(),
          destination: (row['도착지'] || row['Destination'] || '').toString().trim(),
          shippingLine: row['선사'] || row['Shipping Line'] || undefined,
          vesselName: row['선박명'] || row['Vessel Name'] || undefined,
          voyageNumber: row['항차'] || row['Voyage Number'] || undefined,
          etd: parseDate(row['ETD'] || row['예상출발일']),
          eta: parseDate(row['ETA'] || row['예상도착일']),
          atd: parseDate(row['ATD'] || row['실제출발일']),
          ata: parseDate(row['ATA'] || row['실제도착일']),
          status,
          palletCount: parseNumber(row['파렛트수량'] || row['Pallet Count']),
          partCount: parseNumber(row['부품수량'] || row['Part Count']),
          weight: parseNumber(row['중량'] || row['Weight']),
          volume: parseNumber(row['부피'] || row['Volume']),
          sealNumber: row['봉인번호'] || row['Seal Number'] || undefined,
          customsStatus: row['통관상태'] || row['Customs Status'] || undefined,
          notes: row['비고'] || row['Notes'] || undefined,
        };

        // 필수 필드 재검증
        if (!containerData.destination) {
          results.errors.push({
            row: rowNum,
            containerNumber,
            message: '도착지가 없습니다',
          });
          continue;
        }

        // 기존 컨테이너 찾기
        const existing = await Container.findOne({ containerNumber });

        if (existing) {
          // 업데이트
          Object.assign(existing, containerData);
          await existing.save();
          await existing.populate('project', 'projectCode projectName');
          results.success.push({
            row: rowNum,
            containerNumber,
            action: 'updated',
            container: existing,
          });
        } else {
          // 생성
          const newContainer = new Container(containerData);
          await newContainer.save();
          await newContainer.populate('project', 'projectCode projectName');
          results.success.push({
            row: rowNum,
            containerNumber,
            action: 'created',
            container: newContainer,
          });
        }
      } catch (error: any) {
        results.errors.push({
          row: rowNum,
          containerNumber: row['컨테이너번호'] || row['Container Number'] || '',
          message: error.message || '처리 중 오류가 발생했습니다',
        });
      }
    }

    res.json({
      message: `처리 완료: 성공 ${results.success.length}건, 실패 ${results.errors.length}건`,
      success: results.success.length,
      errors: results.errors.length,
      details: results,
    });
  } catch (error: any) {
    console.error('Excel 업로드 오류:', error);
    res.status(500).json({ message: error.message || 'Excel 파일 처리에 실패했습니다' });
  }
});

export default router;
