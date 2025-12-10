import { useState, useEffect } from 'react'
import { Table, Button, message, Modal, Form, Input, Select, DatePicker, InputNumber } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface LaborLog {
  _id: string
  logNumber: string
  project?: {
    _id: string
    projectCode: string
  }
  workDate: string
  workType: string
  workDescription?: string
  hours: number
  laborRate?: number
  status: 'pending' | 'completed' | 'cancelled'
  invoiced: boolean
}

interface Project {
  _id: string
  projectCode: string
  projectName: string
}

const LaborLogs = () => {
  const [laborLogs, setLaborLogs] = useState<LaborLog[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingLog, setEditingLog] = useState<LaborLog | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchLaborLogs()
    fetchProjects()
  }, [])

  const fetchLaborLogs = async () => {
    setLoading(true)
    try {
      const response = await api.get('/labor-logs')
      setLaborLogs(response.data)
    } catch (error) {
      message.error('노무 로그 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects?status=active')
      setProjects(response.data)
    } catch (error) {
      console.error('프로젝트 목록을 불러오는데 실패했습니다')
    }
  }

  const handleAdd = () => {
    setEditingLog(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (log: LaborLog) => {
    setEditingLog(log)
    form.setFieldsValue({
      ...log,
      project: log.project?._id,
      workDate: log.workDate ? dayjs(log.workDate) : null,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '노무 로그 삭제',
      content: '이 노무 로그를 삭제하시겠습니까?',
      onOk: async () => {
        try {
          await api.delete(`/labor-logs/${id}`)
          message.success('노무 로그가 삭제되었습니다')
          fetchLaborLogs()
        } catch (error) {
          message.error('노무 로그 삭제에 실패했습니다')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        workDate: values.workDate?.toISOString(),
      }

      if (editingLog) {
        await api.put(`/labor-logs/${editingLog._id}`, data)
        message.success('노무 로그가 수정되었습니다')
      } else {
        await api.post('/labor-logs', data)
        message.success('노무 로그가 생성되었습니다')
      }
      setModalVisible(false)
      fetchLaborLogs()
    } catch (error: any) {
      message.error(error.response?.data?.message || '노무 로그 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<LaborLog> = [
    {
      title: '로그번호',
      dataIndex: 'logNumber',
      key: 'logNumber',
    },
    {
      title: '프로젝트',
      key: 'project',
      render: (_, record) => record.project?.projectCode || '-',
    },
    {
      title: '작업일',
      dataIndex: 'workDate',
      key: 'workDate',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '작업 유형',
      dataIndex: 'workType',
      key: 'workType',
    },
    {
      title: '시간',
      dataIndex: 'hours',
      key: 'hours',
      render: (hours) => `${hours} 시간`,
    },
    {
      title: '시간당 단가',
      dataIndex: 'laborRate',
      key: 'laborRate',
      render: (rate) => rate ? `$${rate.toLocaleString()}` : '-',
    },
    {
      title: '총액',
      key: 'total',
      render: (_, record) => {
        const total = (record.hours || 0) * (record.laborRate || 0)
        return total > 0 ? `$${total.toLocaleString()}` : '-'
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          pending: { text: '대기', color: 'orange' },
          completed: { text: '완료', color: 'green' },
          cancelled: { text: '취소', color: 'red' },
        }
        const statusInfo = statusMap[status] || { text: status, color: 'default' }
        return <span style={{ color: statusInfo.color }}>{statusInfo.text}</span>
      },
    },
    {
      title: '인보이스',
      dataIndex: 'invoiced',
      key: 'invoiced',
      render: (invoiced) => invoiced ? '✓' : '-',
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          노무 로그 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={laborLogs}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingLog ? '노무 로그 수정' : '노무 로그 추가'}
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
            name="project"
            label="프로젝트"
            rules={[{ required: true, message: '프로젝트를 선택하세요' }]}
          >
            <Select placeholder="프로젝트 선택">
              {projects.map((project) => (
                <Select.Option key={project._id} value={project._id}>
                  {project.projectCode} - {project.projectName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="workDate"
            label="작업일"
            rules={[{ required: true, message: '작업일을 선택하세요' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="workType"
            label="작업 유형"
            rules={[{ required: true, message: '작업 유형을 입력하세요' }]}
          >
            <Input placeholder="예: Packing, Assembly, Inspection" />
          </Form.Item>
          <Form.Item
            name="workDescription"
            label="작업 설명"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="hours"
            label="작업 시간"
            rules={[{ required: true, message: '작업 시간을 입력하세요' }]}
          >
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="laborRate"
            label="시간당 단가"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="status"
            label="상태"
            initialValue="pending"
          >
            <Select>
              <Select.Option value="pending">대기</Select.Option>
              <Select.Option value="completed">완료</Select.Option>
              <Select.Option value="cancelled">취소</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default LaborLogs

