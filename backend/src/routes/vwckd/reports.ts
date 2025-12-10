import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import ARN from '../../models/vwckd/ARN'
import ShippingOrder from '../../models/vwckd/ShippingOrder'
import ShippingOrderCase from '../../models/vwckd/ShippingOrderCase'
import ContainerRelocation from '../../models/vwckd/ContainerRelocation'

const router = express.Router()

const checkDB = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

// GET /api/vwckd/reports/daily-activity - 일별 활동 리포트
router.get('/daily-activity', checkDB, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, projectId } = req.query
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: '시작일과 종료일이 필요합니다' })
    }

    const query: any = {}
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)

    // ARN 데이터 (입고)
    const arnQuery = { ...query, uploadDate: { $gte: startDate, $lte: endDate } }
    const receivedData = await ARN.find(arnQuery)

    // Shipping Order Case 데이터 (픽킹/출고)
    const shippingOrders = await ShippingOrder.find({
      ...query,
      shippingDate: { $gte: startDate, $lte: endDate }
    })
    const orderIds = shippingOrders.map((o: any) => o._id)
    const pickedData = await ShippingOrderCase.find({
      shippingOrder: { $in: orderIds },
      status: { $in: ['picked', 'packed', 'shipped'] }
    })

    // 일별 통계 계산
    const dailyStats: any = {}
    
    // 입고 통계
    receivedData.forEach((arn: any) => {
      const date = arn.uploadDate ? new Date(arn.uploadDate).toISOString().split('T')[0] : null
      if (!date) return
      
      if (!dailyStats[date]) {
        dailyStats[date] = { date, received: 0, picked: 0, shipped: 0, total: 0 }
      }
      dailyStats[date].received++
      dailyStats[date].total++
    })

    // 픽킹 통계
    pickedData.forEach((orderCase: any) => {
      const order = shippingOrders.find((o: any) => o._id.toString() === orderCase.shippingOrder.toString())
      if (!order || !order.shippingDate) return
      
      const date = new Date(order.shippingDate).toISOString().split('T')[0]
      if (!dailyStats[date]) {
        dailyStats[date] = { date, received: 0, picked: 0, shipped: 0, total: 0 }
      }
      
      if (orderCase.status === 'picked' || orderCase.status === 'packed') {
        dailyStats[date].picked++
      }
      if (orderCase.status === 'shipped') {
        dailyStats[date].shipped++
      }
      dailyStats[date].total++
    })

    const result = Object.values(dailyStats).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    res.json({
      summary: {
        totalReceived: result.reduce((sum: number, stat: any) => sum + stat.received, 0),
        totalPicked: result.reduce((sum: number, stat: any) => sum + stat.picked, 0),
        totalShipped: result.reduce((sum: number, stat: any) => sum + stat.shipped, 0),
        totalActions: result.reduce((sum: number, stat: any) => sum + stat.total, 0),
      },
      dailyStats: result,
    })
  } catch (error: any) {
    console.error('일별 활동 리포트 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/reports/vehicle-shipping - 차량별 출고 리포트
router.get('/vehicle-shipping', checkDB, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, projectId } = req.query
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: '시작일과 종료일이 필요합니다' })
    }

    const query: any = {
      shippingDate: { $gte: startDate, $lte: endDate }
    }
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)

    const orders = await ShippingOrder.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ shippingDate: -1 })

    const orderIds = orders.map((o: any) => o._id)
    const allCases = await ShippingOrderCase.find({
      shippingOrder: { $in: orderIds }
    })

    // 차량별 통계
    const vehicleStats: any = {}
    orders.forEach((order: any) => {
      const vehicle = order.customerName || 'Unknown'
      if (!vehicleStats[vehicle]) {
        vehicleStats[vehicle] = {
          vehicleNumber: vehicle,
          orderCount: 0,
          caseCount: 0,
          orders: [],
        }
      }
      vehicleStats[vehicle].orderCount++
      const vehicleCases = allCases.filter((c: any) => 
        c.shippingOrder.toString() === order._id.toString()
      )
      vehicleStats[vehicle].caseCount += vehicleCases.length
      vehicleStats[vehicle].orders.push({
        orderNumber: order.orderNumber,
        shippingDate: order.shippingDate,
        status: order.status,
        caseCount: vehicleCases.length,
      })
    })

    res.json({
      summary: {
        totalVehicles: Object.keys(vehicleStats).length,
        totalOrders: orders.length,
        totalCases: allCases.length,
      },
      vehicleStats: Object.values(vehicleStats),
    })
  } catch (error: any) {
    console.error('차량별 출고 리포트 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

// GET /api/vwckd/reports/export - 리포트 Export
router.get('/export', checkDB, async (req: Request, res: Response) => {
  try {
    const { reportType, startDate, endDate, projectId } = req.query
    
    if (!reportType || !startDate || !endDate) {
      return res.status(400).json({ message: '리포트 유형, 시작일, 종료일이 필요합니다' })
    }

    let csvContent = ''
    let filename = ''

    if (reportType === 'daily-activity') {
      // 직접 데이터 조회
      const query: any = {}
      if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)

      const arnQuery = { ...query, uploadDate: { $gte: startDate, $lte: endDate } }
      const receivedData = await ARN.find(arnQuery)

      const shippingOrders = await ShippingOrder.find({
        ...query,
        shippingDate: { $gte: startDate, $lte: endDate }
      })
      const orderIds = shippingOrders.map((o: any) => o._id)
      const pickedData = await ShippingOrderCase.find({
        shippingOrder: { $in: orderIds },
        status: { $in: ['picked', 'packed', 'shipped'] }
      })

      const dailyStats: any = {}
      receivedData.forEach((arn: any) => {
        const date = arn.uploadDate ? new Date(arn.uploadDate).toISOString().split('T')[0] : null
        if (!date) return
        if (!dailyStats[date]) {
          dailyStats[date] = { date, received: 0, picked: 0, shipped: 0, total: 0 }
        }
        dailyStats[date].received++
        dailyStats[date].total++
      })

      pickedData.forEach((orderCase: any) => {
        const order = shippingOrders.find((o: any) => o._id.toString() === orderCase.shippingOrder.toString())
        if (!order || !order.shippingDate) return
        const date = new Date(order.shippingDate).toISOString().split('T')[0]
        if (!dailyStats[date]) {
          dailyStats[date] = { date, received: 0, picked: 0, shipped: 0, total: 0 }
        }
        if (orderCase.status === 'picked' || orderCase.status === 'packed') {
          dailyStats[date].picked++
        }
        if (orderCase.status === 'shipped') {
          dailyStats[date].shipped++
        }
        dailyStats[date].total++
      })

      const result = Object.values(dailyStats).sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      const headers = ['Date', 'Received', 'Picked', 'Shipped', 'Total']
      const rows = result.map((stat: any) => [
        stat.date,
        stat.received,
        stat.picked,
        stat.shipped,
        stat.total,
      ])
      
      csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) => row.join(','))
      ].join('\n')
      
      filename = `daily_activity_${startDate}_to_${endDate}.csv`
    } else if (reportType === 'vehicle-shipping') {
      // 직접 데이터 조회
      const query: any = {
        shippingDate: { $gte: startDate, $lte: endDate }
      }
      if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId as string)

      const orders = await ShippingOrder.find(query).sort({ shippingDate: -1 })
      const orderIds = orders.map((o: any) => o._id)
      const allCases = await ShippingOrderCase.find({
        shippingOrder: { $in: orderIds }
      })

      const vehicleStats: any = {}
      orders.forEach((order: any) => {
        const vehicle = order.customerName || 'Unknown'
        if (!vehicleStats[vehicle]) {
          vehicleStats[vehicle] = {
            vehicleNumber: vehicle,
            orderCount: 0,
            caseCount: 0,
          }
        }
        vehicleStats[vehicle].orderCount++
        const vehicleCases = allCases.filter((c: any) => 
          c.shippingOrder.toString() === order._id.toString()
        )
        vehicleStats[vehicle].caseCount += vehicleCases.length
      })

      const headers = ['Vehicle Number', 'Order Count', 'Case Count']
      const rows = Object.values(vehicleStats).map((stat: any) => [
        stat.vehicleNumber,
        stat.orderCount,
        stat.caseCount,
      ])
      
      csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) => row.join(','))
      ].join('\n')
      
      filename = `vehicle_shipping_${startDate}_to_${endDate}.csv`
    } else {
      return res.status(400).json({ message: '지원하지 않는 리포트 유형입니다' })
    }

    res.setHeader('Content-Type', 'text/csv;charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
    res.send('\ufeff' + csvContent)
  } catch (error: any) {
    console.error('리포트 Export 오류:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router

