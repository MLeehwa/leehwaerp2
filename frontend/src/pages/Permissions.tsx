import { useState, useEffect } from 'react'
import { Table, Button, message, Modal, Form, Input, Select, Space, Tag, Tree, Card, Tabs } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import type { DataNode } from 'antd/es/tree'

const { TextArea } = Input
const { Option } = Select

interface Permission {
  _id: string
  code: string
  name: string
  description?: string
  category: string
  resource?: {
    _id: string
    name: string
    path: string
  }
}

interface Resource {
  _id: string
  name: string
  path: string
  type: 'menu' | 'page' | 'api' | 'action'
  icon?: string
  parent?: Resource
  children?: Resource[]
  permissions?: Permission[]
  order: number
  isActive: boolean
}

const Permissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('list')

  useEffect(() => {
    fetchPermissions()
    fetchResources()
  }, [])

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const response = await api.get('/permissions')
      setPermissions(response.data || [])
    } catch (error: any) {
      // MongoDB 연결 오류인 경우 조용히 처리 (역할/권한 관리는 나중에 설정 가능)
      if (error.response?.status === 503 || error.response?.status === 500) {
        console.warn('권한 목록을 불러올 수 없습니다. MongoDB 연결을 확인하거나 나중에 설정하세요.')
        setPermissions([])
      } else {
        message.error('권한 목록을 불러오는데 실패했습니다')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchResources = async () => {
    try {
      const response = await api.get('/resources')
      setResources(response.data || [])
    } catch (error: any) {
      // MongoDB 연결 오류인 경우 조용히 처리
      if (error.response?.status === 503 || error.response?.status === 500) {
        console.warn('리소스 목록을 불러올 수 없습니다. MongoDB 연결을 확인하거나 나중에 설정하세요.')
        setResources([])
      } else {
        console.error('리소스 목록을 불러오는데 실패했습니다', error)
      }
    }
  }

  const handleAdd = () => {
    form.resetFields()
    setEditingPermission(null)
    setModalVisible(true)
  }

  const handleEdit = (permission: Permission) => {
    form.setFieldsValue({
      ...permission,
      resource: permission.resource?._id || null,
    })
    setEditingPermission(permission)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/permissions/${id}`)
      message.success('권한이 삭제되었습니다')
      fetchPermissions()
    } catch (error: any) {
      message.error(error.response?.data?.message || '권한 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingPermission?._id) {
        await api.put(`/permissions/${editingPermission._id}`, values)
        message.success('권한이 수정되었습니다')
      } else {
        await api.post('/permissions', values)
        message.success('권한이 생성되었습니다')
      }
      setModalVisible(false)
      fetchPermissions()
    } catch (error: any) {
      message.error(error.response?.data?.message || '권한 저장에 실패했습니다')
    }
  }

  // 카테고리별로 권한 그룹화
  const permissionsByCategory = permissions.reduce((acc: Record<string, Permission[]>, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = []
    }
    acc[perm.category].push(perm)
    return acc
  }, {})

  // 리소스를 트리 구조로 변환
  const buildTreeData = (items: Resource[]): DataNode[] => {
    const map = new Map<string, DataNode>()
    const roots: DataNode[] = []

    // 모든 노드를 맵에 추가
    items.forEach((item) => {
      map.set(item._id, {
        title: (
          <Space>
            <span>{item.name}</span>
            <Tag color="blue">{item.type}</Tag>
            {item.permissions && item.permissions.length > 0 && (
              <Tag color="green">{item.permissions.length}개 권한</Tag>
            )}
          </Space>
        ),
        key: item._id,
        children: [],
      })
    })

    // 부모-자식 관계 설정
    items.forEach((item) => {
      const node = map.get(item._id)!
      if (item.parent) {
        const parentNode = map.get(item.parent._id || (item.parent as any))
        if (parentNode) {
          parentNode.children = parentNode.children || []
          parentNode.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  const columns: ColumnsType<Permission> = [
    {
      title: '권한 코드',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '권한명',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      render: (category) => <Tag color="purple">{category}</Tag>,
    },
    {
      title: '연결된 리소스',
      key: 'resource',
      render: (_, record) => record.resource?.name || '-',
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
        <h2>권한 관리</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          권한 추가
        </Button>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'list',
            label: '권한 목록',
            children: (
              <Table
                columns={columns}
                dataSource={permissions}
                loading={loading}
                rowKey="_id"
                pagination={{ pageSize: 20 }}
              />
            ),
          },
          {
            key: 'category',
            label: '카테고리별 보기',
            children: (
              <>
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <Card
                    key={category}
                    title={category}
                    style={{ marginBottom: 16 }}
                    extra={<Tag color="purple">{perms.length}개</Tag>}
                  >
                    <Table
                      columns={columns}
                      dataSource={perms}
                      rowKey="_id"
                      pagination={false}
                      size="small"
                    />
                  </Card>
                ))}
              </>
            ),
          },
          {
            key: 'tree',
            label: '리소스 트리',
            children: (
              <Card title="리소스 구조">
                <Tree
                  treeData={buildTreeData(resources)}
                  defaultExpandAll
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title={editingPermission ? '권한 수정' : '권한 추가'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
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
            label="권한 코드"
            rules={[{ required: true, message: '권한 코드를 입력하세요' }]}
          >
            <Input placeholder="예: purchase.request.read" disabled={!!editingPermission} />
          </Form.Item>

          <Form.Item
            name="name"
            label="권한명"
            rules={[{ required: true, message: '권한명을 입력하세요' }]}
          >
            <Input placeholder="예: 구매요청 조회" />
          </Form.Item>

          <Form.Item
            name="description"
            label="설명"
          >
            <TextArea rows={2} placeholder="권한 설명" />
          </Form.Item>

          <Form.Item
            name="category"
            label="카테고리"
            rules={[{ required: true, message: '카테고리를 입력하세요' }]}
          >
            <Input placeholder="예: purchase, sales, accounting" />
          </Form.Item>

          <Form.Item
            name="resource"
            label="연결된 리소스 (선택사항)"
          >
            <Select
              placeholder="리소스 선택"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {resources.map((resource) => (
                <Option key={resource._id} value={resource._id}>
                  {resource.name} ({resource.path})
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Permissions

