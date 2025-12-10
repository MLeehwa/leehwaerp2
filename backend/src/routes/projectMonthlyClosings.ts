import express, { Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import ProjectMonthlyClosing from '../models/ProjectMonthlyClosing';
import Project from '../models/Project';
import mongoose from 'mongoose';

const router = express.Router();

// 파일 업로드 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다'));
    }
  },
});

/**
 * GET /api/project-monthly-closings
 * 월 마감 자료 목록 조회
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId, closingMonth } = req.query;

    let query: any = {};
    if (projectId) query.project = projectId;
    if (closingMonth) query.closingMonth = closingMonth;

    const closings = await ProjectMonthlyClosing.find(query)
      .select('-fileData') // Exclude heavy file data
      .populate('project', 'projectCode projectName')
      .sort({ closingMonth: -1 });

    res.json(closings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/project-monthly-closings/:id
 * 월 마감 자료 상세 조회
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const closing = await ProjectMonthlyClosing.findById(req.params.id)
      .select('-fileData')
      .populate('project', 'projectCode projectName');

    if (!closing) {
      return res.status(404).json({ message: '월 마감 자료를 찾을 수 없습니다' });
    }

    res.json(closing);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/project-monthly-closings/upload
 * 프로젝트별 월 마감 자료 파일 업로드
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '파일을 선택하세요' });
    }

    const { projectId, closingMonth, description, notes, userId } = req.body;
    if (!projectId) {
      return res.status(400).json({ message: '프로젝트를 선택하세요' });
    }
    if (!closingMonth) {
      return res.status(400).json({ message: '마감월을 선택하세요' });
    }

    // 마감월 형식 검증 (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(closingMonth)) {
      return res.status(400).json({ message: '마감월은 YYYY-MM 형식이어야 합니다' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' });
    }

    // 같은 프로젝트, 같은 마감월의 파일이 이미 있는지 확인
    const existing = await ProjectMonthlyClosing.findOne({
      project: projectId,
      closingMonth,
    });
    if (existing) {
      return res.status(400).json({ message: '해당 프로젝트의 해당 마감월 자료가 이미 존재합니다' });
    }

    // 파일 타입 확인
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
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
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (data.length > 0) {
          const headers = data[0] as string[];
          const rows = data.slice(1).filter((row: any) => row.some((cell: any) => cell !== null && cell !== ''));

          summary = {
            totalRows: rows.length,
            columns: headers,
            sampleData: rows.slice(0, 5), // 처음 5줄 샘플
          };
        }
      } else if (fileType === 'csv') {
        const csvData = req.file.buffer.toString('utf-8');
        const lines = csvData.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim());
          const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));

          summary = {
            totalRows: rows.length,
            columns: headers,
            sampleData: rows.slice(0, 5),
          };
        }
      }
    } catch (parseError: any) {
      console.error('파일 파싱 오류:', parseError);
    }

    // 파일 정보 저장
    const closingRecord = new ProjectMonthlyClosing({
      fileName: `closing_${Date.now()}_${req.file.originalname}`,
      originalFileName: req.file.originalname,
      project: projectId,
      closingMonth,
      fileType,
      fileSize: req.file.size,
      fileData: req.file.buffer, // Mongoose handles Buffer
      uploadedBy: userId ? new mongoose.Types.ObjectId(userId) : new mongoose.Types.ObjectId('000000000000000000000000'), // Fallback
      uploadedAt: new Date(),
      summary,
      status: summary ? 'processed' : 'uploaded',
      description,
      notes,
    });

    await closingRecord.save();

    // Respond without heavy fileData
    const responseData = closingRecord.toObject();
    delete responseData.fileData;

    res.status(201).json(responseData);
  } catch (error: any) {
    console.error('파일 업로드 오류:', error);
    res.status(500).json({ message: error.message || '파일 업로드에 실패했습니다' });
  }
});

/**
 * GET /api/project-monthly-closings/:id/download
 * 월 마감 자료 파일 다운로드
 */
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const closing = await ProjectMonthlyClosing.findById(req.params.id);
    if (!closing) {
      return res.status(404).json({ message: '월 마감 자료를 찾을 수 없습니다' });
    }

    if (!closing.fileData) {
      return res.status(404).json({ message: '파일 데이터를 찾을 수 없습니다' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${closing.originalFileName}"`);
    res.send(closing.fileData);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/project-monthly-closings/:id
 * 월 마감 자료 삭제
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const closing = await ProjectMonthlyClosing.findByIdAndDelete(req.params.id);
    if (!closing) {
      return res.status(404).json({ message: '월 마감 자료를 찾을 수 없습니다' });
    }
    res.json({ message: '월 마감 자료가 삭제되었습니다' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
