import express, { Request, Response } from 'express'
import mongoose from 'mongoose'
import MaintenanceEquipment from '../../models/MaintenanceEquipment'
import MaintenanceSchedule from '../../models/MaintenanceSchedule'
import MaintenanceRepair from '../../models/MaintenanceRepair'

const router = express.Router()

// MongoDB 연결 확인 미들웨어
const checkDBConnection = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' })
  }
  next()
}

/**
 * GET /api/maintenance/reports/summary
 * 유지보수 요약 통계
 */
router.get('/summary', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    const dateFilter: any = {}
    if (startDate || endDate) {
      dateFilter.createdAt = {}
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate as string)
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate as string)
    }

    // 설비 통계
    const totalEquipment = await MaintenanceEquipment.countDocuments({ managedBy: 'operation' })
    const activeEquipment = await MaintenanceEquipment.countDocuments({ status: 'active', managedBy: 'operation' })
    const maintenanceEquipment = await MaintenanceEquipment.countDocuments({ status: 'maintenance', managedBy: 'operation' })
    const retiredEquipment = await MaintenanceEquipment.countDocuments({ status: 'retired', managedBy: 'operation' })

    // 일정 통계
    const scheduleFilter = { ...dateFilter }
    const totalSchedules = await MaintenanceSchedule.countDocuments(scheduleFilter)
    const completedSchedules = await MaintenanceSchedule.countDocuments({ ...scheduleFilter, status: 'completed' })
    const overdueSchedules = await MaintenanceSchedule.countDocuments({
      ...scheduleFilter,
      status: { $in: ['scheduled', 'in-progress'] },
      dueDate: { $lt: new Date() },
    })

    // 비용 통계 (schedules에서 - 수리/점검 분리)
    const costStats = await MaintenanceSchedule.aggregate([
      { $match: { ...scheduleFilter, status: 'completed', totalCost: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$scheduleType',
          totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
        },
      },
    ])

    // 수리 비용과 점검 비용 분리
    const repairCost = costStats.find((s: any) => s._id === 'repair')?.totalCost || 0
    const maintenanceCost = costStats.find((s: any) => s._id === 'maintenance')?.totalCost || 0

    // 수리 내역 비용 (repairs에서)
    const repairStats = await MaintenanceRepair.aggregate([
      { $match: { ...dateFilter, totalCost: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
        },
      },
    ])
    const repairCostFromRepairs = repairStats[0]?.totalCost || 0

    const totalRepairCost = repairCost + repairCostFromRepairs

    res.json({
      equipment: {
        total: totalEquipment,
        active: activeEquipment,
        maintenance: maintenanceEquipment,
        retired: retiredEquipment,
      },
      schedules: {
        total: totalSchedules,
        completed: completedSchedules,
        overdue: overdueSchedules,
        completionRate: totalSchedules > 0 ? ((completedSchedules / totalSchedules) * 100).toFixed(2) : '0',
      },
      costs: {
        repair: totalRepairCost,
        maintenance: maintenanceCost,
        total: totalRepairCost + maintenanceCost,
      },
    })
  } catch (error: any) {
    console.error('Error fetching summary:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * GET /api/maintenance/reports/equipment-by-location
 * 지게차별 위치별 모든 내역
 */
router.get('/equipment-by-location', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { location, equipmentId, startDate, endDate } = req.query

    // 설비 조회 (지게차만 - subCategory에 '지게차' 포함)
    const equipmentQuery: any = { 
      managedBy: 'operation',
      $or: [
        { subCategory: { $regex: '지게차', $options: 'i' } },
        { category: { $regex: '설비', $options: 'i' } },
      ],
    }
    if (equipmentId) equipmentQuery._id = equipmentId
    if (location) equipmentQuery.location = location

    const equipment = await MaintenanceEquipment.find(equipmentQuery)
      .populate('company', 'code name currency')
      .sort({ location: 1, equipmentCode: 1 })

    // 각 설비별 상세 내역 조회
    const equipmentWithDetails = await Promise.all(
      equipment.map(async (eq) => {
        // 점검 이력 (schedules with scheduleType: 'maintenance')
        const maintenanceFilter: any = { equipment: eq._id, scheduleType: 'maintenance' }
        if (startDate || endDate) {
          maintenanceFilter.scheduledDate = {}
          if (startDate) maintenanceFilter.scheduledDate.$gte = new Date(startDate as string)
          if (endDate) maintenanceFilter.scheduledDate.$lte = new Date(endDate as string)
        }
        const maintenanceSchedules = await MaintenanceSchedule.find(maintenanceFilter)
          .sort({ scheduledDate: -1 })
          .lean()

        // 수리 내역 (schedules with scheduleType: 'repair' + repairs)
        const repairScheduleFilter: any = { equipment: eq._id, scheduleType: 'repair' }
        if (startDate || endDate) {
          repairScheduleFilter.scheduledDate = {}
          if (startDate) repairScheduleFilter.scheduledDate.$gte = new Date(startDate as string)
          if (endDate) repairScheduleFilter.scheduledDate.$lte = new Date(endDate as string)
        }
        const repairSchedules = await MaintenanceSchedule.find(repairScheduleFilter)
          .sort({ scheduledDate: -1 })
          .lean()

        // 수리 내역 (repairs)
        const repairFilter: any = { equipment: eq._id }
        if (startDate || endDate) {
          repairFilter.repairDate = {}
          if (startDate) repairFilter.repairDate.$gte = new Date(startDate as string)
          if (endDate) repairFilter.repairDate.$lte = new Date(endDate as string)
        }
        const repairs = await MaintenanceRepair.find(repairFilter)
          .sort({ repairDate: -1 })
          .lean()

        // 통계
        const totalMaintenanceSchedules = maintenanceSchedules.length
        const completedMaintenanceSchedules = maintenanceSchedules.filter((s: any) => s.status === 'completed').length
        const totalRepairSchedules = repairSchedules.length
        const totalRepairs = repairs.length
        const totalCost = 
          maintenanceSchedules.reduce((sum: number, s: any) => sum + (s.totalCost || 0), 0) +
          repairSchedules.reduce((sum: number, s: any) => sum + (s.totalCost || 0), 0) +
          repairs.reduce((sum: number, r: any) => sum + (r.totalCost || 0), 0)

        return {
          equipment: {
            _id: eq._id,
            equipmentCode: eq.equipmentCode,
            equipmentName: eq.equipmentName,
            alias: eq.alias,
            location: eq.location,
            category: eq.category,
            subCategory: eq.subCategory,
            manufacturer: eq.manufacturer,
            equipmentModel: eq.equipmentModel,
            serialNumber: eq.serialNumber,
            status: eq.status,
            company: eq.company,
          },
          statistics: {
            totalSchedules: totalMaintenanceSchedules + totalRepairSchedules,
            completedSchedules: completedMaintenanceSchedules + repairSchedules.filter((s: any) => s.status === 'completed').length,
            totalRepairs: totalRepairSchedules + totalRepairs,
            totalCost,
          },
          maintenanceSchedules: maintenanceSchedules.map((s: any) => ({
            _id: s._id,
            scheduleNumber: s.scheduleNumber,
            scheduleType: s.scheduleType,
            description: s.description,
            scheduledDate: s.scheduledDate,
            completedDate: s.completedDate,
            status: s.status,
            totalCost: s.totalCost,
            currency: s.currency,
            attachments: s.attachments || [],
          })),
          repairSchedules: repairSchedules.map((s: any) => ({
            _id: s._id,
            scheduleNumber: s.scheduleNumber,
            scheduleType: s.scheduleType,
            description: s.description,
            scheduledDate: s.scheduledDate,
            completedDate: s.completedDate,
            status: s.status,
            totalCost: s.totalCost,
            currency: s.currency,
            attachments: s.attachments || [],
          })),
          repairs: repairs.map((r: any) => ({
            _id: r._id,
            repairNumber: r.repairNumber,
            repairDate: r.repairDate,
            repairType: r.repairType,
            description: r.description,
            totalCost: r.totalCost,
            operatingHours: r.operatingHours,
            status: r.status,
          })),
        }
      })
    )

    res.json(equipmentWithDetails)
  } catch (error: any) {
    console.error('Error fetching equipment by location:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * GET /api/maintenance/reports/upcoming-maintenance
 * 점검 일자 임박 항목
 */
router.get('/upcoming-maintenance', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + Number(days))
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 설비의 nextMaintenanceDate가 임박한 것들
    const equipmentWithUpcoming = await MaintenanceEquipment.find({
      managedBy: 'operation',
      status: 'active',
      nextMaintenanceDate: {
        $gte: today,
        $lte: futureDate,
      },
    })
      .populate('company', 'code name currency')
      .sort({ nextMaintenanceDate: 1 })

    // 일정 중 임박한 것들
    const upcomingSchedules = await MaintenanceSchedule.find({
      status: { $in: ['scheduled', 'in-progress'] },
      scheduledDate: {
        $gte: today,
        $lte: futureDate,
      },
    })
      .populate('equipment', 'equipmentCode equipmentName location category subCategory')
      .populate('assignedTo', 'username email firstName lastName')
      .sort({ scheduledDate: 1 })

    // 지난 일정 (overdue)
    const overdueSchedules = await MaintenanceSchedule.find({
      status: { $in: ['scheduled', 'in-progress'] },
      scheduledDate: { $lt: today },
    })
      .populate('equipment', 'equipmentCode equipmentName location category subCategory')
      .populate('assignedTo', 'username email firstName lastName')
      .sort({ scheduledDate: 1 })

    res.json({
      equipment: equipmentWithUpcoming.map((eq) => ({
        _id: eq._id,
        equipmentCode: eq.equipmentCode,
        equipmentName: eq.equipmentName,
        alias: eq.alias,
        location: eq.location,
        category: eq.category,
        subCategory: eq.subCategory,
        nextMaintenanceDate: eq.nextMaintenanceDate,
        maintenanceInterval: eq.maintenanceInterval,
        maintenanceIntervalUnit: eq.maintenanceIntervalUnit,
        company: eq.company,
        daysUntil: eq.nextMaintenanceDate 
          ? Math.ceil((eq.nextMaintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
      upcomingSchedules: upcomingSchedules.map((s) => ({
        _id: s._id,
        scheduleNumber: s.scheduleNumber,
        scheduleType: s.scheduleType,
        description: s.description,
        scheduledDate: s.scheduledDate,
        status: s.status,
        equipment: s.equipment,
        assignedTo: s.assignedTo,
        daysUntil: s.scheduledDate 
          ? Math.ceil((s.scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
      overdueSchedules: overdueSchedules.map((s) => ({
        _id: s._id,
        scheduleNumber: s.scheduleNumber,
        scheduleType: s.scheduleType,
        description: s.description,
        scheduledDate: s.scheduledDate,
        status: s.status,
        equipment: s.equipment,
        assignedTo: s.assignedTo,
        daysOverdue: s.scheduledDate 
          ? Math.ceil((today.getTime() - s.scheduledDate.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
    })
  } catch (error: any) {
    console.error('Error fetching upcoming maintenance:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * GET /api/maintenance/reports/cost-analysis
 * 비용 분석 리포트
 */
router.get('/cost-analysis', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query

    const matchFilter: any = { status: 'completed', totalCost: { $exists: true, $ne: null } }
    if (startDate || endDate) {
      matchFilter.completedDate = {}
      if (startDate) matchFilter.completedDate.$gte = new Date(startDate as string)
      if (endDate) matchFilter.completedDate.$lte = new Date(endDate as string)
    }

    let groupFormat: any = {}
    if (groupBy === 'month') {
      groupFormat = {
        year: { $year: '$completedDate' },
        month: { $month: '$completedDate' },
      }
    } else if (groupBy === 'year') {
      groupFormat = {
        year: { $year: '$completedDate' },
      }
    } else if (groupBy === 'equipment') {
      groupFormat = { equipment: '$equipment' }
    } else if (groupBy === 'location') {
      // location은 equipment를 통해 가져와야 함
      groupFormat = { equipment: '$equipment' }
    }

    // 점검 비용 분석
    const maintenanceCostAnalysis = await MaintenanceSchedule.aggregate([
      { $match: { ...matchFilter, scheduleType: 'maintenance' } },
      {
        $group: {
          _id: groupFormat,
          count: { $sum: 1 },
          totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // 수리 비용 분석 (schedules + repairs)
    const repairScheduleCostAnalysis = await MaintenanceSchedule.aggregate([
      { $match: { ...matchFilter, scheduleType: 'repair' } },
      {
        $group: {
          _id: groupFormat,
          count: { $sum: 1 },
          totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // repairs 비용 분석
    const repairMatchFilter: any = { totalCost: { $exists: true, $ne: null } }
    if (startDate || endDate) {
      repairMatchFilter.repairDate = {}
      if (startDate) repairMatchFilter.repairDate.$gte = new Date(startDate as string)
      if (endDate) repairMatchFilter.repairDate.$lte = new Date(endDate as string)
    }

    const repairCostAnalysis = await MaintenanceRepair.aggregate([
      { $match: repairMatchFilter },
      {
        $group: {
          _id: groupBy === 'equipment' ? { equipment: '$equipment' } : groupBy === 'location' ? { equipment: '$equipment' } : groupFormat,
          count: { $sum: 1 },
          totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // 수리 비용 합치기 (repairScheduleCostAnalysis + repairCostAnalysis)
    const combinedRepairCostAnalysis = [...repairScheduleCostAnalysis]
    repairCostAnalysis.forEach((repairItem: any) => {
      const existing = combinedRepairCostAnalysis.find((item: any) => 
        JSON.stringify(item._id) === JSON.stringify(repairItem._id)
      )
      if (existing) {
        existing.count += repairItem.count
        existing.totalCost += repairItem.totalCost
      } else {
        combinedRepairCostAnalysis.push(repairItem)
      }
    })

    const costAnalysis = {
      maintenance: maintenanceCostAnalysis,
      repair: combinedRepairCostAnalysis,
    }

    // location 그룹인 경우 equipment 정보를 populate
    const populateEquipmentInfo = async (items: any[]) => {
      return Promise.all(
        items.map(async (item) => {
          if (item._id.equipment) {
            const equipment = await MaintenanceEquipment.findById(item._id.equipment)
            return {
              ...item,
              equipmentInfo: equipment ? {
                equipmentCode: equipment.equipmentCode,
                equipmentName: equipment.equipmentName,
                location: equipment.location,
              } : null,
            }
          }
          return item
        })
      )
    }

    if (groupBy === 'location' || groupBy === 'equipment') {
      costAnalysis.maintenance = await populateEquipmentInfo(costAnalysis.maintenance)
      costAnalysis.repair = await populateEquipmentInfo(costAnalysis.repair)
    }

    res.json(costAnalysis)
  } catch (error: any) {
    console.error('Error fetching cost analysis:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router
