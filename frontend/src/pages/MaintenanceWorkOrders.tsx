import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Space, Tag, Select, DatePicker, InputNumber, Descriptions } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, CheckCircleOutlined, UserOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { TextArea } = Input

interface WorkOrder {
  _id?: string
  workOrderNumber: string
  equipment: any
  schedule?: any
  workOrderType: 'preventive' | 'corrective' | 'emergency' | 'inspection'
  title: string
  description?: string
  reportedBy?: any
  reportedDate?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'requested' | 'assigned' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold'
  assignedTo?: any
  assignedDate?: string
  startedDate?: string
  completedDate?: string
  completedBy?: any
  estimatedDuration?: number
  actualDuration?: number
  laborCost?: number
  materialCost?: number
  totalCost?: number
  partsUsed?: Array<{ partName: string; quantity: number; unitCost?: number; totalCost?: number }>
  workPerformed?: string
  rootCause?: string
  resolution?: string
  notes?: string
  createdAt?: string
}

interface Equipment {
  _id: string
  equipmentCode: string
  equipmentName: string
}

const MaintenanceWorkOrders = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterType, setFilterType] = useState<string | undefined>(undefined)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchEquipment()
    fetchWorkOrders()
  }, [filterStatus, filterType])

  const fetchEquipment = async () => {
    try {
      const response = await api.get('/maintenance/equipment?status=active')
      setEquipment(response.data || [])
    } catch (error) {
      console.error('설비 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchWorkOrders = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filterStatus) params.status = filterStatus
      if (filterType) params.workOrderType = filterType

      const response = await api.get('/maintenance/work-orders', { params })
      setWorkOrders(response.data || [])
    } catch (error) {
      message.error('작업 지시를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    form.resetFields()
    form.setFieldsValue({
      workOrderType: 'corrective',
      priority: 'medium',
      reportedDate: dayjs(),
    })
    setEditingWorkOrder(null)
    setModalVisible(true)
  }

  const handleEdit = (wo: WorkOrder) => {
    const formValues = {
      ...wo,
      reportedDate: wo.reportedDate ? dayjs(wo.reportedDate) : undefined,
      assignedDate: wo.assignedDate ? dayjs(wo.assignedDate) : undefined,
      startedDate: wo.startedDate ? dayjs(wo.startedDate) : undefined,
      completedDate: wo.completedDate ? dayjs(wo.completedDate) : undefined,
    }
    form.setFieldsValue(formValues)
    setEditingWorkOrder(wo)
    setModalVisible(true)
  }

  const handleView = async (id: string) => {
    try {
      const response = await api.get(`/maintenance/work-orders/${id}`)
      setSelectedWorkOrder(response.data)
      setDetailModalVisible(true)
    } catch (error: any) {
      message.error(error.response?.data?.message || '작업 지시 상세를 불러오는데 실패했습니다')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/maintenance/work-orders/${id}`)
      message.success('작업 지시가 삭제되었습니다')
      fetchWorkOrders()
    } catch (error: any) {
      message.error(error.response?.data?.message || '작업 지시 삭제에 실패했습니다')
    }
  }

  const handleAssign = async (id: string) => {
    try {
      await api.put(`/maintenance/work-orders/${id}/assign`, {
        assignedTo: null, // 실제로는 사용자 선택 필요
      })
      message.success('작업 지시가 할당되었습니다')
      fetchWorkOrders()
    } catch (error: any) {
      message.error(error.response?.data?.message || '할당 처리에 실패했습니다')
    }
  }

  const handleStart = async (id: string) => {
    try {
      await api.put(`/maintenance/work-orders/${id}/start`)
      message.success('작업이 시작되었습니다')
      fetchWorkOrders()
    } catch (error: any) {
      message.error(error.response?.data?.message || '시작 처리에 실패했습니다')
    }
  }

  const handleComplete = async (id: string) => {
    try {
      await api.put(`/maintenance/work-orders/${id}/complete`, {
        actualDuration: 0,
      })
      message.success('작업이 완료되었습니다')
      fetchWorkOrders()
    } catch (error: any) {
      message.error(error.response?.data?.message || '완료 처리에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        equipment: values.equipment,
        reportedDate: values.reportedDate ? values.reportedDate.toISOString() : undefined,
        assignedDate: values.assignedDate ? values.assignedDate.toISOString() : undefined,
        startedDate: values.startedDate ? values.startedDate.toISOString() : undefined,
        completedDate: values.completedDate ? values.completedDate.toISOString() : undefined,
      }

      if (editingWorkOrder?._id) {
        await api.put(`/maintenance/work-orders/${editingWorkOrder._id}`, submitData)
        message.success('작업 지시가 수정되었습니다')
      } else {
        await api.post('/maintenance/work-orders', submitData)
        message.success('작업 지시가 생성되었습니다')
      }
      setModalVisible(false)
      fetchWorkOrders()
    } catch (error: any) {
      message.error(error.response?.data?.message || '작업 지시 저장에 실패했습니다')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      requested: 'blue',
      assigned: 'cyan',
      'in-progress': 'orange',
      completed: 'green',
      cancelled: 'default',
      'on-hold': 'purple',
    }
    return colors[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      requested: '요청',
      assigned: '할당',
      'in-progress': '진행중',
      completed: '완료',
      cancelled: '취소',
      'on-hold': '보류',
    }
    return texts[status] || status
  }

  const columns: ColumnsType<WorkOrder> = [
    {
      title: '작업 지시 번호',
      dataIndex: 'workOrderNumber',
      key: 'workOrderNumber',
      width: 150,
    },
    {
      title: '설비',
      key: 'equipment',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.equipment?.equipmentCode}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.equipment?.equipmentName}</div>
        </div>
      ),
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '유형',
      dataIndex: 'workOrderType',
      key: 'workOrderType',
      width: 100,
      render: (type: string) => {
        const types: Record<string, string> = {
          preventive: '예방',
          corrective: '수정',
          emergency: '긴급',
          inspection: '점검',
        }
        return types[type] || type
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
    },
    {
      title: '우선순위',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => <Tag color={priority === 'urgent' ? 'red' : priority === 'high' ? 'orange' : 'blue'}>{priority.toUpperCase()}</Tag>,
    },
    {
      title: '작업',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleView(record._id!)}>
            상세
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            수정
          </Button>
          {record.status === 'requested' && (
            <Button type="link" icon={<UserOutlined />} onClick={() => record._id && handleAssign(record._id)}>
              할당
            </Button>
          )}
          {record.status === 'assigned' && (
            <Button type="link" icon={<PlayCircleOutlined />} onClick={() => record._id && handleStart(record._id)}>
              시작
            </Button>
          )}
          {record.status === 'in-progress' && (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => record._id && handleComplete(record._id)}
            >
              완료
            </Button>
          )}
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              if (record._id && window.confirm('정말 삭제하시겠습니까?')) {
                handleDelete(record._id)
              }
            }}
          >
            삭제
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>작업 지시</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          작업 지시 추가
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="상태"
          value={filterStatus}
          onChange={setFilterStatus}
          allowClear
          style={{ width: 120 }}
        >
          <Select.Option value="requested">요청</Select.Option>
          <Select.Option value="assigned">할당</Select.Option>
          <Select.Option value="in-progress">진행중</Select.Option>
          <Select.Option value="completed">완료</Select.Option>
        </Select>
        <Select
          placeholder="유형"
          value={filterType}
          onChange={setFilterType}
          allowClear
          style={{ width: 120 }}
        >
          <Select.Option value="preventive">예방</Select.Option>
          <Select.Option value="corrective">수정</Select.Option>
          <Select.Option value="emergency">긴급</Select.Option>
          <Select.Option value="inspection">점검</Select.Option>
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={workOrders}
        loading={loading}
        rowKey="_id"
        locale={{ emptyText: '등록된 작업 지시가 없습니다' }}
      />

      <Modal
        title={editingWorkOrder ? '작업 지시 수정' : '작업 지시 추가'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="equipment"
            label="설비"
            rules={[{ required: true, message: '설비를 선택하세요' }]}
          >
            <Select placeholder="설비 선택" showSearch optionFilterProp="children">
              {equipment.map((eq) => (
                <Select.Option key={eq._id} value={eq._id}>
                  {eq.equipmentCode} - {eq.equipmentName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="workOrderType"
            label="유형"
            rules={[{ required: true, message: '유형을 선택하세요' }]}
          >
            <Select>
              <Select.Option value="preventive">예방</Select.Option>
              <Select.Option value="corrective">수정</Select.Option>
              <Select.Option value="emergency">긴급</Select.Option>
              <Select.Option value="inspection">점검</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: '제목을 입력하세요' }]}
          >
            <Input placeholder="작업 지시 제목" />
          </Form.Item>

          <Form.Item name="description" label="설명">
            <TextArea rows={3} placeholder="작업 설명" />
          </Form.Item>

          <Form.Item name="priority" label="우선순위">
            <Select>
              <Select.Option value="low">낮음</Select.Option>
              <Select.Option value="medium">보통</Select.Option>
              <Select.Option value="high">높음</Select.Option>
              <Select.Option value="urgent">긴급</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="reportedDate" label="신고일">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="estimatedDuration" label="예상 소요 시간 (분)">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="예상 소요 시간" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="작업 지시 상세"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedWorkOrder && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="작업 지시 번호">{selectedWorkOrder.workOrderNumber}</Descriptions.Item>
            <Descriptions.Item label="상태">
              <Tag color={getStatusColor(selectedWorkOrder.status)}>{getStatusText(selectedWorkOrder.status)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="설비">
              {selectedWorkOrder.equipment?.equipmentCode} - {selectedWorkOrder.equipment?.equipmentName}
            </Descriptions.Item>
            <Descriptions.Item label="유형">{selectedWorkOrder.workOrderType}</Descriptions.Item>
            <Descriptions.Item label="제목" span={2}>{selectedWorkOrder.title}</Descriptions.Item>
            <Descriptions.Item label="설명" span={2}>{selectedWorkOrder.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="총 비용">{selectedWorkOrder.totalCost ? `$${selectedWorkOrder.totalCost.toLocaleString()}` : '-'}</Descriptions.Item>
            <Descriptions.Item label="작업 내용" span={2}>{selectedWorkOrder.workPerformed || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default MaintenanceWorkOrders

