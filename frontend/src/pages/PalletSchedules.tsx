import { useState, useEffect, useMemo, useRef } from 'react'
import { Modal, Form, Input, Select, DatePicker, InputNumber, Button, message, Space, Tag, Card, Row, Col, Checkbox, Tabs, Table, Tooltip, Dropdown } from 'antd'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import koLocale from '@fullcalendar/core/locales/ko'
import { PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons'
import api from '../utils/api'
import dayjs, { Dayjs } from 'dayjs'
import type { EventClickArg, DateSelectArg, EventDropArg, EventResizeArg } from '@fullcalendar/core'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { useAuth } from '../contexts/AuthContext'

const { TextArea } = Input
const { RangePicker } = DatePicker

interface PalletSchedule {
  _id?: string
  project?: {
    _id: string
    projectCode: string
    projectName: string
  }
  palletProject?: {
    _id: string
    projectCode: string
    projectName: string
  }
  company?: {
    _id: string
    code: string
    name: string
  }
  scheduleType: 'general' | 'project' | 'personal' | 'company' // 전체 일정, 프로젝트별 일정, 개인 일정, 법인별 일정
  category?: {
    _id: string
    code: string
    name: string
    type?: string
  }
  title: string
  description?: string
  startDate: string
  endDate?: string
  allDay: boolean
  palletCount?: number
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high'
  assignedTo?: {
    _id: string
    username: string
    email?: string
  }
  location?: string
  relatedContainer?: {
    _id: string
    containerNumber: string
    status: string
  }
  color?: string
  createdBy?: {
    _id: string
    username: string
  }
}

interface Project {
  _id: string
  projectCode: string
  projectName: string
}

interface PalletProject {
  _id: string
  projectCode: string
  projectName: string
  description?: string
  status: 'active' | 'completed' | 'on-hold' | 'cancelled'
}

interface Container {
  _id: string
  containerNumber?: string
  trackingNumber?: string
  shippingType: 'sea' | 'air'
  palletProject?: {
    _id: string
    projectCode: string
    projectName: string
  }
  company?: {
    _id: string
    code: string
    name: string
  }
  origin: string
  destination: string
  etd?: string
  portEta?: string
  factoryEta?: string
  status: string
  palletCount?: number
  partCount?: number
}

const PalletSchedules = () => {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<PalletSchedule[]>([])
  const [palletProjects, setPalletProjects] = useState<PalletProject[]>([])
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<PalletSchedule | null>(null)
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [selectedPalletProject, setSelectedPalletProject] = useState<string | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'calendar' | 'gantt'>('calendar')
  const [ganttDateRange, setGanttDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().add(3, 'month').endOf('month')
  ])
  const [form] = Form.useForm()
  const calendarRef = useRef<HTMLDivElement>(null)
  const ganttRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPalletProjects()
    fetchContainers()
  }, [])

  useEffect(() => {
    fetchSchedules()
    fetchContainers()
  }, [selectedPalletProject])

  const fetchPalletProjects = async () => {
    try {
      const response = await api.get('/pallet-projects?isActive=true')
      setPalletProjects(response.data || [])
    } catch (error) {
      console.error('팔렛트 프로젝트 목록을 불러오는데 실패했습니다')
    }
  }


  const fetchContainers = async () => {
    try {
      // 프로젝트 필터 없이 모든 컨테이너 가져오기 (캘린더에 표시하기 위해)
      const response = await api.get('/containers')
      setContainers(response.data || [])
    } catch (error) {
      console.error('컨테이너 목록을 불러오는데 실패했습니다', error)
    }
  }

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      // 파렛트 일정 관리: 프로젝트 일정만 조회
      const params: Record<string, string> = {
        scheduleType: 'project' // 프로젝트 일정만
      }
      
      if (selectedPalletProject) {
        params.palletProjectId = selectedPalletProject
      }

      const response = await api.get('/pallet-schedules', { params })
      setSchedules(response.data || [])
    } catch (error) {
      message.error('파렛트 일정을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = (date?: Dayjs) => {
    form.resetFields()
    setEditingSchedule(null)
    const startDate = date || selectedDate
    
    form.setFieldsValue({
      scheduleType: 'project', // 파렛트 일정 관리: 항상 프로젝트 일정
      palletProject: selectedPalletProject || undefined,
      allDay: true, // 날짜만 입력
      status: 'scheduled',
      priority: 'medium',
      // color 필드 제거 - 프로젝트별 색상으로 자동 할당됨
      startDate: startDate,
    })
    setModalVisible(true)
  }

  const handleEdit = (schedule: PalletSchedule) => {
    setEditingSchedule(schedule)
    const { color, ...scheduleWithoutColor } = schedule // color 필드 제거
    form.setFieldsValue({
      ...scheduleWithoutColor,
      scheduleType: 'project', // 파렛트 일정 관리: 항상 프로젝트 일정
      palletProject: schedule.palletProject?._id,
      startDate: schedule.startDate ? dayjs(schedule.startDate).startOf('day') : undefined,
      endDate: schedule.endDate ? dayjs(schedule.endDate).startOf('day') : undefined,
      assignedTo: schedule.assignedTo?._id,
      relatedContainer: schedule.relatedContainer?._id,
      // color 필드는 설정하지 않음 - 프로젝트별 색상으로 자동 할당됨
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/pallet-schedules/${id}`)
      message.success('일정이 삭제되었습니다')
      fetchSchedules()
    } catch (error: any) {
      message.error(error.response?.data?.message || '일정 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      // 파렛트 일정 관리: 프로젝트 일정만
      if (!values.palletProject) {
        message.error('프로젝트를 선택해야 합니다')
        return
      }

      const submitData = {
        ...values,
        scheduleType: 'project', // 항상 프로젝트 일정
        allDay: true, // 날짜만 입력
        startDate: values.startDate?.startOf('day').toISOString(),
        endDate: values.endDate?.startOf('day').toISOString(),
      }

      // 불필요한 필드 제거
      delete submitData.company
      delete submitData.category
      // color 필드 제거 - 프로젝트별 색상으로 자동 할당되므로 저장하지 않음
      delete submitData.color

      if (editingSchedule?._id) {
        await api.put(`/pallet-schedules/${editingSchedule._id}`, submitData)
        message.success('일정이 수정되었습니다')
      } else {
        await api.post('/pallet-schedules', submitData)
        message.success('일정이 등록되었습니다')
      }

      setModalVisible(false)
      form.resetFields()
      fetchSchedules()
    } catch (error: any) {
      message.error(error.response?.data?.message || '일정 저장에 실패했습니다')
    }
  }

  // 전체 일정 요약용 이벤트 (프로젝트별로 그룹화) - 선택적으로만 사용
  const summaryEvents = useMemo(() => {
    // 프로젝트 필터 적용
    const filteredSchedules = selectedPalletProject
      ? schedules.filter(s => s.palletProject?._id === selectedPalletProject)
      : schedules

    const projectGroups = filteredSchedules.reduce((acc, schedule) => {
      const projectId = schedule.palletProject?._id || 'unknown'
      if (!acc[projectId]) {
        acc[projectId] = {
          project: schedule.palletProject,
          schedules: [],
          startDate: schedule.startDate,
          endDate: schedule.endDate || schedule.startDate,
        }
      }
      acc[projectId].schedules.push(schedule)
      // 가장 이른 시작일과 늦은 종료일 찾기
      if (dayjs(schedule.startDate).isBefore(dayjs(acc[projectId].startDate))) {
        acc[projectId].startDate = schedule.startDate
      }
      if (schedule.endDate && dayjs(schedule.endDate).isAfter(dayjs(acc[projectId].endDate))) {
        acc[projectId].endDate = schedule.endDate
      }
      return acc
    }, {} as Record<string, any>)

    return Object.values(projectGroups).map((group: any) => ({
      id: `summary-${group.project?._id}`,
      title: `${group.project?.projectCode || ''} - ${group.project?.projectName || ''} (${group.schedules.length}건)`,
      start: group.startDate,
      end: group.endDate,
      backgroundColor: '#1890ff',
      borderColor: '#1890ff',
      display: 'block',
      editable: false, // 요약 이벤트는 드래그 불가
      extendedProps: {
        type: 'summary',
        project: group.project,
        scheduleCount: group.schedules.length,
        schedules: group.schedules,
      },
    }))
  }, [schedules, selectedPalletProject])

  // 세부 일정용 이벤트 (드래그 가능)
  const detailEvents = useMemo(() => {
    // 파렛트 일정 관리: 프로젝트 일정만 표시
    let filteredSchedules = schedules

    // 프로젝트 필터
    if (selectedPalletProject) {
      filteredSchedules = filteredSchedules.filter(s => s.palletProject?._id === selectedPalletProject)
    }

    // 프로젝트별 색상 매핑 (같은 프로젝트는 같은 색상)
    const projectColorMap = new Map<string, string>()
    const colors = [
      '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
      '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911'
    ]
    
    let colorIndex = 0
    filteredSchedules.forEach((schedule) => {
      const projectId = schedule.palletProject?._id
      if (projectId && !projectColorMap.has(projectId)) {
        projectColorMap.set(projectId, colors[colorIndex % colors.length])
        colorIndex++
      }
    })

    return filteredSchedules.map((schedule) => {
      const projectId = schedule.palletProject?._id
      const projectColor = projectId ? projectColorMap.get(projectId) : '#722ed1'
      
      // 프로젝트별 색상으로 통일 (기존 개별 색상 무시)
      return {
      id: schedule._id,
      title: `${schedule.title}${schedule.palletCount ? ` (${schedule.palletCount}개)` : ''}`,
      start: schedule.startDate,
      end: schedule.endDate || schedule.startDate,
        backgroundColor: projectColor || '#722ed1',
        borderColor: projectColor || '#722ed1',
      editable: true, // 드래그 가능
      durationEditable: false, // 기간 조정 불가 (리사이즈 불가)
      extendedProps: {
        schedule: schedule,
          scheduleType: 'project',
        projectCode: schedule.palletProject?.projectCode || '',
        projectName: schedule.palletProject?.projectName || '',
        palletCount: schedule.palletCount,
        status: schedule.status,
        description: schedule.description,
      },
      }
    })
  }, [schedules, selectedPalletProject])

  // 컨테이너 일정 이벤트
  const containerEvents = useMemo(() => {
    const filteredContainers = selectedPalletProject
      ? containers.filter(c => c.palletProject?._id === selectedPalletProject)
      : containers

    return filteredContainers.flatMap((container) => {
      const events = []
      const isAir = container.shippingType === 'air'
      const identifier = isAir ? container.trackingNumber : container.containerNumber
      const titlePrefix = isAir ? `[항공] ${identifier || ''}` : `[해상] ${identifier || ''}`
      const baseColor = isAir ? '#ffc107' : '#17a2b8' // 항공: 노랑, 해상: 파랑

      // ETD 이벤트
      if (container.etd) {
        events.push({
          id: `container-etd-${container._id}`,
          title: `${titlePrefix} ETD`,
          start: container.etd,
          allDay: true,
          backgroundColor: baseColor,
          borderColor: baseColor,
          editable: false,
          extendedProps: {
            type: 'container',
            container: container,
            containerType: 'etd',
            eventType: 'ETD',
          },
        })
      }
      
      // 항구 ETA 이벤트
      if (container.portEta) {
        events.push({
          id: `container-porteta-${container._id}`,
          title: `${titlePrefix} 항구ETA`,
          start: container.portEta,
          allDay: true,
          backgroundColor: baseColor,
          borderColor: baseColor,
          editable: false,
          extendedProps: {
            type: 'container',
            container: container,
            containerType: 'portEta',
            eventType: 'Port ETA',
          },
        })
      }
      
      // 공장 ETA 이벤트
      if (container.factoryEta) {
        events.push({
          id: `container-factoryeta-${container._id}`,
          title: `${titlePrefix} 공장ETA`,
          start: container.factoryEta,
          allDay: true,
          backgroundColor: baseColor,
          borderColor: baseColor,
          editable: false,
          extendedProps: {
            type: 'container',
            container: container,
            containerType: 'factoryEta',
            eventType: 'Factory ETA',
          },
        })
      }
      
      return events
    })
  }, [containers, selectedPalletProject])

  // 요약 이벤트 내용 커스터마이징
  const renderSummaryEventContent = (eventInfo: any) => {
    const projectCode = eventInfo.event.extendedProps.project?.projectCode
    const projectName = eventInfo.event.extendedProps.project?.projectName
    const scheduleCount = eventInfo.event.extendedProps.scheduleCount

    return (
      <div style={{ 
        padding: '4px 6px', 
        fontSize: '13px', 
        lineHeight: '1.4',
        fontWeight: 'bold',
        whiteSpace: 'normal',
        wordBreak: 'break-word'
      }}>
        <div style={{ fontSize: '14px', marginBottom: '2px' }}>
          {projectCode && `[${projectCode}] `}
          {projectName}
        </div>
        <div style={{ fontSize: '11px', opacity: 0.9 }}>
          {scheduleCount}건의 일정
        </div>
      </div>
    )
  }

  // 세부 이벤트 내용 커스터마이징
  const renderDetailEventContent = (eventInfo: any) => {
    const schedule = eventInfo.event.extendedProps.schedule as PalletSchedule
    const projectCode = eventInfo.event.extendedProps.projectCode
    const status = eventInfo.event.extendedProps.status

    return (
      <div style={{ 
        padding: '2px 4px', 
        fontSize: '11px', 
        lineHeight: '1.3',
        whiteSpace: 'normal',
        wordBreak: 'break-word'
      }}>
        {projectCode && (
          <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '1px' }}>
            [{projectCode}]
          </div>
        )}
        <div style={{ fontWeight: 'bold', marginBottom: '1px' }}>
          {eventInfo.event.title}
        </div>
        {status && (
          <div style={{ fontSize: '9px', opacity: 0.8 }}>
            {getStatusText(status)}
          </div>
        )}
      </div>
    )
  }

  // 컨테이너 이벤트 내용 커스터마이징
  const renderContainerEventContent = (eventInfo: any) => {
    const container = eventInfo.event.extendedProps.container as Container
    const eventType = eventInfo.event.extendedProps.eventType
    const isAir = container.shippingType === 'air'
    const identifier = isAir ? container.trackingNumber : container.containerNumber

    return (
      <div style={{
        padding: '2px 4px',
        fontSize: '11px',
        lineHeight: '1.3',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        backgroundColor: eventInfo.backgroundColor,
        color: '#fff',
        borderRadius: '3px',
      }}>
        <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '1px' }}>
          {isAir ? '[항공]' : '[해상]'} {identifier}
        </div>
        <div style={{ fontWeight: 'bold', marginBottom: '1px' }}>
          {eventType}
        </div>
        {container.company && (
          <div style={{ fontSize: '9px', opacity: 0.8 }}>
            {container.company.code} - {container.company.name}
          </div>
        )}
      </div>
    )
  }

  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventType = clickInfo.event.extendedProps.type
    if (eventType === 'summary') {
      // 요약 이벤트 클릭 시 해당 프로젝트의 첫 번째 일정 수정 또는 프로젝트 필터 적용
      const project = clickInfo.event.extendedProps.project
      if (project) {
        setSelectedPalletProject(project._id)
      }
    } else if (eventType === 'container') {
      // 컨테이너 이벤트 클릭 시 정보 표시
      const container = clickInfo.event.extendedProps.container as Container
      const containerType = clickInfo.event.extendedProps.containerType
      if (container) {
        const containerId = container.containerNumber || container.trackingNumber || container._id
        const typeText = containerType === 'etd' ? '출발' : containerType === 'portEta' ? '항구도착' : '공장도착'
        message.info({
          content: `컨테이너: ${containerId}\n유형: ${typeText}\n출발지: ${container.origin}\n도착지: ${container.destination}\n상태: ${container.status}`,
          duration: 5,
        })
      }
    } else {
      const schedule = clickInfo.event.extendedProps.schedule as PalletSchedule
      if (schedule) {
        handleEdit(schedule)
      }
    }
  }

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const startDate = dayjs(selectInfo.start)
    handleAdd(startDate)
    selectInfo.view.calendar.unselect() // 선택 해제
  }

  // 일정 드래그 완료 시 날짜 업데이트
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    // 요약 이벤트는 드래그 불가
    if (dropInfo.event.extendedProps.type === 'summary') {
      dropInfo.revert()
      return
    }

    const schedule = dropInfo.event.extendedProps.schedule as PalletSchedule
    if (!schedule || !schedule._id) {
      message.warning('일정을 찾을 수 없습니다')
      dropInfo.revert()
      return
    }

    try {
      const newStartDate = dropInfo.event.start
      // 기간 유지: 원래 기간을 계산하여 종료일 설정
      const originalStart = dayjs(schedule.startDate)
      const originalEnd = schedule.endDate ? dayjs(schedule.endDate) : originalStart
      const duration = originalEnd.diff(originalStart, 'day')
      const newEndDate = dayjs(newStartDate).add(duration, 'day')

      await api.put(`/pallet-schedules/${schedule._id}`, {
        startDate: dayjs(newStartDate).startOf('day').toISOString(),
        endDate: newEndDate.startOf('day').toISOString(),
      })

      message.success('일정이 이동되었습니다')
      fetchSchedules()
    } catch (error: any) {
      message.error(error.response?.data?.message || '일정 이동에 실패했습니다')
      dropInfo.revert()
    }
  }

  // 일정 리사이즈 완료 시 종료일 업데이트
  const handleEventResize = async (resizeInfo: EventResizeArg) => {
    // 요약 이벤트는 리사이즈 불가
    if (resizeInfo.event.extendedProps.type === 'summary') {
      resizeInfo.revert()
      return
    }

    const schedule = resizeInfo.event.extendedProps.schedule as PalletSchedule
    if (!schedule || !schedule._id) {
      message.warning('일정을 찾을 수 없습니다')
      resizeInfo.revert()
      return
    }

    try {
      const newStartDate = resizeInfo.event.start
      const newEndDate = resizeInfo.event.end || newStartDate

      await api.put(`/pallet-schedules/${schedule._id}`, {
        startDate: dayjs(newStartDate).startOf('day').toISOString(),
        endDate: dayjs(newEndDate).startOf('day').toISOString(),
      })

      message.success('일정 기간이 변경되었습니다')
      fetchSchedules()
    } catch (error: any) {
      message.error(error.response?.data?.message || '일정 기간 변경에 실패했습니다')
      resizeInfo.revert()
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'blue',
      'in-progress': 'orange',
      completed: 'green',
      cancelled: 'red',
    }
    return colors[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      scheduled: '예정',
      'in-progress': '진행중',
      completed: '완료',
      cancelled: '취소',
    }
    return texts[status] || status
  }

  // 간트 차트용 날짜 범위 생성
  const generateDateRange = (startDate: Dayjs, endDate: Dayjs) => {
    const dates: Dayjs[] = []
    let current = startDate.startOf('month')
    const end = endDate.endOf('month')
    
    while (current.isBefore(end) || current.isSame(end, 'month')) {
      dates.push(current)
      current = current.add(1, 'month')
    }
    return dates
  }

  // 간트 차트용 주차 생성 (범위 기반)
  const generateWeeks = (startDate: Dayjs, endDate: Dayjs) => {
    const weeks: Dayjs[] = []
    let current = startDate.startOf('week')
    const end = endDate.endOf('week')
    
    while (current.isBefore(end) || current.isSame(end)) {
      weeks.push(current)
      current = current.add(1, 'week')
    }
    return weeks
  }

  // 주차 번호 계산 (연도 기준)
  const getWeekNumber = (date: Dayjs) => {
    const startOfYear = date.startOf('year')
    const weekNumber = date.diff(startOfYear, 'week') + 1
    return weekNumber
  }

  // 간트 차트 데이터 준비
  const ganttData = useMemo(() => {
    const projectGroups = schedules.reduce((acc, schedule) => {
      const projectId = schedule.palletProject?._id || 'unknown'
      if (!acc[projectId]) {
        acc[projectId] = {
          project: schedule.palletProject,
          schedules: [],
        }
      }
      acc[projectId].schedules.push(schedule)
      return acc
    }, {} as Record<string, any>)

    return Object.values(projectGroups).map((group: any) => ({
      key: group.project?._id || 'unknown',
      projectCode: group.project?.projectCode || '',
      projectName: group.project?.projectName || '',
      customer: group.project?.customer?.name || '',
      schedules: group.schedules,
    }))
  }, [schedules])

  // 간트 차트용 날짜 범위 (사용자 선택 또는 기본값)
  const ganttWeeks = useMemo(() => {
    return generateWeeks(ganttDateRange[0], ganttDateRange[1])
  }, [ganttDateRange])

  // 간트 차트용 월 범위
  const ganttMonthRange = useMemo(() => {
    return generateDateRange(ganttDateRange[0], ganttDateRange[1])
  }, [ganttDateRange])

  // 캘린더 다운로드 (이미지)
  const downloadCalendarAsImage = async () => {
    if (!calendarRef.current) {
      message.error('캘린더를 찾을 수 없습니다')
      return
    }

    try {
      message.loading({ content: '이미지 생성 중...', key: 'download' })
      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      })
      
      const link = document.createElement('a')
      link.download = `파렛트_일정_캘린더_${dayjs().format('YYYY-MM-DD')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      
      message.success({ content: '이미지가 다운로드되었습니다', key: 'download' })
    } catch (error) {
      console.error('이미지 다운로드 실패:', error)
      message.error({ content: '이미지 다운로드에 실패했습니다', key: 'download' })
    }
  }

  // 캘린더 다운로드 (PDF)
  const downloadCalendarAsPDF = async () => {
    if (!calendarRef.current) {
      message.error('캘린더를 찾을 수 없습니다')
      return
    }

    try {
      message.loading({ content: 'PDF 생성 중...', key: 'download' })
      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('landscape', 'mm', 'a4')
      const imgWidth = 297 // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`파렛트_일정_캘린더_${dayjs().format('YYYY-MM-DD')}.pdf`)
      
      message.success({ content: 'PDF가 다운로드되었습니다', key: 'download' })
    } catch (error) {
      console.error('PDF 다운로드 실패:', error)
      message.error({ content: 'PDF 다운로드에 실패했습니다', key: 'download' })
    }
  }

  // 간트 차트 다운로드 (이미지)
  const downloadGanttAsImage = async () => {
    if (!ganttRef.current) {
      message.error('간트 차트를 찾을 수 없습니다')
      return
    }

    try {
      message.loading({ content: '이미지 생성 중...', key: 'download' })
      const canvas = await html2canvas(ganttRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
      })
      
      const link = document.createElement('a')
      link.download = `파렛트_일정_간트차트_${dayjs().format('YYYY-MM-DD')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      
      message.success({ content: '이미지가 다운로드되었습니다', key: 'download' })
    } catch (error) {
      console.error('이미지 다운로드 실패:', error)
      message.error({ content: '이미지 다운로드에 실패했습니다', key: 'download' })
    }
  }

  // 간트 차트 다운로드 (PDF)
  const downloadGanttAsPDF = async () => {
    if (!ganttRef.current) {
      message.error('간트 차트를 찾을 수 없습니다')
      return
    }

    try {
      message.loading({ content: 'PDF 생성 중...', key: 'download' })
      const canvas = await html2canvas(ganttRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('landscape', 'mm', 'a4')
      const imgWidth = 297 // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // 이미지가 A4보다 크면 여러 페이지로 나눔
      const pageHeight = 210 // A4 landscape height in mm
      let heightLeft = imgHeight
      let position = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      pdf.save(`파렛트_일정_간트차트_${dayjs().format('YYYY-MM-DD')}.pdf`)
      
      message.success({ content: 'PDF가 다운로드되었습니다', key: 'download' })
    } catch (error) {
      console.error('PDF 다운로드 실패:', error)
      message.error({ content: 'PDF 다운로드에 실패했습니다', key: 'download' })
    }
  }

  // 간트 차트 렌더링
  const renderGanttChart = () => {
    return (
      <div style={{ overflowX: 'auto' }} ref={ganttRef}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ 
                position: 'sticky', 
                left: 0, 
                zIndex: 10, 
                backgroundColor: '#fafafa', 
                border: '1px solid #d9d9d9',
                padding: '8px',
                minWidth: '200px',
                textAlign: 'left'
              }}>
                프로젝트
              </th>
              <th style={{ 
                position: 'sticky', 
                left: 200, 
                zIndex: 10, 
                backgroundColor: '#fafafa', 
                border: '1px solid #d9d9d9',
                padding: '8px',
                minWidth: '150px',
                textAlign: 'left'
              }}>
                고객사
              </th>
              {ganttMonthRange.map((month) => {
                const monthWeeks = ganttWeeks.filter(week => 
                  week.isSame(month, 'month') || 
                  (week.isAfter(month.startOf('month')) && week.isBefore(month.endOf('month')))
                )
                return (
                  <th key={month.format('YYYY-MM')} colSpan={monthWeeks.length} style={{ 
                    border: '1px solid #d9d9d9',
                    padding: '4px',
                    textAlign: 'center',
                    backgroundColor: '#f0f0f0'
                  }}>
                    {month.format('YYYY년 MM월')}
                  </th>
                )
              })}
            </tr>
            <tr>
              <th style={{ 
                position: 'sticky', 
                left: 0, 
                zIndex: 10, 
                backgroundColor: '#fafafa', 
                border: '1px solid #d9d9d9',
                padding: '4px'
              }}></th>
              <th style={{ 
                position: 'sticky', 
                left: 200, 
                zIndex: 10, 
                backgroundColor: '#fafafa', 
                border: '1px solid #d9d9d9',
                padding: '4px'
              }}></th>
              {ganttWeeks.map((week) => {
                const weekNumber = getWeekNumber(week)
                const weekStart = week.format('MM/DD')
                const weekEnd = week.endOf('week').format('MM/DD')
                return (
                  <th key={week.format('YYYY-MM-DD')} style={{ 
                    border: '1px solid #d9d9d9',
                    padding: '4px',
                    minWidth: '60px',
                    textAlign: 'center',
                    fontSize: '10px'
                  }}>
                    <div>{weekNumber}주차</div>
                    <div style={{ fontSize: '9px', color: '#666' }}>{weekStart}~{weekEnd}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {ganttData.map((row) => (
              <tr key={row.key}>
                <td style={{ 
                  position: 'sticky', 
                  left: 0, 
                  zIndex: 5, 
                  backgroundColor: 'white', 
                  border: '1px solid #d9d9d9',
                  padding: '8px',
                  fontWeight: 'bold'
                }}>
                  [{row.projectCode}] {row.projectName}
                </td>
                <td style={{ 
                  position: 'sticky', 
                  left: 200, 
                  zIndex: 5, 
                  backgroundColor: 'white', 
                  border: '1px solid #d9d9d9',
                  padding: '8px'
                }}>
                  {row.customer}
                </td>
                {ganttWeeks.map((week) => {
                    const weekStart = week.startOf('week')
                    const weekEnd = week.endOf('week')
                    const weekSchedules = row.schedules.filter((s: PalletSchedule) => {
                      const start = dayjs(s.startDate)
                      const end = s.endDate ? dayjs(s.endDate) : start
                      return (start.isBefore(weekEnd) || start.isSame(weekEnd)) && 
                             (end.isAfter(weekStart) || end.isSame(weekStart))
                    })
                    
                    return (
                      <td 
                        key={week.format('YYYY-MM-DD')} 
                        style={{ 
                          border: '1px solid #d9d9d9',
                          padding: '2px',
                          position: 'relative',
                          minHeight: '40px'
                        }}
                        onClick={() => {
                          if (weekSchedules.length > 0) {
                            handleEdit(weekSchedules[0])
                          }
                        }}
                      >
                        {weekSchedules.map((schedule: PalletSchedule, idx: number) => {
                          const start = dayjs(schedule.startDate)
                          const end = schedule.endDate ? dayjs(schedule.endDate) : start
                          const isStart = start.isSame(weekStart, 'week') || start.isAfter(weekStart)
                          const isEnd = end.isSame(weekEnd, 'week') || end.isBefore(weekEnd)
                          
                          return (
                            <Tooltip
                              key={schedule._id || idx}
                              title={
                                <div>
                                  <div><strong>{schedule.title}</strong></div>
                                  {schedule.palletCount && <div>팔렛트: {schedule.palletCount}개</div>}
                                  <div>상태: {getStatusText(schedule.status)}</div>
                                  <div>기간: {start.format('YYYY-MM-DD')} ~ {end.format('YYYY-MM-DD')}</div>
                                </div>
                              }
                            >
                              <div
                                style={{
                                  backgroundColor: schedule.color || '#1890ff',
                                  color: 'white',
                                  padding: '2px 4px',
                                  margin: '1px 0',
                                  borderRadius: '2px',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  opacity: schedule.status === 'completed' ? 0.7 : 1,
                                }}
                              >
                                {isStart && schedule.title}
                              </div>
                            </Tooltip>
                          )
                        })}
                      </td>
                    )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>파렛트 일정 관리</h1>
        <Space>
          <Button 
            type={viewMode === 'calendar' ? 'default' : 'primary'}
            onClick={() => setViewMode('calendar')}
          >
            캘린더
          </Button>
          <Button 
            type={viewMode === 'gantt' ? 'default' : 'primary'}
            onClick={() => setViewMode('gantt')}
          >
            간트 차트
          </Button>
          <Button 
            type="default" 
            onClick={async () => {
              try {
                // 기존 일정들의 색상을 프로젝트별로 업데이트
                const response = await api.get('/pallet-schedules?scheduleType=project')
                const allSchedules = response.data || []
                
                // 프로젝트별 색상 매핑 생성
                const projectColorMap = new Map<string, string>()
                const colors = [
                  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
                  '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911'
                ]
                let colorIndex = 0
                
                allSchedules.forEach((s: PalletSchedule) => {
                  if (s.palletProject?._id) {
                    const projectId = s.palletProject._id
                    if (!projectColorMap.has(projectId)) {
                      projectColorMap.set(projectId, colors[colorIndex % colors.length])
                      colorIndex++
                    }
                  }
                })
                
                // 프로젝트별 일정의 색상 업데이트
                const updatePromises = allSchedules
                  .filter((s: PalletSchedule) => s.palletProject?._id)
                  .map((s: PalletSchedule) => {
                    const projectColor = projectColorMap.get(s.palletProject!._id!)
                    if (projectColor && s._id) {
                      return api.put(`/pallet-schedules/${s._id}`, { color: projectColor })
                    }
                    return Promise.resolve()
                  })
                
                await Promise.all(updatePromises)
                message.success('기존 일정의 색상이 프로젝트별로 업데이트되었습니다')
                fetchSchedules()
              } catch (error: any) {
                message.error('색상 업데이트에 실패했습니다: ' + (error.response?.data?.message || error.message))
              }
            }}
          >
            색상 통일
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd()}>
            일정 추가
          </Button>
        </Space>
      </div>

      {viewMode === 'calendar' ? (
        <>

      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>파렛트 일정 요약</span>
            <Space>
            <Select
              placeholder="프로젝트 필터"
              allowClear
              style={{ width: 300 }}
              value={selectedPalletProject}
              onChange={setSelectedPalletProject}
            >
              {palletProjects.map((project) => (
                <Select.Option key={project._id} value={project._id}>
                  {project.projectCode} - {project.projectName}
                </Select.Option>
              ))}
            </Select>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'image',
                      label: '이미지로 다운로드',
                      onClick: downloadCalendarAsImage,
                    },
                    {
                      key: 'pdf',
                      label: 'PDF로 다운로드',
                      onClick: downloadCalendarAsPDF,
                    },
                  ],
                }}
                trigger={['click']}
              >
                <Button icon={<DownloadOutlined />}>다운로드</Button>
              </Dropdown>
            </Space>
          </div>
        }
        style={{ marginBottom: 16 }}
      >
        <div ref={calendarRef} style={{ height: '600px', padding: '16px' }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth'
            }}
            views={{
              dayGridMonth: {
                titleFormat: { year: 'numeric', month: 'long' }
              }
            }}
            events={[...detailEvents, ...containerEvents]}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={false}
            weekends={true}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={false}
            select={handleDateSelect}
            locale={koLocale}
            height="100%"
            eventDisplay="block"
            eventContent={(eventInfo) => {
              const eventType = eventInfo.event.extendedProps.type
              if (eventType === 'summary') {
                return renderSummaryEventContent(eventInfo)
              } else if (eventType === 'container') {
                return renderContainerEventContent(eventInfo)
              } else {
                return renderDetailEventContent(eventInfo)
              }
            }}
            eventDidMount={(info) => {
              const project = info.event.extendedProps.project
              const scheduleCount = info.event.extendedProps.scheduleCount
              const schedules = info.event.extendedProps.schedules || []
              if (project) {
                const scheduleList = schedules.map((s: PalletSchedule) => 
                  `- ${s.title}${s.palletCount ? ` (${s.palletCount}개)` : ''}`
                ).join('\n')
                info.el.setAttribute('title', 
                  `${project.projectCode} - ${project.projectName}\n${scheduleCount}건의 일정\n\n일정 목록:\n${scheduleList}`
                )
              }
            }}
          />
        </div>
      </Card>

      <Card title="프로젝트별 일정 목록" style={{ marginTop: 16 }}>
        <Tabs
          defaultActiveKey="all"
          items={[
            {
              key: 'all',
              label: '전체',
              children: (
                <div>
                  {palletProjects.map((project) => {
                    const projectSchedules = schedules.filter(
                      (s) => s.palletProject?._id === project._id
                    )
                    if (projectSchedules.length === 0) return null
                    return (
                      <div key={project._id} style={{ marginBottom: 16 }}>
                        <h3>{project.projectCode} - {project.projectName}</h3>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {projectSchedules.map((schedule) => (
                            <Card
                              key={schedule._id}
                              size="small"
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleEdit(schedule)}
                            >
                              <Space>
                                <Tag color={getStatusColor(schedule.status)}>
                                  {getStatusText(schedule.status)}
                                </Tag>
                                <span>{schedule.title}</span>
                                <span style={{ color: '#999' }}>
                                  {dayjs(schedule.startDate).format('YYYY-MM-DD')}
                                  {schedule.endDate && ` ~ ${dayjs(schedule.endDate).format('YYYY-MM-DD')}`}
                                </span>
                                {schedule.palletCount && (
                                  <span style={{ color: '#999' }}>{schedule.palletCount}개</span>
                                )}
                              </Space>
                            </Card>
                          ))}
                        </Space>
                      </div>
                    )
                  })}
                </div>
              ),
            },
            ...palletProjects.map((project) => ({
              key: project._id,
              label: project.projectCode,
              children: (
                <div>
                  {schedules
                    .filter((s) => s.palletProject?._id === project._id)
                    .map((schedule) => (
                      <Card
                        key={schedule._id}
                        size="small"
                        style={{ marginBottom: 8, cursor: 'pointer' }}
                        onClick={() => handleEdit(schedule)}
                      >
                        <Space>
                          <Tag color={getStatusColor(schedule.status)}>
                            {getStatusText(schedule.status)}
                          </Tag>
                          <span>{schedule.title}</span>
                          <span style={{ color: '#999' }}>
                            {dayjs(schedule.startDate).format('YYYY-MM-DD')}
                            {schedule.endDate && ` ~ ${dayjs(schedule.endDate).format('YYYY-MM-DD')}`}
                          </span>
                          {schedule.palletCount && (
                            <span style={{ color: '#999' }}>{schedule.palletCount}개</span>
                          )}
                        </Space>
                      </Card>
                    ))}
                </div>
              ),
            })),
          ]}
        />
      </Card>

      {/* 선택된 프로젝트의 컨테이너 목록 */}
      {selectedPalletProject && (
        <Card title="컨테이너 목록" style={{ marginTop: 16 }}>
          <Table
            columns={[
              {
                title: '컨테이너번호/추적번호',
                dataIndex: 'containerNumber',
                key: 'containerNumber',
                width: 150,
              },
              {
                title: '운송유형',
                dataIndex: 'shippingType',
                key: 'shippingType',
                width: 100,
                render: (text: string) => text === 'air' ? '항공' : '해상',
              },
              {
                title: '도착지(법인)',
                dataIndex: 'destination',
                key: 'destination',
                width: 200,
              },
              {
                title: 'ETD',
                dataIndex: 'etd',
                key: 'etd',
                width: 100,
                render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD') : '',
              },
              {
                title: '항구ETA',
                dataIndex: 'portEta',
                key: 'portEta',
                width: 100,
                render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD') : '',
              },
              {
                title: '공장ETA',
                dataIndex: 'factoryEta',
                key: 'factoryEta',
                width: 100,
                render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD') : '',
              },
              {
                title: '상태',
                dataIndex: 'status',
                key: 'status',
                width: 100,
                render: (status: string, record: Container) => {
                  const today = dayjs().startOf('day')
                  const factoryEta = record.factoryEta ? dayjs(record.factoryEta).startOf('day') : null
                  const etd = record.etd ? dayjs(record.etd).startOf('day') : null
                  
                  let displayStatus = status
                  if (status !== 'delivered') {
                    if (factoryEta && factoryEta.isBefore(today)) {
                      displayStatus = 'delayed'
                    } else if (etd && (etd.isBefore(today) || etd.isSame(today))) {
                      displayStatus = 'in-transit'
                    }
                  }
                  
                  const statusTextMap: Record<string, string> = {
                    pending: '대기중',
                    'in-transit': '운송중',
                    arrived: '도착',
                    delivered: '인도완료',
                    cancelled: '취소',
                    delayed: '지연중',
                  }
                  const statusText = statusTextMap[displayStatus] || displayStatus
                  
                  const colorMap: Record<string, string> = {
                    '대기중': 'default',
                    '운송중': 'processing',
                    '도착': 'success',
                    '인도완료': 'success',
                    '취소': 'error',
                    '지연중': 'warning',
                  }
                  return <Tag color={colorMap[statusText] || 'default'}>{statusText}</Tag>
                },
              },
            ]}
            dataSource={containers
              .filter((c) => c.palletProject?._id === selectedPalletProject)
              .map((container) => ({
                key: container._id,
                containerNumber: container.shippingType === 'air' ? (container.trackingNumber || '') : (container.containerNumber || ''),
                shippingType: container.shippingType || 'sea',
                destination: container.company ? `${container.company.code} - ${container.company.name}` : (container.destination || ''),
                etd: container.etd,
                portEta: container.portEta,
                factoryEta: container.factoryEta,
                status: container.status,
              }))}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `총 ${total}건`,
            }}
            size="small"
          />
        </Card>
      )}
        </>
      ) : (
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <span>간트 차트</span>
                <RangePicker
                  value={ganttDateRange}
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      setGanttDateRange([dates[0], dates[1]])
                    }
                  }}
                  format="YYYY-MM-DD"
                  placeholder={['시작일', '종료일']}
                />
              </Space>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'image',
                      label: '이미지로 다운로드',
                      onClick: downloadGanttAsImage,
                    },
                    {
                      key: 'pdf',
                      label: 'PDF로 다운로드',
                      onClick: downloadGanttAsPDF,
                    },
                  ],
                }}
                trigger={['click']}
              >
                <Button icon={<DownloadOutlined />}>다운로드</Button>
              </Dropdown>
            </div>
          }
        >
          <div style={{ overflowX: 'auto', maxHeight: '800px', overflowY: 'auto' }}>
            {renderGanttChart()}
          </div>
        </Card>
      )}

      <Modal
        title={editingSchedule ? '일정 수정' : '일정 등록'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="palletProject"
            label="팔렛트 프로젝트"
            rules={[{ required: true, message: '팔렛트 프로젝트를 선택하세요' }]}
          >
            <Select placeholder="팔렛트 프로젝트 선택">
              {palletProjects.map((project) => (
                <Select.Option key={project._id} value={project._id}>
                  {project.projectCode} - {project.projectName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: '제목을 입력하세요' }]}
          >
            <Input placeholder="일정 제목" />
          </Form.Item>

          <Form.Item name="description" label="설명">
            <TextArea rows={3} placeholder="일정 설명" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="시작일"
                rules={[{ required: true, message: '시작일을 선택하세요' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="종료일">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>


          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="palletCount" label="파렛트 수량">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="수량" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="상태">
                <Select>
                  <Select.Option value="scheduled">예정</Select.Option>
                  <Select.Option value="in-progress">진행중</Select.Option>
                  <Select.Option value="completed">완료</Select.Option>
                  <Select.Option value="cancelled">취소</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priority" label="우선순위">
                <Select>
                  <Select.Option value="low">낮음</Select.Option>
                  <Select.Option value="medium">보통</Select.Option>
                  <Select.Option value="high">높음</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="location" label="위치">
            <Input placeholder="위치" />
          </Form.Item>

          <Form.Item name="relatedContainer" label="관련 컨테이너">
            <Select placeholder="컨테이너 선택" allowClear>
              {containers.map((container) => (
                <Select.Option key={container._id} value={container._id}>
                  {container.containerNumber} ({container.status})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 색상 필드 제거 - 프로젝트별 색상으로 자동 할당됨 */}

          {editingSchedule && (
            <Form.Item>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  if (editingSchedule._id && window.confirm('정말 삭제하시겠습니까?')) {
                    handleDelete(editingSchedule._id)
                    setModalVisible(false)
                  }
                }}
              >
                삭제
              </Button>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default PalletSchedules

