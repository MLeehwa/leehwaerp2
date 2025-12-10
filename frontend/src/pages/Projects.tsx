import { useState, useEffect } from 'react'
import { Table, Button, message, Modal, Form, Input, Select, Space } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'

interface Project {
  _id: string
  projectCode: string
  projectName: string
  customer?: {
    _id: string
    name: string
    company?: string
  }
  company?: {
    _id: string
    code: string
    name: string
  }
  invoiceCategory?: {
    _id: string
    code: string
    name: string
  }
  status: 'active' | 'completed' | 'on-hold' | 'cancelled'
  poNumber: string
  paymentTerm?: string
  currency: string
  isActive: boolean
}

interface Customer {
  _id: string
  name: string
  company?: string
}

interface Company {
  _id: string
  code: string
  name: string
}

interface Category {
  _id: string
  code: string
  name: string
  type?: string
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchProjects()
    fetchCustomers()
    fetchCompanies()
    fetchCategories()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await api.get('/projects')
      setProjects(response.data)
    } catch (error) {
      message.error('프로젝트 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers?isActive=true')
      setCustomers(response.data)
    } catch (error) {
      console.error('고객 목록을 불러오는데 실패했습니다')
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
      // Invoice 관련 카테고리만 가져오기 (type이 'logistics' 또는 'other'인 것)
      const response = await api.get('/categories?isActive=true&type=logistics,other')
      setCategories(response.data || [])
    } catch (error) {
      console.error('카테고리 목록을 불러오는데 실패했습니다')
    }
  }

  const handleAdd = () => {
    setEditingProject(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    form.setFieldsValue({
      ...project,
      customer: project.customer?._id,
      company: project.company?._id,
      invoiceCategory: project.invoiceCategory?._id,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '프로젝트 삭제',
      content: '이 프로젝트를 삭제하시겠습니까?',
      onOk: async () => {
        try {
          await api.delete(`/projects/${id}`)
          message.success('프로젝트가 삭제되었습니다')
          fetchProjects()
        } catch (error) {
          message.error('프로젝트 삭제에 실패했습니다')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject._id}`, values)
        message.success('프로젝트가 수정되었습니다')
      } else {
        await api.post('/projects', values)
        message.success('프로젝트가 생성되었습니다')
      }
      setModalVisible(false)
      fetchProjects()
    } catch (error: any) {
      message.error(error.response?.data?.message || '프로젝트 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<Project> = [
    {
      title: '프로젝트 코드',
      dataIndex: 'projectCode',
      key: 'projectCode',
    },
    {
      title: '프로젝트명',
      dataIndex: 'projectName',
      key: 'projectName',
    },
    {
      title: '고객',
      key: 'customer',
      render: (_, record) => record.customer?.name || '-',
    },
    {
      title: '법인',
      key: 'company',
      render: (_, record) => record.company?.name || '-',
    },
    {
      title: 'Payment Term',
      dataIndex: 'paymentTerm',
      key: 'paymentTerm',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          active: { text: '진행중', color: 'green' },
          completed: { text: '완료', color: 'blue' },
          'on-hold': { text: '보류', color: 'orange' },
          cancelled: { text: '취소', color: 'red' },
        }
        const statusInfo = statusMap[status] || { text: status, color: 'default' }
        return <span style={{ color: statusInfo.color }}>{statusInfo.text}</span>
      },
    },
    {
      title: 'PO 번호',
      dataIndex: 'poNumber',
      key: 'poNumber',
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
        <h2>프로젝트 관리</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          프로젝트 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={projects}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingProject ? '프로젝트 수정' : '프로젝트 추가'}
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
            name="projectCode"
            label="프로젝트 코드"
            rules={[{ required: true, message: '프로젝트 코드를 입력하세요' }]}
          >
            <Input placeholder="예: VW-CKD" />
          </Form.Item>
          <Form.Item
            name="projectName"
            label="프로젝트명"
            rules={[{ required: true, message: '프로젝트명을 입력하세요' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="customer"
            label="고객"
            rules={[{ required: true, message: '고객을 선택하세요' }]}
          >
            <Select placeholder="고객 선택">
              {customers.map((customer) => (
                <Select.Option key={customer._id} value={customer._id}>
                  {customer.name} {customer.company && `(${customer.company})`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="company"
            label="발행 법인"
            rules={[{ required: true, message: '법인을 선택하세요' }]}
            tooltip="PO 번호가 자동으로 생성됩니다"
          >
            <Select placeholder="법인 선택">
              {companies.map((company) => (
                <Select.Option key={company._id} value={company._id}>
                  {company.code} - {company.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="status"
            label="상태"
            initialValue="active"
          >
            <Select>
              <Select.Option value="active">진행중</Select.Option>
              <Select.Option value="completed">완료</Select.Option>
              <Select.Option value="on-hold">보류</Select.Option>
              <Select.Option value="cancelled">취소</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="paymentTerm"
            label="Payment Term"
            tooltip="예: Net 30, Net 60, Due on Receipt 등"
          >
            <Input placeholder="예: Net 30" />
          </Form.Item>
          <Form.Item
            name="invoiceCategory"
            label="Invoice 카테고리"
            tooltip="이 프로젝트의 Invoice에 사용할 카테고리를 선택하세요"
          >
            <Select placeholder="카테고리 선택" allowClear>
              {categories.map((category) => (
                <Select.Option key={category._id} value={category._id}>
                  {category.code} - {category.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="currency"
            label="통화"
            initialValue="USD"
          >
            <Select>
              <Select.Option value="USD">USD (US Dollar)</Select.Option>
              <Select.Option value="KRW">KRW (Korean Won)</Select.Option>
              <Select.Option value="MXN">MXN (Mexican Peso)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Projects

