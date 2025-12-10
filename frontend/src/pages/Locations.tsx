import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Space, Tag, Select, Switch } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'

interface Company {
  _id: string
  code: string
  name: string
}

interface Location {
  _id?: string
  code: string
  name: string
  companyId: string
  companyName?: string
  address?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

const Locations = () => {
  const [locations, setLocations] = useState<Location[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchLocations()
    fetchCompanies()
  }, [])

  const fetchLocations = async () => {
    setLoading(true)
    try {
      const response = await api.get('/locations')
      // 백엔드 응답을 프론트엔드 형식으로 변환
      const locations = (response.data || []).map((loc: any) => ({
        ...loc,
        companyId: loc.company?._id || loc.company,
        companyName: loc.company?.name || '',
      }))
      setLocations(locations)
    } catch (error) {
      message.error('로케이션 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
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

  const handleAdd = () => {
    form.resetFields()
    form.setFieldsValue({ isActive: true })
    setEditingLocation(null)
    setModalVisible(true)
  }

  const handleEdit = (location: Location) => {
    // 백엔드 형식으로 변환하여 폼에 설정
    form.setFieldsValue({
      ...location,
      company: location.companyId || location.company,
    })
    setEditingLocation(location)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/locations/${id}`)
      message.success('로케이션이 삭제되었습니다')
      fetchLocations()
    } catch (error: any) {
      message.error(error.response?.data?.message || '로케이션 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      // 백엔드는 'company'를 사용하므로 변환
      const submitData = {
        ...values,
        company: values.companyId || values.company,
      }
      delete submitData.companyId
      
      if (editingLocation?._id) {
        await api.put(`/locations/${editingLocation._id}`, submitData)
        message.success('로케이션이 수정되었습니다')
      } else {
        await api.post('/locations', submitData)
        message.success('로케이션이 생성되었습니다')
      }
      setModalVisible(false)
      fetchLocations()
    } catch (error: any) {
      message.error(error.response?.data?.message || '로케이션 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<Location> = [
    {
      title: '로케이션 코드',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '로케이션명',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '법인',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (_, record) => {
        const company = companies.find(c => c._id === record.companyId)
        return company ? `${company.code} - ${company.name}` : '-'
      },
    },
    {
      title: '주소',
      dataIndex: 'address',
      key: 'address',
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
        <h1>로케이션 관리</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          로케이션 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={locations}
        loading={loading}
        rowKey="_id"
        locale={{ emptyText: '등록된 로케이션이 없습니다' }}
      />

      <Modal
        title={editingLocation ? '로케이션 수정' : '로케이션 추가'}
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
            label="로케이션 코드"
            rules={[{ required: true, message: '로케이션 코드를 입력하세요' }]}
          >
            <Input placeholder="예: LOC001" disabled={!!editingLocation} />
          </Form.Item>

          <Form.Item
            name="name"
            label="로케이션명"
            rules={[{ required: true, message: '로케이션명을 입력하세요' }]}
          >
            <Input placeholder="로케이션명" />
          </Form.Item>

          <Form.Item
            name="companyId"
            label="법인"
            rules={[{ required: true, message: '법인을 선택하세요' }]}
          >
            <Select
              placeholder="법인 선택"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={companies.map(company => ({
                value: company._id,
                label: `${company.code} - ${company.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="address"
            label="주소"
          >
            <Input.TextArea rows={2} placeholder="주소" />
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

export default Locations

