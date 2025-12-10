import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Select, Space, Tag, DatePicker } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined, UndoOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { TextArea } = Input

interface Notification {
  _id?: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  section: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  isResolved: boolean
  resolvedAt?: string
  resolvedBy?: any
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null)
  const [form] = Form.useForm()
  const [filterResolved, setFilterResolved] = useState<'unresolved' | 'all'>('unresolved')

  useEffect(() => {
    fetchNotifications()
  }, [filterResolved])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filterResolved === 'all') {
        params.isResolved = 'all' // 전체 조회
      } else {
        params.isResolved = 'false' // 미해결만
      }
      const response = await api.get('/notifications', { params })
      setNotifications(response.data || [])
    } catch (error) {
      message.error('알림 목록을 불러오는데 실패했습니다')
      console.error('알림 목록 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingNotification(null)
    form.resetFields()
    form.setFieldsValue({ 
      type: 'info',
      priority: 'medium',
      isResolved: false,
    })
    setModalVisible(true)
  }

  const handleEdit = (notification: Notification) => {
    setEditingNotification(notification)
    form.setFieldsValue({
      ...notification,
      dueDate: notification.dueDate ? dayjs(notification.dueDate) : undefined,
    })
    setModalVisible(true)
  }

  const handleUnresolve = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/unresolve`)
      message.success('알림이 미해결로 변경되었습니다')
      fetchNotifications()
    } catch (error: any) {
      message.error(error.response?.data?.message || '알림 상태 변경에 실패했습니다')
    }
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '알림 삭제',
      content: '이 알림을 삭제하시겠습니까?',
      onOk: async () => {
        try {
          await api.delete(`/notifications/${id}`)
          message.success('알림이 삭제되었습니다')
          fetchNotifications()
        } catch (error: any) {
          message.error(error.response?.data?.message || '알림 삭제에 실패했습니다')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD HH:mm:ss') : undefined,
      }
      
      if (editingNotification?._id) {
        await api.put(`/notifications/${editingNotification._id}`, submitData)
        message.success('알림이 수정되었습니다')
      } else {
        await api.post('/notifications', submitData)
        message.success('알림이 생성되었습니다')
      }
      setModalVisible(false)
      fetchNotifications()
    } catch (error: any) {
      message.error(error.response?.data?.message || '알림 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<Notification> = [
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '타입',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => {
        const colorMap: Record<string, string> = {
          error: 'red',
          warning: 'orange',
          success: 'green',
          info: 'blue',
        }
        return <Tag color={colorMap[type] || 'default'}>{type.toUpperCase()}</Tag>
      },
    },
    {
      title: '섹션',
      dataIndex: 'section',
      key: 'section',
      width: 120,
      render: (section) => {
        const colorMap: Record<string, string> = {
          sales: 'blue',
          accounting: 'green',
          purchase: 'orange',
          operation: 'purple',
          'master-data': 'cyan',
          admin: 'red',
          all: 'default',
        }
        return <Tag color={colorMap[section] || 'default'}>{section.toUpperCase()}</Tag>
      },
    },
    {
      title: '우선순위',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => {
        const colorMap: Record<string, string> = {
          urgent: 'red',
          high: 'orange',
          medium: 'blue',
          low: 'default',
        }
        return <Tag color={colorMap[priority] || 'default'}>{priority.toUpperCase()}</Tag>
      },
    },
    {
      title: '마감일',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 150,
      render: (dueDate: string) => {
        if (!dueDate) return '-'
        const date = dayjs(dueDate)
        const now = dayjs()
        const isOverdue = date.isBefore(now)
        const isDueSoon = date.isBefore(now.add(3, 'day')) && !isOverdue
        
        return (
          <span style={{ color: isOverdue ? 'red' : isDueSoon ? 'orange' : undefined }}>
            {date.format('YYYY-MM-DD HH:mm')}
            {isOverdue && <Tag color="red" style={{ marginLeft: 4 }}>초과</Tag>}
            {isDueSoon && <Tag color="orange" style={{ marginLeft: 4 }}>임박</Tag>}
          </span>
        )
      },
    },
    {
      title: '상태',
      dataIndex: 'isResolved',
      key: 'isResolved',
      width: 100,
      render: (isResolved) => (
        <Tag color={isResolved ? 'green' : 'red'}>
          {isResolved ? '해결됨' : '미해결'}
        </Tag>
      ),
    },
    {
      title: '작업',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space>
          {record.isResolved && (
            <Button
              type="link"
              icon={<UndoOutlined />}
              onClick={() => record._id && handleUnresolve(record._id)}
            >
              다시 보기
            </Button>
          )}
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
            onClick={() => record._id && handleDelete(record._id)}
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
        <h1>미처리 업무 관리</h1>
        <Space>
          <Select
            value={filterResolved}
            onChange={(value) => setFilterResolved(value as 'unresolved' | 'all')}
            style={{ width: 150 }}
          >
            <Select.Option value="unresolved">미해결만</Select.Option>
            <Select.Option value="all">전체</Select.Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchNotifications}>
            새로고침
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            알림 추가
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={notifications}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 50 }}
      />

      <Modal
        title={editingNotification ? '알림 수정' : '알림 추가'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: '제목을 입력하세요' }]}
          >
            <Input placeholder="알림 제목" />
          </Form.Item>

          <Form.Item
            name="message"
            label="내용"
            rules={[{ required: true, message: '내용을 입력하세요' }]}
          >
            <TextArea rows={4} placeholder="알림 내용" />
          </Form.Item>

          <Form.Item
            name="section"
            label="섹션"
            rules={[{ required: true, message: '섹션을 선택하세요' }]}
          >
            <Select placeholder="섹션 선택">
              <Select.Option value="sales">Sales</Select.Option>
              <Select.Option value="accounting">Accounting</Select.Option>
              <Select.Option value="purchase">Purchase</Select.Option>
              <Select.Option value="operation">Operation</Select.Option>
              <Select.Option value="master-data">Master Data</Select.Option>
              <Select.Option value="admin">Admin</Select.Option>
              <Select.Option value="all">전체</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="type"
            label="타입"
            rules={[{ required: true, message: '타입을 선택하세요' }]}
          >
            <Select>
              <Select.Option value="info">Info</Select.Option>
              <Select.Option value="warning">Warning</Select.Option>
              <Select.Option value="error">Error</Select.Option>
              <Select.Option value="success">Success</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="priority"
            label="우선순위"
            rules={[{ required: true, message: '우선순위를 선택하세요' }]}
          >
            <Select>
              <Select.Option value="low">Low</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="urgent">Urgent</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="dueDate"
            label="마감일"
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              format="YYYY-MM-DD HH:mm"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Notifications

