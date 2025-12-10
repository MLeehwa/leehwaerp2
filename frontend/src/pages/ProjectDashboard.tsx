import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Row, Col, Select, Table, Tag, Space, Button, message, Statistic, Calendar, List, Empty } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'

interface PalletSchedule {
  _id: string
  title: string
  description?: string
  startDate: string
  endDate?: string
  palletCount?: number
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high'
  location?: string
  relatedContainer?: {
    _id: string
    containerNumber: string
  }
  color?: string
}

interface Container {
  _id: string
  containerNumber: string
  origin: string
  destination: string
  shippingLine?: string
  vesselName?: string
  etd?: string
  eta?: string
  atd?: string
  ata?: string
  status: 'pending' | 'in-transit' | 'arrived' | 'delivered' | 'cancelled'
  palletCount?: number
  partCount?: number
}

interface Project {
  _id: string
  projectCode: string
  projectName: string
}

const ProjectDashboard = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [schedules, setSchedules] = useState<PalletSchedule[]>([])
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchSchedules()
      fetchContainers()
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`)
      setProject(response.data)
    } catch (error) {
      message.error('프로젝트 정보를 불러오는데 실패했습니다')
    }
  }

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/pallet-schedules?projectId=${projectId}`)
      setSchedules(response.data || [])
    } catch (error) {
      message.error('파렛트 일정을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchContainers = async () => {
    try {
      const response = await api.get(`/containers?projectId=${projectId}`)
      setContainers(response.data || [])
    } catch (error) {
      message.error('컨테이너 정보를 불러오는데 실패했습니다')
    }
  }

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD')
    const daySchedules = schedules.filter((schedule) => {
      const start = dayjs(schedule.startDate).format('YYYY-MM-DD')
      const end = schedule.endDate ? dayjs(schedule.endDate).format('YYYY-MM-DD') : start
      return dateStr >= start && dateStr <= end
    })

    return (
      <div style={{ minHeight: '60px' }}>
        {daySchedules.map((schedule) => (
          <div
            key={schedule._id}
            style={{
              backgroundColor: schedule.color || '#1890ff',
              color: 'white',
              padding: '2px 4px',
              margin: '2px 0',
              borderRadius: '2px',
              fontSize: '11px',
              cursor: 'pointer',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={schedule.title}
          >
            {schedule.title}
          </div>
        ))}
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'blue',
      'in-progress': 'orange',
      completed: 'green',
      cancelled: 'red',
      pending: 'default',
      'in-transit': 'processing',
      arrived: 'success',
      delivered: 'success',
    }
    return colors[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      scheduled: '예정',
      'in-progress': '진행중',
      completed: '완료',
      cancelled: '취소',
      pending: '대기중',
      'in-transit': '운송중',
      arrived: '도착',
      delivered: '인도완료',
    }
    return texts[status] || status
  }

  const containerColumns: ColumnsType<Container> = [
    {
      title: '컨테이너 번호',
      dataIndex: 'containerNumber',
      key: 'containerNumber',
    },
    {
      title: '출발지',
      dataIndex: 'origin',
      key: 'origin',
    },
    {
      title: '도착지',
      dataIndex: 'destination',
      key: 'destination',
    },
    {
      title: 'ETA',
      dataIndex: 'eta',
      key: 'eta',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: 'ATA',
      dataIndex: 'ata',
      key: 'ata',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '파렛트 수량',
      dataIndex: 'palletCount',
      key: 'palletCount',
      render: (count) => count || '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
  ]

  const scheduleColumns: ColumnsType<PalletSchedule> = [
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '시작일',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '종료일',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '파렛트 수량',
      dataIndex: 'palletCount',
      key: 'palletCount',
      render: (count) => count || '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
  ]

  if (!project) {
    return <div>프로젝트를 불러오는 중...</div>
  }

  const upcomingSchedules = schedules
    .filter(s => s.status !== 'completed' && s.status !== 'cancelled')
    .sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf())
    .slice(0, 5)

  const inTransitContainers = containers.filter(c => c.status === 'in-transit')

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/production/pallet-schedules')}>
            뒤로
          </Button>
          <h1>{project.projectCode} - {project.projectName}</h1>
        </Space>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/production/pallet-schedules?projectId=${projectId}`)}>
            일정 추가
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/production/containers?projectId=${projectId}`)}>
            컨테이너 등록
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="전체 일정"
              value={schedules.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="진행중 일정"
              value={schedules.filter(s => s.status === 'in-progress').length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="전체 컨테이너"
              value={containers.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="운송중 컨테이너"
              value={inTransitContainers.length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="파렛트 일정 캘린더" style={{ marginBottom: 16 }}>
            <Calendar cellRender={dateCellRender} mode="month" />
          </Card>

          <Card title="파렛트 일정 목록">
            <Table
              columns={scheduleColumns}
              dataSource={schedules}
              loading={loading}
              rowKey="_id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="다가오는 일정" style={{ marginBottom: 16 }}>
            {upcomingSchedules.length > 0 ? (
              <List
                dataSource={upcomingSchedules}
                renderItem={(schedule) => (
                  <List.Item>
                    <List.Item.Meta
                      title={schedule.title}
                      description={
                        <Space>
                          <span>{dayjs(schedule.startDate).format('MM-DD')}</span>
                          {schedule.palletCount && <span>{schedule.palletCount}개</span>}
                          <Tag color={getStatusColor(schedule.status)} size="small">
                            {getStatusText(schedule.status)}
                          </Tag>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="다가오는 일정이 없습니다" />
            )}
          </Card>

          <Card title="운송중인 컨테이너">
            {inTransitContainers.length > 0 ? (
              <List
                dataSource={inTransitContainers}
                renderItem={(container) => (
                  <List.Item>
                    <List.Item.Meta
                      title={container.containerNumber}
                      description={
                        <Space direction="vertical" size="small">
                          <span>{container.origin} → {container.destination}</span>
                          {container.eta && (
                            <span>ETA: {dayjs(container.eta).format('YYYY-MM-DD')}</span>
                          )}
                          {container.palletCount && <span>파렛트: {container.palletCount}개</span>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="운송중인 컨테이너가 없습니다" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ProjectDashboard

