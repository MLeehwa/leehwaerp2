import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Space, Tag, Select, DatePicker, InputNumber } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'

const { TextArea } = Input

interface Repair {
  _id?: string
  repairNumber: string
  equipment?: { _id: string; equipmentCode: string; equipmentName: string }
  repairDate: string
  repairType: 'repair' | 'maintenance' | 'inspection'
  description: string
  issue?: string
  workPerformed?: string
  operatingHours?: number
  totalCost?: number
  status: 'reported' | 'in-progress' | 'completed' | 'cancelled'
  reportedBy?: { _id: string; username: string }
  performedBy?: { _id: string; username: string }
  notes?: string
}

interface Equipment {
  _id: string
  equipmentCode: string
  equipmentName: string
}

const MaintenanceRepairs = () => {
  const navigate = useNavigate()
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterType, setFilterType] = useState<string | undefined>(undefined)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchEquipment()
    fetchRepairs()
  }, [filterStatus, filterType])

  const fetchEquipment = async () => {
    try {
      const response = await api.get('/maintenance/equipment?status=active&managedBy=operation')
      setEquipment(response.data || [])
    } catch (error) {
      console.error('설비 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchRepairs = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterStatus) params.status = filterStatus
      if (filterType) params.repairType = filterType

      const response = await api.get('/maintenance/repairs', { params })
      setRepairs(response.data || [])
    } catch (error) {
      message.error('수리 내역을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    form.resetFields()
    form.setFieldsValue({
      repairDate: dayjs(),
      repairType: 'repair',
      status: 'reported',
    })
    setEditingRepair(null)
    setModalVisible(true)
  }

  const handleEdit = (repair: Repair) => {
    form.setFieldsValue({
      ...repair,
      equipment: repair.equipment?._id,
      repairDate: repair.repairDate ? dayjs(repair.repairDate) : undefined,
    })
    setEditingRepair(repair)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/maintenance/repairs/${id}`)
      message.success('수리 내역이 삭제되었습니다')
      fetchRepairs()
    } catch (error) {
      message.error('수리 내역 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        repairDate: values.repairDate ? values.repairDate.format('YYYY-MM-DD') : undefined,
        operatingHours: values.operatingHours || undefined,
        totalCost: values.totalCost || undefined,
      }

      if (editingRepair?._id) {
        await api.put(`/maintenance/repairs/${editingRepair._id}`, submitData)
        message.success('수리 내역이 수정되었습니다')
      } else {
        await api.post('/maintenance/repairs', submitData)
        message.success('고장이 등록되었습니다')
      }
      setModalVisible(false)
      fetchRepairs()
    } catch (error: any) {
      message.error(error.response?.data?.message || '수리 내역 저장에 실패했습니다')
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.put(`/maintenance/repairs/${id}`, { status: newStatus })
      message.success('상태가 변경되었습니다')
      fetchRepairs()
    } catch (error: any) {
      message.error(error.response?.data?.message || '상태 변경에 실패했습니다')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      reported: 'red',
      'in-progress': 'orange',
      completed: 'green',
      cancelled: 'default',
    }
    return colors[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      reported: '고장 등록',
      'in-progress': '수리 진행중',
      completed: '완료',
      cancelled: '취소',
    }
    return texts[status] || status
  }

  const columns: ColumnsType<Repair> = [
    {
      title: '수리 번호',
      dataIndex: 'repairNumber',
      key: 'repairNumber',
      width: 150,
      fixed: 'left',
    },
    {
      title: '설비',
      key: 'equipment',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.equipment?.equipmentCode}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.equipment?.equipmentName}</div>
        </div>
      ),
    },
    {
      title: '수리일',
      dataIndex: 'repairDate',
      key: 'repairDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '유형',
      dataIndex: 'repairType',
      key: 'repairType',
      width: 100,
      render: (type: string) => {
        const types: Record<string, string> = {
          repair: '수리',
          maintenance: '점검',
          inspection: '일상점검',
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
      title: '문제점',
      dataIndex: 'issue',
      key: 'issue',
      ellipsis: true,
    },
    {
      title: '비용',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      render: (cost: number) => (cost ? `₩${cost.toLocaleString()}` : '-'),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record) => (
        <Space>
          <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
          {status === 'reported' && (
            <Button
              size="small"
              type="link"
              onClick={() => handleStatusChange(record._id!, 'in-progress')}
            >
              진행중으로
            </Button>
          )}
          {status === 'in-progress' && (
            <Button
              size="small"
              type="link"
              onClick={() => handleStatusChange(record._id!, 'completed')}
            >
              완료로
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: '작업',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            수정
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id!)}
          >
            삭제
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>고장 등록 / 수리 관리</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          고장 등록
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            placeholder="상태 필터"
            allowClear
            style={{ width: 150 }}
          >
            <Select.Option value="reported">고장 등록</Select.Option>
            <Select.Option value="in-progress">수리 진행중</Select.Option>
            <Select.Option value="completed">완료</Select.Option>
            <Select.Option value="cancelled">취소</Select.Option>
          </Select>
          <Select
            value={filterType}
            onChange={setFilterType}
            placeholder="유형 필터"
            allowClear
            style={{ width: 150 }}
          >
            <Select.Option value="repair">수리</Select.Option>
            <Select.Option value="maintenance">점검</Select.Option>
            <Select.Option value="inspection">일상점검</Select.Option>
          </Select>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={repairs}
        loading={loading}
        rowKey="_id"
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingRepair ? '수리 내역 수정' : '고장 등록'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="equipment"
            label="설비"
            rules={[{ required: true, message: '설비를 선택하세요' }]}
          >
            <Select
              showSearch
              placeholder="설비 선택"
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {equipment.map((eq) => (
                <Select.Option key={eq._id} value={eq._id}>
                  {eq.equipmentCode} - {eq.equipmentName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="repairDate"
            label="수리일"
            rules={[{ required: true, message: '수리일을 선택하세요' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="repairType"
            label="유형"
            rules={[{ required: true, message: '유형을 선택하세요' }]}
          >
            <Select
              onChange={(value) => {
                if (value === 'repair') {
                  form.setFieldsValue({ status: 'reported' })
                } else {
                  form.setFieldsValue({ status: 'completed' })
                }
              }}
            >
              <Select.Option value="repair">수리</Select.Option>
              <Select.Option value="maintenance">점검</Select.Option>
              <Select.Option value="inspection">일상점검</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="상태"
            rules={[{ required: true, message: '상태를 선택하세요' }]}
          >
            <Select>
              <Select.Option value="reported">고장 등록</Select.Option>
              <Select.Option value="in-progress">수리 진행중</Select.Option>
              <Select.Option value="completed">완료</Select.Option>
              <Select.Option value="cancelled">취소</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="설명"
            rules={[{ required: true, message: '설명을 입력하세요' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="issue"
            label="문제점"
          >
            <TextArea rows={2} placeholder="고장 등록 시 문제점을 상세히 기록하세요" />
          </Form.Item>

          <Form.Item
            name="workPerformed"
            label="수행 작업"
          >
            <TextArea rows={3} placeholder="수리 완료 시 수행한 작업을 기록하세요" />
          </Form.Item>

          <Form.Item
            name="operatingHours"
            label="사용 시간 (시간)"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={0.1}
              placeholder="예: 150.5"
            />
          </Form.Item>

          <Form.Item
            name="totalCost"
            label="총 비용"
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `₩ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/₩\s?|(,*)/g, '')}
              min={0}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="비고"
          >
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default MaintenanceRepairs

