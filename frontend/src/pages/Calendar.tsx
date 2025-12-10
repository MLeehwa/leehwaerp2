import { useState, useEffect, useMemo, useRef } from 'react'
import { Modal, Form, Input, Select, DatePicker, InputNumber, Button, message, Space, Tag, Card, Dropdown } from 'antd'
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

interface Schedule {
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
  scheduleType: 'general' | 'project' | 'personal' | 'company'
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

interface PalletProject {
  _id: string
  projectCode: string
  projectName: string
  description?: string
  status: 'active' | 'completed' | 'on-hold' | 'cancelled'
}

interface Company {
  _id: string
  code: string
  name: string
  nameEn?: string
  isActive: boolean
}

interface Category {
  _id: string
  code: string
  name: string
  description?: string
  type: 'purchase' | 'logistics' | 'expense' | 'other'
  isActive: boolean
}

const Calendar = () => {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [palletProjects, setPalletProjects] = useState<PalletProject[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [selectedPalletProject, setSelectedPalletProject] = useState<string | undefined>(undefined)
  const [selectedCompany, setSelectedCompany] = useState<string | undefined>(undefined)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined)
  const [selectedScheduleType, setSelectedScheduleType] = useState<'all' | 'general' | 'project' | 'personal' | 'company'>('all')
  const [form] = Form.useForm()
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPalletProjects()
    fetchCompanies()
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [selectedPalletProject, selectedCompany, selectedCategory, selectedScheduleType])

  const fetchPalletProjects = async () => {
    try {
      const response = await api.get('/pallet-projects?isActive=true')
      setPalletProjects(response.data || [])
    } catch (error) {
      console.error('팔렛트 프로젝트 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies?isActive=true')
      setCompanies(response.data || [])
    } catch (error) {
      console.error('법인 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchCategories = async () => {
    try {
      // 일정 관리에 적합한 카테고리만 가져오기 (logistics, other 타입만)
      // purchase 타입은 PO 관련이므로 제외
      const response = await api.get('/categories?isActive=true')
      const allCategories = response.data || []
      // logistics와 other 타입만 필터링
      const filteredCategories = allCategories.filter(
        (cat: Category) => cat.type === 'logistics' || cat.type === 'other'
      )
      setCategories(filteredCategories)
    } catch (error) {
      console.error('카테고리 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      
      // scheduleType 필터링
      if (selectedScheduleType !== 'all') {
        params.scheduleType = selectedScheduleType
      }

      // 프로젝트 필터링
      if (selectedPalletProject) {
        params.palletProjectId = selectedPalletProject
      }

      // 법인 필터링
      if (selectedCompany) {
        params.companyId = selectedCompany
      }

      // 카테고리 필터링
      if (selectedCategory) {
        params.categoryId = selectedCategory
      }

      const response = await api.get('/pallet-schedules', { params })
      let allSchedules = response.data || []

      // personal 일정은 createdBy가 현재 사용자와 일치하는 것만
      if (selectedScheduleType === 'personal' || selectedScheduleType === 'all') {
        allSchedules = allSchedules.filter((s: Schedule) => {
          if (s.scheduleType === 'personal') {
            return s.createdBy?._id === user?.id
          }
          return true
        })
      }

      setSchedules(allSchedules)
    } catch (error) {
      message.error('일정을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = (date?: Dayjs) => {
    form.resetFields()
    setEditingSchedule(null)
    const startDate = date || selectedDate
    // 기본 scheduleType 설정
    let defaultScheduleType: 'general' | 'project' | 'personal' | 'company' = 'general'
    if (selectedScheduleType !== 'all') {
      defaultScheduleType = selectedScheduleType as 'general' | 'project' | 'personal' | 'company'
    } else if (selectedPalletProject) {
      defaultScheduleType = 'project'
    } else if (selectedCompany) {
      defaultScheduleType = 'company'
    }
    
    form.setFieldsValue({
      scheduleType: defaultScheduleType,
      palletProject: selectedPalletProject || undefined,
      company: selectedCompany || undefined,
      category: selectedCategory || undefined,
      allDay: true,
      status: 'scheduled',
      priority: 'medium',
      // color 필드 제거 - 프로젝트별 색상으로 자동 할당됨
      startDate: startDate,
    })
    setModalVisible(true)
  }

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    const { color, ...scheduleWithoutColor } = schedule // color 필드 제거
    form.setFieldsValue({
      ...scheduleWithoutColor,
      scheduleType: schedule.scheduleType || 'general',
      palletProject: schedule.palletProject?._id,
      company: schedule.company?._id,
      category: schedule.category?._id,
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
      const submitData = {
        ...values,
        scheduleType: values.scheduleType || 'general',
        allDay: true,
        startDate: values.startDate?.startOf('day').toISOString(),
        endDate: values.endDate?.startOf('day').toISOString(),
      }

      // scheduleType에 따라 필수 필드 검증 및 불필요한 필드 제거
      if (submitData.scheduleType === 'personal') {
        delete submitData.palletProject
        delete submitData.company
      } else if (submitData.scheduleType === 'project') {
        if (!submitData.palletProject) {
          message.error('프로젝트별 일정인 경우 프로젝트를 선택해야 합니다')
          return
        }
        delete submitData.company
      } else if (submitData.scheduleType === 'company') {
        if (!submitData.company) {
          message.error('법인별 일정인 경우 법인을 선택해야 합니다')
          return
        }
        delete submitData.palletProject
      } else if (submitData.scheduleType === 'general') {
        delete submitData.palletProject
        delete submitData.company
      }

      // color 필드 제거 - 프로젝트별/법인별 색상으로 자동 할당되므로 저장하지 않음
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

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      scheduled: '예정',
      'in-progress': '진행중',
      completed: '완료',
      cancelled: '취소',
    }
    return texts[status] || status
  }

  // 캘린더 이벤트 생성
  const calendarEvents = useMemo(() => {
    // 필터링된 일정
    let filteredSchedules = schedules

    // 프로젝트 필터 (project 타입일 때만)
    if (selectedPalletProject && selectedScheduleType === 'project') {
      filteredSchedules = filteredSchedules.filter(s => s.palletProject?._id === selectedPalletProject)
    }

    // 법인 필터 (company 타입일 때만)
    if (selectedCompany && selectedScheduleType === 'company') {
      filteredSchedules = filteredSchedules.filter(s => s.company?._id === selectedCompany)
    }

    // 색상 팔레트 (구분이 잘 되는 색상들)
    const colorPalette = [
      '#1890ff', // 파란색
      '#52c41a', // 초록색
      '#faad14', // 주황색
      '#f5222d', // 빨간색
      '#722ed1', // 보라색
      '#13c2c2', // 청록색
      '#eb2f96', // 분홍색
      '#fa8c16', // 주황색
      '#2f54eb', // 진한 파란색
      '#a0d911', // 연두색
      '#722ed1', // 보라색
      '#fa541c', // 주황빨강
      '#096dd9', // 진한 파랑
      '#389e0d', // 진한 초록
      '#d4380d', // 진한 빨강
    ]

    // 프로젝트별 색상 매핑 (같은 프로젝트는 같은 색상)
    const projectColorMap = new Map<string, string>()
    // 법인별 색상 매핑
    const companyColorMap = new Map<string, string>()
    // 일정 유형별 기본 색상
    const typeColors: Record<string, string> = {
      'general': '#1890ff',
      'project': '#722ed1',
      'company': '#fa8c16',
      'personal': '#52c41a',
    }

    // 프로젝트별 색상 할당
    let projectColorIndex = 0
    filteredSchedules.forEach((schedule) => {
      if (schedule.scheduleType === 'project' && schedule.palletProject?._id) {
        const projectId = schedule.palletProject._id
        if (!projectColorMap.has(projectId)) {
          projectColorMap.set(projectId, colorPalette[projectColorIndex % colorPalette.length])
          projectColorIndex++
        }
      }
    })

    // 법인별 색상 할당
    let companyColorIndex = 0
    filteredSchedules.forEach((schedule) => {
      if (schedule.scheduleType === 'company' && schedule.company?._id) {
        const companyId = schedule.company._id
        if (!companyColorMap.has(companyId)) {
          companyColorMap.set(companyId, colorPalette[companyColorIndex % colorPalette.length])
          companyColorIndex++
        }
      }
    })

    // 같은 월에 겹치는 일정들을 그룹화하여 색상 충돌 방지
    const monthOverlapMap = new Map<string, Set<string>>() // 월별 겹치는 프로젝트/법인 추적
    
    filteredSchedules.forEach((schedule) => {
      const start = dayjs(schedule.startDate)
      const end = schedule.endDate ? dayjs(schedule.endDate) : start
      
      // 일정이 포함된 모든 월을 추적
      let currentMonth = start.startOf('month')
      const endMonth = end.endOf('month')
      
      while (currentMonth.isBefore(endMonth) || currentMonth.isSame(endMonth, 'month')) {
        const monthKey = currentMonth.format('YYYY-MM')
        
        if (!monthOverlapMap.has(monthKey)) {
          monthOverlapMap.set(monthKey, new Set())
        }
        
        const overlapSet = monthOverlapMap.get(monthKey)!
        
        // 프로젝트별 일정인 경우
        if (schedule.scheduleType === 'project' && schedule.palletProject?._id) {
          overlapSet.add(`project-${schedule.palletProject._id}`)
        }
        // 법인별 일정인 경우
        else if (schedule.scheduleType === 'company' && schedule.company?._id) {
          overlapSet.add(`company-${schedule.company._id}`)
        }
        
        currentMonth = currentMonth.add(1, 'month')
      }
    })

    return filteredSchedules.map((schedule) => {
      // 프로젝트별/법인별 색상으로 통일 (기존 개별 색상 무시)
      let backgroundColor: string
      
      // 프로젝트별 일정인 경우 프로젝트 색상 사용
      if (schedule.scheduleType === 'project' && schedule.palletProject?._id) {
        backgroundColor = projectColorMap.get(schedule.palletProject._id) || typeColors['project']
      }
      // 법인별 일정인 경우 법인 색상 사용
      else if (schedule.scheduleType === 'company' && schedule.company?._id) {
        backgroundColor = companyColorMap.get(schedule.company._id) || typeColors['company']
      }
      // 그 외는 일정 유형별 색상 사용
      else {
        backgroundColor = typeColors[schedule.scheduleType] || typeColors['general']
      }
      
      // 제목에 법인/카테고리 정보 추가
      let title = schedule.title
      if (schedule.palletCount) title += ` (${schedule.palletCount}개)`
      if (schedule.company) title += ` [${schedule.company.code}]`
      if (schedule.category) title += ` [${schedule.category.code}]`
      
      return {
        id: schedule._id,
        title: title,
        start: schedule.startDate,
        end: schedule.endDate || schedule.startDate,
        backgroundColor: backgroundColor,
        borderColor: backgroundColor,
        editable: true,
        durationEditable: false,
        extendedProps: {
          schedule: schedule,
          scheduleType: schedule.scheduleType,
          projectCode: schedule.palletProject?.projectCode || '',
          projectName: schedule.palletProject?.projectName || '',
          companyCode: schedule.company?.code || '',
          companyName: schedule.company?.name || '',
          categoryCode: schedule.category?.code || '',
          categoryName: schedule.category?.name || '',
          palletCount: schedule.palletCount,
          status: schedule.status,
          description: schedule.description,
        },
      }
    })
  }, [schedules, selectedPalletProject, selectedCompany, selectedScheduleType])

  const handleEventClick = (clickInfo: EventClickArg) => {
    const schedule = clickInfo.event.extendedProps.schedule as Schedule
    if (schedule) {
      handleEdit(schedule)
    }
  }

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const startDate = dayjs(selectInfo.start)
    handleAdd(startDate)
    selectInfo.view.calendar.unselect()
  }

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const schedule = dropInfo.event.extendedProps.schedule as Schedule
    if (!schedule || !schedule._id) {
      dropInfo.revert()
      return
    }

    try {
      const newStartDate = dropInfo.event.start
      const newEndDate = dropInfo.event.end

      await api.put(`/pallet-schedules/${schedule._id}`, {
        startDate: newStartDate ? dayjs(newStartDate).startOf('day').toISOString() : undefined,
        endDate: newEndDate ? dayjs(newEndDate).startOf('day').toISOString() : undefined,
      })
      message.success('일정이 이동되었습니다')
      fetchSchedules()
    } catch (error: any) {
      message.error(error.response?.data?.message || '일정 이동에 실패했습니다')
      dropInfo.revert()
    }
  }

  // 캘린더 다운로드 (이미지)
  const downloadCalendarAsImage = async () => {
    if (!calendarRef.current) {
      message.error('캘린더를 찾을 수 없습니다')
      return
    }

    try {
      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      })
      const imgData = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `일정_캘린더_${dayjs().format('YYYY-MM-DD')}.png`
      link.href = imgData
      link.click()
      message.success({ content: '이미지로 다운로드되었습니다', key: 'download' })
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
      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      })
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      const pdf = new jsPDF('p', 'mm', 'a4')
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`일정_캘린더_${dayjs().format('YYYY-MM-DD')}.pdf`)
      message.success({ content: 'PDF로 다운로드되었습니다', key: 'download' })
    } catch (error) {
      console.error('PDF 다운로드 실패:', error)
      message.error({ content: 'PDF 다운로드에 실패했습니다', key: 'download' })
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>일정 관리</h1>
        <Space>
          <Button 
            type="default" 
            onClick={async () => {
              try {
                // 기존 일정들의 색상을 프로젝트별로 업데이트
                const response = await api.get('/pallet-schedules')
                const allSchedules = response.data || []
                
                // 프로젝트별 색상 매핑 생성
                const projectColorMap = new Map<string, string>()
                const colorPalette = [
                  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
                  '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911',
                  '#722ed1', '#fa541c', '#096dd9', '#389e0d', '#d4380d',
                ]
                let colorIndex = 0
                
                allSchedules.forEach((s: Schedule) => {
                  if (s.scheduleType === 'project' && s.palletProject?._id) {
                    const projectId = s.palletProject._id
                    if (!projectColorMap.has(projectId)) {
                      projectColorMap.set(projectId, colorPalette[colorIndex % colorPalette.length])
                      colorIndex++
                    }
                  }
                })
                
                // 프로젝트별 일정의 색상 업데이트
                const updatePromises = allSchedules
                  .filter((s: Schedule) => s.scheduleType === 'project' && s.palletProject?._id)
                  .map((s: Schedule) => {
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

      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>전체 일정</span>
            <Space wrap>
              <Select
                placeholder="일정 유형"
                style={{ width: 150 }}
                value={selectedScheduleType}
                onChange={(value) => {
                  setSelectedScheduleType(value)
                  // 일정 유형 변경 시 관련 필터 초기화
                  if (value !== 'project') setSelectedPalletProject(undefined)
                  if (value !== 'company') setSelectedCompany(undefined)
                }}
              >
                <Select.Option value="all">전체</Select.Option>
                <Select.Option value="general">전체 일정</Select.Option>
                <Select.Option value="project">프로젝트 일정</Select.Option>
                <Select.Option value="company">법인 일정</Select.Option>
                <Select.Option value="personal">개인 일정</Select.Option>
              </Select>
              {selectedScheduleType === 'project' && (
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
              )}
              {selectedScheduleType === 'company' && (
                <Select
                  placeholder="법인 필터"
                  allowClear
                  style={{ width: 250 }}
                  value={selectedCompany}
                  onChange={setSelectedCompany}
                >
                  {companies.map((company) => (
                    <Select.Option key={company._id} value={company._id}>
                      {company.code} - {company.name}
                    </Select.Option>
                  ))}
                </Select>
              )}
              <Select
                placeholder="카테고리 필터"
                allowClear
                style={{ width: 200 }}
                value={selectedCategory}
                onChange={setSelectedCategory}
              >
                {categories.map((category) => (
                  <Select.Option key={category._id} value={category._id}>
                    {category.code} - {category.name}
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
            events={calendarEvents}
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
          />
        </div>
      </Card>

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
            name="scheduleType"
            label="일정 유형"
            rules={[{ required: true, message: '일정 유형을 선택하세요' }]}
          >
            <Select placeholder="일정 유형 선택">
              <Select.Option value="general">전체 일정</Select.Option>
              <Select.Option value="project">프로젝트 일정</Select.Option>
              <Select.Option value="company">법인 일정</Select.Option>
              <Select.Option value="personal">개인 일정</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.scheduleType !== currentValues.scheduleType}
          >
            {({ getFieldValue }) => {
              const scheduleType = getFieldValue('scheduleType')
              return (
                <>
                  {scheduleType === 'project' && (
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
                  )}
                  {scheduleType === 'company' && (
                    <Form.Item
                      name="company"
                      label="법인"
                      rules={[{ required: true, message: '법인을 선택하세요' }]}
                    >
                      <Select placeholder="법인 선택">
                        {companies.map((company) => (
                          <Select.Option key={company._id} value={company._id}>
                            {company.code} - {company.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )}
                </>
              )
            }}
          </Form.Item>

          <Form.Item
            name="category"
            label="카테고리"
            tooltip="일정을 분류하기 위한 카테고리를 선택하세요"
          >
            <Select placeholder="카테고리 선택 (선택사항)" allowClear>
              {categories.map((category) => (
                <Select.Option key={category._id} value={category._id}>
                  {category.code} - {category.name} {category.type && `(${category.type})`}
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

          <Space style={{ width: '100%' }} direction="vertical">
            <Space>
              <Form.Item
                name="startDate"
                label="시작일"
                rules={[{ required: true, message: '시작일을 선택하세요' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
              <Form.Item name="endDate" label="종료일">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Space>
          </Space>

          <Space style={{ width: '100%' }} direction="vertical">
            <Space>
              <Form.Item name="palletCount" label="파렛트 수량">
                <InputNumber min={0} placeholder="수량" />
              </Form.Item>
              <Form.Item name="status" label="상태">
                <Select style={{ width: 150 }}>
                  <Select.Option value="scheduled">예정</Select.Option>
                  <Select.Option value="in-progress">진행중</Select.Option>
                  <Select.Option value="completed">완료</Select.Option>
                  <Select.Option value="cancelled">취소</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="priority" label="우선순위">
                <Select style={{ width: 150 }}>
                  <Select.Option value="low">낮음</Select.Option>
                  <Select.Option value="medium">보통</Select.Option>
                  <Select.Option value="high">높음</Select.Option>
                </Select>
              </Form.Item>
            </Space>
          </Space>

          <Form.Item name="location" label="위치">
            <Input placeholder="위치" />
          </Form.Item>

          {/* 색상 필드 제거 - 프로젝트별/법인별 색상으로 자동 할당됨 */}

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

export default Calendar

