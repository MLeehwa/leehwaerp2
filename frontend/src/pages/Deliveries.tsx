import { useState, useEffect } from 'react'
import { Table, Button, message, Modal, Form, Input, Select, DatePicker, InputNumber } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Delivery {
  _id: string
  deliveryNumber: string
  project?: {
    _id: string
    projectCode: string
  }
  deliveryDate: string
  partNo?: string
  partName?: string
  quantity: number
  unit: string
  palletNo?: string
  palletType?: string
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled'
  invoiced: boolean
}

interface Project {
  _id: string
  projectCode: string
  projectName: string
}

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchDeliveries()
    fetchProjects()
  }, [])

  const fetchDeliveries = async () => {
    setLoading(true)
    try {
      const response = await api.get('/deliveries')
      setDeliveries(response.data)
    } catch (error) {
      message.error('출하 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects?status=active')
      setProjects(response.data)
    } catch (error) {
      console.error('프로젝트 목록을 불러오는데 실패했습니다')
    }
  }

  const handleAdd = () => {
    setEditingDelivery(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (delivery: Delivery) => {
    setEditingDelivery(delivery)
    form.setFieldsValue({
      ...delivery,
      project: delivery.project?._id,
      deliveryDate: delivery.deliveryDate ? dayjs(delivery.deliveryDate) : null,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '출하 삭제',
      content: '이 출하를 삭제하시겠습니까?',
      onOk: async () => {
        try {
          await api.delete(`/deliveries/${id}`)
          message.success('출하가 삭제되었습니다')
          fetchDeliveries()
        } catch (error) {
          message.error('출하 삭제에 실패했습니다')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        deliveryDate: values.deliveryDate?.toISOString(),
      }

      if (editingDelivery) {
        await api.put(`/deliveries/${editingDelivery._id}`, data)
        message.success('출하가 수정되었습니다')
      } else {
        await api.post('/deliveries', data)
        message.success('출하가 생성되었습니다')
      }
      setModalVisible(false)
      fetchDeliveries()
    } catch (error: any) {
      message.error(error.response?.data?.message || '출하 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<Delivery> = [
    {
      title: '출하번호',
      dataIndex: 'deliveryNumber',
      key: 'deliveryNumber',
    },
    {
      title: '프로젝트',
      key: 'project',
      render: (_, record) => record.project?.projectCode || '-',
    },
    {
      title: '출하일',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '부품번호',
      dataIndex: 'partNo',
      key: 'partNo',
    },
    {
      title: '부품명',
      dataIndex: 'partName',
      key: 'partName',
    },
    {
      title: '수량',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '단위',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: '팔레트',
      dataIndex: 'palletNo',
      key: 'palletNo',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          pending: { text: '대기', color: 'orange' },
          shipped: { text: '출하', color: 'blue' },
          delivered: { text: '도착', color: 'green' },
          cancelled: { text: '취소', color: 'red' },
        }
        const statusInfo = statusMap[status] || { text: status, color: 'default' }
        return <span style={{ color: statusInfo.color }}>{statusInfo.text}</span>
      },
    },
    {
      title: '인보이스',
      dataIndex: 'invoiced',
      key: 'invoiced',
      render: (invoiced) => invoiced ? '✓' : '-',
    },
    {
      title: '작업',
      key: 'action',
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
            onClick={() => handleDelete(record._id)}
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          출하 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={deliveries}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingDelivery ? '출하 수정' : '출하 추가'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="project"
            label="프로젝트"
            rules={[{ required: true, message: '프로젝트를 선택하세요' }]}
          >
            <Select placeholder="프로젝트 선택">
              {projects.map((project) => (
                <Select.Option key={project._id} value={project._id}>
                  {project.projectCode} - {project.projectName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="deliveryDate"
            label="출하일"
            rules={[{ required: true, message: '출하일을 선택하세요' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="partNo"
            label="부품번호"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="partName"
            label="부품명"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="수량"
            rules={[{ required: true, message: '수량을 입력하세요' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="unit"
            label="단위"
            initialValue="EA"
          >
            <Select>
              <Select.Option value="EA">EA</Select.Option>
              <Select.Option value="Pallet">Pallet</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="palletNo"
            label="팔레트 번호"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="palletType"
            label="팔레트 타입"
          >
            <Input placeholder="예: 6500lb" />
          </Form.Item>
          <Form.Item
            name="status"
            label="상태"
            initialValue="pending"
          >
            <Select>
              <Select.Option value="pending">대기</Select.Option>
              <Select.Option value="shipped">출하</Select.Option>
              <Select.Option value="delivered">도착</Select.Option>
              <Select.Option value="cancelled">취소</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Deliveries

