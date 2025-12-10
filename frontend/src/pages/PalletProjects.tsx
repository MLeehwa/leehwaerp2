import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Space, Tag, Checkbox } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { TextArea } = Input

interface PalletProject {
  _id?: string
  projectCode: string
  projectName: string
  description?: string
  customer?: {
    _id: string
    name: string
    company?: string
    email?: string
  }
  company?: {
    _id: string
    code: string
    name: string
  }
  status: 'active' | 'completed' | 'on-hold' | 'cancelled'
  manager?: {
    _id: string
    username: string
    email?: string
  }
  isActive: boolean
}

interface Customer {
  _id: string
  name: string
  company?: string
  email?: string
}

interface Company {
  _id: string
  code: string
  name: string
}

const PalletProjects = () => {
  const [projects, setProjects] = useState<PalletProject[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProject, setEditingProject] = useState<PalletProject | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchCustomers()
    fetchCompanies()
    fetchProjects()
  }, [filterStatus])

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers?isActive=true')
      setCustomers(response.data || [])
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

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterStatus) params.status = filterStatus

      const response = await api.get('/pallet-projects', { params })
      setProjects(response.data || [])
    } catch (error) {
      message.error('팔렛트 프로젝트 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    form.resetFields()
    setEditingProject(null)
    form.setFieldsValue({
      status: 'active',
      isActive: true,
    })
    setModalVisible(true)
  }

  const handleEdit = (project: PalletProject) => {
    setEditingProject(project)
    form.setFieldsValue({
      ...project,
      customer: project.customer?._id,
      company: project.company?._id,
      manager: project.manager?._id,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/pallet-projects/${id}`)
      message.success('팔렛트 프로젝트가 삭제되었습니다')
      fetchProjects()
    } catch (error: any) {
      message.error(error.response?.data?.message || '팔렛트 프로젝트 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
      }

      if (editingProject?._id) {
        await api.put(`/pallet-projects/${editingProject._id}`, submitData)
        message.success('팔렛트 프로젝트가 수정되었습니다')
      } else {
        await api.post('/pallet-projects', submitData)
        message.success('팔렛트 프로젝트가 등록되었습니다')
      }

      setModalVisible(false)
      form.resetFields()
      fetchProjects()
    } catch (error: any) {
      message.error(error.response?.data?.message || '팔렛트 프로젝트 저장에 실패했습니다')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'green',
      completed: 'blue',
      'on-hold': 'orange',
      cancelled: 'red',
    }
    return colors[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      active: '진행중',
      completed: '완료',
      'on-hold': '보류',
      cancelled: '취소',
    }
    return texts[status] || status
  }

  const columns: ColumnsType<PalletProject> = [
    {
      title: '프로젝트 코드',
      dataIndex: 'projectCode',
      key: 'projectCode',
      width: 150,
    },
    {
      title: '프로젝트명',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 200,
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      width: 250,
    },
    {
      title: '고객',
      key: 'customer',
      width: 200,
      render: (_, record) => (
        <span>
          {record.customer?.name || '-'}
          {record.customer?.company && ` (${record.customer.company})`}
        </span>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '활성',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive) => (
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>팔렛트 프로젝트 관리</h1>
        <Space>
          <Select
            placeholder="상태 필터"
            allowClear
            style={{ width: 150 }}
            value={filterStatus}
            onChange={setFilterStatus}
          >
            <Select.Option value="active">진행중</Select.Option>
            <Select.Option value="completed">완료</Select.Option>
            <Select.Option value="on-hold">보류</Select.Option>
            <Select.Option value="cancelled">취소</Select.Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            프로젝트 등록
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={projects}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingProject ? '팔렛트 프로젝트 수정' : '팔렛트 프로젝트 등록'}
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
            name="projectCode"
            label="프로젝트 코드"
            rules={[{ required: true, message: '프로젝트 코드를 입력하세요' }]}
          >
            <Input placeholder="프로젝트 코드" style={{ textTransform: 'uppercase' }} disabled={!!editingProject} />
          </Form.Item>

          <Form.Item
            name="projectName"
            label="프로젝트명"
            rules={[{ required: true, message: '프로젝트명을 입력하세요' }]}
          >
            <Input placeholder="프로젝트명" />
          </Form.Item>

          <Form.Item name="description" label="설명">
            <TextArea rows={3} placeholder="프로젝트 설명" />
          </Form.Item>

          <Form.Item name="customer" label="고객">
            <Select placeholder="고객 선택" allowClear showSearch optionFilterProp="children">
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
            rules={[{ required: true, message: '발행 법인을 선택하세요' }]}
          >
            <Select placeholder="발행 법인 선택" showSearch optionFilterProp="children">
              {companies.map((company) => (
                <Select.Option key={company._id} value={company._id}>
                  {company.code} - {company.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="status" label="상태">
            <Select>
              <Select.Option value="active">진행중</Select.Option>
              <Select.Option value="completed">완료</Select.Option>
              <Select.Option value="on-hold">보류</Select.Option>
              <Select.Option value="cancelled">취소</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="isActive" valuePropName="checked">
            <Checkbox>활성</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PalletProjects

