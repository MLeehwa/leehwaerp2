import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, DatePicker, Select, message, Space, Button, Tabs, Tag, Input, List, Checkbox } from 'antd'
import { ToolOutlined, CheckCircleOutlined, ClockCircleOutlined, DollarOutlined, WarningOutlined, DownloadOutlined, SearchOutlined, PaperClipOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
// html2pdf.js는 동적 import로 로드

const { RangePicker } = DatePicker

interface Summary {
  equipment: {
    total: number
    active: number
    maintenance: number
    retired: number
  }
  schedules: {
    total: number
    completed: number
    overdue: number
    completionRate: string
  }
  costs: {
    repair: number
    maintenance: number
    total: number
  }
}

interface EquipmentDetail {
  equipment: {
    _id: string
    equipmentCode: string
    equipmentName: string
    alias?: string
    location?: string
    category: string
    subCategory: string
    manufacturer?: string
    equipmentModel?: string
    serialNumber?: string
    status: string
    company?: { _id: string; code: string; name: string; currency?: string }
  }
  statistics: {
    totalSchedules: number
    completedSchedules: number
    totalRepairs: number
    totalCost: number
  }
  maintenanceSchedules: Array<{
    _id: string
    scheduleNumber: string
    scheduleType: string
    description: string
    scheduledDate: string
    completedDate?: string
    status: string
    totalCost?: number
    currency?: string
    attachments?: Array<{
      fileName: string
      filePath?: string
      fileSize?: number
      uploadedAt: string
    }>
  }>
  repairSchedules: Array<{
    _id: string
    scheduleNumber: string
    scheduleType: string
    description: string
    scheduledDate: string
    completedDate?: string
    status: string
    totalCost?: number
    currency?: string
    attachments?: Array<{
      fileName: string
      filePath?: string
      fileSize?: number
      uploadedAt: string
    }>
  }>
  repairs: Array<{
    _id: string
    repairNumber: string
    repairDate: string
    repairType: string
    description: string
    totalCost?: number
    operatingHours?: number
    status: string
  }>
}

interface UpcomingMaintenance {
  equipment: Array<{
    _id: string
    equipmentCode: string
    equipmentName: string
    alias?: string
    location?: string
    category: string
    subCategory: string
    nextMaintenanceDate?: string
    maintenanceInterval?: number
    maintenanceIntervalUnit?: string
    company?: { _id: string; code: string; name: string; currency?: string }
    daysUntil: number | null
  }>
  upcomingSchedules: Array<{
    _id: string
    scheduleNumber: string
    scheduleType: string
    description: string
    scheduledDate: string
    status: string
    equipment?: { _id: string; equipmentCode: string; equipmentName: string; location?: string }
    assignedTo?: { _id: string; username: string }
    daysUntil: number | null
  }>
  overdueSchedules: Array<{
    _id: string
    scheduleNumber: string
    scheduleType: string
    description: string
    scheduledDate: string
    status: string
    equipment?: { _id: string; equipmentCode: string; equipmentName: string; location?: string }
    assignedTo?: { _id: string; username: string }
    daysOverdue: number | null
  }>
}

const MaintenanceReports = () => {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [equipmentDetails, setEquipmentDetails] = useState<EquipmentDetail[]>([])
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<UpcomingMaintenance | null>(null)
  const [costAnalysis, setCostAnalysis] = useState<{ maintenance: Array<Record<string, unknown>>; repair: Array<Record<string, unknown>> } | null>(null)
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [groupBy, setGroupBy] = useState<string>('month')
  const [locationFilter, setLocationFilter] = useState<string>('')
  const [equipmentFilter, setEquipmentFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [cardLocationFilter, setCardLocationFilter] = useState<string>('')
  const [cardEquipmentFilter, setCardEquipmentFilter] = useState<string>('')

  useEffect(() => {
    fetchSummary()
    fetchEquipmentByLocation()
    fetchUpcomingMaintenance()
    fetchCostAnalysis()
  }, [dateRange, groupBy, locationFilter, equipmentFilter])

  const fetchSummary = async () => {
    try {
      const params: Record<string, string> = {}
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].startOf('day').toISOString()
        params.endDate = dateRange[1].endOf('day').toISOString()
      }

      const response = await api.get('/maintenance/reports/summary', { params })
      setSummary(response.data)
    } catch (error) {
      message.error('요약 통계를 불러오는데 실패했습니다')
    }
  }

  const fetchEquipmentByLocation = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (locationFilter) params.location = locationFilter
      if (equipmentFilter) params.equipmentId = equipmentFilter
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].startOf('day').toISOString()
        params.endDate = dateRange[1].endOf('day').toISOString()
      }

      const response = await api.get('/maintenance/reports/equipment-by-location', { params })
      setEquipmentDetails(response.data || [])
    } catch (error) {
      message.error('지게차별 위치별 내역을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchUpcomingMaintenance = async () => {
    try {
      const response = await api.get('/maintenance/reports/upcoming-maintenance', {
        params: { days: 30 },
      })
      setUpcomingMaintenance(response.data)
    } catch (error) {
      message.error('임박한 점검을 불러오는데 실패했습니다')
    }
  }

  const fetchCostAnalysis = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { groupBy }
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].startOf('day').toISOString()
        params.endDate = dateRange[1].endOf('day').toISOString()
      }

      const response = await api.get('/maintenance/reports/cost-analysis', { params })
      setCostAnalysis(response.data || { maintenance: [], repair: [] })
    } catch (error) {
      message.error('비용 분석을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReport = async () => {
    if (selectedEquipmentIds.length === 0) {
      message.warning('다운로드할 지게차를 선택하세요')
      return
    }

    try {
      // 선택한 지게차 정보 가져오기
      const selectedEquipment = equipmentDetails.filter(
        (item) => selectedEquipmentIds.includes(item.equipment._id)
      )

      // HTML 리포트 생성
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
              padding: 10px;
              background: #fff;
              color: #333;
              margin: 0;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #1890ff;
            }
            .header h1 {
              color: #1890ff;
              font-size: 20px;
              margin-bottom: 5px;
              font-weight: bold;
            }
            .header .date {
              color: #666;
              font-size: 10px;
            }
            .equipment-section {
              margin-bottom: 15px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .equipment-header {
              background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
              color: white;
              padding: 8px 12px;
              border-radius: 4px 4px 0 0;
              margin-bottom: 0;
            }
            .equipment-header h2 {
              font-size: 14px;
              margin: 0;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.1);
            }
            .info-table th {
              background: #f0f2f5;
              padding: 6px 8px;
              text-align: left;
              font-weight: bold;
              border: 1px solid #e8e8e8;
              width: 30%;
              color: #333;
              font-size: 9px;
            }
            .info-table td {
              padding: 6px 8px;
              border: 1px solid #e8e8e8;
              background: white;
              font-size: 9px;
            }
            .info-table tr:nth-child(even) td {
              background: #fafafa;
            }
            .section-title {
              background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
              color: white;
              padding: 6px 12px;
              margin: 10px 0 8px 0;
              border-radius: 4px;
              font-size: 11px;
              font-weight: bold;
            }
            .section-title.repair {
              background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.1);
            }
            .data-table thead {
              background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
              color: white;
            }
            .data-table thead.repair-header {
              background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
            }
            .data-table th {
              padding: 6px 6px;
              text-align: left;
              font-weight: bold;
              font-size: 8px;
            }
            .data-table td {
              padding: 5px 6px;
              border: 1px solid #e8e8e8;
              font-size: 8px;
            }
            .data-table tbody tr:nth-child(even) {
              background: #fafafa;
            }
            .data-table tbody tr:hover {
              background: #e6f7ff;
            }
            .status-badge {
              display: inline-block;
              padding: 2px 4px;
              border-radius: 3px;
              font-size: 7px;
              font-weight: bold;
            }
            .status-completed {
              background: #f6ffed;
              color: #52c41a;
              border: 1px solid #b7eb8f;
            }
            .status-scheduled {
              background: #e6f7ff;
              color: #1890ff;
              border: 1px solid #91d5ff;
            }
            .status-in-progress {
              background: #fff7e6;
              color: #fa8c16;
              border: 1px solid #ffd591;
            }
            .no-data {
              text-align: center;
              padding: 10px;
              color: #999;
              font-style: italic;
              font-size: 9px;
            }
            .footer {
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px solid #e8e8e8;
              text-align: center;
              color: #999;
              font-size: 8px;
            }
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }
              body {
                padding: 0;
                margin: 0;
              }
              .equipment-section {
                page-break-inside: avoid;
                break-inside: avoid;
                margin-bottom: 10px;
              }
              .data-table {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .info-table {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>지게차 유지보수 리포트</h1>
            <div class="date">생성일: ${dayjs().format('YYYY년 MM월 DD일 HH:mm:ss')}</div>
          </div>
      `

      selectedEquipment.forEach((item, index) => {
        const eq = item.equipment

        htmlContent += `
          <div class="equipment-section">
            <div class="equipment-header">
              <h2>${eq.equipmentName}${eq.alias ? ` (${eq.alias})` : ''}</h2>
            </div>
            
            <table class="info-table">
              <tr>
                <th>설비 코드</th>
                <td>${eq.equipmentCode || '-'}</td>
                <th>시리얼 번호</th>
                <td>${eq.serialNumber || '-'}</td>
              </tr>
              <tr>
                <th>제조사</th>
                <td>${eq.manufacturer || '-'}</td>
                <th>모델</th>
                <td>${eq.equipmentModel || '-'}</td>
              </tr>
              <tr>
                <th>위치</th>
                <td>${eq.location || '-'}</td>
                <th>상태</th>
                <td>${eq.status || '-'}</td>
              </tr>
              <tr>
                <th>대분류</th>
                <td>${eq.category || '-'}</td>
                <th>소분류</th>
                <td>${eq.subCategory || '-'}</td>
              </tr>
            </table>
        `

        // 점검 이력
        if (item.maintenanceSchedules && item.maintenanceSchedules.length > 0) {
          htmlContent += `
            <div class="section-title">점검 이력</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>일정 번호</th>
                  <th>점검일</th>
                  <th>완료일</th>
                  <th>설명</th>
                  <th>비용</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
          `

          item.maintenanceSchedules.forEach((schedule: any) => {
            const currency = schedule.currency || 'USD'
            const symbol = currency === 'KRW' ? '₩' : currency === 'USD' ? '$' : currency
            const cost = schedule.totalCost ? `${symbol}${schedule.totalCost.toLocaleString()}` : '-'
            const statusClass = schedule.status === 'completed' ? 'status-completed' : 
                              schedule.status === 'scheduled' ? 'status-scheduled' : 
                              schedule.status === 'in-progress' ? 'status-in-progress' : ''

            htmlContent += `
              <tr>
                <td>${schedule.scheduleNumber || '-'}</td>
                <td>${schedule.scheduledDate ? dayjs(schedule.scheduledDate).format('YYYY-MM-DD') : '-'}</td>
                <td>${schedule.completedDate ? dayjs(schedule.completedDate).format('YYYY-MM-DD') : '-'}</td>
                <td>${schedule.description || '-'}</td>
                <td>${cost}</td>
                <td><span class="status-badge ${statusClass}">${schedule.status || '-'}</span></td>
              </tr>
            `
          })

          htmlContent += `
              </tbody>
            </table>
          `
        } else {
          htmlContent += `
            <div class="section-title">점검 이력</div>
            <div class="no-data">점검 이력이 없습니다</div>
          `
        }

        // 수리 내역
        const allRepairs = [
          ...(item.repairSchedules || []).map((s: any) => ({ ...s, type: 'schedule' })),
          ...(item.repairs || []).map((r: any) => ({ ...r, type: 'repair' })),
        ]

        if (allRepairs.length > 0) {
          htmlContent += `
            <div class="section-title repair">수리 내역</div>
            <table class="data-table">
              <thead class="repair-header">
                <tr>
                  <th>번호</th>
                  <th>수리일</th>
                  <th>설명</th>
                  <th>비용</th>
                  <th>사용 시간</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
          `

          allRepairs.forEach((repair: any) => {
            const currency = repair.currency || 'USD'
            const symbol = currency === 'KRW' ? '₩' : currency === 'USD' ? '$' : currency
            const cost = repair.totalCost ? `${symbol}${repair.totalCost.toLocaleString()}` : '-'
            const hours = repair.operatingHours ? `${repair.operatingHours}시간` : '-'

            htmlContent += `
              <tr>
                <td>${repair.scheduleNumber || repair.repairNumber || '-'}</td>
                <td>${repair.scheduledDate || repair.repairDate ? dayjs(repair.scheduledDate || repair.repairDate).format('YYYY-MM-DD') : '-'}</td>
                <td>${repair.description || '-'}</td>
                <td>${cost}</td>
                <td>${hours}</td>
                <td><span class="status-badge ${repair.status === 'completed' ? 'status-completed' : ''}">${repair.status || '-'}</span></td>
              </tr>
            `
          })

          htmlContent += `
              </tbody>
            </table>
          `
        } else {
          htmlContent += `
            <div class="section-title repair">수리 내역</div>
            <div class="no-data">수리 내역이 없습니다</div>
          `
        }

        htmlContent += `
          </div>
        `
      })

      htmlContent += `
          <div class="footer">
            <p>본 리포트는 시스템에서 자동으로 생성되었습니다.</p>
            <p>LEEHWA ERP System - Maintenance Reports</p>
          </div>
        </body>
        </html>
      `

      // 새 창 열기
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (!printWindow) {
        message.error('팝업이 차단되어 인쇄할 수 없습니다. 팝업 차단을 해제해주세요.')
        return
      }

      // HTML 콘텐츠를 새 창에 쓰기
      printWindow.document.open()
      printWindow.document.write(htmlContent)
      printWindow.document.close()

      // 문서가 완전히 로드될 때까지 대기
      await new Promise((resolve) => {
        if (printWindow.document.readyState === 'complete') {
          resolve(null)
        } else {
          printWindow.onload = () => resolve(null)
          setTimeout(() => resolve(null), 2000) // 타임아웃 2초
        }
      })

      // 추가 렌더링 대기
      await new Promise(resolve => setTimeout(resolve, 300))

      // 인쇄 대화상자 열기 (사용자가 PDF로 저장 가능)
      printWindow.focus()
      printWindow.print()
      
      message.success('인쇄 대화상자가 열렸습니다. PDF로 저장하거나 인쇄하세요.')
      
      // 창을 자동으로 닫지 않고 사용자가 닫도록 함 (인쇄 후 확인 가능)
      // 필요시 사용자가 직접 닫을 수 있음
    } catch (error) {
      console.error('리포트 생성 오류:', error)
      message.error('리포트 생성 중 오류가 발생했습니다')
    }
  }

  // 필터링된 설비 목록
  const filteredEquipmentDetails = equipmentDetails.filter((item) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        item.equipment.equipmentCode.toLowerCase().includes(searchLower) ||
        item.equipment.equipmentName.toLowerCase().includes(searchLower) ||
        item.equipment.alias?.toLowerCase().includes(searchLower) ||
        item.equipment.location?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  // 지게차별 위치별 테이블 컬럼
  const equipmentDetailColumns: ColumnsType<EquipmentDetail> = [
    {
      title: '설비 코드',
      dataIndex: ['equipment', 'equipmentCode'],
      key: 'equipmentCode',
      width: 120,
      fixed: 'left',
    },
    {
      title: '설비명',
      key: 'equipmentName',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.equipment.equipmentName}</div>
          {record.equipment.alias && (
            <div style={{ fontSize: '12px', color: '#999' }}>({record.equipment.alias})</div>
          )}
        </div>
      ),
    },
    {
      title: '위치',
      dataIndex: ['equipment', 'location'],
      key: 'location',
      width: 120,
    },
    {
      title: '카테고리',
      key: 'category',
      width: 150,
      render: (_, record) => `${record.equipment.category} / ${record.equipment.subCategory}`,
    },
    {
      title: '이력 수',
      dataIndex: ['statistics', 'totalSchedules'],
      key: 'totalSchedules',
      width: 100,
      render: (count: number, record) => (
        <div>
          <div>{count}건</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            완료: {record.statistics.completedSchedules}건
          </div>
        </div>
      ),
    },
    {
      title: '수리 수',
      dataIndex: ['statistics', 'totalRepairs'],
      key: 'totalRepairs',
      width: 100,
    },
    {
      title: '총 비용',
      dataIndex: ['statistics', 'totalCost'],
      key: 'totalCost',
      width: 150,
      render: (cost: number, record) => {
        if (!cost) return '-'
        const currency = record.equipment.company?.currency || 'USD'
        const currencySymbols: Record<string, string> = {
          USD: '$',
          KRW: '₩',
          MXN: '$',
        }
        const symbol = currencySymbols[currency] || currency
        return `${symbol}${cost.toLocaleString()}`
      },
    },
    {
      title: '상태',
      dataIndex: ['equipment', 'status'],
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          active: 'green',
          inactive: 'default',
          maintenance: 'orange',
          retired: 'red',
        }
        return <Tag color={colors[status] || 'default'}>{status === 'active' ? '운영중' : status}</Tag>
      },
    },
  ]

  // 임박한 점검 테이블 컬럼
  const upcomingEquipmentColumns: ColumnsType<UpcomingMaintenance['equipment'][0]> = [
    {
      title: '설비 코드',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: 120,
    },
    {
      title: '설비명',
      key: 'equipmentName',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.equipmentName}</div>
          {record.alias && <div style={{ fontSize: '12px', color: '#999' }}>({record.alias})</div>}
        </div>
      ),
    },
    {
      title: '위치',
      dataIndex: 'location',
      key: 'location',
      width: 120,
    },
    {
      title: '다음 점검일',
      dataIndex: 'nextMaintenanceDate',
      key: 'nextMaintenanceDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '임박 일수',
      dataIndex: 'daysUntil',
      key: 'daysUntil',
      width: 100,
      render: (days: number | null) => {
        if (days === null) return '-'
        if (days <= 7) return <Tag color="red">{days}일</Tag>
        if (days <= 14) return <Tag color="orange">{days}일</Tag>
        return <Tag color="blue">{days}일</Tag>
      },
    },
    {
      title: '점검 주기',
      key: 'interval',
      width: 120,
      render: (_, record) => {
        if (!record.maintenanceInterval) return '-'
        const unitMap: Record<string, string> = {
          days: '일',
          weeks: '주',
          months: '월',
        }
        return `${record.maintenanceInterval}${unitMap[record.maintenanceIntervalUnit || 'days'] || ''}`
      },
    },
  ]

  const upcomingScheduleColumns: ColumnsType<UpcomingMaintenance['upcomingSchedules'][0]> = [
    {
      title: '일정 번호',
      dataIndex: 'scheduleNumber',
      key: 'scheduleNumber',
      width: 150,
    },
    {
      title: '설비',
      key: 'equipment',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.equipment?.equipmentCode} - {record.equipment?.equipmentName}</div>
          {record.equipment?.location && (
            <div style={{ fontSize: '12px', color: '#999' }}>위치: {record.equipment.location}</div>
          )}
        </div>
      ),
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '고장일',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '임박 일수',
      dataIndex: 'daysUntil',
      key: 'daysUntil',
      width: 100,
      render: (days: number | null) => {
        if (days === null) return '-'
        if (days <= 7) return <Tag color="red">{days}일</Tag>
        if (days <= 14) return <Tag color="orange">{days}일</Tag>
        return <Tag color="blue">{days}일</Tag>
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          scheduled: 'blue',
          'in-progress': 'orange',
          completed: 'green',
        }
        return <Tag color={colors[status] || 'default'}>{status}</Tag>
      },
    },
  ]

  const overdueScheduleColumns: ColumnsType<UpcomingMaintenance['overdueSchedules'][0]> = [
    {
      title: '일정 번호',
      dataIndex: 'scheduleNumber',
      key: 'scheduleNumber',
      width: 150,
    },
    {
      title: '설비',
      key: 'equipment',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.equipment?.equipmentCode} - {record.equipment?.equipmentName}</div>
          {record.equipment?.location && (
            <div style={{ fontSize: '12px', color: '#999' }}>위치: {record.equipment.location}</div>
          )}
        </div>
      ),
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '고장일',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '지연 일수',
      dataIndex: 'daysOverdue',
      key: 'daysOverdue',
      width: 100,
      render: (days: number | null) => {
        if (days === null) return '-'
        return <Tag color="red">{days}일 지연</Tag>
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          scheduled: 'blue',
          'in-progress': 'orange',
        }
        return <Tag color={colors[status] || 'default'}>{status}</Tag>
      },
    },
  ]

  // 위치 목록 가져오기
  const locations = Array.from(new Set(equipmentDetails.map((item) => item.equipment.location).filter(Boolean)))
  
  // 지게차 목록 가져오기
  const equipmentList = equipmentDetails.map((item) => ({
    _id: item.equipment._id,
    name: `${item.equipment.equipmentCode} - ${item.equipment.equipmentName}`,
    location: item.equipment.location,
  }))

  // 카드용 필터링된 데이터 계산
  const getFilteredDataForCards = () => {
    let filtered = equipmentDetails

    // 로케이션 필터
    if (cardLocationFilter) {
      filtered = filtered.filter((item) => item.equipment.location === cardLocationFilter)
    }

    // 지게차 필터
    if (cardEquipmentFilter) {
      filtered = filtered.filter((item) => item.equipment._id === cardEquipmentFilter)
    }

    // 체크박스 선택 필터 (우선순위)
    if (selectedEquipmentIds.length > 0) {
      filtered = filtered.filter((item) => selectedEquipmentIds.includes(item.equipment._id))
    }

    return filtered
  }

  const filteredForCards = getFilteredDataForCards()

  // 카드용 통계 계산
  const calculateCardStatistics = () => {
    const filtered = filteredForCards

    const totalEquipment = filtered.length
    const activeEquipment = filtered.filter((item) => item.equipment.status === 'active').length
    
    // 고장 수량 계산: 설비 상태가 'maintenance'이거나, 수리 이력이 'in-progress' 상태인 설비
    const brokenEquipment = filtered.filter((item) => {
      // 설비 상태가 'maintenance'인 경우
      if (item.equipment.status === 'maintenance') {
        return true
      }
      
      // 수리 이력이 'in-progress' 상태인 경우
      const allSchedules = [
        ...(item.maintenanceSchedules || []),
        ...(item.repairSchedules || []),
      ]
      const hasInProgressRepair = allSchedules.some((schedule: any) => 
        schedule.scheduleType === 'repair' && schedule.status === 'in-progress'
      )
      
      return hasInProgressRepair
    }).length

    // 비용 통계 계산
    let repairCost = 0
    let maintenanceCost = 0

    filtered.forEach((item) => {
      // 수리 비용
      const repairs = [
        ...(item.repairSchedules || []).filter((s: any) => s.scheduleType === 'repair'),
        ...(item.repairs || []),
      ]
      repairs.forEach((repair: any) => {
        if (repair.totalCost) {
          repairCost += repair.totalCost
        }
      })

      // 점검 비용
      const maintenance = [
        ...(item.maintenanceSchedules || []).filter((s: any) => s.scheduleType === 'maintenance'),
        ...(item.repairSchedules || []).filter((s: any) => s.scheduleType === 'maintenance'),
      ]
      maintenance.forEach((maint: any) => {
        if (maint.totalCost) {
          maintenanceCost += maint.totalCost
        }
      })
    })

    return {
      equipment: {
        total: totalEquipment,
        active: activeEquipment,
        broken: brokenEquipment,
      },
      costs: {
        repair: repairCost,
        maintenance: maintenanceCost,
        total: repairCost + maintenanceCost,
      },
    }
  }

  const cardStatistics = calculateCardStatistics()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>유지보수 리포트</h1>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
          />
          <Select value={groupBy} onChange={setGroupBy} style={{ width: 120 }}>
            <Select.Option value="month">월별</Select.Option>
            <Select.Option value="year">년별</Select.Option>
            <Select.Option value="equipment">설비별</Select.Option>
            <Select.Option value="location">위치별</Select.Option>
          </Select>
        </Space>
      </div>

      {/* 카드 필터 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <span>로케이션:</span>
          <Select
            value={cardLocationFilter}
            onChange={setCardLocationFilter}
            style={{ width: 150 }}
            allowClear
            placeholder="전체"
          >
            {locations.map((loc) => (
              <Select.Option key={loc} value={loc}>
                {loc}
              </Select.Option>
            ))}
          </Select>
          <span>지게차:</span>
          <Select
            value={cardEquipmentFilter}
            onChange={setCardEquipmentFilter}
            style={{ width: 250 }}
            allowClear
            placeholder="전체"
            showSearch
            filterOption={(input, option) =>
              (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {equipmentList.map((eq) => (
              <Select.Option key={eq._id} value={eq._id}>
                {eq.name}
              </Select.Option>
            ))}
          </Select>
          {(cardLocationFilter || cardEquipmentFilter || selectedEquipmentIds.length > 0) && (
            <Button
              size="small"
              onClick={() => {
                setCardLocationFilter('')
                setCardEquipmentFilter('')
                setSelectedEquipmentIds([])
              }}
            >
              필터 초기화
            </Button>
          )}
        </Space>
      </Card>

      {/* 카드 통계 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="전체 설비"
              value={cardStatistics.equipment.total}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="가동 수량"
              value={cardStatistics.equipment.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="고장 수량"
              value={cardStatistics.equipment.broken}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="총 비용"
              value={cardStatistics.costs.total}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="수리 비용"
                  value={cardStatistics.costs.repair}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="점검 비용"
                  value={cardStatistics.costs.maintenance}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Tabs 
        defaultActiveKey="equipment-location"
        items={[
          {
            key: 'equipment-location',
            label: '지게차별 위치별 내역',
            children: (
          <Card>
            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <Select
                  placeholder="위치 필터"
                  value={locationFilter}
                  onChange={setLocationFilter}
                  allowClear
                  style={{ width: 150 }}
                >
                  {locations.map((loc) => (
                    <Select.Option key={loc} value={loc}>
                      {loc}
                    </Select.Option>
                  ))}
                </Select>
                <Input
                  placeholder="설비 코드/이름 검색"
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: 200 }}
                  allowClear
                />
              </Space>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handleDownloadReport}
                disabled={selectedEquipmentIds.length === 0}
              >
                선택한 지게차 리포트 인쇄/PDF 저장 ({selectedEquipmentIds.length})
              </Button>
            </Space>
            <Table
              columns={equipmentDetailColumns}
              dataSource={filteredEquipmentDetails}
              loading={loading}
              rowKey={(record) => record.equipment._id}
              pagination={{ pageSize: 20 }}
              rowSelection={{
                selectedRowKeys: selectedEquipmentIds,
                onChange: (selectedKeys) => {
                  setSelectedEquipmentIds(selectedKeys as string[])
                },
              }}
              expandable={{
                expandedRowRender: (record) => {
                  const handleDownloadAttachment = (scheduleId: string, index: number, fileName: string) => {
                    const url = `/api/maintenance/schedules/${scheduleId}/attachments/${index}/download`
                    const link = document.createElement('a')
                    link.href = url
                    link.setAttribute('download', fileName)
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }

                  // 안전하게 데이터 가져오기 (하위 호환성: 기존 schedules 필드도 처리)
                  const maintenanceSchedules = record.maintenanceSchedules || 
                    (record.schedules ? record.schedules.filter((s: any) => s.scheduleType === 'maintenance') : [])
                  const repairSchedules = record.repairSchedules || 
                    (record.schedules ? record.schedules.filter((s: any) => s.scheduleType === 'repair') : [])
                  const repairs = record.repairs || []

                  // 수리 내역: repairSchedules와 repairs 합치기
                  const allRepairs = [
                    ...repairSchedules.map((s: any) => ({
                      ...s,
                      type: 'schedule',
                      date: s.scheduledDate,
                    })),
                    ...repairs.map((r: any) => ({
                      ...r,
                      type: 'repair',
                      date: r.repairDate,
                      scheduleNumber: r.repairNumber,
                    })),
                  ].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())

                  const tabItems = [
                    {
                      key: 'maintenance',
                      label: '점검 이력',
                      children: (
                          <Table
                            size="small"
                            dataSource={maintenanceSchedules}
                            rowKey="_id"
                            pagination={{ pageSize: 5 }}
                            columns={[
                              {
                                title: '일정 번호',
                                dataIndex: 'scheduleNumber',
                                key: 'scheduleNumber',
                              },
                              {
                                title: '설명',
                                dataIndex: 'description',
                                key: 'description',
                                ellipsis: true,
                              },
                              {
                                title: '점검일',
                                dataIndex: 'scheduledDate',
                                key: 'scheduledDate',
                                render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
                              },
                              {
                                title: '완료일',
                                dataIndex: 'completedDate',
                                key: 'completedDate',
                                render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
                              },
                              {
                                title: '비용',
                                key: 'cost',
                                render: (_, item) => {
                                  if (!item.totalCost) return '-'
                                  const currency = item.currency || 'USD'
                                  const currencySymbols: Record<string, string> = {
                                    USD: '$',
                                    KRW: '₩',
                                    MXN: '$',
                                  }
                                  const symbol = currencySymbols[currency] || currency
                                  return `${symbol}${item.totalCost.toLocaleString()}`
                                },
                              },
                              {
                                title: '상태',
                                dataIndex: 'status',
                                key: 'status',
                                render: (status: string) => {
                                  const colors: Record<string, string> = {
                                    completed: 'green',
                                    scheduled: 'blue',
                                    'in-progress': 'orange',
                                  }
                                  return <Tag color={colors[status] || 'default'}>{status}</Tag>
                                },
                              },
                              {
                                title: '첨부파일',
                                key: 'attachments',
                                width: 120,
                                render: (_, item) => {
                                  if (!item.attachments || item.attachments.length === 0) return '-'
                                  return (
                                    <Space>
                                      {item.attachments.map((attachment: any, index: number) => (
                                        <Button
                                          key={index}
                                          type="link"
                                          size="small"
                                          icon={<DownloadOutlined />}
                                          onClick={() => handleDownloadAttachment(item._id, index, attachment.fileName)}
                                        >
                                          다운로드
                                        </Button>
                                      ))}
                                    </Space>
                                  )
                                },
                              },
                            ]}
                          />
                      ),
                    },
                    {
                      key: 'repairs',
                      label: '수리 내역',
                      children: (
                          <Table
                            size="small"
                            dataSource={allRepairs}
                            rowKey={(item) => `${item.type}-${item._id}`}
                            pagination={{ pageSize: 5 }}
                            columns={[
                              {
                                title: '번호',
                                key: 'number',
                                render: (_, item) => item.scheduleNumber || item.repairNumber,
                              },
                              {
                                title: '유형',
                                key: 'type',
                                render: (_, item) => (item.type === 'schedule' ? '이력 수리' : '수리'),
                              },
                              {
                                title: '수리일',
                                key: 'date',
                                render: (_, item) => (item.date ? dayjs(item.date).format('YYYY-MM-DD') : '-'),
                              },
                              {
                                title: '설명',
                                dataIndex: 'description',
                                key: 'description',
                                ellipsis: true,
                              },
                              {
                                title: '비용',
                                key: 'cost',
                                render: (_, item) => {
                                  if (!item.totalCost) return '-'
                                  const currency = item.currency || 'USD'
                                  const currencySymbols: Record<string, string> = {
                                    USD: '$',
                                    KRW: '₩',
                                    MXN: '$',
                                  }
                                  const symbol = currencySymbols[currency] || currency
                                  return `${symbol}${item.totalCost.toLocaleString()}`
                                },
                              },
                              {
                                title: '사용 시간',
                                dataIndex: 'operatingHours',
                                key: 'operatingHours',
                                render: (hours: number) => (hours ? `${hours}시간` : '-'),
                              },
                              {
                                title: '첨부파일',
                                key: 'attachments',
                                width: 120,
                                render: (_, item) => {
                                  if (item.type === 'repair' || !item.attachments || item.attachments.length === 0) return '-'
                                  return (
                                    <Space>
                                      {item.attachments.map((attachment: any, index: number) => (
                                        <Button
                                          key={index}
                                          type="link"
                                          size="small"
                                          icon={<DownloadOutlined />}
                                          onClick={() => handleDownloadAttachment(item._id, index, attachment.fileName)}
                                        >
                                          다운로드
                                        </Button>
                                      ))}
                                    </Space>
                                  )
                                },
                              },
                              {
                                title: '상태',
                                dataIndex: 'status',
                                key: 'status',
                                render: (status: string) => {
                                  const colors: Record<string, string> = {
                                    completed: 'green',
                                    scheduled: 'blue',
                                    'in-progress': 'orange',
                                  }
                                  return <Tag color={colors[status] || 'default'}>{status || '-'}</Tag>
                                },
                              },
                            ]}
                          />
                      ),
                    },
                  ]

                  return (
                    <div style={{ margin: 0 }}>
                      <Tabs size="small" items={tabItems} />
                    </div>
                  )
                },
              }}
            />
          </Card>
            ),
          },
          {
            key: 'upcoming',
            label: '점검 일자 임박 항목',
            children: (
          <Row gutter={16}>
            <Col span={24}>
              <Card title="설비 점검 임박 (30일 내)" style={{ marginBottom: 16 }}>
                <Table
                  columns={upcomingEquipmentColumns}
                  dataSource={upcomingMaintenance?.equipment || []}
                  rowKey="_id"
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              </Card>
            </Col>
            <Col span={24}>
              <Card title="일정 임박 (30일 내)" style={{ marginBottom: 16 }}>
                <Table
                  columns={upcomingScheduleColumns}
                  dataSource={upcomingMaintenance?.upcomingSchedules || []}
                  rowKey="_id"
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              </Card>
            </Col>
            <Col span={24}>
              <Card title="지연된 일정" style={{ marginBottom: 16 }}>
                <Table
                  columns={overdueScheduleColumns}
                  dataSource={upcomingMaintenance?.overdueSchedules || []}
                  rowKey="_id"
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
            ),
          },
          {
            key: 'cost',
            label: '비용 분석',
            children: (
          <Card title="비용 분석">
            <Tabs
              items={[
                {
                  key: 'maintenance',
                  label: '점검 비용',
                  children: (
                    <Table
                      dataSource={costAnalysis?.maintenance || []}
                      loading={loading}
                      rowKey={(record: any) => JSON.stringify(record._id)}
                      pagination={false}
                      columns={[
                        {
                          title: groupBy === 'month' ? '월' : groupBy === 'year' ? '년' : groupBy === 'equipment' ? '설비' : '위치',
                          key: 'period',
                          render: (_, record: any) => {
                            if (groupBy === 'month') {
                              return `${record._id.year}-${String(record._id.month).padStart(2, '0')}`
                            } else if (groupBy === 'year') {
                              return `${record._id.year}`
                            } else if (groupBy === 'equipment' || groupBy === 'location') {
                              if (record.equipmentInfo) {
                                return `${record.equipmentInfo.equipmentCode} - ${record.equipmentInfo.equipmentName}${record.equipmentInfo.location ? ` (${record.equipmentInfo.location})` : ''}`
                              }
                              return record._id.equipment || '-'
                            }
                            return '-'
                          },
                        },
                        {
                          title: '작업 수',
                          dataIndex: 'count',
                          key: 'count',
                        },
                        {
                          title: '점검 비용',
                          dataIndex: 'totalCost',
                          key: 'totalCost',
                          render: (value: number) => `₩${value.toLocaleString()}`,
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: 'repair',
                  label: '수리 비용',
                  children: (
                    <Table
                      dataSource={costAnalysis?.repair || []}
                      loading={loading}
                      rowKey={(record: any) => JSON.stringify(record._id)}
                      pagination={false}
                      columns={[
                        {
                          title: groupBy === 'month' ? '월' : groupBy === 'year' ? '년' : groupBy === 'equipment' ? '설비' : '위치',
                          key: 'period',
                          render: (_, record: any) => {
                            if (groupBy === 'month') {
                              return `${record._id.year}-${String(record._id.month).padStart(2, '0')}`
                            } else if (groupBy === 'year') {
                              return `${record._id.year}`
                            } else if (groupBy === 'equipment' || groupBy === 'location') {
                              if (record.equipmentInfo) {
                                return `${record.equipmentInfo.equipmentCode} - ${record.equipmentInfo.equipmentName}${record.equipmentInfo.location ? ` (${record.equipmentInfo.location})` : ''}`
                              }
                              return record._id.equipment || '-'
                            }
                            return '-'
                          },
                        },
                        {
                          title: '작업 수',
                          dataIndex: 'count',
                          key: 'count',
                        },
                        {
                          title: '수리 비용',
                          dataIndex: 'totalCost',
                          key: 'totalCost',
                          render: (value: number) => `₩${value.toLocaleString()}`,
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </Card>
            ),
          },
        ]}
      />
    </div>
  )
}

export default MaintenanceReports
