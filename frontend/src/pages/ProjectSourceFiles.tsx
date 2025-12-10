import { useState, useEffect } from 'react'
import { Table, Button, message, Modal, Form, Input, Select, Upload, Space, Tag, Popconfirm, DatePicker } from 'antd'
import { UploadOutlined, DownloadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { UploadFile } from 'antd/es/upload/interface'

const { TextArea } = Input
const { MonthPicker } = DatePicker

interface ProjectSourceFile {
  _id: string
  fileName: string
  originalFileName: string
  filePath?: string
  project?: {
    _id: string
    projectCode: string
    projectName: string
  }
  category: string
  closingMonth?: string
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
  storageInfo?: {
    type: string
    path: string
    exists: boolean
  }
  fileExists?: boolean
}

interface Project {
  _id: string
  projectCode: string
  projectName: string
}

// 프로젝트별 중분류 카테고리 옵션
const categoryOptions = [
  { value: 'monthly_closing', label: '월 마감', requiresMonth: true },
  { value: 'delivery', label: '출하 실적', requiresMonth: false },
  { value: 'labor', label: '노무 실적', requiresMonth: false },
  { value: 'inventory', label: '재고 현황', requiresMonth: false },
  { value: 'quality', label: '품질 검사', requiresMonth: false },
  { value: 'maintenance', label: '유지보수', requiresMonth: false },
  { value: 'expense', label: '경비', requiresMonth: false },
  { value: 'other', label: '기타', requiresMonth: false },
]

const ProjectSourceFiles = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [files, setFiles] = useState<ProjectSourceFile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [selectedFile, setSelectedFile] = useState<ProjectSourceFile | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined)
  const [form] = Form.useForm()

  // URL 경로에서 category 추출 (예: /operation/projects/123/tm-packaging -> tm-packaging)
  const getCategoryFromPath = () => {
    const pathMatch = location.pathname.match(/\/operation\/projects\/[^/]+\/(.+)$/)
    if (pathMatch && pathMatch[1] !== 'source-data') {
      return pathMatch[1]
    }
    return undefined
  }

  const currentCategory = getCategoryFromPath()

  // 중분류 카테고리 라벨 매핑
  const categoryLabels: Record<string, string> = {
    'tm-packaging': 'TM 포장',
    'tm-storage': 'TM 보관',
    'vw-ckd': 'VW CKD',
    'bsa': 'BSA',
    'mobis-ckd': 'MOBIS CKD',
    'source-data': '월마감자료',
  }

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchFiles()
    } else {
      fetchProjects()
      fetchFiles()
    }
  }, [projectId, filterCategory, currentCategory])

  const fetchProject = async () => {
    if (!projectId) return
    try {
      const response = await api.get(`/projects/${projectId}`)
      setSelectedProject(response.data)
    } catch (error) {
      message.error('프로젝트 정보를 불러오는데 실패했습니다')
      navigate('/operation')
    }
  }

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (projectId) params.projectId = projectId
      // URL에서 추출한 category가 있으면 우선 사용, 없으면 filterCategory 사용
      if (currentCategory) {
        params.category = currentCategory
      } else if (filterCategory) {
        params.category = filterCategory
      }
      const response = await api.get('/project-source-files', { params })
      setFiles(response.data)
    } catch (error) {
      message.error('파일 목록을 불러오는데 실패했습니다')
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
    // currentCategory가 있으면 해당 category로 기본 설정, 없으면 monthly_closing
    const defaultCategory = currentCategory || 'monthly_closing'
    form.setFieldsValue({
      projectId: projectId || undefined,
      category: defaultCategory,
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

      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', values.projectId)
      // currentCategory가 있으면 우선 사용, 없으면 form의 category 사용
      const uploadCategory = currentCategory || values.category
      formData.append('category', uploadCategory)
      const categoryInfo = categoryOptions.find(opt => opt.value === uploadCategory)
      if (categoryInfo?.requiresMonth && values.closingMonth) {
        formData.append('closingMonth', values.closingMonth.format('YYYY-MM'))
      }
      if (values.description) {
        formData.append('description', values.description)
      }

      const response = await api.post('/project-source-files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // 업로드된 파일 정보를 상세히 표시
      const uploadedFile = response.data
      const successMessage = (
        <div>
          <div><strong>파일 업로드 성공!</strong></div>
          <div style={{ marginTop: 8 }}>
            <div>프로젝트: {uploadedFile.project?.projectCode || 'N/A'}</div>
            <div>카테고리: {categoryOptions.find(opt => opt.value === uploadCategory)?.label || uploadCategory}</div>
            {uploadedFile.closingMonth && <div>마감월: {dayjs(uploadedFile.closingMonth, 'YYYY-MM').format('YYYY년 MM월')}</div>}
            <div>파일명: {uploadedFile.originalFileName}</div>
            <div>파일 크기: {formatFileSize(uploadedFile.fileSize)}</div>
            {uploadedFile.summary && <div>데이터 행 수: {uploadedFile.summary.totalRows.toLocaleString()}행</div>}
          </div>
        </div>
      )
      
      message.success(successMessage, 5)
      
      // 업로드된 파일을 즉시 상세 보기로 표시
      setSelectedFile(uploadedFile)
      setPreviewModalVisible(true)
      
      setUploadModalVisible(false)
      form.resetFields()
      setFileList([])
      fetchFiles()
    } catch (error: any) {
      message.error(error.response?.data?.message || '파일 업로드에 실패했습니다')
    }
  }

  const handleDownload = async (file: ProjectSourceFile) => {
    try {
      const response = await api.get(`/project-source-files/${file._id}/download`, {
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.originalFileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      message.success('파일 다운로드가 시작되었습니다')
    } catch (error) {
      message.error('파일 다운로드에 실패했습니다')
    }
  }

  const handlePreview = async (file: ProjectSourceFile) => {
    try {
      const response = await api.get(`/project-source-files/${file._id}`)
      setSelectedFile(response.data)
      setPreviewModalVisible(true)
    } catch (error) {
      message.error('파일 정보를 불러오는데 실패했습니다')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/project-source-files/${id}`)
      message.success('파일이 삭제되었습니다')
      fetchFiles()
    } catch (error) {
      message.error('파일 삭제에 실패했습니다')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const columns: ColumnsType<ProjectSourceFile> = [
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
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      render: (category) => {
        const categoryInfo = categoryOptions.find(opt => opt.value === category)
        const colorMap: Record<string, string> = {
          monthly_closing: 'blue',
          delivery: 'green',
          labor: 'orange',
          inventory: 'purple',
          quality: 'cyan',
          maintenance: 'geekblue',
          expense: 'red',
          other: 'default',
        }
        return <Tag color={colorMap[category] || 'default'}>
          {categoryInfo?.label || category}
        </Tag>
      },
    },
    {
      title: '마감월',
      dataIndex: 'closingMonth',
      key: 'closingMonth',
      render: (month) => month ? dayjs(month, 'YYYY-MM').format('YYYY년 MM월') : '-',
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
      render: (_, record) => record.summary?.totalRows ? record.summary.totalRows.toLocaleString() + '행' : '-',
    },
    {
      title: '업로드일',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '업로드자',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy',
      width: 120,
      render: (user: any) => user?.username || user?.email || '시스템',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; label: string }> = {
          uploaded: { color: 'blue', label: '업로드됨' },
          processed: { color: 'green', label: '처리됨' },
          error: { color: 'red', label: '오류' },
        }
        const statusInfo = statusMap[status] || { color: 'default', label: status }
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
      },
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
            title="파일을 삭제하시겠습니까?"
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
      {selectedProject && (
        <div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            {selectedProject.projectCode} - {selectedProject.projectName}
          </div>
          <Button
            type="link"
            size="small"
            onClick={() => navigate('/operation')}
            style={{ padding: 0 }}
          >
            다른 프로젝트 선택
          </Button>
        </div>
      )}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>
          {currentCategory 
            ? categoryLabels[currentCategory] || currentCategory
            : selectedProject 
              ? '월마감자료' 
              : '프로젝트별 월마감자료'}
        </h2>
        <Space>
          {!currentCategory && (
            <Select
              placeholder="카테고리 필터"
              allowClear
              style={{ width: 150 }}
              value={filterCategory}
              onChange={setFilterCategory}
            >
              {categoryOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          )}
          <Button type="primary" icon={<UploadOutlined />} onClick={handleUpload}>
            파일 업로드
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={files}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="월마감자료 업로드"
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
          {!projectId && (
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
          )}
          <Form.Item
            name="category"
            label="카테고리"
            rules={[{ required: true, message: '카테고리를 선택하세요' }]}
          >
            <Select 
              placeholder="카테고리 선택"
              disabled={!!currentCategory}
            >
              {categoryOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
            {currentCategory && (
              <div style={{ marginTop: 4, fontSize: '12px', color: '#999' }}>
                현재 카테고리: {categoryLabels[currentCategory] || currentCategory}
              </div>
            )}
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.category !== currentValues.category}
          >
            {({ getFieldValue }) => {
              const category = getFieldValue('category')
              const categoryInfo = categoryOptions.find(opt => opt.value === category)
              return categoryInfo?.requiresMonth ? (
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
              ) : null
            }}
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
        </Form>
      </Modal>

      <Modal
        title={`파일 정보 - ${selectedFile?.originalFileName}`}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedFile && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p><strong>프로젝트:</strong> {selectedFile.project?.projectCode} - {selectedFile.project?.projectName}</p>
              <p><strong>카테고리:</strong> {categoryOptions.find(opt => opt.value === selectedFile.category)?.label || selectedFile.category}</p>
              {selectedFile.closingMonth && (
                <p><strong>마감월:</strong> {dayjs(selectedFile.closingMonth, 'YYYY-MM').format('YYYY년 MM월')}</p>
              )}
              <p><strong>파일명:</strong> {selectedFile.originalFileName}</p>
              <p><strong>파일 크기:</strong> {formatFileSize(selectedFile.fileSize)}</p>
              <p><strong>업로드일:</strong> {dayjs(selectedFile.uploadedAt).format('YYYY-MM-DD HH:mm')}</p>
              {selectedFile.description && (
                <p><strong>설명:</strong> {selectedFile.description}</p>
              )}
            </div>
            {selectedFile.summary && (
              <div>
                <h4>파일 요약</h4>
                <p><strong>총 행 수:</strong> {selectedFile.summary.totalRows.toLocaleString()}행</p>
                <p><strong>컬럼:</strong> {selectedFile.summary.columns.join(', ')}</p>
                {selectedFile.summary.sampleData && selectedFile.summary.sampleData.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <h4>샘플 데이터 (처음 5줄)</h4>
                    <Table
                      columns={selectedFile.summary.columns.map((col, idx) => ({
                        title: col,
                        dataIndex: idx,
                        key: idx,
                      }))}
                      dataSource={selectedFile.summary.sampleData.map((row, idx) => ({
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

export default ProjectSourceFiles

