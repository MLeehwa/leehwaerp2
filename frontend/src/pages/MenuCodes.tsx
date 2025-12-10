import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Select, Space, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'

interface MenuCode {
  _id?: string
  code: string
  name: string
  path: string
  section: string
  description?: string
  isActive: boolean
  order: number
}

// 섹션별 경로 목록
const sectionPaths: Record<string, Array<{ path: string; label: string }>> = {
  sales: [
    { path: '/sales/invoices', label: '인보이스' },
    { path: '/sales/ar', label: 'AR 현황' },
    { path: '/sales/reports', label: 'Sales 리포트' },
  ],
  accounting: [
    { path: '/accounting/accounts-payable', label: '매입채무/지급 (AP)' },
    { path: '/accounting/accounts-receivable', label: '매출채권/수금 (AR)' },
    { path: '/accounting/reports', label: 'Accounting 리포트' },
  ],
  purchase: [
    { path: '/purchase/purchase-requests', label: '구매요청 (PR)' },
    { path: '/purchase/purchase-orders', label: '구매주문 (PO)' },
    { path: '/purchase/goods-receipt', label: '입고 관리' },
    { path: '/purchase/reports', label: '구매 리포트' },
  ],
  'master-data': [
    { path: '/master-data/sales/customers', label: '고객 관리' },
    { path: '/master-data/sales/projects', label: '프로젝트 관리' },
    { path: '/master-data/sales/billing-rules', label: '청구 규칙 관리' },
    { path: '/master-data/companies', label: '법인 관리' },
    { path: '/master-data/locations', label: '로케이션 관리' },
    { path: '/master-data/categories', label: '카테고리 관리' },
    { path: '/master-data/suppliers', label: '공급업체 관리' },
    { path: '/master-data/shipping-addresses', label: '배송지 관리' },
  ],
  admin: [
    { path: '/admin/assets', label: '총무 자산 관리' },
  ],
  'system-admin': [
    { path: '/system-admin/users', label: '사용자 관리' },
    { path: '/system-admin/database', label: '데이터베이스 관리' },
    { path: '/system-admin/storage-status', label: '저장소 상태' },
    { path: '/system-admin/menu-codes', label: '메뉴 코드 관리' },
    { path: '/system-admin/notifications', label: '알림 관리' },
    { path: '/system-admin/roles', label: '역할 관리' },
    { path: '/system-admin/permissions', label: '권한 관리' },
  ],
  operation: [
    { path: '/operation', label: 'Operation 메인' },
  ],
}

const MenuCodes = () => {
  const [menuCodes, setMenuCodes] = useState<MenuCode[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingMenuCode, setEditingMenuCode] = useState<MenuCode | null>(null)
  const [form] = Form.useForm()
  const [selectedSection, setSelectedSection] = useState<string>('')

  useEffect(() => {
    fetchMenuCodes()
  }, [])

  const fetchMenuCodes = async () => {
    setLoading(true)
    try {
      const response = await api.get('/menu-codes')
      setMenuCodes(response.data || [])
    } catch (error) {
      message.error('메뉴 코드 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingMenuCode(null)
    setSelectedSection('')
    form.resetFields()
    form.setFieldsValue({ 
      isActive: true, 
      order: 0,
      section: 'sales', // 기본값
    })
    setModalVisible(true)
  }

  const handleEdit = (menuCode: MenuCode) => {
    setEditingMenuCode(menuCode)
    setSelectedSection(menuCode.section)
    form.setFieldsValue({
      code: menuCode.code,
      name: menuCode.name,
      path: menuCode.path,
      isActive: menuCode.isActive,
      section: menuCode.section, // 숨겨진 필드
      order: menuCode.order, // 숨겨진 필드
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '메뉴 코드 삭제',
      content: '이 메뉴 코드를 비활성화하시겠습니까?',
      onOk: async () => {
        try {
          await api.delete(`/menu-codes/${id}`)
          message.success('메뉴 코드가 비활성화되었습니다')
          fetchMenuCodes()
        } catch (error: any) {
          message.error(error.response?.data?.message || '메뉴 코드 삭제에 실패했습니다')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingMenuCode?._id) {
        await api.put(`/menu-codes/${editingMenuCode._id}`, values)
        message.success('메뉴 코드가 수정되었습니다')
      } else {
        await api.post('/menu-codes', values)
        message.success('메뉴 코드가 생성되었습니다')
      }
      setModalVisible(false)
      fetchMenuCodes()
    } catch (error: any) {
      message.error(error.response?.data?.message || '메뉴 코드 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<MenuCode> = [
    {
      title: '메뉴 코드',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '메뉴 이름',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '경로',
      dataIndex: 'path',
      key: 'path',
      render: (path) => <code style={{ fontSize: '12px', color: '#1890ff' }}>{path}</code>,
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
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
              if (record._id && window.confirm('정말 비활성화하시겠습니까?')) {
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
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>메뉴 코드 관리</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchMenuCodes}>
            새로고침
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            메뉴 코드 추가
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={menuCodes}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 50 }}
      />

      <Modal
        title={editingMenuCode ? '메뉴 코드 수정' : '메뉴 코드 추가'}
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
            label="메뉴 코드"
            rules={[{ required: true, message: '메뉴 코드를 입력하세요' }]}
          >
            <Input placeholder="예: 0010" disabled={!!editingMenuCode} />
          </Form.Item>

          <Form.Item
            name="name"
            label="메뉴 이름"
            rules={[{ required: true, message: '메뉴 이름을 입력하세요' }]}
          >
            <Input placeholder="예: SALES 인보이스 관리" />
          </Form.Item>

          <Form.Item
            name="path"
            label="경로"
            rules={[{ required: true, message: '경로를 선택하세요' }]}
          >
            <Select 
              placeholder="경로를 선택하세요"
              showSearch
              style={{ width: '100%' }}
              filterOption={(input, option) => {
                const searchText = input.toLowerCase()
                const optionText = (option?.children as string || '').toLowerCase()
                const optionValue = (option?.value as string || '').toLowerCase()
                return optionText.includes(searchText) || optionValue.includes(searchText)
              }}
              onChange={(value) => {
                // 경로에서 섹션 자동 감지
                const path = value as string
                let detectedSection = 'sales'
                if (path.startsWith('/accounting/')) detectedSection = 'accounting'
                else if (path.startsWith('/purchase/')) detectedSection = 'purchase'
                else if (path.startsWith('/master-data/')) detectedSection = 'master-data'
                else if (path.startsWith('/admin/')) detectedSection = 'admin'
                else if (path.startsWith('/operation/')) detectedSection = 'operation'
                
                form.setFieldsValue({ section: detectedSection })
                setSelectedSection(detectedSection)
              }}
            >
              {Object.entries(sectionPaths).map(([section, paths]) => (
                <Select.OptGroup key={section} label={section.toUpperCase()}>
                  {paths.map((item) => (
                    <Select.Option key={item.path} value={item.path}>
                      {item.label} ({item.path})
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>
          
          <div style={{ marginTop: -16, marginBottom: 16, fontSize: '12px', color: '#999' }}>
            💡 경로를 선택하면 섹션이 자동으로 설정됩니다
          </div>
          
          {/* 숨겨진 필드 (자동 설정) */}
          <Form.Item name="section" hidden initialValue="sales">
            <Input />
          </Form.Item>
          <Form.Item name="order" hidden initialValue={0}>
            <Input />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="상태"
            initialValue={true}
          >
            <Select>
              <Select.Option value={true}>활성</Select.Option>
              <Select.Option value={false}>비활성</Select.Option>
            </Select>
          </Form.Item>
          
          {/* 숨겨진 필드 (자동 설정) */}
          <Form.Item name="section" hidden initialValue="sales">
            <Input />
          </Form.Item>
          <Form.Item name="order" hidden initialValue={0}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default MenuCodes

