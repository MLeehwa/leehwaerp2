import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import path from 'path'
import ShippingOrder from '../../models/vwckd/ShippingOrder'
import ShippingOrderCase from '../../models/vwckd/ShippingOrderCase'
import { STORAGE_TYPE } from '../../config/storage'
import { storageService } from '../../services/StorageService'

const router = express.Router()

// Multer 설정 (StorageService 사용 - MemoryStorage)
const upload = storageService.getMulterUpload()

const checkDB = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

// GET /api/vwckd/shipping/orders - 출고 주문 목록
router.get('/orders', checkDB, async (req: Request, res: Response) => {
  try {
    const { status, projectId } = req.query
    const query: any = {}
    if (status) query.status = status
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)

    const orders = await ShippingOrder.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })

    res.json(orders)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/shipping/orders/:id - 출고 주문 상세
router.get('/orders/:id', checkDB, async (req: Request, res: Response) => {
  try {
    const order = await ShippingOrder.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')

    if (!order) {
      return res.status(404).json({ message: '출고 주문을 찾을 수 없습니다' })
    }

    const cases = await ShippingOrderCase.find({ shippingOrder: order._id })
      .populate('pickedBy', 'firstName lastName')

    res.json({ ...order.toObject(), cases })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/shipping/orders/:id/cases - 주문 케이스 목록
router.get('/orders/:id/cases', checkDB, async (req: Request, res: Response) => {
  try {
    const cases = await ShippingOrderCase.find({ shippingOrder: req.params.id })
      .populate('pickedBy', 'firstName lastName')
      .sort({ caseNumber: 1 })

    res.json(cases)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/vwckd/shipping/orders/:id/cases/:caseId/pick - 케이스 픽킹
router.put('/orders/:id/cases/:caseId/pick', checkDB, async (req: Request, res: Response) => {
  try {
    const orderCase = await ShippingOrderCase.findById(req.params.caseId)
    if (!orderCase) {
      return res.status(404).json({ message: '케이스를 찾을 수 없습니다' })
    }

    if (orderCase.shippingOrder.toString() !== req.params.id) {
      return res.status(400).json({ message: '주문과 케이스가 일치하지 않습니다' })
    }

    orderCase.status = 'picked'
    orderCase.pickedBy = (req as any).user?._id
    orderCase.pickedAt = new Date()
    await orderCase.save()

    res.json(orderCase)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/vwckd/shipping/orders/:id/complete - 주문 완료
router.put('/orders/:id/complete', checkDB, async (req: Request, res: Response) => {
  try {
    const order = await ShippingOrder.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다' })
    }

    // 모든 케이스가 픽킹되었는지 확인
    const cases = await ShippingOrderCase.find({ shippingOrder: order._id })
    const unpickedCases = cases.filter((c: any) => c.status !== 'picked' && c.status !== 'packed' && c.status !== 'shipped')

    if (unpickedCases.length > 0) {
      return res.status(400).json({
        message: `아직 픽킹되지 않은 케이스가 ${unpickedCases.length}개 있습니다`
      })
    }

    order.status = 'completed'
    await order.save()

    res.json(order)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/vwckd/shipping/orders - 출고 주문 생성
router.post('/orders', checkDB, async (req: Request, res: Response) => {
  try {
    const order = await ShippingOrder.create({
      ...req.body,
      createdBy: (req as any).user?._id,
    })
    res.status(201).json(order)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/vwckd/shipping/orders/:id/cases - 출고 주문에 케이스 추가
router.post('/orders/:id/cases', checkDB, async (req: Request, res: Response) => {
  try {
    const orderCase = await ShippingOrderCase.create({
      ...req.body,
      shippingOrder: req.params.id,
    })
    res.status(201).json(orderCase)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/shipping/orders/:id/cases - 출고 주문의 케이스 목록 (위치 정보 포함)
router.get('/orders/:id/cases', checkDB, async (req: Request, res: Response) => {
  try {
    const WMSInventory = (await import('../../models/vwckd/WMSInventory')).default

    const cases = await ShippingOrderCase.find({ shippingOrder: req.params.id })
      .populate('pickedBy', 'firstName lastName')
      .sort({ caseNumber: 1 })

    // 각 케이스의 위치 정보 조회
    const casesWithLocation = await Promise.all(
      cases.map(async (orderCase) => {
        const inventory = await WMSInventory.findOne({
          caseNumber: orderCase.caseNumber
        })

        return {
          ...orderCase.toObject(),
          location: inventory
            ? `${inventory.locationLetter || ''}${inventory.locationNumber || ''}`.trim()
            : null,
        }
      })
    )

    res.json(casesWithLocation)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/vwckd/shipping/orders/:id/cases/:caseId/pick - 케이스 픽킹
router.put('/orders/:id/cases/:caseId/pick', checkDB, async (req: Request, res: Response) => {
  try {
    const WMSInventory = (await import('../../models/vwckd/WMSInventory')).default

    const orderCase = await ShippingOrderCase.findById(req.params.caseId)
    if (!orderCase) {
      return res.status(404).json({ message: '케이스를 찾을 수 없습니다' })
    }

    if (orderCase.shippingOrder.toString() !== req.params.id) {
      return res.status(400).json({ message: '주문과 케이스가 일치하지 않습니다' })
    }

    // 케이스 상태 업데이트
    orderCase.status = 'picked'
    orderCase.pickedBy = (req as any).user?._id
    orderCase.pickedAt = new Date()
    await orderCase.save()

    // 재고 상태 업데이트
    await WMSInventory.updateOne(
      { caseNumber: orderCase.caseNumber },
      { status: 'picked' }
    )

    // 주문 상태 확인 및 업데이트
    const allCases = await ShippingOrderCase.find({ shippingOrder: req.params.id })
    const allPicked = allCases.every((c: any) => c.status !== 'pending')

    if (allPicked) {
      await ShippingOrder.findByIdAndUpdate(req.params.id, { status: 'preparing' })
    }

    res.json(orderCase)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/vwckd/shipping/orders/:id/complete - 주문 완료
router.put('/orders/:id/complete', checkDB, async (req: Request, res: Response) => {
  try {
    const WMSInventory = (await import('../../models/vwckd/WMSInventory')).default

    const order = await ShippingOrder.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다' })
    }

    const cases = await ShippingOrderCase.find({ shippingOrder: req.params.id })
    const allPicked = cases.every((c: any) => c.status === 'picked' || c.status === 'packed' || c.status === 'shipped')

    if (!allPicked) {
      return res.status(400).json({ message: '모든 케이스가 픽킹되지 않았습니다' })
    }

    // 주문 상태 업데이트
    order.status = 'completed'
    await order.save()

    // 모든 케이스 상태를 shipped로 업데이트
    await ShippingOrderCase.updateMany(
      { shippingOrder: req.params.id },
      { status: 'shipped' }
    )

    // 재고 상태 업데이트
    const caseNumbers = cases.map((c: any) => c.caseNumber)
    await WMSInventory.updateMany(
      { caseNumber: { $in: caseNumbers } },
      { status: 'shipped' }
    )

    res.json(order)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/vwckd/shipping/upload - CSV 파일 업로드
router.post('/upload', checkDB, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ message: '파일을 선택하세요' })
    }

    const { projectId, vehicleNumber } = req.body
    if (!projectId) {
      return res.status(400).json({ message: '프로젝트 ID가 필요합니다' })
    }
    if (!vehicleNumber) {
      return res.status(400).json({ message: '차량 번호가 필요합니다' })
    }

    // CSV 파일 읽기
    let csvContent: string
    // storageService uses MemoryStorage, so buffer is always available
    if (file.buffer) {
      csvContent = file.buffer.toString('utf-8')
    } else {
      throw new Error('File buffer is missing')
    }

    // CSV 파싱
    const lines = csvContent.split('\n').filter((line: string) => line.trim() !== '')
    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV 파일에 헤더와 데이터가 필요합니다' })
    }

    const headers = lines[0].split(',').map((h: string) => h.trim())
    const requiredHeaders = ['Date', 'Case No']
    const missingHeaders = requiredHeaders.filter((h: string) => !headers.includes(h))

    if (missingHeaders.length > 0) {
      return res.status(400).json({
        message: `필수 헤더가 없습니다: ${missingHeaders.join(', ')}`
      })
    }

    // 출고 주문 생성
    const orderDate = new Date()
    const orderNumber = `SO-${Date.now()}`
    const shippingOrder = await ShippingOrder.create({
      orderNumber,
      customerName: vehicleNumber, // 차량 번호를 고객명으로 사용
      shippingDate: orderDate,
      status: 'pending',
      projectId: new mongoose.Types.ObjectId(projectId),
      createdBy: (req as any).user?._id,
    })

    const records: any[] = []
    const invalidRecords: string[] = []

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
      if (!record['Case No']) {
        invalidRecords.push(`Line ${i + 1}: Case No 누락`)
        continue
      }

      // 날짜 정규화
      let orderDateValue = orderDate
      if (record.Date) {
        try {
          const parsedDate = new Date(record.Date)
          if (!isNaN(parsedDate.getTime())) {
            orderDateValue = parsedDate
          }
        } catch (e) {
          // 기본값 사용
        }
      }

      records.push({
        shippingOrder: shippingOrder._id,
        caseNumber: record['Case No'],
        quantity: parseInt(record.Quantity) || 1,
        status: 'pending',
      })
    }

    if (records.length === 0) {
      await ShippingOrder.findByIdAndDelete(shippingOrder._id)
      return res.status(400).json({
        message: '유효한 레코드가 없습니다',
        errors: invalidRecords.slice(0, 10)
      })
    }

    // 케이스 일괄 삽입
    const inserted = await ShippingOrderCase.insertMany(records)

    // 원본 CSV 파일 저장 (Storage Service)
    // 원본 CSV 파일 저장 (Storage Service)
    try {
      await storageService.uploadFile(file, `projects/${projectId}/shipping`)
    } catch (e) {
      console.warn('Failed to save shipping CSV to storage:', e)
    }

    res.status(201).json({
      message: `${records.length}개의 케이스가 성공적으로 업로드되었습니다`,
      order: shippingOrder,
      inserted: inserted.length,
      errors: invalidRecords.length > 0 ? invalidRecords.slice(0, 10) : undefined,
    })
  } catch (error: any) {
    console.error('Shipping CSV 업로드 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/shipping/orders/:id/cases - 주문별 케이스 목록 조회 (위치 정보 포함)
router.get('/orders/:id/cases', checkDB, async (req: Request, res: Response) => {
  try {
    const order = await ShippingOrder.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: '출고 주문을 찾을 수 없습니다' })
    }

    const cases = await ShippingOrderCase.find({ shippingOrder: order._id })

    // 케이스별 위치 정보 조회 (WMS Inventory에서)
    const WMSInventory = (await import('../../models/vwckd/WMSInventory')).default
    const caseNumbers = cases.map((c: any) => c.caseNumber)
    const inventoryItems = await WMSInventory.find({
      caseNumber: { $in: caseNumbers }
    })

    // 케이스에 위치 정보 추가
    const casesWithLocation = cases.map((orderCase: any) => {
      const inventory = inventoryItems.find((inv: any) => inv.caseNumber === orderCase.caseNumber)
      return {
        ...orderCase.toObject(),
        location: inventory ? `${inventory.locationLetter || ''}${inventory.locationNumber || ''}`.trim() : null,
        locationLetter: inventory?.locationLetter,
        locationNumber: inventory?.locationNumber,
      }
    })

    res.json(casesWithLocation)
  } catch (error: any) {
    console.error('주문 케이스 조회 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/vwckd/shipping/orders/:id/cases/:caseId/pick - 케이스 픽킹 처리
router.put('/orders/:id/cases/:caseId/pick', checkDB, async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params
    const orderCase = await ShippingOrderCase.findById(caseId)

    if (!orderCase) {
      return res.status(404).json({ message: '케이스를 찾을 수 없습니다' })
    }

    orderCase.status = 'picked'
    orderCase.pickedBy = (req as any).user?._id
    orderCase.pickedAt = new Date()
    await orderCase.save()

    res.json(orderCase)
  } catch (error: any) {
    console.error('케이스 픽킹 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/vwckd/shipping/orders/:id/complete - 주문 완료 처리
router.put('/orders/:id/complete', checkDB, async (req: Request, res: Response) => {
  try {
    const order = await ShippingOrder.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ message: '출고 주문을 찾을 수 없습니다' })
    }

    // 모든 케이스가 픽킹되었는지 확인
    const cases = await ShippingOrderCase.find({ shippingOrder: order._id })
    const allPicked = cases.every((c: any) => c.status === 'picked' || c.status === 'shipped')

    if (!allPicked) {
      return res.status(400).json({ message: '모든 케이스가 픽킹되지 않았습니다' })
    }

    order.status = 'completed'
    await order.save()

    // 모든 케이스 상태를 shipped로 변경
    await ShippingOrderCase.updateMany(
      { shippingOrder: order._id },
      { status: 'shipped' }
    )

    res.json(order)
  } catch (error: any) {
    console.error('주문 완료 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/shipping/export - Shipping 데이터 Export
router.get('/export', checkDB, async (req: Request, res: Response) => {
  try {
    const { projectId, status, startDate, endDate } = req.query
    const query: any = {}

    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)
    if (status) query.status = status
    if (startDate || endDate) {
      query.shippingDate = {}
      if (startDate) query.shippingDate.$gte = startDate
      if (endDate) query.shippingDate.$lte = endDate
    }

    const orders = await ShippingOrder.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ shippingDate: -1 })

    const allCases = await ShippingOrderCase.find({
      shippingOrder: { $in: orders.map((o: any) => o._id) }
    }).populate('pickedBy', 'firstName lastName')

    // CSV 형식으로 변환
    const csvHeaders = ['Order Number', 'Customer Name', 'Shipping Date', 'Case No', 'Quantity', 'Status', 'Picked By']
    const csvRows: any[] = []

    orders.forEach((order: any) => {
      const orderCases = allCases.filter((c: any) => c.shippingOrder.toString() === order._id.toString())
      if (orderCases.length === 0) {
        csvRows.push([
          order.orderNumber || '',
          order.customerName || '',
          order.shippingDate || '',
          '',
          '',
          order.status || '',
          '',
        ])
      } else {
        orderCases.forEach((orderCase: any) => {
          csvRows.push([
            order.orderNumber || '',
            order.customerName || '',
            order.shippingDate || '',
            orderCase.caseNumber || '',
            orderCase.quantity || '',
            orderCase.status || '',
            orderCase.pickedBy ? `${orderCase.pickedBy.firstName} ${orderCase.pickedBy.lastName}` : '',
          ])
        })
      }
    })

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => row.join(','))
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv;charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=shipping_export_${Date.now()}.csv`)
    res.send('\ufeff' + csvContent) // BOM 추가 (Excel 호환성)
  } catch (error: any) {
    console.error('Shipping Export 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router

