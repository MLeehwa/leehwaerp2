import { useState, useEffect } from 'react'
import { Table, Button, message, Modal, Form, Input, Select, Upload, Space, Tag, Popconfirm, DatePicker } from 'antd'
import { UploadOutlined, DownloadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { UploadFile } from 'antd/es/upload/interface'

const { TextArea } = Input
const { MonthPicker } = DatePicker

interface ProjectMonthlyClosing {
  _id: string
  fileName: string
  originalFileName: string
  project?: {
    _id: string
    projectCode: string
    projectName: string
  }
  closingMonth: string
  fileType: 'excel' | 'csv' | 'other'
  fileSize: number
  uploadedBy?: string
  uploadedAt: string
  summary?: {
    totalRows: number
    columns: string[]
    sampleData?: any[]
  }
  status: 'uploaded' | 'processed' | 'error'
  description?: string
  notes?: string
}

interface Project {
  _id: string
  projectCode: string
  projectName: string
}

const ProjectMonthlyClosings = () => {
  const [closings, setClosings] = useState<ProjectMonthlyClosing[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [selectedClosing, setSelectedClosing] = useState<ProjectMonthlyClosing | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    fetchClosings()
    fetchProjects()
  }, [])

  const fetchClosings = async () => {
    setLoading(true)
    try {
      const response = await api.get('/project-monthly-closings')
      setClosings(response.data)
    } catch (error) {
      message.error('월 마감 자료 목록을 불러오는데 실패했습니다')
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

  const handleUpload = () => {
    form.resetFields()
    form.setFieldsValue({
      closingMonth: dayjs().format('YYYY-MM'),
    })
    setFileList([])
    setUploadModalVisible(true)
  }

  const handleUploadSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (fileList.length === 0) {
        message.error('파일을 선택하세요')
        return
      }

      const file = fileList[0].originFileObj
      if (!file) {
        message.error('파일을 선택하세요')
        return
      }

      const closingMonth = values.closingMonth.format('YYYY-MM')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', values.projectId)
      formData.append('closingMonth', closingMonth)
      if (values.description) {
        formData.append('description', values.description)
      }
      if (values.notes) {
        formData.append('notes', values.notes)
      }

      await api.post('/project-monthly-closings/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      message.success('월 마감 자료가 업로드되었습니다')
      setUploadModalVisible(false)
      form.resetFields()
      setFileList([])
      fetchClosings()
    } catch (error: any) {
      message.error(error.response?.data?.message || '파일 업로드에 실패했습니다')
    }
  }

  const handleDownload = async (closing: ProjectMonthlyClosing) => {
    try {
      const response = await api.get(`/project-monthly-closings/${closing._id}/download`, {
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', closing.originalFileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      message.success('파일 다운로드가 시작되었습니다')
    } catch (error) {
      message.error('파일 다운로드에 실패했습니다')
    }
  }

  const handlePreview = async (closing: ProjectMonthlyClosing) => {
    try {
      const response = await api.get(`/project-monthly-closings/${closing._id}`)
      setSelectedClosing(response.data)
      setPreviewModalVisible(true)
    } catch (error) {
      message.error('월 마감 자료 정보를 불러오는데 실패했습니다')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/project-monthly-closings/${id}`)
      message.success('월 마감 자료가 삭제되었습니다')
      fetchClosings()
    } catch (error) {
      message.error('월 마감 자료 삭제에 실패했습니다')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const columns: ColumnsType<ProjectMonthlyClosing> = [
    {
      title: '프로젝트',
      key: 'project',
      render: (_, record) => (
        <div>
          <div>{record.project?.projectCode}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.project?.projectName}</div>
        </div>
      ),
    },
    {
      title: '마감월',
      dataIndex: 'closingMonth',
      key: 'closingMonth',
      render: (month) => dayjs(month, 'YYYY-MM').format('YYYY년 MM월'),
    },
    {
      title: '파일명',
      dataIndex: 'originalFileName',
      key: 'originalFileName',
      render: (name, record) => (
        <div>
          <div>{name}</div>
          {record.description && (
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '파일 타입',
      dataIndex: 'fileType',
      key: 'fileType',
      render: (type) => (
        <Tag color={type === 'excel' ? 'green' : type === 'csv' ? 'blue' : 'default'}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '파일 크기',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size) => formatFileSize(size),
    },
    {
      title: '데이터 행 수',
      key: 'rows',
      render: (_, record) => record.summary?.totalRows || '-',
    },
    {
      title: '업로드일',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          uploaded: { text: '업로드됨', color: 'blue' },
          processed: { text: '처리됨', color: 'green' },
          error: { text: '오류', color: 'red' },
        }
        const statusInfo = statusMap[status] || { text: status, color: 'default' }
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
      },
    },
    {
      title: '작업',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          >
            보기
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            다운로드
          </Button>
          <Popconfirm
            title="월 마감 자료를 삭제하시겠습니까?"
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
        <h2>프로젝트별 월 마감 자료</h2>
        <Button type="primary" icon={<UploadOutlined />} onClick={handleUpload}>
          파일 업로드
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={closings}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="월 마감 자료 업로드"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false)
          form.resetFields()
          setFileList([])
        }}
        onOk={handleUploadSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="projectId"
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
            name="closingMonth"
            label="마감월"
            rules={[{ required: true, message: '마감월을 선택하세요' }]}
          >
            <MonthPicker
              style={{ width: '100%' }}
              format="YYYY-MM"
              placeholder="마감월 선택"
            />
          </Form.Item>
          <Form.Item
            name="file"
            label="파일"
            rules={[{ required: true, message: '파일을 선택하세요' }]}
          >
            <Upload
              fileList={fileList}
              beforeUpload={(file) => {
                setFileList([file])
                return false // 자동 업로드 방지
              }}
              onRemove={() => {
                setFileList([])
              }}
              accept=".xlsx,.xls,.csv"
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>파일 선택</Button>
            </Upload>
            <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
              엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다. (최대 10MB)
            </div>
          </Form.Item>
          <Form.Item
            name="description"
            label="설명"
          >
            <TextArea rows={3} placeholder="파일에 대한 설명을 입력하세요" />
          </Form.Item>
          <Form.Item
            name="notes"
            label="메모"
          >
            <TextArea rows={3} placeholder="추가 메모를 입력하세요" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`월 마감 자료 정보 - ${selectedClosing?.originalFileName}`}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedClosing && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p><strong>프로젝트:</strong> {selectedClosing.project?.projectCode} - {selectedClosing.project?.projectName}</p>
              <p><strong>마감월:</strong> {dayjs(selectedClosing.closingMonth, 'YYYY-MM').format('YYYY년 MM월')}</p>
              <p><strong>파일명:</strong> {selectedClosing.originalFileName}</p>
              <p><strong>파일 크기:</strong> {formatFileSize(selectedClosing.fileSize)}</p>
              <p><strong>업로드일:</strong> {dayjs(selectedClosing.uploadedAt).format('YYYY-MM-DD HH:mm')}</p>
              {selectedClosing.description && (
                <p><strong>설명:</strong> {selectedClosing.description}</p>
              )}
              {selectedClosing.notes && (
                <p><strong>메모:</strong> {selectedClosing.notes}</p>
              )}
            </div>
            {selectedClosing.summary && (
              <div>
                <h4>파일 요약</h4>
                <p><strong>총 행 수:</strong> {selectedClosing.summary.totalRows.toLocaleString()}행</p>
                <p><strong>컬럼:</strong> {selectedClosing.summary.columns.join(', ')}</p>
                {selectedClosing.summary.sampleData && selectedClosing.summary.sampleData.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <h4>샘플 데이터 (처음 5줄)</h4>
                    <Table
                      columns={selectedClosing.summary.columns.map((col, idx) => ({
                        title: col,
                        dataIndex: idx,
                        key: idx,
                      }))}
                      dataSource={selectedClosing.summary.sampleData.map((row, idx) => ({
                        key: idx,
                        ...row,
                      }))}
                      pagination={false}
                      size="small"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ProjectMonthlyClosings

