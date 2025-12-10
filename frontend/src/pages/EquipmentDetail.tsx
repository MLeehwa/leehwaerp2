import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Card, 
  Descriptions, 
  Tag, 
  Tabs, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  DatePicker, 
  InputNumber, 
  Select, 
  message,
  Space
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import api from '../utils/api'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { TextArea } = Input
const { TabPane } = Tabs

interface Equipment {
  _id: string
  equipmentCode: string
  equipmentName: string
  assetType: 'asset' | 'equipment'
  managedBy: 'hr' | 'operation' | 'admin'
  company?: { _id: string; code: string; name: string; currency?: string }
  category: string
  subCategory: string
  manufacturer?: string
  equipmentModel?: string
  serialNumber?: string
  alias?: string
  location?: string
  status: 'active' | 'inactive' | 'maintenance' | 'retired'
  description?: string
}

interface MaintenanceSchedule {
  _id: string
  scheduleNumber: string
  scheduleType: 'repair' | 'maintenance' // 수리, 점검
  title?: string
  scheduledDate: string
  dueDate: string
  status: 'in-progress' | 'completed' | 'cancelled'
  completedDate?: string
  description: string
  notes?: string
  laborCost?: number
  materialCost?: number
  totalCost?: number
  currency?: string
  attachments?: Array<{
    fileName: string
    filePath: string
    fileSize?: number
    uploadedAt: string
  }>
}

const EquipmentDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [loading] = useState(false)
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null)
  const [scheduleForm] = Form.useForm()
  const [equipmentCurrency, setEquipmentCurrency] = useState<string>('USD')

  useEffect(() => {
    if (id) {
      fetchEquipment()
      fetchSchedules()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchEquipment = async () => {
    try {
      const response = await api.get(`/maintenance/equipment/${id}`)
      setEquipment(response.data)
      if (response.data?.company?.currency) {
        setEquipmentCurrency(response.data.company.currency)
      }
    } catch (error) {
      message.error('설비 정보를 불러오는데 실패했습니다')
      navigate('/operation/maintenance/equipment')
    }
  }

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/maintenance/schedules', {
        params: { equipment: id },
      })
      setSchedules(response.data || [])
    } catch (error) {
      console.error('이력을 불러오는데 실패했습니다')
    }
  }

  // 이력 등록 관련 함수들
  const handleAddSchedule = () => {
    scheduleForm.resetFields()
    scheduleForm.setFieldsValue({
      scheduledDate: dayjs(), // 발생일
      scheduleType: 'maintenance', // 기본값은 점검
      status: 'completed', // 점검 이력은 기본적으로 완료 상태
    })
    setEditingSchedule(null)
    setScheduleModalVisible(true)
  }

  const handleEditSchedule = (schedule: MaintenanceSchedule) => {
    scheduleForm.setFieldsValue({
      ...schedule,
      scheduledDate: schedule.scheduledDate ? dayjs(schedule.scheduledDate) : undefined,
      completedDate: schedule.completedDate ? dayjs(schedule.completedDate) : undefined,
    })
    setEditingSchedule(schedule)
    setScheduleModalVisible(true)
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      await api.delete(`/maintenance/schedules/${scheduleId}`)
      message.success('이력이 삭제되었습니다')
      fetchSchedules()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined
      message.error(errorMessage || '이력 삭제에 실패했습니다')
    }
  }

  const handleScheduleSubmit = async (values: Record<string, unknown>) => {
    try {
      const scheduleType = values.scheduleType as string
      const status = values.status as string
      
      // 점검 이력이거나 완료 상태인 경우에만 completedDate 필수
      const completedDate = values.completedDate && typeof values.completedDate === 'object' && 'format' in values.completedDate
        ? (values.completedDate as { format: (format: string) => string }).format('YYYY-MM-DD')
        : undefined
      if ((scheduleType === 'maintenance' || status === 'completed') && !completedDate) {
        message.error('완료일을 입력하세요')
        return
      }

      const scheduledDate = values.scheduledDate && typeof values.scheduledDate === 'object' && 'format' in values.scheduledDate
        ? (values.scheduledDate as { format: (format: string) => string }).format('YYYY-MM-DD')
        : undefined

      const submitData = {
        ...values,
        equipment: id,
        scheduledDate,
        dueDate: scheduledDate, // dueDate는 scheduledDate와 동일하게 설정
        completedDate,
        totalCost: values.totalCost || undefined,
        currency: equipmentCurrency,
      }

      if (editingSchedule?._id) {
        await api.put(`/maintenance/schedules/${editingSchedule._id}`, submitData)
        message.success('이력이 수정되었습니다')
        
        // 수리 이력 상태 변경 시 설비 상태 업데이트
        if (scheduleType === 'repair' && id) {
          if (status === 'in-progress') {
            // 수리 진행 중이면 설비 상태를 'maintenance'로 변경
            await api.put(`/maintenance/equipment/${id}`, { status: 'maintenance' })
          } else if (status === 'completed') {
            // 수리 완료되면 설비 상태를 'active'로 복구
            await api.put(`/maintenance/equipment/${id}`, { status: 'active' })
          }
        }
      } else {
        await api.post('/maintenance/schedules', submitData)
        message.success('이력이 등록되었습니다')
        
        // 수리 이력 등록 시 설비 상태 업데이트
        if (scheduleType === 'repair' && status === 'in-progress' && id) {
          await api.put(`/maintenance/equipment/${id}`, { status: 'maintenance' })
        }
      }
      setScheduleModalVisible(false)
      fetchSchedules()
      fetchEquipment() // 설비 정보 새로고침
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined
      message.error(errorMessage || '이력 저장에 실패했습니다')
    }
  }

  const scheduleColumns: ColumnsType<MaintenanceSchedule> = [
    {
      title: '일정 번호',
      dataIndex: 'scheduleNumber',
      key: 'scheduleNumber',
      width: 150,
    },
    {
      title: '유형',
      dataIndex: 'scheduleType',
      key: 'scheduleType',
      width: 100,
      render: (type: string) => {
        const types: Record<string, string> = {
          repair: '수리 이력',
          maintenance: '점검 이력',
        }
        return types[type] || type
      },
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '발생일',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          'in-progress': 'red',
          completed: 'green',
        }
        const texts: Record<string, string> = {
          'in-progress': '고장',
          completed: '완료',
        }
        return <Tag color={colors[status]}>{texts[status]}</Tag>
      },
    },
    {
      title: '완료일',
      dataIndex: 'completedDate',
      key: 'completedDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '작업',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditSchedule(record)}
          >
            수정
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              if (window.confirm('정말 삭제하시겠습니까?')) {
                handleDeleteSchedule(record._id)
              }
            }}
          >
            삭제
          </Button>
        </Space>
      ),
    },
  ]


  if (!equipment) {
    return <div>로딩 중...</div>
  }

  // 이력 정렬 (최신순)
  const sortedSchedules = [...schedules].sort((a, b) => {
    const dateA = a.completedDate || a.scheduledDate
    const dateB = b.completedDate || b.scheduledDate
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })

  return (
    <div style={{ padding: '24px' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/operation/maintenance/equipment')}
        style={{ marginBottom: '16px' }}
      >
        목록으로
      </Button>

      <Card title="설비 정보" style={{ marginBottom: '16px' }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="설비 코드">{equipment.equipmentCode}</Descriptions.Item>
          <Descriptions.Item label="설비명">{equipment.equipmentName}</Descriptions.Item>
          <Descriptions.Item label="대분류">{equipment.category}</Descriptions.Item>
          <Descriptions.Item label="소분류">{equipment.subCategory}</Descriptions.Item>
          <Descriptions.Item label="제조사">{equipment.manufacturer || '-'}</Descriptions.Item>
          <Descriptions.Item label="모델">{equipment.equipmentModel || '-'}</Descriptions.Item>
          <Descriptions.Item label="시리얼 번호">{equipment.serialNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="별칭">{equipment.alias || '-'}</Descriptions.Item>
          <Descriptions.Item label="위치">{equipment.location || '-'}</Descriptions.Item>
          <Descriptions.Item label="상태">
            <Tag color={equipment.status === 'active' ? 'green' : 'default'}>
              {equipment.status === 'active' ? '운영중' : equipment.status}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs defaultActiveKey="schedules">
          <TabPane tab="이력 관리" key="schedules">
            <div style={{ marginBottom: '16px' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddSchedule}
              >
                이력 등록
              </Button>
            </div>
            <Table
              columns={scheduleColumns}
              dataSource={sortedSchedules}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 이력 등록 모달 */}
      <Modal
        title={editingSchedule ? '이력 수정' : '이력 등록'}
        open={scheduleModalVisible}
        onCancel={() => setScheduleModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={scheduleForm}
          layout="vertical"
          onFinish={handleScheduleSubmit}
        >
          <Form.Item
            name="scheduleType"
            label="유형"
            rules={[{ required: true, message: '유형을 선택하세요' }]}
          >
            <Select
              onChange={(value) => {
                // 점검 이력은 기본적으로 완료 상태, 수리 이력은 고장 상태
                if (value === 'maintenance') {
                  scheduleForm.setFieldsValue({ status: 'completed' })
                } else if (value === 'repair') {
                  scheduleForm.setFieldsValue({ status: 'in-progress' })
                }
              }}
            >
              <Select.Option value="repair">수리 이력</Select.Option>
              <Select.Option value="maintenance">점검 이력</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="설명"
            rules={[{ required: true, message: '설명을 입력하세요' }]}
          >
            <TextArea rows={4} placeholder="이력 설명을 입력하세요" />
          </Form.Item>

          <Form.Item
            name="scheduledDate"
            label="발생일"
            rules={[{ required: true, message: '발생일을 선택하세요' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="status"
            label="상태"
            rules={[{ required: true, message: '상태를 선택하세요' }]}
          >
            <Select>
              <Select.Option value="in-progress">고장</Select.Option>
              <Select.Option value="completed">완료</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="completedDate"
            label="완료일"
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value) => {
                  const scheduleType = getFieldValue('scheduleType')
                  const status = getFieldValue('status')
                  // 점검 이력이거나 완료 상태인 경우에만 필수
                  if ((scheduleType === 'maintenance' || status === 'completed') && !value) {
                    return Promise.reject(new Error('완료일을 선택하세요'))
                  }
                  return Promise.resolve()
                },
              }),
            ]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="totalCost"
            label={`비용 (${equipmentCurrency})`}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value) => {
                  const status = getFieldValue('status')
                  // 완료 상태일 때 비용 필수
                  if (status === 'completed' && !value) {
                    return Promise.reject(new Error('완료 처리 시 비용을 입력하세요'))
                  }
                  return Promise.resolve()
                },
              }),
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => {
                if (!value) return ''
                const currencySymbols: Record<string, string> = {
                  USD: '$',
                  KRW: '₩',
                  MXN: '$',
                }
                const symbol = currencySymbols[equipmentCurrency] || equipmentCurrency
                return `${symbol} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }}
              // parser는 formatter와 함께 사용 시 자동으로 처리됨
              min={0}
              placeholder="비용을 입력하세요 (완료 시 필수)"
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="비고"
          >
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                저장
              </Button>
              <Button onClick={() => setScheduleModalVisible(false)}>
                취소
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default EquipmentDetail
