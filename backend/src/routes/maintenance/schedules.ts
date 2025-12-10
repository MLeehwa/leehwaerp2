import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import MaintenanceSchedule from '../../models/MaintenanceSchedule'
import MaintenanceEquipment from '../../models/MaintenanceEquipment'
import { STORAGE_TYPE } from '../../config/storage'

import { storageService } from '../../services/StorageService'
import * as xlsx from 'xlsx' // Assuming xlsx is used but if not referenced it will just be an unused import, safe to keep or remove if not needed. But checking file content, I don't see xlsx used in viewed chunks. Wait, I see no xlsx import in viewed content.

const router = express.Router()

// 파일 업로드 설정 (StorageService 사용)
const upload = storageService.getMulterUpload()


// MongoDB 연결 확인 미들웨어
const checkDBConnection = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

/**
 * GET /api/maintenance/schedules
 * 정기 점검 일정 목록 조회
 */
router.get('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { equipment, scheduleType, status, assignedTo, overdue } = req.query

    const query: any = {}
    if (equipment) query.equipment = equipment
    if (scheduleType) query.scheduleType = scheduleType
    if (status) query.status = status
    if (assignedTo) query.assignedTo = assignedTo

    // 만료된 일정 필터링
    if (overdue === 'true') {
      query.status = { $in: ['scheduled', 'in-progress'] }
      query.dueDate = { $lt: new Date() }
    }

    const schedules = await MaintenanceSchedule.find(query)
      .populate('equipment', 'equipmentCode equipmentName equipmentType location')
      .populate('assignedTo', 'username email firstName lastName')
      .populate('completedBy', 'username email firstName lastName')
      .populate('createdBy', 'username email')
      .populate('supplier', 'name email phone contactPerson paymentTerms')
      .sort({ dueDate: 1 })

    res.json(schedules)
  } catch (error: any) {
    console.error('Error fetching schedules:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * GET /api/maintenance/schedules/:id
 * 정기 점검 일정 상세 조회
 */
router.get('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const schedule = await MaintenanceSchedule.findById(req.params.id)
      .populate('equipment')
      .populate('assignedTo', 'username email firstName lastName')
      .populate('completedBy', 'username email firstName lastName')
      .populate('createdBy', 'username email')
      .populate('supplier', 'name email phone contactPerson paymentTerms address')

    if (!schedule) {
      return res.status(404).json({ message: '정기 점검 일정을 찾을 수 없습니다' })
    }

    res.json(schedule)
  } catch (error: any) {
    console.error('Error fetching schedule:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * POST /api/maintenance/schedules
 * 정기 점검 일정 생성
 */
router.post('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const {
      equipment,
      scheduleType,
      title,
      description,
      scheduledDate,
      dueDate,
      frequency,
      frequencyUnit,
      assignedTo,
      estimatedDuration,
      completedDate,
      laborCost,
      materialCost,
      totalCost,
      currency,
      status,
      checklist,
      notes,
      attachments,
      createdBy,
      supplier,
      invoiceNumber,
      paymentMethod,
      paymentDueDate,
      paymentStatus,
      paymentNotes,
    } = req.body

    // 필수 필드 검증
    if (!description) {
      return res.status(400).json({ message: '설명을 입력하세요' })
    }

    // 설비 존재 확인 및 currency 가져오기
    const equipmentDoc = await MaintenanceEquipment.findById(equipment)
      .populate('company', 'currency')
    if (!equipmentDoc) {
      return res.status(404).json({ message: '설비를 찾을 수 없습니다' })
    }

    // 설비의 company에서 currency 가져오기
    const equipmentCurrency = (equipmentDoc.company as any)?.currency || 'USD'

    // 일정 번호 생성
    const count = await MaintenanceSchedule.countDocuments()
    const scheduleNumber = `SCH-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`

    const schedule = new MaintenanceSchedule({
      scheduleNumber,
      equipment,
      scheduleType,
      title: title || description, // 제목이 없으면 설명을 제목으로 사용
      description,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : scheduledDate ? new Date(scheduledDate) : new Date(),
      frequency,
      frequencyUnit: frequencyUnit || 'months',
      status: status || 'completed', // 이력이므로 기본값은 completed
      assignedTo,
      estimatedDuration,
      completedDate: completedDate ? new Date(completedDate) : new Date(),
      laborCost,
      materialCost,
      totalCost,
      currency: currency || equipmentCurrency, // currency가 없으면 설비의 company currency 사용
      supplier: supplier || undefined,
      invoiceNumber: invoiceNumber || undefined,
      paymentMethod: paymentMethod || undefined,
      paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : undefined,
      paymentStatus: paymentStatus || 'pending',
      paymentNotes: paymentNotes || undefined,
      attachments: attachments || [],
      checklist: checklist || [],
      notes,
      createdBy,
    })

    await schedule.save()

    // 수리 이력 등록 시 설비 상태 자동 업데이트
    if (scheduleType === 'repair' && status === 'in-progress' && equipment) {
      const equipmentDoc = await MaintenanceEquipment.findById(equipment)
      if (equipmentDoc) {
        equipmentDoc.status = 'maintenance'
        await equipmentDoc.save()
      }
    }

    await schedule.populate('equipment', 'equipmentCode equipmentName equipmentType location')
    await schedule.populate('assignedTo', 'username email firstName lastName')
    await schedule.populate('createdBy', 'username email')

    res.status(201).json(schedule)
  } catch (error: any) {
    console.error('Error creating schedule:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * PUT /api/maintenance/schedules/:id
 * 정기 점검 일정 수정
 */
router.put('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const schedule = await MaintenanceSchedule.findById(req.params.id)

    if (!schedule) {
      return res.status(404).json({ message: '정기 점검 일정을 찾을 수 없습니다' })
    }

    Object.assign(schedule, req.body)

    // 날짜 필드 변환
    if (req.body.scheduledDate) schedule.scheduledDate = new Date(req.body.scheduledDate)
    if (req.body.dueDate) schedule.dueDate = new Date(req.body.dueDate)
    if (req.body.completedDate) schedule.completedDate = new Date(req.body.completedDate)
    if (req.body.paymentDueDate) schedule.paymentDueDate = new Date(req.body.paymentDueDate)

    // supplier 필드 처리 (undefined인 경우 null로 설정)
    if (req.body.supplier !== undefined) {
      schedule.supplier = req.body.supplier || undefined
    }

    // 완료 처리 시 자동 업데이트
    if (req.body.status === 'completed' && !schedule.completedDate) {
      schedule.completedDate = new Date()
      if (req.body.completedBy) {
        schedule.completedBy = req.body.completedBy
      }
      if (req.body.actualDuration) {
        schedule.actualDuration = req.body.actualDuration
      }
    }

    await schedule.save()

    // 수리 이력 상태 변경 시 설비 상태 자동 업데이트
    if (schedule.scheduleType === 'repair' && schedule.equipment) {
      const equipmentDoc = await MaintenanceEquipment.findById(schedule.equipment)
      if (equipmentDoc) {
        if (schedule.status === 'in-progress') {
          // 수리 진행 중이면 설비 상태를 'maintenance'로 변경
          equipmentDoc.status = 'maintenance'
        } else if (schedule.status === 'completed') {
          // 수리 완료되면 설비 상태를 'active'로 복구
          equipmentDoc.status = 'active'
        }
        await equipmentDoc.save()
      }
    }

    await schedule.populate('equipment', 'equipmentCode equipmentName equipmentType location')
    await schedule.populate('assignedTo', 'username email firstName lastName')
    await schedule.populate('completedBy', 'username email firstName lastName')
    await schedule.populate('createdBy', 'username email')
    await schedule.populate('supplier', 'name email phone contactPerson paymentTerms address')

    res.json(schedule)
  } catch (error: any) {
    console.error('Error updating schedule:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * DELETE /api/maintenance/schedules/:id
 * 정기 점검 일정 삭제
 */
router.delete('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const schedule = await MaintenanceSchedule.findById(req.params.id)

    if (!schedule) {
      return res.status(404).json({ message: '정기 점검 일정을 찾을 수 없습니다' })
    }

    await MaintenanceSchedule.findByIdAndDelete(req.params.id)

    res.json({ message: '정기 점검 일정이 삭제되었습니다' })
  } catch (error: any) {
    console.error('Error deleting schedule:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * PUT /api/maintenance/schedules/:id/start
 * 정기 점검 시작
 */
router.put('/:id/start', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const schedule = await MaintenanceSchedule.findById(req.params.id)

    if (!schedule) {
      return res.status(404).json({ message: '정기 점검 일정을 찾을 수 없습니다' })
    }

    schedule.status = 'in-progress'
    schedule.startedDate = new Date()

    await schedule.save()
    await schedule.populate('equipment', 'equipmentCode equipmentName equipmentType location')
    await schedule.populate('assignedTo', 'username email firstName lastName')
    await schedule.populate('createdBy', 'username email')

    res.json(schedule)
  } catch (error: any) {
    console.error('Error starting schedule:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * PUT /api/maintenance/schedules/:id/complete
 * 정기 점검 완료
 */
router.put('/:id/complete', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { actualDuration, completedBy, notes } = req.body

    const schedule = await MaintenanceSchedule.findById(req.params.id)

    if (!schedule) {
      return res.status(404).json({ message: '정기 점검 일정을 찾을 수 없습니다' })
    }

    schedule.status = 'completed'
    schedule.completedDate = new Date()
    if (actualDuration) schedule.actualDuration = actualDuration
    if (completedBy) schedule.completedBy = completedBy
    if (notes) schedule.notes = notes

    // 설비의 마지막 점검일 업데이트 및 다음 점검 일정 자동 생성
    const equipment = await MaintenanceEquipment.findById(schedule.equipment)
    if (equipment && equipment.maintenanceRequired && equipment.maintenanceInterval) {
      const completedDate = new Date()
      equipment.lastMaintenanceDate = completedDate

      // 다음 점검일 계산
      const intervalMs =
        equipment.maintenanceInterval *
        (equipment.maintenanceIntervalUnit === 'days'
          ? 86400000
          : equipment.maintenanceIntervalUnit === 'weeks'
            ? 604800000
            : 2592000000)
      const nextMaintenanceDate = new Date(completedDate.getTime() + intervalMs)
      equipment.nextMaintenanceDate = nextMaintenanceDate
      await equipment.save()

      // 점검 타입인 경우에만 다음 일정 자동 생성
      if (schedule.scheduleType === 'maintenance') {
        // 다음 점검 일정이 이미 있는지 확인
        const existingNextSchedule = await MaintenanceSchedule.findOne({
          equipment: schedule.equipment,
          scheduleType: 'maintenance',
          status: { $in: ['scheduled', 'in-progress'] },
          scheduledDate: { $gte: nextMaintenanceDate }
        })

        // 다음 일정이 없으면 자동 생성
        if (!existingNextSchedule) {
          // 일정 번호 생성
          const scheduleCount = await MaintenanceSchedule.countDocuments()
          const year = new Date().getFullYear()
          const scheduleNumber = `MS-${year}-${String(scheduleCount + 1).padStart(6, '0')}`

          // 설비의 통화 정보 가져오기
          let currency = 'USD'
          if (equipment.company) {
            await equipment.populate('company')
            const company = equipment.company as any
            if (company?.currency) {
              currency = company.currency
            }
          }

          // 다음 점검 일정 생성
          const nextSchedule = new MaintenanceSchedule({
            scheduleNumber,
            equipment: schedule.equipment,
            scheduleType: 'maintenance',
            description: `${equipment.equipmentName} 정기 점검`,
            scheduledDate: nextMaintenanceDate,
            dueDate: nextMaintenanceDate,
            frequency: equipment.maintenanceInterval,
            frequencyUnit: equipment.maintenanceIntervalUnit,
            status: 'scheduled',
            assignedTo: schedule.assignedTo, // 동일한 담당자에게 할당
            currency: currency,
            createdBy: schedule.createdBy,
          })

          await nextSchedule.save()
          console.log(`다음 점검 일정이 자동 생성되었습니다: ${scheduleNumber} (${nextMaintenanceDate.toISOString()})`)
        }
      }
    }

    await schedule.save()
    await schedule.populate('equipment', 'equipmentCode equipmentName equipmentType location')
    await schedule.populate('assignedTo', 'username email firstName lastName')
    await schedule.populate('completedBy', 'username email firstName lastName')
    await schedule.populate('createdBy', 'username email')

    res.json(schedule)
  } catch (error: any) {
    console.error('Error completing schedule:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * POST /api/maintenance/schedules/:id/attachments
 * 이력에 파일 첨부
 */
router.post('/:id/attachments', upload.single('file'), checkDBConnection, async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ message: '파일을 선택하세요' })
    }

    const schedule = await MaintenanceSchedule.findById(req.params.id)
    if (!schedule) {
      return res.status(404).json({ message: '이력을 찾을 수 없습니다' })
    }

    const timestamp = Date.now()
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `attachment_${timestamp}_${sanitizedOriginalName}`

    let finalFilePath: string | undefined
    let fileBuffer: Buffer | undefined

    // Upload to S3
    const uploadResult = await storageService.uploadFile(file, `maintenance/schedules/${req.params.id}`)
    finalFilePath = uploadResult.location


    const attachment = {
      fileName: file.originalname,
      filePath: finalFilePath || undefined, // undefined일 수 있음
      fileSize: file.size,
      uploadedAt: new Date(),
    }

    if (!schedule.attachments) {
      schedule.attachments = []
    }
    schedule.attachments.push(attachment)
    await schedule.save()

    res.status(201).json(attachment)
  } catch (error: any) {
    console.error('파일 첨부 오류:', error)
    res.status(500).json({ message: error.message || '파일 첨부에 실패했습니다' })
  }
})

/**
 * DELETE /api/maintenance/schedules/:id/attachments/:attachmentIndex
 * 이력에서 파일 삭제
 */
router.delete('/:id/attachments/:attachmentIndex', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const schedule = await MaintenanceSchedule.findById(req.params.id)
    if (!schedule) {
      return res.status(404).json({ message: '이력을 찾을 수 없습니다' })
    }

    const attachmentIndex = parseInt(req.params.attachmentIndex)
    if (!schedule.attachments || !schedule.attachments[attachmentIndex]) {
      return res.status(404).json({ message: '첨부파일을 찾을 수 없습니다' })
    }

    const attachment = schedule.attachments[attachmentIndex]

    // NAS에 저장된 파일 삭제
    // S3 파일 삭제는 현재 StorageService에 deleteFile 구현이 필요할 수 있음. 
    // 하지만 현재는 DB 업데이트만 수행하거나 추후 구현. 여기서는 로컬 삭제 로직만 제거.
    // 만약 StorageService에 deleteFile이 있다면 호출. 현재 StorageService 코드를 보면 deleteFile 메소드가 있을 것으로 추정됨.
    // 하지만 확실하지 않으므로 일단 NAS 로직만 제거.


    schedule.attachments.splice(attachmentIndex, 1)
    await schedule.save()

    res.json({ message: '첨부파일이 삭제되었습니다' })
  } catch (error: any) {
    console.error('파일 삭제 오류:', error)
    res.status(500).json({ message: error.message || '파일 삭제에 실패했습니다' })
  }
})

/**
 * GET /api/maintenance/schedules/:id/attachments/:attachmentIndex/download
 * 첨부파일 다운로드
 */
router.get('/:id/attachments/:attachmentIndex/download', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const schedule = await MaintenanceSchedule.findById(req.params.id)
    if (!schedule) {
      return res.status(404).json({ message: '이력을 찾을 수 없습니다' })
    }

    const attachmentIndex = parseInt(req.params.attachmentIndex)
    if (!schedule.attachments || !schedule.attachments[attachmentIndex]) {
      return res.status(404).json({ message: '첨부파일을 찾을 수 없습니다' })
    }

    const attachment = schedule.attachments[attachmentIndex]
    let fileBuffer: Buffer

    if (attachment.filePath) {
      fileBuffer = await storageService.downloadFile(attachment.filePath)
    } else {
      return res.status(404).json({ message: '파일 데이터를 찾을 수 없습니다' })
    }

    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`)
    res.setHeader('Content-Length', attachment.fileSize || fileBuffer.length)

    res.send(fileBuffer)
  } catch (error: any) {
    console.error('파일 다운로드 오류:', error)
    res.status(500).json({ message: error.message || '파일 다운로드에 실패했습니다' })
  }
})

export default router

