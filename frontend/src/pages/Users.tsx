import { useState, useEffect } from 'react'
import { Table, Button, message, Modal, Form, Input, Select, Space, Tag, Switch, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, LockOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'

const { Option } = Select

interface Role {
  _id: string
  name: string
  description?: string
}

interface User {
  _id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'manager' | 'employee' // 기존 호환성
  roles?: Role[] | string[] // 다중 역할
  isActive: boolean
  allowedMenus?: string[] // 사용자별 허용된 메뉴 목록
  createdAt?: string
  updatedAt?: string
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()

  // 메뉴 목록 (권한 설정용)
  const menuOptions = [
    { value: '/master-data', label: 'Master Data' },
    { value: '/sales', label: 'Sales' },
    { value: '/accounting', label: 'Accounting' },
    { value: '/purchase', label: 'Purchase' },
    { value: '/operation', label: 'Operation' },
  ]

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles')
      setRoles(response.data || [])
    } catch (error) {
      // 역할 목록을 불러오지 못해도 사용자 추가는 가능하도록 에러를 조용히 처리
      console.warn('역할 목록을 불러오는데 실패했습니다. 기본 역할(admin, manager, employee)만 사용 가능합니다.', error)
      setRoles([]) // 빈 배열로 설정하여 기본 역할만 사용
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/users')
      setUsers(response.data || [])
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('사용자 목록을 조회할 권한이 없습니다. 관리자 또는 매니저 권한이 필요합니다.')
      } else if (error.response?.status === 404) {
        message.error('사용자 API를 찾을 수 없습니다. 백엔드 서버를 확인하세요.')
      } else {
        message.error('사용자 목록을 불러오는데 실패했습니다')
      }
      setUsers([]) // 에러 발생 시 빈 배열로 설정하여 페이지가 깨지지 않도록
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    form.resetFields()
    form.setFieldsValue({
      role: 'employee',
      isActive: true,
      allowedMenus: [],
    })
    setEditingUser(null)
    setModalVisible(true)
  }

  const handleEdit = (user: User) => {
    // roles가 객체 배열이면 _id만 추출
    const roleIds = user.roles 
      ? user.roles.map((r: any) => typeof r === 'string' ? r : r._id)
      : []
    
    form.setFieldsValue({
      ...user,
      roles: roleIds,
      allowedMenus: user.allowedMenus || [],
    })
    setEditingUser(user)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}`)
      message.success('사용자가 삭제되었습니다')
      fetchUsers()
    } catch (error: any) {
      message.error(error.response?.data?.message || '사용자 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingUser?._id) {
        // 수정
        await api.put(`/users/${editingUser._id}`, values)
        message.success('사용자 정보가 수정되었습니다')
      } else {
        // 추가
        await api.post('/users', values)
        message.success('사용자가 생성되었습니다')
      }
      setModalVisible(false)
      fetchUsers()
    } catch (error: any) {
      console.error('사용자 저장 오류:', error)
      const errorMessage = error.response?.data?.message || '사용자 저장에 실패했습니다'
      
      // MongoDB 연결 오류인 경우
      if (error.response?.status === 503 || error.response?.data?.error === 'DATABASE_CONNECTION_ERROR') {
        message.error('데이터베이스에 연결할 수 없습니다. MongoDB가 실행 중인지 확인하세요.')
      } else {
        message.error(errorMessage)
      }
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      await api.put(`/users/${user._id}`, {
        isActive: !user.isActive,
      })
      message.success(`사용자가 ${!user.isActive ? '활성화' : '비활성화'}되었습니다`)
      fetchUsers()
    } catch (error: any) {
      message.error(error.response?.data?.message || '상태 변경에 실패했습니다')
    }
  }

  const handleResetPassword = async (id: string) => {
    try {
      const newPassword = prompt('새 비밀번호를 입력하세요 (최소 6자)')
      if (!newPassword || newPassword.length < 6) {
        message.error('비밀번호는 최소 6자 이상이어야 합니다')
        return
      }
      await api.post(`/users/${id}/reset-password`, { password: newPassword })
      message.success('비밀번호가 변경되었습니다')
    } catch (error: any) {
      message.error(error.response?.data?.message || '비밀번호 변경에 실패했습니다')
    }
  }

  const roleColors: Record<string, string> = {
    admin: 'red',
    manager: 'orange',
    employee: 'blue',
  }

  const roleLabels: Record<string, string> = {
    admin: '관리자',
    manager: '매니저',
    employee: '직원',
  }

  const columns: ColumnsType<User> = [
    {
      title: '사용자명',
      key: 'name',
      render: (_, record) => `${record.firstName} ${record.lastName}`,
    },
    {
      title: '아이디',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '권한',
      key: 'roles',
      render: (_, record) => {
        // roles가 있으면 roles 표시, 없으면 기존 role 표시
        if (record.roles && record.roles.length > 0) {
          return (
            <Space wrap>
              {record.roles.map((r: any) => {
                const roleName = typeof r === 'string' ? roles.find(ro => ro._id === r)?.name || r : r.name
                return (
                  <Tag key={typeof r === 'string' ? r : r._id} color="blue">
                    {roleName}
                  </Tag>
                )
              })}
            </Space>
          )
        }
        return (
          <Tag color={roleColors[record.role]}>
            {roleLabels[record.role]}
          </Tag>
        )
      },
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record)}
          checkedChildren="활성"
          unCheckedChildren="비활성"
        />
      ),
    },
    {
      title: '허용 메뉴',
      key: 'allowedMenus',
      render: (_, record) => {
        const menus = record.allowedMenus || []
        if (menus.length === 0) {
          return <Tag color="default">전체</Tag>
        }
        return (
          <Space wrap>
            {menus.map((menu) => {
              const menuInfo = menuOptions.find(opt => opt.value === menu)
              return (
                <Tag key={menu} color="green">
                  {menuInfo?.label || menu}
                </Tag>
              )
            })}
          </Space>
        )
      },
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
            icon={<LockOutlined />}
            onClick={() => handleResetPassword(record._id)}
          >
            비밀번호 변경
          </Button>
          <Popconfirm
            title="사용자를 삭제하시겠습니까?"
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
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>사용자 관리</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          사용자 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingUser ? '사용자 수정' : '사용자 추가'}
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
            name="username"
            label="아이디 (로그인 시 사용 가능)"
            rules={[
              { required: true, message: '아이디를 입력하세요' },
              { min: 3, message: '아이디는 최소 3자 이상이어야 합니다' },
            ]}
            tooltip="로그인 시 이메일 또는 아이디 둘 다 사용 가능합니다"
          >
            <Input placeholder="아이디 (예: admin, user01)" disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            name="email"
            label="이메일 (로그인 시 사용 가능)"
            rules={[
              { required: true, message: '이메일을 입력하세요' },
              { type: 'email', message: '올바른 이메일 형식이 아닙니다' },
            ]}
            tooltip="로그인 시 이메일 또는 아이디 둘 다 사용 가능합니다"
          >
            <Input placeholder="이메일 (예: user@example.com)" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="비밀번호"
              rules={[
                { required: true, message: '비밀번호를 입력하세요' },
                { min: 6, message: '비밀번호는 최소 6자 이상이어야 합니다' },
              ]}
            >
              <Input.Password placeholder="비밀번호 (최소 6자)" />
            </Form.Item>
          )}

          <Form.Item
            name="firstName"
            label="이름"
            rules={[{ required: true, message: '이름을 입력하세요' }]}
          >
            <Input placeholder="이름" />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="성"
            rules={[{ required: true, message: '성을 입력하세요' }]}
          >
            <Input placeholder="성" />
          </Form.Item>

          <Form.Item
            name="role"
            label="기본 권한 (호환성)"
            tooltip="기존 시스템과의 호환성을 위한 필드입니다. 역할을 선택하면 이 필드는 자동으로 설정됩니다."
          >
            <Select>
              <Option value="employee">직원</Option>
              <Option value="manager">매니저</Option>
              <Option value="admin">관리자</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="roles"
            label="역할 (다중 선택 가능, 선택사항)"
            tooltip="사용자에게 부여할 역할을 선택하세요. 여러 역할을 선택할 수 있습니다. 역할이 없으면 기본 역할(admin, manager, employee)만 사용됩니다."
          >
            <Select
              mode="multiple"
              placeholder={roles.length > 0 ? "역할 선택 (선택사항)" : "역할 관리에서 역할을 먼저 생성하세요"}
              allowClear
              disabled={roles.length === 0}
            >
              {roles.map((role) => (
                <Option key={role._id} value={role._id}>
                  {role.name} {role.description && `- ${role.description}`}
                </Option>
              ))}
            </Select>
            {roles.length === 0 && (
              <div style={{ marginTop: 8, color: '#999', fontSize: '12px' }}>
                💡 역할이 없습니다. 역할 관리는 나중에 설정할 수 있으며, 지금은 기본 역할(admin, manager, employee)만 사용됩니다.
              </div>
            )}
          </Form.Item>

          <Form.Item
            name="allowedMenus"
            label="허용된 메뉴 (비어있으면 전체 접근)"
            tooltip="선택하지 않으면 모든 메뉴에 접근 가능합니다"
          >
            <Select
              mode="multiple"
              placeholder="메뉴 선택 (전체 접근: 선택 안함)"
              allowClear
            >
              {menuOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
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

export default Users

