import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import MaintenanceEquipmentType from '../../models/MaintenanceEquipmentType'

const router = express.Router()

// MongoDB 연결 확인 미들웨어
const checkDBConnection = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

/**
 * GET /api/maintenance/equipment-types
 * 장비 유형 목록 조회
 */
router.get('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { category, isActive } = req.query

    const query: any = {}
    if (category) query.category = category
    if (isActive !== undefined) query.isActive = isActive === 'true'

    const types = await MaintenanceEquipmentType.find(query)
      .sort({ category: 1, subCategory: 1 })

    res.json(types)
  } catch (error: any) {
    console.error('Error fetching equipment types:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * GET /api/maintenance/equipment-types/categories
 * 대분류 목록 조회
 */
router.get('/categories', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const categories = await MaintenanceEquipmentType.distinct('category', { isActive: true })
    res.json(categories)
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * GET /api/maintenance/equipment-types/subcategories
 * 소분류 목록 조회 (대분류별)
 */
router.get('/subcategories', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { category } = req.query

    const query: any = { isActive: true }
    if (category) query.category = category

    const subCategories = await MaintenanceEquipmentType.find(query)
      .select('subCategory category')
      .sort({ subCategory: 1 })

    res.json(subCategories)
  } catch (error: any) {
    console.error('Error fetching subcategories:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * POST /api/maintenance/equipment-types
 * 장비 유형 생성
 */
router.post('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { category, subCategory, description, isActive } = req.body

    // 중복 확인
    const existing = await MaintenanceEquipmentType.findOne({ category, subCategory })
    if (existing) {
      return res.status(400).json({ message: '이미 존재하는 장비 유형입니다' })
    }

    const equipmentType = new MaintenanceEquipmentType({
      category,
      subCategory,
      description,
      isActive: isActive !== undefined ? isActive : true,
    })

    await equipmentType.save()

    res.status(201).json(equipmentType)
  } catch (error: any) {
    console.error('Error creating equipment type:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * PUT /api/maintenance/equipment-types/:id
 * 장비 유형 수정
 */
router.put('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const equipmentType = await MaintenanceEquipmentType.findById(req.params.id)

    if (!equipmentType) {
      return res.status(404).json({ message: '장비 유형을 찾을 수 없습니다' })
    }

    // 대분류/소분류 변경 시 중복 확인
    if (req.body.category && req.body.subCategory) {
      const existing = await MaintenanceEquipmentType.findOne({
        category: req.body.category,
        subCategory: req.body.subCategory,
        _id: { $ne: req.params.id },
      })
      if (existing) {
        return res.status(400).json({ message: '이미 존재하는 장비 유형입니다' })
      }
    }

    Object.assign(equipmentType, req.body)
    await equipmentType.save()

    res.json(equipmentType)
  } catch (error: any) {
    console.error('Error updating equipment type:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * DELETE /api/maintenance/equipment-types/:id
 * 장비 유형 삭제
 */
router.delete('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const equipmentType = await MaintenanceEquipmentType.findById(req.params.id)

    if (!equipmentType) {
      return res.status(404).json({ message: '장비 유형을 찾을 수 없습니다' })
    }

    await MaintenanceEquipmentType.findByIdAndDelete(req.params.id)

    res.json({ message: '장비 유형이 삭제되었습니다' })
  } catch (error: any) {
    console.error('Error deleting equipment type:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router

