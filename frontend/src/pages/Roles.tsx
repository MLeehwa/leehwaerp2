import { useState, useEffect } from 'react'
import { Table, Button, message, Modal, Form, Input, Select, Space, Tag, Popconfirm, TreeSelect } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'

const { TextArea } = Input
const { Option } = Select

interface Permission {
  _id: string
  code: string
  name: string
  description?: string
  category: string
}

interface Role {
  _id: string
  name: string
  description?: string
  isSystem: boolean
  parentRole?: {
    _id: string
    name: string
  }
  permissions?: Permission[]
}

const Roles = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [])

  const fetchRoles = async () => {
    setLoading(true)
    try {
      const response = await api.get('/roles')
      setRoles(response.data || [])
    } catch (error: any) {
      // MongoDB 연결 오류인 경우 조용히 처리 (역할 관리는 나중에 설정 가능)
      if (error.response?.status === 503 || error.response?.status === 500) {
        console.warn('역할 목록을 불러올 수 없습니다. MongoDB 연결을 확인하거나 나중에 설정하세요.')
        setRoles([])
      } else {
        message.error('역할 목록을 불러오는데 실패했습니다')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/permissions')
      setPermissions(response.data || [])
    } catch (error: any) {
      // MongoDB 연결 오류인 경우 조용히 처리
      if (error.response?.status === 503 || error.response?.status === 500) {
        console.warn('권한 목록을 불러올 수 없습니다. MongoDB 연결을 확인하거나 나중에 설정하세요.')
        setPermissions([])
      } else {
        console.error('권한 목록을 불러오는데 실패했습니다', error)
      }
    }
  }

  const handleAdd = () => {
    form.resetFields()
    form.setFieldsValue({
      permissions: [],
    })
    setEditingRole(null)
    setModalVisible(true)
  }

  const handleEdit = (role: Role) => {
    const permissionIds = role.permissions?.map(p => p._id) || []
    form.setFieldsValue({
      ...role,
      parentRole: role.parentRole?._id || null,
      permissions: permissionIds,
    })
    setEditingRole(role)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/roles/${id}`)
      message.success('역할이 삭제되었습니다')
      fetchRoles()
    } catch (error: any) {
      message.error(error.response?.data?.message || '역할 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingRole?._id) {
        await api.put(`/roles/${editingRole._id}`, values)
        message.success('역할이 수정되었습니다')
      } else {
        await api.post('/roles', values)
        message.success('역할이 생성되었습니다')
      }
      setModalVisible(false)
      fetchRoles()
    } catch (error: any) {
      message.error(error.response?.data?.message || '역할 저장에 실패했습니다')
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

  const columns: ColumnsType<Role> = [
    {
      title: '역할명',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          {name}
          {record.isSystem && <Tag color="red" icon={<SafetyOutlined />}>시스템</Tag>}
        </Space>
      ),
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '상위 역할',
      key: 'parentRole',
      render: (_, record) => record.parentRole?.name || '-',
    },
    {
      title: '권한 수',
      key: 'permissions',
      render: (_, record) => (
        <Tag color="blue">{record.permissions?.length || 0}개</Tag>
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
          {!record.isSystem && (
            <Popconfirm
              title="역할을 삭제하시겠습니까?"
              onConfirm={() => handleDelete(record._id)}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              >
                삭제
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>역할 관리</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          역할 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={roles}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingRole ? '역할 수정' : '역할 추가'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="역할명"
            rules={[{ required: true, message: '역할명을 입력하세요' }]}
          >
            <Input placeholder="역할명" disabled={editingRole?.isSystem} />
          </Form.Item>

          <Form.Item
            name="description"
            label="설명"
          >
            <TextArea rows={2} placeholder="역할 설명" />
          </Form.Item>

          <Form.Item
            name="parentRole"
            label="상위 역할 (선택사항)"
            tooltip="상위 역할을 선택하면 해당 역할의 권한을 상속받습니다."
          >
            <Select
              placeholder="상위 역할 선택"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {roles
                .filter(r => !editingRole || r._id !== editingRole._id)
                .map((role) => (
                  <Option key={role._id} value={role._id}>
                    {role.name}
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="permissions"
            label="권한"
            tooltip="이 역할에 부여할 권한을 선택하세요."
          >
            <Select
              mode="multiple"
              placeholder="권한 선택"
              allowClear
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <Select.OptGroup key={category} label={category}>
                  {perms.map((perm) => (
                    <Option key={perm._id} value={perm._id}>
                      {perm.name} ({perm.code})
                    </Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Roles

