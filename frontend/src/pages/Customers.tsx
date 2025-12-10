import { useState, useEffect } from 'react'
import { Table, Button, message, Modal, Form, Input, Space, Switch } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'

interface Customer {
  _id: string
  name: string
  email?: string
  phone?: string
  company?: string
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  isActive: boolean
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/customers')
      setCustomers(response.data)
    } catch (error) {
      message.error('고객 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingCustomer(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    form.setFieldsValue(customer)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '고객 삭제',
      content: '이 고객을 삭제하시겠습니까?',
      onOk: async () => {
        try {
          await api.delete(`/customers/${id}`)
          message.success('고객이 삭제되었습니다')
          fetchCustomers()
        } catch (error) {
          message.error('고객 삭제에 실패했습니다')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer._id}`, values)
        message.success('고객이 수정되었습니다')
      } else {
        await api.post('/customers', values)
        message.success('고객이 생성되었습니다')
      }
      setModalVisible(false)
      fetchCustomers()
    } catch (error: any) {
      message.error(error.response?.data?.message || '고객 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<Customer> = [
    {
      title: '고객명',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '회사명',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '전화번호',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <span style={{ color: isActive ? 'green' : 'red' }}>
          {isActive ? '활성' : '비활성'}
        </span>
      ),
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
        <h2>고객 관리</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          고객 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={customers}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingCustomer ? '고객 수정' : '고객 추가'}
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
            name="name"
            label="고객명"
            rules={[{ required: true, message: '고객명을 입력하세요' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="company"
            label="회사명"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="이메일"
            rules={[{ type: 'email', message: '유효한 이메일을 입력하세요' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="전화번호"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="isActive"
            label="활성 상태"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Customers

