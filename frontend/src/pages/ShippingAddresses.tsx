import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Switch, Space, Popconfirm, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'

interface ShippingAddress {
  _id: string
  name: string
  street: string
  city: string
  state?: string
  zipCode?: string
  country: string
  isDefault: boolean
  isActive: boolean
}

const ShippingAddresses = () => {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    setLoading(true)
    try {
      const response = await api.get('/shipping-addresses')
      setAddresses(response.data)
    } catch (error) {
      message.error('배송지 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingAddress(null)
    form.resetFields()
    form.setFieldsValue({ isActive: true, isDefault: false })
    setModalVisible(true)
  }

  const handleEdit = (address: ShippingAddress) => {
    setEditingAddress(address)
    form.setFieldsValue(address)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/shipping-addresses/${id}`)
      message.success('배송지가 삭제되었습니다')
      fetchAddresses()
    } catch (error: any) {
      message.error(error.response?.data?.message || '배송지 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingAddress) {
        await api.put(`/shipping-addresses/${editingAddress._id}`, values)
        message.success('배송지가 수정되었습니다')
      } else {
        await api.post('/shipping-addresses', values)
        message.success('배송지가 등록되었습니다')
      }
      setModalVisible(false)
      form.resetFields()
      fetchAddresses()
    } catch (error: any) {
      message.error(error.response?.data?.message || '배송지 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<ShippingAddress> = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '주소',
      key: 'address',
      render: (_, record) => (
        <div>
          <div>{record.street}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {record.city}{record.state ? `, ${record.state}` : ''} {record.zipCode ? `(${record.zipCode})` : ''}, {record.country}
          </div>
        </div>
      ),
    },
    {
      title: '기본 주소',
      dataIndex: 'isDefault',
      key: 'isDefault',
      render: (isDefault: boolean) => (isDefault ? '예' : '아니오'),
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (isActive ? '활성' : '비활성'),
    },
    {
      title: '작업',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record._id)}
          >
            <Button danger icon={<DeleteOutlined />}>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>배송지 관리</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          배송지 등록
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={addresses}
        loading={loading}
        rowKey="_id"
      />

      <Modal
        title={editingAddress ? '배송지 수정' : '배송지 등록'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="배송지 이름"
            rules={[{ required: true, message: '배송지 이름을 입력하세요' }]}
          >
            <Input placeholder="예: 본사, 창고, 지점" />
          </Form.Item>

          <Form.Item
            name="street"
            label="도로명 주소"
            rules={[{ required: true, message: '도로명 주소를 입력하세요' }]}
          >
            <Input placeholder="도로명 주소를 입력하세요" />
          </Form.Item>

          <Space style={{ width: '100%' }}>
            <Form.Item
              name="city"
              label="도시"
              rules={[{ required: true, message: '도시를 입력하세요' }]}
              style={{ width: '48%' }}
            >
              <Input placeholder="도시" />
            </Form.Item>

            <Form.Item
              name="state"
              label="주/도"
              style={{ width: '48%' }}
            >
              <Input placeholder="주/도 (선택사항)" />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }}>
            <Form.Item
              name="zipCode"
              label="우편번호"
              style={{ width: '48%' }}
            >
              <Input placeholder="우편번호 (선택사항)" />
            </Form.Item>

            <Form.Item
              name="country"
              label="국가"
              rules={[{ required: true, message: '국가를 입력하세요' }]}
              style={{ width: '48%' }}
            >
              <Input placeholder="국가" />
            </Form.Item>
          </Space>

          <Form.Item name="isDefault" label="기본 주소로 설정" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="isActive" label="활성화" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ShippingAddresses

