import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Space, Tag, Switch, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'

interface Company {
  _id?: string
  code: string
  name: string
  nameEn?: string
  taxId?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  } | string
  contact?: {
    email?: string
    phone?: string
  }
  currency: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

const Companies = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    setLoading(true)
    try {
      const response = await api.get('/companies?isActive=true')
      setCompanies(response.data || [])
    } catch (error) {
      message.error('법인 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    form.resetFields()
    form.setFieldsValue({ isActive: true })
    setEditingCompany(null)
    setModalVisible(true)
  }

  const handleEdit = (company: Company) => {
    form.setFieldsValue(company)
    setEditingCompany(company)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/companies/${id}`)
      message.success('법인이 삭제되었습니다')
      fetchCompanies()
    } catch (error: any) {
      message.error(error.response?.data?.message || '법인 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      // 영문명을 name 필드에 저장하고 nameEn에도 동일하게 저장
      const submitData = {
        ...values,
        name: values.name, // 영문명
        nameEn: values.name, // 영문명을 nameEn에도 저장 (호환성)
      }

      if (editingCompany?._id) {
        await api.put(`/companies/${editingCompany._id}`, submitData)
        message.success('법인이 수정되었습니다')
      } else {
        await api.post('/companies', submitData)
        message.success('법인이 생성되었습니다')
      }
      setModalVisible(false)
      fetchCompanies()
    } catch (error: any) {
      message.error(error.response?.data?.message || '법인 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<Company> = [
    {
      title: '법인 코드',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '법인명 (영문)',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '통화',
      dataIndex: 'currency',
      key: 'currency',
      width: 80,
    },
    {
      title: 'Tax ID',
      dataIndex: 'taxId',
      key: 'taxId',
      width: 120,
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '활성' : '비활성'}
        </Tag>
      ),
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
            onClick={() => handleEdit(record)}
          >
            수정
          </Button>
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
        <h1>법인 관리</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          법인 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={companies}
        loading={loading}
        rowKey="_id"
        locale={{ emptyText: '등록된 법인이 없습니다' }}
      />

      <Modal
        title={editingCompany ? '법인 수정' : '법인 추가'}
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
            name="code"
            label="법인 코드"
            rules={[{ required: true, message: '법인 코드를 입력하세요' }]}
          >
            <Input placeholder="예: CORP001" disabled={!!editingCompany} />
          </Form.Item>

          <Form.Item
            name="name"
            label="법인명 (영문)"
            rules={[{ required: true, message: '법인명(영문)을 입력하세요' }]}
          >
            <Input placeholder="Company Name (English)" />
          </Form.Item>

          <Form.Item
            name="taxId"
            label="사업자등록번호 / Tax ID"
          >
            <Input placeholder="사업자등록번호 또는 Tax ID" />
          </Form.Item>

          <Form.Item
            name="currency"
            label="기본 통화"
            initialValue="USD"
            rules={[{ required: true, message: '통화를 선택하세요' }]}
          >
            <Select placeholder="통화 선택">
              <Select.Option value="USD">USD (US Dollar)</Select.Option>
              <Select.Option value="KRW">KRW (Korean Won)</Select.Option>
              <Select.Option value="MXN">MXN (Mexican Peso)</Select.Option>
              <Select.Option value="EUR">EUR (Euro)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="address"
            label="주소"
          >
            <Input.TextArea rows={2} placeholder="주소 (선택사항)" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="상태"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="활성" unCheckedChildren="비활성" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Companies

