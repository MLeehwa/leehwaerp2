import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import PartMaster from '../../models/vwckd/PartMaster'
import RackMaster from '../../models/vwckd/RackMaster'
import WMSLocation from '../../models/vwckd/WMSLocation'

const router = express.Router()

const checkDB = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

// Part Master
router.get('/parts', checkDB, async (req: Request, res: Response) => {
  try {
    const { partNumber, isActive } = req.query
    const query: any = {}
    if (partNumber) query.partNumber = new RegExp(partNumber as string, 'i')
    if (isActive !== undefined) query.isActive = isActive === 'true'
    
    const parts = await PartMaster.find(query).sort({ partNumber: 1 })
    res.json(parts)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/parts', checkDB, async (req: Request, res: Response) => {
  try {
    const part = await PartMaster.create(req.body)
    res.status(201).json(part)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Rack Master
router.get('/racks', checkDB, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query
    const query: any = {}
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)
    
    const racks = await RackMaster.find(query).sort({ rackLocation: 1 })
    res.json(racks)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/racks', checkDB, async (req: Request, res: Response) => {
  try {
    const rack = await RackMaster.create(req.body)
    res.status(201).json(rack)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Locations
router.get('/locations', checkDB, async (req: Request, res: Response) => {
  try {
    const { projectId, status } = req.query
    const query: any = {}
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)
    if (status) query.status = status
    
    const locations = await WMSLocation.find(query).sort({ letter: 1, number: 1 })
    res.json(locations)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/locations', checkDB, async (req: Request, res: Response) => {
  try {
    const location = await WMSLocation.create(req.body)
    res.status(201).json(location)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/vwckd/master/parts/:id
router.put('/parts/:id', checkDB, async (req: Request, res: Response) => {
  try {
    const part = await PartMaster.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!part) return res.status(404).json({ message: 'Part not found' })
    res.json(part)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// DELETE /api/vwckd/master/parts/:id
router.delete('/parts/:id', checkDB, async (req: Request, res: Response) => {
  try {
    await PartMaster.findByIdAndDelete(req.params.id)
    res.json({ message: 'Part deleted' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/vwckd/master/racks/:id
router.put('/racks/:id', checkDB, async (req: Request, res: Response) => {
  try {
    const rack = await RackMaster.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!rack) return res.status(404).json({ message: 'Rack not found' })
    res.json(rack)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// DELETE /api/vwckd/master/racks/:id
router.delete('/racks/:id', checkDB, async (req: Request, res: Response) => {
  try {
    await RackMaster.findByIdAndDelete(req.params.id)
    res.json({ message: 'Rack deleted' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/vwckd/master/locations/:id
router.put('/locations/:id', checkDB, async (req: Request, res: Response) => {
  try {
    const location = await WMSLocation.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!location) return res.status(404).json({ message: 'Location not found' })
    res.json(location)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// DELETE /api/vwckd/master/locations/:id
router.delete('/locations/:id', checkDB, async (req: Request, res: Response) => {
  try {
    await WMSLocation.findByIdAndDelete(req.params.id)
    res.json({ message: 'Location deleted' })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router

