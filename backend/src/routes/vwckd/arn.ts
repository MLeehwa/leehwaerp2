import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import ARN from '../../models/vwckd/ARN'
import ARNContainer from '../../models/vwckd/ARNContainer'
import { storageService } from '../../services/StorageService'


const router = express.Router()

// Multer 설정 (StorageService 사용)
const upload = storageService.getMulterUpload()


// MongoDB 연결 확인 미들웨어
const checkDB = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

// GET /api/vwckd/arn - ARN 목록 조회
router.get('/', checkDB, async (req: Request, res: Response) => {
  try {
    const { containerNo, caseNumber, status, projectId } = req.query
    const query: any = {}

    if (containerNo) query.containerNo = new RegExp(containerNo as string, 'i')
    if (caseNumber) query.caseNumber = new RegExp(caseNumber as string, 'i')
    if (status) query.status = status
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)

    const arns = await ARN.find(query)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(1000)

    res.json(arns)
  } catch (error: any) {
    console.error('ARN 목록 조회 실패:', error)
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/arn/:id - ARN 상세 조회
router.get('/:id', checkDB, async (req: Request, res: Response) => {
  try {
    const arn = await ARN.findById(req.params.id).populate('uploadedBy', 'firstName lastName')
    if (!arn) {
      return res.status(404).json({ message: 'ARN을 찾을 수 없습니다' })
    }
    res.json(arn)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/vwckd/arn - ARN 생성
router.post('/', checkDB, async (req: Request, res: Response) => {
  try {
    const arn = await ARN.create({
      ...req.body,
      uploadedBy: (req as any).user?._id,
    })
    res.status(201).json(arn)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/vwckd/arn/:id - ARN 수정
router.put('/:id', checkDB, async (req: Request, res: Response) => {
  try {
    const arn = await ARN.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!arn) {
      return res.status(404).json({ message: 'ARN을 찾을 수 없습니다' })
    }
    res.json(arn)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// DELETE /api/vwckd/arn/:id - ARN 삭제
router.delete('/:id', checkDB, async (req: Request, res: Response) => {
  try {
    const arn = await ARN.findByIdAndDelete(req.params.id)
    if (!arn) {
      return res.status(404).json({ message: 'ARN을 찾을 수 없습니다' })
    }
    res.json({ message: 'ARN이 삭제되었습니다' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/arn/containers - 컨테이너 목록 조회
router.get('/containers/list', checkDB, async (req: Request, res: Response) => {
  try {
    const containers = await ARNContainer.find().sort({ createdAt: -1 })
    res.json(containers)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/arn/containers/:containerNo/cases - 컨테이너별 케이스 조회
router.get('/containers/:containerNo/cases', checkDB, async (req: Request, res: Response) => {
  try {
    const { containerNo } = req.params
    const cases = await ARN.find({ containerNo }).sort({ caseNumber: 1 })
    res.json(cases)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/vwckd/arn/upload - CSV 파일 업로드
router.post('/upload', checkDB, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ message: '파일을 선택하세요' })
    }

    const { projectId } = req.body
    if (!projectId) {
      return res.status(400).json({ message: '프로젝트 ID가 필요합니다' })
    }

    // CSV 파일 읽기
    // CSV 파일 읽기
    let csvContent: string
    if (file.buffer) {
      csvContent = file.buffer.toString('utf-8')
    } else {
      throw new Error('파일 데이터를 읽을 수 없습니다')
    }

    // CSV 파싱 및 검증
    const lines = csvContent.split('\n').filter((line: string) => line.trim() !== '')
    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV 파일에 헤더와 데이터가 필요합니다' })
    }

    const headers = lines[0].split(',').map((h: string) => h.trim())
    const requiredHeaders = ['upload_date', 'container_no', 'case_no']
    const missingHeaders = requiredHeaders.filter((h: string) => !headers.includes(h))

    if (missingHeaders.length > 0) {
      return res.status(400).json({
        message: `필수 헤더가 없습니다: ${missingHeaders.join(', ')}`
      })
    }

    const records: any[] = []
    const invalidRecords: string[] = []
    const caseNoSet = new Set<string>()

    // 각 라인 처리
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(',').map((v: string) => v.trim())
      if (values.length < headers.length) {
        invalidRecords.push(`Line ${i + 1}: 컬럼 수 부족`)
        continue
      }

      const record: any = {}
      headers.forEach((header, index) => {
        record[header] = values[index]
      })

      // 필수 필드 검증
      if (!record.upload_date || !record.container_no || !record.case_no) {
        invalidRecords.push(`Line ${i + 1}: 필수 필드 누락`)
        continue
      }

      // 날짜 형식 정규화
      let normalizedDate = record.upload_date
      const dateFormats = [
        /^\d{4}-\d{2}-\d{2}$/,
        /^\d{2}\/\d{2}\/\d{4}$/,
        /^\d{2}-\d{2}-\d{4}$/,
        /^\d{4}\/\d{2}\/\d{2}$/,
        /^\d{1,2}\/\d{1,2}\/\d{4}$/,
        /^\d{1,2}-\d{1,2}-\d{4}$/,
      ]

      let isValidDate = false
      for (const format of dateFormats) {
        if (format.test(record.upload_date)) {
          isValidDate = true
          try {
            const date = new Date(record.upload_date)
            if (!isNaN(date.getTime())) {
              normalizedDate = date.toISOString().split('T')[0]
              break
            }
          } catch (e) {
            // Continue
          }
        }
      }

      if (!isValidDate) {
        invalidRecords.push(`Line ${i + 1}: 날짜 형식 오류`)
        continue
      }

      // 중복 체크
      const caseKey = `${record.case_no}-${record.container_no}`
      if (caseNoSet.has(caseKey)) {
        invalidRecords.push(`Line ${i + 1}: 중복된 케이스 번호`)
        continue
      }
      caseNoSet.add(caseKey)

      // ARN 번호 생성 (upload_date + 시리얼 번호)
      const dateKey = normalizedDate.replace(/-/g, '')
      const existingCount = await ARN.countDocuments({
        uploadDate: normalizedDate,
        projectId: new mongoose.Types.ObjectId(projectId)
      })
      const serialNumber = String(existingCount + 1).padStart(3, '0')
      const arnNumber = `${dateKey}-${serialNumber}`

      records.push({
        arnNumber,
        containerNo: record.container_no,
        caseNumber: record.case_no,
        partName: record.part_name || null,
        uploadDate: normalizedDate,
        status: 'pending',
        projectId: new mongoose.Types.ObjectId(projectId),
        uploadedBy: (req as any).user?._id,
      })
    }

    if (records.length === 0) {
      return res.status(400).json({
        message: '유효한 레코드가 없습니다',
        errors: invalidRecords.slice(0, 10)
      })
    }

    // 컨테이너 생성 또는 업데이트
    const containerNos = [...new Set(records.map((r: any) => r.containerNo))]
    for (const containerNo of containerNos) {
      await ARNContainer.findOneAndUpdate(
        { containerNo, projectId: new mongoose.Types.ObjectId(projectId) },
        {
          containerNo,
          projectId: new mongoose.Types.ObjectId(projectId),
          arrivalDate: records.find((r: any) => r.containerNo === containerNo)?.uploadDate,
          status: 'pending',
        },
        { upsert: true, new: true }
      )
    }

    // ARN 레코드 일괄 삽입
    const inserted = await ARN.insertMany(records)

    // NAS에 원본 CSV 파일 저장
    // S3에 원본 CSV 파일 저장
    try {
      await storageService.uploadFile(file, `projects/${projectId}/arn`)
    } catch (e: any) {
      console.warn('Failed to save ARN CSV to storage:', e)
    }

    res.status(201).json({
      message: `${records.length}개의 레코드가 성공적으로 업로드되었습니다`,
      inserted: inserted.length,
      errors: invalidRecords.length > 0 ? invalidRecords.slice(0, 10) : undefined,
    })
  } catch (error: any) {
    console.error('ARN CSV 업로드 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/arn/export - ARN 데이터 Export
router.get('/export', checkDB, async (req: Request, res: Response) => {
  try {
    const { projectId, containerNo, status, startDate, endDate } = req.query
    const query: any = {}

    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)
    if (containerNo) query.containerNo = new RegExp(containerNo as string, 'i')
    if (status) query.status = status
    if (startDate || endDate) {
      query.uploadDate = {}
      if (startDate) query.uploadDate.$gte = startDate
      if (endDate) query.uploadDate.$lte = endDate
    }

    const arns = await ARN.find(query)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ uploadDate: -1, containerNo: 1, caseNumber: 1 })

    // CSV 형식으로 변환
    const csvHeaders = ['ARN Number', 'Container No', 'Case No', 'Part Name', 'Upload Date', 'Status']
    const csvRows = arns.map((arn: any) => [
      arn.arnNumber || '',
      arn.containerNo || '',
      arn.caseNumber || '',
      arn.partName || '',
      arn.uploadDate || '',
      arn.status || '',
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => row.join(','))
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv;charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=arn_export_${Date.now()}.csv`)
    res.send('\ufeff' + csvContent) // BOM 추가 (Excel 호환성)
  } catch (error: any) {
    console.error('ARN Export 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router

