import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'

interface Category {
  _id: string
  code: string
  name: string
  description?: string
  type: 'purchase' | 'logistics' | 'expense' | 'other'
  isActive: boolean
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const response = await api.get('/categories')
      console.log('카테고리 API 응답:', response.data)
      if (Array.isArray(response.data)) {
      setCategories(response.data)
        if (response.data.length === 0) {
          console.log('카테고리 데이터가 없습니다. 초기 데이터를 생성하세요.')
        }
      } else {
        console.error('예상치 못한 응답 형식:', response.data)
        setCategories([])
      }
    } catch (error: any) {
      console.error('카테고리 목록 불러오기 실패:', error)
      message.error(error.response?.data?.message || '카테고리 목록을 불러오는데 실패했습니다')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingCategory(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    form.setFieldsValue(category)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`)
      message.success('카테고리가 삭제되었습니다')
      fetchCategories()
    } catch (error) {
      message.error('카테고리 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, values)
        message.success('카테고리가 수정되었습니다')
      } else {
        await api.post('/categories', values)
        message.success('카테고리가 등록되었습니다')
      }
      setModalVisible(false)
      form.resetFields()
      fetchCategories()
    } catch (error: any) {
      message.error(error.response?.data?.message || '카테고리 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<Category> = [
    {
      title: '코드',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '카테고리명',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          purchase: '일반구매',
          logistics: '물류비',
          expense: '경비',
          other: '기타',
        }
        return typeMap[type] || type
      },
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
        <h1>카테고리 관리</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          카테고리 등록
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={categories}
        loading={loading}
        rowKey="_id"
      />

      <Modal
        title={editingCategory ? '카테고리 수정' : '카테고리 등록'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="code"
            label="코드"
            rules={[{ required: true, message: '코드를 입력하세요' }]}
          >
            <Input placeholder="예: LOGISTICS" />
          </Form.Item>

          <Form.Item
            name="name"
            label="카테고리명"
            rules={[{ required: true, message: '카테고리명을 입력하세요' }]}
          >
            <Input placeholder="예: 물류비" />
          </Form.Item>

          <Form.Item
            name="type"
            label="유형"
            rules={[{ required: true, message: '유형을 선택하세요' }]}
          >
            <Select>
              <Select.Option value="purchase">일반구매</Select.Option>
              <Select.Option value="logistics">물류비</Select.Option>
              <Select.Option value="expense">경비</Select.Option>
              <Select.Option value="other">기타</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="설명">
            <Input.TextArea rows={3} placeholder="카테고리 설명" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Categories

