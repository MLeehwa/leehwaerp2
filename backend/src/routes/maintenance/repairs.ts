import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import MaintenanceRepair from '../../models/MaintenanceRepair'

const router = express.Router()

// MongoDB 연결 확인 미들웨어
const checkDBConnection = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

/**
 * GET /api/maintenance/repairs
 * 수리 내역 목록 조회
 */
router.get('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { equipment, repairType, status, startDate, endDate } = req.query

    const query: any = {}
    if (equipment) query.equipment = equipment
    if (repairType) query.repairType = repairType
    if (status) query.status = status
    if (startDate || endDate) {
      query.repairDate = {}
      if (startDate) query.repairDate.$gte = new Date(startDate as string)
      if (endDate) query.repairDate.$lte = new Date(endDate as string)
    }

    const repairs = await MaintenanceRepair.find(query)
      .populate('equipment', 'equipmentCode equipmentName')
      .populate('reportedBy', 'username email')
      .populate('performedBy', 'username email')
      .populate('createdBy', 'username email')
      .sort({ repairDate: -1 })

    res.json(repairs)
  } catch (error: any) {
    console.error('Error fetching repairs:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * GET /api/maintenance/repairs/:id
 * 수리 내역 상세 조회
 */
router.get('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const repair = await MaintenanceRepair.findById(req.params.id)
      .populate('equipment', 'equipmentCode equipmentName')
      .populate('reportedBy', 'username email')
      .populate('performedBy', 'username email')
      .populate('createdBy', 'username email')

    if (!repair) {
      return res.status(404).json({ message: '수리 내역을 찾을 수 없습니다' })
    }

    res.json(repair)
  } catch (error: any) {
    console.error('Error fetching repair:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * POST /api/maintenance/repairs
 * 수리 내역 생성
 */
router.post('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const {
      equipment,
      repairDate,
      repairType,
      reportedBy,
      performedBy,
      description,
      issue,
      workPerformed,
      operatingHours,
      partsUsed,
      laborCost,
      materialCost,
      totalCost,
      status,
      notes,
      createdBy,
    } = req.body

    // 필수 필드 검증
    if (!equipment) {
      return res.status(400).json({ message: '설비를 선택하세요' })
    }
    if (!repairDate) {
      return res.status(400).json({ message: '수리일을 입력하세요' })
    }
    if (!description) {
      return res.status(400).json({ message: '설명을 입력하세요' })
    }
    if (repairType === 'repair' && !totalCost && totalCost !== 0) {
      return res.status(400).json({ message: '수리 이력의 경우 금액을 입력하세요' })
    }

    // equipment가 유효한 ObjectId인지 확인
    if (!mongoose.Types.ObjectId.isValid(equipment)) {
      return res.status(400).json({ message: '유효하지 않은 설비 ID입니다' })
    }

    const repairData: any = {
      equipment,
      repairDate: new Date(repairDate),
      repairType: repairType || 'repair',
      description,
      status: status || (repairType === 'repair' ? 'reported' : 'completed'), // 수리는 'reported', 점검은 'completed'가 기본값
    }

    if (reportedBy) repairData.reportedBy = reportedBy
    if (performedBy) repairData.performedBy = performedBy
    if (issue) repairData.issue = issue
    if (workPerformed) repairData.workPerformed = workPerformed
    if (operatingHours !== undefined) repairData.operatingHours = operatingHours
    if (partsUsed) repairData.partsUsed = partsUsed
    if (laborCost !== undefined) repairData.laborCost = laborCost
    if (materialCost !== undefined) repairData.materialCost = materialCost
    if (totalCost !== undefined) repairData.totalCost = totalCost
    if (notes) repairData.notes = notes
    if (createdBy) repairData.createdBy = createdBy

    const repair = new MaintenanceRepair(repairData)
    await repair.save()
    await repair.populate('equipment', 'equipmentCode equipmentName')
    await repair.populate('reportedBy', 'username email')
    await repair.populate('performedBy', 'username email')
    await repair.populate('createdBy', 'username email')

    res.status(201).json(repair)
  } catch (error: any) {
    console.error('Error creating repair:', error)
    res.status(500).json({ message: error.message || '수리 내역 등록에 실패했습니다' })
  }
})

/**
 * PUT /api/maintenance/repairs/:id
 * 수리 내역 수정
 */
router.put('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const repair = await MaintenanceRepair.findById(req.params.id)

    if (!repair) {
      return res.status(404).json({ message: '수리 내역을 찾을 수 없습니다' })
    }

    Object.assign(repair, req.body)

    // 날짜 필드 변환
    if (req.body.repairDate) repair.repairDate = new Date(req.body.repairDate)

    await repair.save()
    await repair.populate('equipment', 'equipmentCode equipmentName')
    await repair.populate('reportedBy', 'username email')
    await repair.populate('performedBy', 'username email')
    await repair.populate('createdBy', 'username email')

    res.json(repair)
  } catch (error: any) {
    console.error('Error updating repair:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * DELETE /api/maintenance/repairs/:id
 * 수리 내역 삭제
 */
router.delete('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const repair = await MaintenanceRepair.findById(req.params.id)

    if (!repair) {
      return res.status(404).json({ message: '수리 내역을 찾을 수 없습니다' })
    }

    await MaintenanceRepair.findByIdAndDelete(req.params.id)

    res.json({ message: '수리 내역이 삭제되었습니다' })
  } catch (error: any) {
    console.error('Error deleting repair:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router

