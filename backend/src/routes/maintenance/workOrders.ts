import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import MaintenanceWorkOrder from '../../models/MaintenanceWorkOrder'
import MaintenanceEquipment from '../../models/MaintenanceEquipment'
import MaintenanceSchedule from '../../models/MaintenanceSchedule'

const router = express.Router()

// MongoDB 연결 확인 미들웨어
const checkDBConnection = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

/**
 * GET /api/maintenance/work-orders
 * 작업 지시 목록 조회
 */
router.get('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { equipment, workOrderType, status, priority, assignedTo } = req.query

    const query: any = {}
    if (equipment) query.equipment = equipment
    if (workOrderType) query.workOrderType = workOrderType
    if (status) query.status = status
    if (priority) query.priority = priority
    if (assignedTo) query.assignedTo = assignedTo

    const workOrders = await MaintenanceWorkOrder.find(query)
      .populate('equipment', 'equipmentCode equipmentName equipmentType location')
      .populate('schedule', 'scheduleNumber title')
      .populate('reportedBy', 'username email firstName lastName')
      .populate('assignedTo', 'username email firstName lastName')
      .populate('completedBy', 'username email firstName lastName')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })

    res.json(workOrders)
  } catch (error: any) {
    console.error('Error fetching work orders:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * GET /api/maintenance/work-orders/:id
 * 작업 지시 상세 조회
 */
router.get('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const workOrder = await MaintenanceWorkOrder.findById(req.params.id)
      .populate('equipment')
      .populate('schedule', 'scheduleNumber title')
      .populate('reportedBy', 'username email firstName lastName')
      .populate('assignedTo', 'username email firstName lastName')
      .populate('completedBy', 'username email firstName lastName')
      .populate('createdBy', 'username email')

    if (!workOrder) {
      return res.status(404).json({ message: '작업 지시를 찾을 수 없습니다' })
    }

    res.json(workOrder)
  } catch (error: any) {
    console.error('Error fetching work order:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * POST /api/maintenance/work-orders
 * 작업 지시 생성
 */
router.post('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const {
      equipment,
      schedule,
      workOrderType,
      title,
      description,
      reportedBy,
      reportedDate,
      priority,
      assignedTo,
      estimatedDuration,
      partsUsed,
      createdBy,
    } = req.body

    // 설비 존재 확인
    const equipmentDoc = await MaintenanceEquipment.findById(equipment)
    if (!equipmentDoc) {
      return res.status(404).json({ message: '설비를 찾을 수 없습니다' })
    }

    // 일정 존재 확인 (제공된 경우)
    if (schedule) {
      const scheduleDoc = await MaintenanceSchedule.findById(schedule)
      if (!scheduleDoc) {
        return res.status(404).json({ message: '정기 점검 일정을 찾을 수 없습니다' })
      }
    }

    // 작업 지시 번호 생성
    const count = await MaintenanceWorkOrder.countDocuments()
    const workOrderNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`

    const workOrder = new MaintenanceWorkOrder({
      workOrderNumber,
      equipment,
      schedule,
      workOrderType,
      title,
      description,
      reportedBy,
      reportedDate: reportedDate ? new Date(reportedDate) : new Date(),
      status: 'requested',
      priority: priority || 'medium',
      assignedTo,
      estimatedDuration,
      partsUsed: partsUsed || [],
      createdBy,
    })

    // 비용 계산
    if (partsUsed && partsUsed.length > 0) {
      workOrder.materialCost = partsUsed.reduce((sum: number, part: any) => sum + (part.totalCost || 0), 0)
    }
    workOrder.totalCost = (workOrder.laborCost || 0) + (workOrder.materialCost || 0)

    await workOrder.save()
    await workOrder.populate('equipment', 'equipmentCode equipmentName equipmentType location')
    await workOrder.populate('schedule', 'scheduleNumber title')
    await workOrder.populate('reportedBy', 'username email firstName lastName')
    await workOrder.populate('assignedTo', 'username email firstName lastName')
    await workOrder.populate('createdBy', 'username email')

    res.status(201).json(workOrder)
  } catch (error: any) {
    console.error('Error creating work order:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * PUT /api/maintenance/work-orders/:id
 * 작업 지시 수정
 */
router.put('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const workOrder = await MaintenanceWorkOrder.findById(req.params.id)

    if (!workOrder) {
      return res.status(404).json({ message: '작업 지시를 찾을 수 없습니다' })
    }

    Object.assign(workOrder, req.body)

    // 날짜 필드 변환
    if (req.body.reportedDate) workOrder.reportedDate = new Date(req.body.reportedDate)
    if (req.body.assignedDate) workOrder.assignedDate = new Date(req.body.assignedDate)
    if (req.body.startedDate) workOrder.startedDate = new Date(req.body.startedDate)
    if (req.body.completedDate) workOrder.completedDate = new Date(req.body.completedDate)

    // 비용 재계산
    if (req.body.partsUsed) {
      workOrder.materialCost = req.body.partsUsed.reduce((sum: number, part: any) => sum + (part.totalCost || 0), 0)
    }
    workOrder.totalCost = (workOrder.laborCost || 0) + (workOrder.materialCost || 0)

    await workOrder.save()
    await workOrder.populate('equipment', 'equipmentCode equipmentName equipmentType location')
    await workOrder.populate('schedule', 'scheduleNumber title')
    await workOrder.populate('reportedBy', 'username email firstName lastName')
    await workOrder.populate('assignedTo', 'username email firstName lastName')
    await workOrder.populate('completedBy', 'username email firstName lastName')
    await workOrder.populate('createdBy', 'username email')

    res.json(workOrder)
  } catch (error: any) {
    console.error('Error updating work order:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * DELETE /api/maintenance/work-orders/:id
 * 작업 지시 삭제
 */
router.delete('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const workOrder = await MaintenanceWorkOrder.findById(req.params.id)

    if (!workOrder) {
      return res.status(404).json({ message: '작업 지시를 찾을 수 없습니다' })
    }

    await MaintenanceWorkOrder.findByIdAndDelete(req.params.id)

    res.json({ message: '작업 지시가 삭제되었습니다' })
  } catch (error: any) {
    console.error('Error deleting work order:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * PUT /api/maintenance/work-orders/:id/assign
 * 작업 지시 할당
 */
router.put('/:id/assign', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { assignedTo } = req.body

    const workOrder = await MaintenanceWorkOrder.findById(req.params.id)

    if (!workOrder) {
      return res.status(404).json({ message: '작업 지시를 찾을 수 없습니다' })
    }

    workOrder.status = 'assigned'
    workOrder.assignedTo = assignedTo
    workOrder.assignedDate = new Date()

    await workOrder.save()
    await workOrder.populate('equipment', 'equipmentCode equipmentName equipmentType location')
    await workOrder.populate('assignedTo', 'username email firstName lastName')
    await workOrder.populate('createdBy', 'username email')

    res.json(workOrder)
  } catch (error: any) {
    console.error('Error assigning work order:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * PUT /api/maintenance/work-orders/:id/start
 * 작업 시작
 */
router.put('/:id/start', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const workOrder = await MaintenanceWorkOrder.findById(req.params.id)

    if (!workOrder) {
      return res.status(404).json({ message: '작업 지시를 찾을 수 없습니다' })
    }

    workOrder.status = 'in-progress'
    workOrder.startedDate = new Date()

    await workOrder.save()
    await workOrder.populate('equipment', 'equipmentCode equipmentName equipmentType location')
    await workOrder.populate('assignedTo', 'username email firstName lastName')
    await workOrder.populate('createdBy', 'username email')

    res.json(workOrder)
  } catch (error: any) {
    console.error('Error starting work order:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * PUT /api/maintenance/work-orders/:id/complete
 * 작업 완료
 */
router.put('/:id/complete', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { actualDuration, completedBy, workPerformed, rootCause, resolution, notes } = req.body

    const workOrder = await MaintenanceWorkOrder.findById(req.params.id)

    if (!workOrder) {
      return res.status(404).json({ message: '작업 지시를 찾을 수 없습니다' })
    }

    workOrder.status = 'completed'
    workOrder.completedDate = new Date()
    if (actualDuration) workOrder.actualDuration = actualDuration
    if (completedBy) workOrder.completedBy = completedBy
    if (workPerformed) workOrder.workPerformed = workPerformed
    if (rootCause) workOrder.rootCause = rootCause
    if (resolution) workOrder.resolution = resolution
    if (notes) workOrder.notes = notes

    await workOrder.save()
    await workOrder.populate('equipment', 'equipmentCode equipmentName equipmentType location')
    await workOrder.populate('schedule', 'scheduleNumber title')
    await workOrder.populate('reportedBy', 'username email firstName lastName')
    await workOrder.populate('assignedTo', 'username email firstName lastName')
    await workOrder.populate('completedBy', 'username email firstName lastName')
    await workOrder.populate('createdBy', 'username email')

    res.json(workOrder)
  } catch (error: any) {
    console.error('Error completing work order:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router

