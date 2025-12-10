import express, { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import path from 'path'; // Used for path util only
import ProjectSourceFile from '../models/ProjectSourceFile';
import Project from '../models/Project';
import { getStorageInfo } from '../config/storage';
import { storageService } from '../services/StorageService';

// Request 타입 확장 (multer 파일 업로드용)
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const router = express.Router();

// 저장소 서비스에서 multer 미들웨어 가져오기 (MemoryStorage 기반)
const upload = storageService.getMulterUpload();

/**
 * POST /api/project-source-files/upload
 * 프로젝트별 기초 자료 파일 업로드
 */
router.post('/upload', upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: '파일을 선택하세요' });
    }

    const { projectId, category, closingMonth, description } = req.body;
    if (!projectId) {
      return res.status(400).json({ message: '프로젝트를 선택하세요' });
    }
    if (!category) {
      return res.status(400).json({ message: '카테고리를 선택하세요' });
    }

    // 마감월 형식 검증 (마감월이 필요한 카테고리인 경우)
    // 월 마감, 출하 실적, 노무 실적 등은 마감월이 필요할 수 있음
    const requiresMonthCategories = ['monthly_closing']; // 마감월이 필수인 카테고리
    if (requiresMonthCategories.includes(category)) {
      if (!closingMonth) {
        return res.status(400).json({ message: '마감월을 선택하세요' });
      }
      if (!/^\d{4}-\d{2}$/.test(closingMonth)) {
        return res.status(400).json({ message: '마감월은 YYYY-MM 형식이어야 합니다' });
      }
    }

    // 프로젝트 확인
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' });
    }

    // 같은 프로젝트, 같은 카테고리, 같은 마감월의 파일이 이미 있는지 확인 (마감월이 필요한 카테고리인 경우)
    if (requiresMonthCategories.includes(category) && closingMonth) {
      const existing = await ProjectSourceFile.findOne({
        project: projectId,
        category,
        closingMonth,
      });
      if (existing) {
        return res.status(400).json({ message: '해당 프로젝트의 해당 카테고리 및 마감월 자료가 이미 존재합니다' });
      }
    }

    // 파일 타입 확인
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    let fileType: 'excel' | 'csv' | 'other' = 'other';
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      fileType = 'excel';
    } else if (fileExtension === 'csv') {
      fileType = 'csv';
    }

    // 엑셀 파일 파싱
    let summary: any = null;
    try {
      if (fileType === 'excel') {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (data.length > 0) {
          const headers = data[0] as string[];
          const rows = (data.slice(1) as any[]).filter((row: any) => {
            if (Array.isArray(row)) {
              return row.some((cell: any) => cell !== null && cell !== '');
            }
            return false;
          });

          summary = {
            totalRows: rows.length,
            columns: headers,
            sampleData: rows.slice(0, 5), // 처음 5줄 샘플
          };
        }
      } else if (fileType === 'csv') {
        const csvData = file.buffer.toString('utf-8');
        const lines = csvData.split('\n').filter((line: string) => line.trim());
        if (lines.length > 0) {
          const headers = lines[0].split(',').map((h: string) => h.trim());
          const rows = lines.slice(1).map((line: string) => line.split(',').map((cell: string) => cell.trim()));

          summary = {
            totalRows: rows.length,
            columns: headers,
            sampleData: rows.slice(0, 5),
          };
        }
      }
    } catch (parseError: any) {
      console.error('파일 파싱 오류:', parseError);
      // 파싱 오류가 있어도 파일은 저장
    }

    // 파일 정보 저장
    // uploadedBy는 ObjectId이므로 임시로 projectId를 사용 (실제로는 인증된 사용자 ID를 사용해야 함)
    const uploadedBy = (req as any).user?.userId || req.body.userId || projectId;

    // 파일 명 생성
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `file_${timestamp}_${sanitizedOriginalName}`;

    // 파일 저장 경로 구조: 프로젝트/카테고리/연/월
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    let folderPath = `projects/${projectId}/${category}/${year}/${month}`;
    if (requiresMonthCategories.includes(category) && closingMonth) {
      const [cYear, cMonth] = closingMonth.split('-');
      folderPath = `projects/${projectId}/${category}/${cYear}/${cMonth}`;
    }

    // Upload to S3 using storage service
    const uploadResult = await storageService.uploadFile(file, folderPath);
    const finalFilePath = uploadResult.location;

    const fileRecord = await ProjectSourceFile.create({
      fileName,
      originalFileName: file.originalname,
      project: projectId,
      category,
      closingMonth: requiresMonthCategories.includes(category) ? closingMonth : undefined,
      fileType,
      fileSize: file.size,
      filePath: finalFilePath, // S3 key
      uploadedBy: uploadedBy,
      uploadedAt: new Date(),
      summary,
      status: summary ? 'processed' : 'uploaded',
      description,
    });

    const fileRecordObj = fileRecord.toObject();
    delete fileRecordObj.fileData; // 응답에서는 파일 데이터 제외

    // 저장소 정보 추가
    const storageInfo = getStorageInfo();
    (fileRecordObj as any).storageInfo = storageInfo;

    res.status(201).json(fileRecordObj);
  } catch (error: any) {
    console.error('파일 업로드 오류:', error);
    res.status(500).json({ message: error.message || '파일 업로드에 실패했습니다' });
  }
});

/**
 * GET /api/project-source-files
 * 프로젝트별 파일 목록 조회
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId, category, closingMonth } = req.query;

    let query: any = {};
    if (projectId) query.project = projectId;
    if (category) query.category = category;
    if (closingMonth) query.closingMonth = closingMonth;

    const files = await ProjectSourceFile.find(query)
      .populate('project', 'projectCode projectName')
      .populate('uploadedBy', 'username email')
      .sort({ uploadedAt: -1 })
      .lean();

    // 파일 데이터 제외 및 저장소 정보 추가
    const storageInfo = getStorageInfo();
    const filesWithoutData = files.map((file: any) => {
      const { fileData, ...rest } = file;

      // 저장소 정보 추가
      rest.storageInfo = storageInfo;

      // NAS에 저장된 파일인 경우 존재 여부 확인 (생략)
      // if (rest.filePath) {
      //   rest.fileExists = true;
      // }

      return rest;
    });

    res.json(filesWithoutData);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/project-source-files/:id
 * 파일 상세 조회
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const file = await ProjectSourceFile.findById(req.params.id)
      .populate('project', 'projectCode projectName')
      .populate('uploadedBy', 'username email')
      .lean();

    if (!file) {
      return res.status(404).json({ message: '파일을 찾을 수 없습니다' });
    }

    const { fileData, ...fileInfo } = file;

    // 저장소 정보 추가
    const storageInfo = getStorageInfo();
    (fileInfo as any).storageInfo = storageInfo;

    // NAS에 저장된 파일인 경우 존재 여부 확인 (생략 - DB에 있으면 있다고 가정)
    // if (rest.filePath) {
    //   rest.fileExists = true; 
    // }

    res.json(fileInfo);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/project-source-files/:id/download
 * 파일 다운로드
 */
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const file = await ProjectSourceFile.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: '파일을 찾을 수 없습니다' });
    }

    // Download from S3
    if (!file.filePath) {
      return res.status(404).json({ message: '파일 경로를 찾을 수 없습니다' });
    }

    const fileBuffer = await storageService.downloadFile(file.filePath);

    // 파일 다운로드 헤더 설정
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalFileName)}"`);
    res.setHeader('Content-Length', file.fileSize);

    res.send(fileBuffer);
  } catch (error: any) {
    console.error('파일 다운로드 오류:', error);
    res.status(500).json({ message: error.message || '파일 다운로드에 실패했습니다' });
  }
});

/**
 * DELETE /api/project-source-files/:id
 * 파일 삭제
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await ProjectSourceFile.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: '파일을 찾을 수 없습니다' });
    }
    res.json({ message: '파일이 삭제되었습니다' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

