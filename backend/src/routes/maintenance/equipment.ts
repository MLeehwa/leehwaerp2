import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import MaintenanceEquipment from '../../models/MaintenanceEquipment'

const router = express.Router()

// MongoDB 연결 확인 미들웨어
const checkDBConnection = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

/**
 * GET /api/maintenance/equipment
 * 설비 목록 조회
 */
router.get('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { status, category, subCategory, equipmentType, location, search, assetType, managedBy, company, maintenanceRequired } = req.query

    const query: any = {}
    if (status) query.status = status
    if (category) query.category = category
    if (subCategory) query.subCategory = subCategory
    if (equipmentType) query.equipmentType = equipmentType // 기존 호환성 유지
    if (assetType) query.assetType = assetType
    if (managedBy) query.managedBy = managedBy
    if (company) query.company = company
    if (maintenanceRequired !== undefined) query.maintenanceRequired = maintenanceRequired === 'true'
    if (location) query.location = { $regex: location, $options: 'i' }
    if (search) {
      query.$or = [
        { equipmentCode: { $regex: search, $options: 'i' } },
        { equipmentName: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
      ]
    }

    const equipment = await MaintenanceEquipment.find(query)
      .populate('createdBy', 'username email')
      .populate('company', 'code name')
      .sort({ createdAt: -1 })

    res.json(equipment)
  } catch (error: any) {
    console.error('Error fetching equipment:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * GET /api/maintenance/equipment/:id
 * 설비 상세 조회
 */
router.get('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const equipment = await MaintenanceEquipment.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('company', 'code name')

    if (!equipment) {
      return res.status(404).json({ message: '설비를 찾을 수 없습니다' })
    }

    res.json(equipment)
  } catch (error: any) {
    console.error('Error fetching equipment:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * POST /api/maintenance/equipment
 * 설비 생성
 */
router.post('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    console.log('=== POST /api/maintenance/equipment ===')
    console.log('Request body:', JSON.stringify(req.body, null, 2))
    
    const {
      equipmentCode,
      equipmentName,
      assetType,
      company,
      managedBy,
      category,
      subCategory,
      equipmentType, // 기존 호환성 유지
      manufacturer,
      model,
      equipmentModel, // 프론트엔드에서 equipmentModel로 보낼 수도 있음
      serialNumber,
      alias,
      location,
      installationDate,
      purchaseDate,
      purchaseCost,
      warrantyExpiryDate,
      status,
      description,
      specifications,
      maintenanceRequired,
      maintenanceInterval,
      maintenanceIntervalUnit,
      createdBy,
    } = req.body

    // 필수 필드 검증
    if (!equipmentName) {
      return res.status(400).json({ message: '설비명을 입력하세요' })
    }
    if (!category) {
      return res.status(400).json({ message: '대분류를 선택하세요' })
    }
    if (!subCategory) {
      return res.status(400).json({ message: '소분류를 선택하세요' })
    }

    // 설비 코드는 자동 생성 (제공된 경우에만 중복 확인)
    if (equipmentCode) {
      const existing = await MaintenanceEquipment.findOne({ equipmentCode })
      if (existing) {
        return res.status(400).json({ message: '이미 존재하는 설비 코드입니다' })
      }
    }

    // company가 빈 문자열이면 undefined로 변환
    let companyId = company
    if (companyId === '' || companyId === null) {
      companyId = undefined
    } else if (companyId && !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: '유효하지 않은 법인 ID입니다' })
    }

    const equipmentData: any = {
      equipmentName,
      assetType: assetType || 'equipment',
      company: companyId,
      managedBy: managedBy || 'hr',
      category,
      subCategory,
      equipmentType: equipmentType || subCategory, // 기존 호환성 유지
      manufacturer: manufacturer || undefined,
      equipmentModel: equipmentModel || model || undefined, // model 또는 equipmentModel 필드명 변환
      serialNumber: serialNumber || undefined,
      alias: alias || undefined,
      location: location || undefined,
      installationDate: installationDate ? new Date(installationDate) : undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      purchaseCost: purchaseCost || undefined,
      warrantyExpiryDate: warrantyExpiryDate ? new Date(warrantyExpiryDate) : undefined,
      status: status || 'active',
      description: description || undefined,
      specifications: specifications || undefined,
      maintenanceRequired: maintenanceRequired !== undefined ? maintenanceRequired : false,
      maintenanceInterval: maintenanceInterval || undefined,
      maintenanceIntervalUnit: (maintenanceIntervalUnit && ['days', 'weeks', 'months'].includes(maintenanceIntervalUnit)) 
        ? maintenanceIntervalUnit 
        : (maintenanceRequired ? 'months' : undefined),
      createdBy: createdBy || undefined,
    }

    // 유효하지 않은 필드 제거
    Object.keys(equipmentData).forEach(key => {
      if (equipmentData[key] === null || equipmentData[key] === '') {
        delete equipmentData[key]
      }
    })

    console.log('Processed equipmentData:', JSON.stringify(equipmentData, null, 2))

    // equipmentCode는 자동 생성되므로 포함하지 않음
    const equipment = new MaintenanceEquipment(equipmentData)
    
    console.log('Equipment instance created, attempting save...')

    await equipment.save()
    
    console.log('Equipment saved successfully:', equipment.equipmentCode)
    
    // populate는 선택적으로 처리 (에러가 발생해도 무시)
    try {
      if (equipment.createdBy) {
        await equipment.populate('createdBy', 'username email')
      }
      if (equipment.company) {
        await equipment.populate('company', 'code name')
      }
    } catch (populateError: any) {
      console.warn('Populate error (non-critical):', populateError.message)
    }

    res.status(201).json(equipment)
  } catch (error: any) {
    console.error('Error creating equipment:', error)
    console.error('Request body:', JSON.stringify(req.body, null, 2))
    console.error('Error stack:', error.stack)
    res.status(500).json({ 
      message: error.message || '자산 등록에 실패했습니다',
      error: error.name,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

/**
 * PUT /api/maintenance/equipment/:id
 * 설비 수정
 */
router.put('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const equipment = await MaintenanceEquipment.findById(req.params.id)

    if (!equipment) {
      return res.status(404).json({ message: '설비를 찾을 수 없습니다' })
    }

    // 설비 코드 중복 확인 (변경하는 경우)
    if (req.body.equipmentCode && req.body.equipmentCode !== equipment.equipmentCode) {
      const existing = await MaintenanceEquipment.findOne({ equipmentCode: req.body.equipmentCode })
      if (existing) {
        return res.status(400).json({ message: '이미 존재하는 설비 코드입니다' })
      }
    }

    // model 필드를 equipmentModel로 변환
    const updateData: any = { ...req.body }
    if (updateData.model !== undefined) {
      updateData.equipmentModel = updateData.model
      delete updateData.model
    }
    if (updateData.equipmentModel === undefined && updateData.model === undefined) {
      // 둘 다 없으면 그대로 유지
    }

    Object.assign(equipment, updateData)

    // 날짜 필드 변환
    if (req.body.installationDate) equipment.installationDate = new Date(req.body.installationDate)
    if (req.body.purchaseDate) equipment.purchaseDate = new Date(req.body.purchaseDate)
    if (req.body.warrantyExpiryDate) equipment.warrantyExpiryDate = new Date(req.body.warrantyExpiryDate)

    await equipment.save()
    await equipment.populate('createdBy', 'username email')
    await equipment.populate('company', 'code name')

    res.json(equipment)
  } catch (error: any) {
    console.error('Error updating equipment:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * DELETE /api/maintenance/equipment/:id
 * 설비 삭제
 */
router.delete('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const equipment = await MaintenanceEquipment.findById(req.params.id)

    if (!equipment) {
      return res.status(404).json({ message: '설비를 찾을 수 없습니다' })
    }

    await MaintenanceEquipment.findByIdAndDelete(req.params.id)

    res.json({ message: '설비가 삭제되었습니다' })
  } catch (error: any) {
    console.error('Error deleting equipment:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * PUT /api/maintenance/equipment/:id/update-maintenance-date
 * 마지막 점검일 및 다음 점검일 업데이트
 */
router.put('/:id/update-maintenance-date', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { lastMaintenanceDate, nextMaintenanceDate } = req.body

    const equipment = await MaintenanceEquipment.findById(req.params.id)

    if (!equipment) {
      return res.status(404).json({ message: '설비를 찾을 수 없습니다' })
    }

    if (lastMaintenanceDate) {
      equipment.lastMaintenanceDate = new Date(lastMaintenanceDate)
    }

    if (nextMaintenanceDate) {
      equipment.nextMaintenanceDate = new Date(nextMaintenanceDate)
    } else if (equipment.maintenanceInterval && equipment.lastMaintenanceDate) {
      // 자동 계산
      const intervalMs = equipment.maintenanceInterval * (equipment.maintenanceIntervalUnit === 'days' ? 86400000 : equipment.maintenanceIntervalUnit === 'weeks' ? 604800000 : 2592000000)
      equipment.nextMaintenanceDate = new Date(equipment.lastMaintenanceDate.getTime() + intervalMs)
    }

    await equipment.save()
    await equipment.populate('createdBy', 'username email')

    res.json(equipment)
  } catch (error: any) {
    console.error('Error updating maintenance date:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router

