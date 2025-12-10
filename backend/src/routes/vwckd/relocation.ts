import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import ContainerRelocation from '../../models/vwckd/ContainerRelocation'
import ARN from '../../models/vwckd/ARN'
import WMSInventory from '../../models/vwckd/WMSInventory'

const router = express.Router()

const checkDB = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

// GET /api/vwckd/relocation - 재배치 이력 조회
router.get('/', checkDB, async (req: Request, res: Response) => {
  try {
    const { containerNo, caseNumber, projectId } = req.query
    const query: any = {}
    
    if (containerNo) query.containerNo = new RegExp(containerNo as string, 'i')
    if (caseNumber) query.caseNumber = new RegExp(caseNumber as string, 'i')
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)
    
    const relocations = await ContainerRelocation.find(query)
      .populate('movedBy', 'firstName lastName')
      .sort({ movedAt: -1 })
      .limit(1000)
    
    res.json(relocations)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/relocation/containers/:containerNo/cases - 컨테이너별 케이스 조회 (In Stock만)
router.get('/containers/:containerNo/cases', checkDB, async (req: Request, res: Response) => {
  try {
    const { containerNo } = req.params
    const { projectId } = req.query
    
    const query: any = { containerNo }
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)
    
    // ARN에서 케이스 조회
    const arnCases = await ARN.find(query)
    
    // WMS Inventory에서 위치 정보 조회
    const caseNumbers = arnCases.map((a: any) => a.caseNumber)
    const inventoryItems = await WMSInventory.find({ 
      caseNumber: { $in: caseNumbers },
      status: 'active'
    })
    
    // 케이스에 위치 정보 추가
    const casesWithLocation = arnCases
      .filter((arn: any) => {
        const inventory = inventoryItems.find((inv: any) => inv.caseNumber === arn.caseNumber)
        return inventory // In Stock인 케이스만 반환
      })
      .map((arn: any) => {
        const inventory = inventoryItems.find((inv: any) => inv.caseNumber === arn.caseNumber)
        return {
          _id: arn._id,
          caseNumber: arn.caseNumber,
          containerNo: arn.containerNo,
          location: inventory ? `${inventory.locationLetter || ''}${inventory.locationNumber || ''}`.trim() : null,
          locationLetter: inventory?.locationLetter,
          locationNumber: inventory?.locationNumber,
          status: inventory?.status || 'In Stock',
        }
      })
    
    res.json(casesWithLocation)
  } catch (error: any) {
    console.error('컨테이너 케이스 조회 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

// POST /api/vwckd/relocation - 재배치 실행 (일괄)
router.post('/', checkDB, async (req: Request, res: Response) => {
  try {
    const { cases, toLocation } = req.body
    
    if (!cases || !Array.isArray(cases) || cases.length === 0) {
      return res.status(400).json({ message: '재배치할 케이스를 선택하세요' })
    }
    
    if (!toLocation) {
      return res.status(400).json({ message: '새 위치를 입력하세요' })
    }

    // 위치 파싱 (예: "A-1" -> letter: "A", number: 1)
    const locationMatch = toLocation.match(/^([A-Za-z]+)[-]?(\d+)$/)
    if (!locationMatch) {
      return res.status(400).json({ message: '위치 형식이 올바르지 않습니다 (예: A-1, B-2)' })
    }
    
    const locationLetter = locationMatch[1]
    const locationNumber = parseInt(locationMatch[2], 10)
    
    const relocations = []
    const errors = []
    
    for (const caseItem of cases) {
      try {
        const caseNumber = caseItem.caseNumber || caseItem.caseNo
        
        // 기존 위치 조회
        const oldInventory = await WMSInventory.findOne({ caseNumber, status: 'active' })
        if (!oldInventory) {
          errors.push(`케이스 ${caseNumber}를 찾을 수 없습니다`)
          continue
        }
        
        const fromLocation = `${oldInventory.locationLetter || ''}${oldInventory.locationNumber || ''}`.trim()
        
        // 재배치 이력 생성
        const relocation = await ContainerRelocation.create({
          containerNo: caseItem.containerNo,
          caseNumber,
          fromLocation,
          toLocation,
          movedBy: (req as any).user?._id,
          movedAt: new Date(),
          reason: 'Container relocation',
        })
        
        // WMS Inventory 위치 업데이트
        oldInventory.locationLetter = locationLetter
        oldInventory.locationNumber = locationNumber
        await oldInventory.save()
        
        relocations.push(relocation)
      } catch (error: any) {
        errors.push(`케이스 ${caseItem.caseNumber || caseItem.caseNo} 처리 실패: ${error.message}`)
      }
    }
    
    if (relocations.length === 0) {
      return res.status(400).json({ 
        message: '재배치된 케이스가 없습니다',
        errors 
      })
    }
    
    res.status(201).json({
      message: `${relocations.length}개의 케이스가 재배치되었습니다`,
      relocations,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('재배치 실행 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/relocation/export - 재배치 이력 Export
router.get('/export', checkDB, async (req: Request, res: Response) => {
  try {
    const { projectId, startDate, endDate } = req.query
    const query: any = {}
    
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)
    if (startDate || endDate) {
      query.movedAt = {}
      if (startDate) query.movedAt.$gte = startDate
      if (endDate) query.movedAt.$lte = endDate
    }

    const relocations = await ContainerRelocation.find(query)
      .populate('movedBy', 'firstName lastName')
      .sort({ movedAt: -1 })

    // CSV 형식으로 변환
    const csvHeaders = ['Container No', 'Case No', 'From Location', 'To Location', 'Moved By', 'Moved At', 'Reason']
    const csvRows = relocations.map((rel: any) => [
      rel.containerNo || '',
      rel.caseNumber || '',
      rel.fromLocation || '',
      rel.toLocation || '',
      rel.movedBy ? `${rel.movedBy.firstName} ${rel.movedBy.lastName}` : '',
      rel.movedAt ? new Date(rel.movedAt).toLocaleString() : '',
      rel.reason || '',
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => row.join(','))
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv;charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=relocation_export_${Date.now()}.csv`)
    res.send('\ufeff' + csvContent)
  } catch (error: any) {
    console.error('재배치 Export 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router

