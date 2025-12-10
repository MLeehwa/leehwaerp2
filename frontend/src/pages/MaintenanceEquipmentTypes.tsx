import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Space, Tag, Select, Switch } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'

const { TextArea } = Input

interface EquipmentType {
  _id?: string
  category: string
  subCategory: string
  description?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

const MaintenanceEquipmentTypes = () => {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingType, setEditingType] = useState<EquipmentType | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined)
  const [categories, setCategories] = useState<string[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchEquipmentTypes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/maintenance/equipment-types/categories')
      setCategories(response.data || [])
    } catch (error) {
      console.error('대분류 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchEquipmentTypes = async () => {
    setLoading(true)
    try {
      const params: Record<string, string | boolean> = { isActive: true }
      if (filterCategory) params.category = filterCategory

      const response = await api.get('/maintenance/equipment-types', { params })
      setEquipmentTypes(response.data || [])
    } catch (error) {
      message.error('장비 유형 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    form.resetFields()
    form.setFieldsValue({ isActive: true })
    setEditingType(null)
    setModalVisible(true)
  }

  const handleEdit = (type: EquipmentType) => {
    form.setFieldsValue(type)
    setEditingType(type)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/maintenance/equipment-types/${id}`)
      message.success('장비 유형이 삭제되었습니다')
      fetchEquipmentTypes()
      fetchCategories()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined
      message.error(errorMessage || '장비 유형 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingType?._id) {
        await api.put(`/maintenance/equipment-types/${editingType._id}`, values)
        message.success('장비 유형이 수정되었습니다')
      } else {
        await api.post('/maintenance/equipment-types', values)
        message.success('장비 유형이 생성되었습니다')
      }
      setModalVisible(false)
      fetchEquipmentTypes()
      fetchCategories()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined
      message.error(errorMessage || '장비 유형 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<EquipmentType> = [
    {
      title: '대분류',
      dataIndex: 'category',
      key: 'category',
      width: 150,
    },
    {
      title: '소분류',
      dataIndex: 'subCategory',
      key: 'subCategory',
      width: 200,
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
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
        <h1>장비 유형 관리</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          유형 추가
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="대분류 필터"
          value={filterCategory}
          onChange={setFilterCategory}
          allowClear
          style={{ width: 200 }}
        >
          {categories.map((cat) => (
            <Select.Option key={cat} value={cat}>
              {cat}
            </Select.Option>
          ))}
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={equipmentTypes}
        loading={loading}
        rowKey="_id"
        locale={{ emptyText: '등록된 장비 유형이 없습니다' }}
      />

      <Modal
        title={editingType ? '장비 유형 수정' : '장비 유형 추가'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="category"
            label="대분류"
            rules={[{ required: true, message: '대분류를 입력하세요' }]}
          >
            <Select placeholder="대분류 선택" showSearch>
              <Select.Option value="자산">자산 (컴퓨터, 차량 등)</Select.Option>
              <Select.Option value="설비">설비 (지게차, 리프트 등)</Select.Option>
              <Select.Option value="기타">기타</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="subCategory"
            label="소분류"
            rules={[{ required: true, message: '소분류를 입력하세요' }]}
            tooltip="자산: 노트북, 데스크톱, 승용차, 화물차 등 / 설비: 지게차, 리프트, 스커러버 등"
          >
            <Input placeholder="소분류를 입력하세요 (예: 노트북, 지게차, 승용차)" />
          </Form.Item>

          <Form.Item name="description" label="설명">
            <TextArea rows={3} placeholder="장비 유형 설명" />
          </Form.Item>

          <Form.Item name="isActive" label="상태" valuePropName="checked">
            <Switch checkedChildren="활성" unCheckedChildren="비활성" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default MaintenanceEquipmentTypes

