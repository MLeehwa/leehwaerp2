import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import WMSInventory from '../../models/vwckd/WMSInventory'

const router = express.Router()

const checkDB = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

// GET /api/vwckd/inventory - 재고 목록 조회
router.get('/', checkDB, async (req: Request, res: Response) => {
  try {
    const { caseNumber, containerNo, location, projectId, status } = req.query
    const query: any = {}
    
    if (caseNumber) query.caseNumber = new RegExp(caseNumber as string, 'i')
    if (containerNo) query.containerNo = new RegExp(containerNo as string, 'i')
    if (location) {
      const [letter, number] = (location as string).split('-')
      if (letter) query.locationLetter = letter
      if (number) query.locationNumber = parseInt(number)
    }
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)
    if (status) query.status = status
    
    const inventory = await WMSInventory.find(query)
      .populate('scannedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(1000)
    
    res.json(inventory)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/vwckd/inventory - 재고 생성
router.post('/', checkDB, async (req: Request, res: Response) => {
  try {
    const inventory = await WMSInventory.create({
      ...req.body,
      scannedBy: (req as any).user?._id,
      scannedAt: new Date(),
    })
    res.status(201).json(inventory)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/inventory/export - 재고 데이터 Export
router.get('/export', checkDB, async (req: Request, res: Response) => {
  try {
    const { caseNumber, containerNo, location, projectId, status } = req.query
    const query: any = {}
    
    if (caseNumber) query.caseNumber = new RegExp(caseNumber as string, 'i')
    if (containerNo) query.containerNo = new RegExp(containerNo as string, 'i')
    if (location) {
      const [letter, number] = (location as string).split('-')
      if (letter) query.locationLetter = letter
      if (number) query.locationNumber = parseInt(number)
    }
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)
    if (status) query.status = status

    const inventory = await WMSInventory.find(query)
      .populate('scannedBy', 'firstName lastName')
      .sort({ createdAt: -1 })

    // CSV 형식으로 변환
    const csvHeaders = ['Case No', 'Container No', 'Location', 'Quantity', 'Status', 'Scanned By', 'Scanned At']
    const csvRows = inventory.map((inv: any) => [
      inv.caseNumber || '',
      inv.containerNo || '',
      `${inv.locationLetter || ''}${inv.locationNumber || ''}`.trim() || '',
      inv.quantity || '',
      inv.status || '',
      inv.scannedBy ? `${inv.scannedBy.firstName} ${inv.scannedBy.lastName}` : '',
      inv.scannedAt ? new Date(inv.scannedAt).toLocaleString() : '',
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => row.join(','))
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv;charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=inventory_export_${Date.now()}.csv`)
    res.send('\ufeff' + csvContent)
  } catch (error: any) {
    console.error('재고 Export 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router

