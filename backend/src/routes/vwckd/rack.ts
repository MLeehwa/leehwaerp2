import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import RackInventory from '../../models/vwckd/RackInventory'
import RackMaster from '../../models/vwckd/RackMaster'

const router = express.Router()

const checkDB = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

// GET /api/vwckd/rack/inventory - 랙 재고 조회
router.get('/inventory', checkDB, async (req: Request, res: Response) => {
  try {
    const { rackLocation, projectId } = req.query
    const query: any = {}
    
    if (rackLocation) query.rackLocation = new RegExp(rackLocation as string, 'i')
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)
    
    const inventory = await RackInventory.find(query)
      .populate('assignedBy', 'firstName lastName')
      .sort({ rackLocation: 1 })
    
    res.json(inventory)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/rack/master - 랙 마스터 조회
router.get('/master', checkDB, async (req: Request, res: Response) => {
  try {
    const { projectId, status } = req.query
    const query: any = {}
    
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)
    if (status) query.status = status
    
    const racks = await RackMaster.find(query).sort({ rackLocation: 1 })
    res.json(racks)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router

