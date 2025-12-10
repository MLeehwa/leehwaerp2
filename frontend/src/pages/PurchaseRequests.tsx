import { useState, useEffect } from 'react'
import { Table, Button, Tag, Space, message, Modal, Form, Input, Select, InputNumber, DatePicker, Upload, Card, Descriptions, Divider, AutoComplete, Row, Col, Popconfirm } from 'antd'
import { PlusOutlined, MinusCircleOutlined, UploadOutlined, FilterOutlined, CheckOutlined, CloseOutlined, SwapOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface PurchaseRequestItem {
  description: string
  modelNo?: string
  spec?: string
  quantity: number
  unitPrice?: number
  estimatedTotal?: number
  categoryCode?: string
}

interface Project {
  _id: string
  projectCode: string
  projectName: string
  status?: string
}

interface PurchaseRequest {
  _id: string
  prNumber: string
  status: string
  totalAmount: number
  requestedDate: string
  locationId?: string
  locationData?: {
    code: string
    name: string
  }
  companyId?: string
  companyData?: {
    code: string
    name: string
  }
  projectId?: string
  projectData?: {
    projectCode: string
    projectName: string
  }
  supplier?: string
  items?: PurchaseRequestItem[]
  requestedBy?: string
  requestedByUser?: {
    _id?: string
    username: string
    firstName?: string
    lastName?: string
  }
  approvedBy?: string
  approvedAt?: string
  approvedByUser?: {
    username: string
    firstName?: string
    lastName?: string
  }
  rejectionReason?: string
  convertedToPO?: string
}

interface Category {
  _id: string
  code: string
  name: string
  isActive: boolean
}

interface Supplier {
  _id: string
  name: string
  email?: string
  phone?: string
  isActive: boolean
}

interface User {
  _id: string
  username: string
  firstName?: string
  lastName?: string
  role: string
}

interface Location {
  _id: string
  code: string
  name: string
  companyId: string
}

interface Company {
  _id: string
  code: string
  name: string
  nameEn?: string
  currency?: string
  isActive: boolean
}

const PurchaseRequests = () => {
  const { user } = useAuth()
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [approveModalVisible, setApproveModalVisible] = useState(false)
  const [convertModalVisible, setConvertModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedPR, setSelectedPR] = useState<PurchaseRequest | null>(null)
  const [editingPR, setEditingPR] = useState<PurchaseRequest | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [approveAction, setApproveAction] = useState<'approve' | 'reject'>('approve')
  const [modelNoOptionsMap, setModelNoOptionsMap] = useState<Record<number, Array<{ value: string; label: string; item: any }>>>({})
  const [form] = Form.useForm()
  const [approveForm] = Form.useForm()
  const [convertForm] = Form.useForm()
  
  // 필터 상태
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterLocationId, setFilterLocationId] = useState<string | undefined>(undefined)
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  
  // 권한 확인
  const canApprove = user?.role === 'admin' || user?.role === 'manager'

  useEffect(() => {
    fetchRequests()
    fetchCategories()
    fetchSuppliers()
    fetchLocations()
    fetchCompanies()
    fetchProjects()
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [filterStatus, filterLocationId, filterDateRange])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filterStatus) params.status = filterStatus
      if (filterLocationId) params.locationId = filterLocationId
      if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
        params.startDate = filterDateRange[0].startOf('day').toISOString()
        params.endDate = filterDateRange[1].endOf('day').toISOString()
      }
      
      const response = await api.get('/purchase-requests', { params })
      // company 필드를 companyId로 매핑
      const mappedData = response.data.map((pr: any) => ({
        ...pr,
        companyId: pr.company || pr.companyId,
      }))
      setRequests(mappedData)
    } catch (error) {
      message.error('구매요청 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories')
      setCategories(response.data.filter((cat: Category) => cat.isActive))
    } catch (error) {
      console.error('카테고리 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers?isActive=true')
      setSuppliers(response.data)
    } catch (error) {
      console.error('공급업체 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations?isActive=true')
      setLocations(response.data || [])
    } catch (error) {
      console.error('로케이션 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies?isActive=true')
      setCompanies(response.data || [])
    } catch (error) {
      console.error('법인 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects?status=active')
      setProjects(response.data || [])
    } catch (error) {
      console.error('프로젝트 목록을 불러오는데 실패했습니다')
    }
  }

  const handleAdd = () => {
    setEditingPR(null)
    form.resetFields()
    form.setFieldsValue({ priority: 'medium', items: [{}] })
    setFileList([])
    setModalVisible(true)
  }

  const handleEdit = async (pr: PurchaseRequest) => {
    try {
      // 상세 정보 가져오기
      const response = await api.get(`/purchase-requests/${pr._id}`)
      const prData = response.data
      
      setEditingPR(prData)
      form.resetFields()
      
      // 폼 데이터 설정
      const formValues: any = {
        companyId: prData.companyId || prData.company,
        locationId: prData.locationId,
        supplier: prData.supplier,
        priority: prData.priority || 'medium',
        requiredDate: prData.requiredDate ? dayjs(prData.requiredDate) : undefined,
        reason: prData.reason,
        notes: prData.notes,
        websiteUrl: prData.websiteUrl,
        items: prData.items && prData.items.length > 0 ? prData.items : [{}],
        projectId: prData.projectId || prData.project,
      }
      
      form.setFieldsValue(formValues)
      setFileList([])
      setModalVisible(true)
    } catch (error: any) {
      message.error('구매요청 정보를 불러오는데 실패했습니다')
    }
  }

  const handleDelete = async (pr: PurchaseRequest) => {
    try {
      await api.delete(`/purchase-requests/${pr._id}`)
      message.success('구매요청이 삭제되었습니다')
      fetchRequests()
    } catch (error: any) {
      message.error(error.response?.data?.message || '구매요청 삭제에 실패했습니다')
    }
  }

  const handleFileChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setFileList(newFileList)
  }

  const beforeUpload = (file: File) => {
    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      message.error('파일 크기는 10MB 이하여야 합니다')
    }
    return false // 자동 업로드 방지
  }

  const handleSubmit = async (values: any) => {
    try {
      // 날짜 변환 (dayjs 객체를 ISO string으로)
      if (values.requiredDate) {
        values.requiredDate = values.requiredDate.toDate().toISOString()
      }

      // items 처리
      const items = values.items.map((item: any) => {
        const processedItem: any = {
          description: item.description,
          quantity: item.quantity,
        }
        if (item.modelNo) processedItem.modelNo = item.modelNo
        if (item.spec) processedItem.spec = item.spec
        if (item.unitPrice) processedItem.unitPrice = item.unitPrice
        if (item.estimatedTotal) processedItem.estimatedTotal = item.estimatedTotal
        if (item.categoryCode) processedItem.categoryCode = item.categoryCode
        return processedItem
      })

      // 파일 첨부 처리 (파일명과 크기만 저장)
      const attachments = fileList.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        // 실제 파일은 나중에 별도 업로드 API로 처리하거나, base64로 인코딩할 수 있음
      }))

      // companyId를 company로 매핑
      // shippingAddressId 제거 (로케이션이 배송지 역할)
      const requestData: any = {
        ...values,
        items,
        attachments: attachments.length > 0 ? attachments : undefined,
      }
      // companyId를 company로 매핑
      if (values.companyId) {
        requestData.company = values.companyId
        delete requestData.companyId
      }
      // shippingAddressId 제거
      if (requestData.shippingAddressId) {
        delete requestData.shippingAddressId
      }
      // projectId를 project로 매핑
      if (values.projectId) {
        requestData.project = values.projectId
        delete requestData.projectId
      }
      // approver 제거 (불필요)
      if (requestData.approver) {
        delete requestData.approver
      }

      if (editingPR) {
        // 수정
        await api.put(`/purchase-requests/${editingPR._id}`, requestData)
        message.success('구매요청이 수정되었습니다')
      } else {
        // 생성
        await api.post('/purchase-requests', requestData)
        message.success('구매요청이 생성되었습니다')
      }
      
      setModalVisible(false)
      setEditingPR(null)
      form.resetFields()
      setFileList([])
      fetchRequests()
    } catch (error: any) {
      message.error(error.response?.data?.message || (editingPR ? '구매요청 수정에 실패했습니다' : '구매요청 생성에 실패했습니다'))
    }
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      draft: 'default',
      submitted: 'processing',
      approved: 'success',
      rejected: 'error',
      converted: 'success',
    }
    return colorMap[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      draft: '초안',
      submitted: '제출됨',
      approved: '승인됨',
      rejected: '거부됨',
      converted: '변환됨',
    }
    return textMap[status] || status
  }

  const handleApprove = (pr: PurchaseRequest) => {
    setSelectedPR(pr)
    setApproveAction('approve')
    approveForm.resetFields()
    approveForm.setFieldsValue({ action: 'approve' })
    setApproveModalVisible(true)
  }

  const handleReject = (pr: PurchaseRequest) => {
    setSelectedPR(pr)
    setApproveAction('reject')
    approveForm.resetFields()
    approveForm.setFieldsValue({ action: 'reject' })
    setApproveModalVisible(true)
  }

  const handleApproveSubmit = async (values: any) => {
    if (!selectedPR) return
    
    try {
      await api.post(`/purchase-requests/${selectedPR._id}/approve`, {
        action: approveAction,
        rejectionReason: values.rejectionReason,
      })
      message.success(approveAction === 'approve' ? '구매요청이 승인되었습니다' : '구매요청이 거부되었습니다')
      setApproveModalVisible(false)
      setApproveAction('approve')
      fetchRequests()
    } catch (error: any) {
      message.error(error.response?.data?.message || '처리에 실패했습니다')
    }
  }

  const handleConvertToPO = (pr: PurchaseRequest) => {
    setSelectedPR(pr)
    convertForm.resetFields()
    // PR 정보로 폼 초기화
    if (pr.items && pr.items.length > 0) {
      const poItems = pr.items.map((item) => ({
        description: item.description,
        modelNo: item.modelNo,
        spec: item.spec,
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        total: item.estimatedTotal || (item.unitPrice || 0) * item.quantity,
        categoryCode: item.categoryCode,
      }))
      convertForm.setFieldsValue({
        items: poItems,
        supplier: pr.supplier,
        paymentTerms: 'Net 30',
      })
    }
    setConvertModalVisible(true)
  }

  const handleConvertSubmit = async (values: any) => {
    if (!selectedPR) return
    
    try {
      // 날짜 변환
      const requestData: any = {
        supplier: values.supplier,
        paymentTerms: values.paymentTerms || 'Net 30',
      }
      if (values.expectedDeliveryDate) {
        requestData.expectedDeliveryDate = values.expectedDeliveryDate.toDate().toISOString()
      }

      // items 처리 (금액 조정된 항목들)
      if (values.items && values.items.length > 0) {
        requestData.items = values.items.map((item: any) => ({
          description: item.description,
          modelNo: item.modelNo,
          spec: item.spec,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          total: item.total || (item.unitPrice || 0) * item.quantity,
          categoryCode: item.categoryCode,
        }))
      }

      await api.post(`/purchase-requests/${selectedPR._id}/convert-to-po`, requestData)
      message.success('구매주문이 생성되었습니다')
      setConvertModalVisible(false)
      fetchRequests()
    } catch (error: any) {
      message.error(error.response?.data?.message || '구매주문 생성에 실패했습니다')
    }
  }

  const handleViewDetail = async (pr: PurchaseRequest) => {
    try {
      // 상세 정보 가져오기
      const response = await api.get(`/purchase-requests/${pr._id}`)
      setSelectedPR(response.data)
      setDetailModalVisible(true)
    } catch (error: any) {
      message.error('구매요청 정보를 불러오는데 실패했습니다')
    }
  }

  const columns: ColumnsType<PurchaseRequest> = [
    {
      title: 'PR 번호',
      dataIndex: 'prNumber',
      key: 'prNumber',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '로케이션',
      key: 'location',
      render: (_, record: PurchaseRequest) => {
        if (record.locationData) {
          return `${record.locationData.code} - ${record.locationData.name}`
        }
        const location = locations.find(loc => loc._id === record.locationId)
        return location ? `${location.code} - ${location.name}` : '-'
      },
    },
    {
      title: '발주 법인',
      key: 'company',
      render: (_, record: PurchaseRequest) => {
        if (record.companyData) {
          return `${record.companyData.code} - ${record.companyData.name}`
        }
        // companyId 또는 company 필드 확인
        const companyId = record.companyId || (record as any).company
        const company = companyId ? companies.find(comp => comp._id === companyId) : null
        return company ? `${company.code} - ${company.name}` : '-'
      },
    },
    {
      title: '총액',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => amount ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
    },
    {
      title: '웹사이트',
      dataIndex: 'websiteUrl',
      key: 'websiteUrl',
      render: (url: string) => {
        if (!url) return '-'
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            링크 열기
          </a>
        )
      },
    },
    {
      title: '요청일',
      dataIndex: 'requestedDate',
      key: 'requestedDate',
      render: (date: string) => {
        if (!date) return '-'
        try {
          return new Date(date).toLocaleDateString('ko-KR')
        } catch {
          return '-'
        }
      },
    },
    {
      title: '작업',
      key: 'action',
      width: 250,
      render: (_, record: PurchaseRequest) => {
        const isDraft = record.status === 'draft'
        const isSubmitted = record.status === 'submitted'
        const isApproved = record.status === 'approved'
        const canConvert = isApproved && !record.convertedToPO && canApprove
        const isOwner = user?._id && record.requestedByUser && String(user._id) === String(record.requestedByUser._id || record.requestedBy)
        const canEdit = isDraft && isOwner
        const canDelete = isDraft && (isOwner || user?.role === 'admin')

        return (
          <Space>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            >
              상세
            </Button>
            {canEdit && (
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                수정
              </Button>
            )}
            {canDelete && (
              <Popconfirm
                title="구매요청을 삭제하시겠습니까?"
                description="이 작업은 되돌릴 수 없습니다."
                onConfirm={() => handleDelete(record)}
                okText="삭제"
                cancelText="취소"
                okButtonProps={{ danger: true }}
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
            {isSubmitted && canApprove && (
              <>
                <Button
                  type="link"
                  icon={<CheckOutlined />}
                  onClick={() => handleApprove(record)}
                >
                  승인
                </Button>
                <Button
                  type="link"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleReject(record)}
                >
                  거부
                </Button>
              </>
            )}
            {canConvert && (
              <Button
                type="link"
                icon={<SwapOutlined />}
                onClick={() => handleConvertToPO(record)}
              >
                PO 변환
              </Button>
            )}
          </Space>
        )
      },
    },
  ]

  const handleFilterReset = () => {
    setFilterStatus(undefined)
    setFilterLocationId(undefined)
    setFilterDateRange(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>구매요청 (PR)</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          구매요청 작성
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FilterOutlined />
            <span style={{ fontWeight: 500 }}>필터:</span>
          </div>
          
          <Select
            placeholder="상태"
            allowClear
            style={{ width: 150 }}
            value={filterStatus}
            onChange={setFilterStatus}
          >
            <Select.Option value="draft">초안</Select.Option>
            <Select.Option value="submitted">제출됨</Select.Option>
            <Select.Option value="approved">승인됨</Select.Option>
            <Select.Option value="rejected">거부됨</Select.Option>
            <Select.Option value="converted">변환됨</Select.Option>
          </Select>

          <Select
            placeholder="로케이션"
            allowClear
            showSearch
            style={{ width: 200 }}
            value={filterLocationId}
            onChange={setFilterLocationId}
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {locations.map((location) => (
              <Select.Option 
                key={location._id} 
                value={location._id}
                label={`${location.code} - ${location.name}`}
              >
                {location.code} - {location.name}
              </Select.Option>
            ))}
          </Select>

          <RangePicker
            placeholder={['시작일', '종료일']}
            value={filterDateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setFilterDateRange([dates[0], dates[1]])
              } else {
                setFilterDateRange(null)
              }
            }}
            format="YYYY-MM-DD"
          />

          <Button onClick={handleFilterReset}>
            필터 초기화
          </Button>
        </div>
      </Card>

      <Table
        columns={columns}
        dataSource={requests}
        loading={loading}
        rowKey="_id"
        locale={{ emptyText: '구매요청이 없습니다' }}
      />

      <Modal
        title={editingPR ? '구매요청 수정' : '구매요청 작성'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingPR(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={1400}
        style={{ top: 20 }}
        styles={{ body: { padding: '24px' } }}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item 
                name="companyId" 
                label="발주 법인"
                rules={[{ required: true, message: '발주 법인을 선택하세요' }]}
              >
                <Select 
                  placeholder="발주 법인을 선택하세요" 
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {companies.map((company) => (
                    <Select.Option 
                      key={company._id} 
                      value={company._id}
                      label={`${company.code} - ${company.name}`}
                    >
                      {company.code} - {company.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item 
                name="locationId" 
                label="로케이션"
                rules={[{ required: true, message: '로케이션을 선택하세요' }]}
              >
                <Select 
                  placeholder="로케이션을 선택하세요" 
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {locations.map((location) => (
                    <Select.Option key={location._id} value={location._id} label={`${location.code} - ${location.name}`}>
                      {location.code} - {location.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item 
                name="supplier" 
                label="업체 선택"
                tooltip="기존 업체를 선택하거나 새 업체명을 직접 입력할 수 있습니다. 새로 입력한 업체명도 저장됩니다."
              >
                <AutoComplete
                  placeholder="업체를 선택하거나 직접 입력하세요"
                  allowClear
                  options={suppliers.map((supplier) => ({
                    value: supplier.name,
                    label: `${supplier.name}${supplier.email ? ` (${supplier.email})` : ''}`,
                  }))}
                  filterOption={(inputValue, option) =>
                    option?.label?.toLowerCase().includes(inputValue.toLowerCase()) ?? false
                  }
                  onChange={(value) => {
                    // 업체가 변경되면 MODEL NO 검색 옵션 초기화
                    if (value) {
                      setModelNoOptionsMap({})
                    }
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="projectId" label="프로젝트 (선택)">
                <Select 
                  placeholder="프로젝트를 선택하세요" 
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {projects.map((project) => (
                    <Select.Option 
                      key={project._id} 
                      value={project._id}
                      label={`${project.projectCode} - ${project.projectName}`}
                    >
                      {project.projectCode} - {project.projectName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="priority" label="우선순위" initialValue="medium">
                <Select>
                  <Select.Option value="low">낮음</Select.Option>
                  <Select.Option value="medium">보통</Select.Option>
                  <Select.Option value="high">높음</Select.Option>
                  <Select.Option value="urgent">긴급</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="requiredDate" label="필요일자">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="reason" label="구매 사유">
                <Input.TextArea rows={2} placeholder="구매 사유를 입력하세요" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="구매 항목"
            required
          >
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  <div style={{ marginBottom: 8 }}>
                    {fields.map(({ key, name, ...restField }) => {
                      // MODEL NO 자동완성 핸들러
                      const handleModelNoSearch = async (value: string) => {
                        if (!value || value.length < 2) {
                          setModelNoOptionsMap(prev => ({ ...prev, [name]: [] }))
                          return
                        }
                        
                        try {
                          // 선택된 업체 정보 가져오기
                          const selectedSupplier = form.getFieldValue('supplier')
                          const params: any = { modelNo: value }
                          if (selectedSupplier) {
                            params.supplier = selectedSupplier
                          }
                          
                          const response = await api.get('/purchase-requests/search/items', { params })
                          const options = response.data.map((item: any) => ({
                            value: item.modelNo || '',
                            label: `${item.modelNo || ''}${item.description ? ` - ${item.description}` : ''}${item.spec ? ` (${item.spec.substring(0, 50)}...)` : ''}`,
                            item: item
                          }))
                          setModelNoOptionsMap(prev => ({ ...prev, [name]: options }))
                        } catch (error) {
                          console.error('MODEL NO 검색 실패:', error)
                          setModelNoOptionsMap(prev => ({ ...prev, [name]: [] }))
                        }
                      }

                      const handleModelNoSelect = (value: string, option: any) => {
                        if (option?.item) {
                          const item = option.item
                          // 스펙 자동 입력
                          if (item.spec) {
                            form.setFieldValue(['items', name, 'spec'], item.spec)
                          }
                          // 설명 자동 입력 (비어있을 때만)
                          const currentDescription = form.getFieldValue(['items', name, 'description'])
                          if (!currentDescription && item.description) {
                            form.setFieldValue(['items', name, 'description'], item.description)
                          }
                          // 카테고리 자동 입력 (비어있을 때만)
                          const currentCategory = form.getFieldValue(['items', name, 'categoryCode'])
                          if (!currentCategory && item.categoryCode) {
                            form.setFieldValue(['items', name, 'categoryCode'], item.categoryCode)
                          }
                          // 단가 자동 입력 (비어있을 때만)
                          const currentUnitPrice = form.getFieldValue(['items', name, 'unitPrice'])
                          if (!currentUnitPrice && item.unitPrice) {
                            form.setFieldValue(['items', name, 'unitPrice'], item.unitPrice)
                            // 총액도 자동 계산
                            const quantity = form.getFieldValue(['items', name, 'quantity']) || 1
                            form.setFieldValue(['items', name, 'estimatedTotal'], item.unitPrice * quantity)
                          }
                        }
                      }

                      return (
                        <div key={key} style={{ marginBottom: 12, padding: 12, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                          <Row gutter={8} style={{ marginBottom: 8 }} align="middle">
                            <Col span={5}>
                              <Form.Item
                                {...restField}
                                name={[name, 'description']}
                                label="품명"
                                rules={[{ required: true, message: '품명을 입력하세요' }]}
                                style={{ marginBottom: 0 }}
                              >
                                <Input placeholder="품명" />
                              </Form.Item>
                            </Col>

                            <Col span={5}>
                              <Form.Item
                                {...restField}
                                name={[name, 'modelNo']}
                                label="MODEL NO"
                                style={{ marginBottom: 0 }}
                              >
                                <AutoComplete
                                  placeholder="MODEL NO 입력 (2자 이상)"
                                  allowClear
                                  options={modelNoOptionsMap[name] || []}
                                  onSearch={handleModelNoSearch}
                                  onSelect={handleModelNoSelect}
                                  filterOption={false}
                                  notFoundContent={null}
                                />
                              </Form.Item>
                            </Col>

                            <Col span={4}>
                              <Form.Item
                                {...restField}
                                name={[name, 'categoryCode']}
                                label="카테고리"
                                style={{ marginBottom: 0 }}
                              >
                                <Select placeholder="카테고리" allowClear>
                                  {categories.map((cat) => (
                                    <Select.Option key={cat._id} value={cat.code}>
                                      {cat.code} - {cat.name}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            </Col>

                            <Col span={3}>
                              <Form.Item
                                {...restField}
                                name={[name, 'quantity']}
                                label="수량"
                                rules={[{ required: true, message: '수량' }]}
                                style={{ marginBottom: 0 }}
                              >
                                <InputNumber 
                                  min={1} 
                                  placeholder="수량" 
                                  style={{ width: '100%' }}
                                  onChange={(value) => {
                                    const unitPrice = form.getFieldValue(['items', name, 'unitPrice'])
                                    if (value && unitPrice) {
                                      form.setFieldValue(['items', name, 'estimatedTotal'], value * unitPrice)
                                    }
                                  }}
                                />
                              </Form.Item>
                            </Col>

                            <Col span={3}>
                              <Form.Item
                                {...restField}
                                name={[name, 'unitPrice']}
                                label="단가"
                                style={{ marginBottom: 0 }}
                              >
                                <InputNumber
                                  min={0}
                                  placeholder="단가"
                                  prefix="$"
                                  style={{ width: '100%' }}
                                  onChange={(value) => {
                                    const quantity = form.getFieldValue(['items', name, 'quantity'])
                                    if (value && quantity) {
                                      form.setFieldValue(['items', name, 'estimatedTotal'], value * quantity)
                                    }
                                  }}
                                />
                              </Form.Item>
                            </Col>

                            <Col span={3}>
                              <Form.Item
                                {...restField}
                                name={[name, 'estimatedTotal']}
                                label="예상 총액"
                                style={{ marginBottom: 0 }}
                              >
                                <InputNumber
                                  min={0}
                                  placeholder="예상 총액"
                                  prefix="$"
                                  style={{ width: '100%' }}
                                />
                              </Form.Item>
                            </Col>

                            <Col span={1}>
                              <Form.Item label=" " style={{ marginBottom: 0 }}>
                                <Button
                                  type="text"
                                  danger
                                  icon={<MinusCircleOutlined />}
                                  onClick={() => remove(name)}
                                  style={{ width: '100%' }}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={8}>
                            <Col span={24}>
                              <Form.Item
                                {...restField}
                                name={[name, 'spec']}
                                label="스펙"
                                style={{ marginBottom: 0 }}
                              >
                                <Input.TextArea 
                                  rows={2} 
                                  placeholder="스펙 정보를 입력하세요 (MODEL NO 입력 시 자동으로 불러올 수 있습니다)" 
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        </div>
                      )
                    })}
                  </div>
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      항목 추가
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="websiteUrl" 
                label="웹사이트 URL (선택)"
                rules={[
                  {
                    type: 'url',
                    message: '올바른 URL 형식을 입력하세요 (예: https://example.com)',
                  },
                ]}
              >
                <div>
                  <Space.Compact style={{ width: '100%' }}>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      padding: '0 11px', 
                      background: '#fafafa', 
                      border: '1px solid #d9d9d9',
                      borderRight: 'none',
                      borderRadius: '6px 0 0 6px'
                    }}>
                      🌐
                    </span>
                    <Input 
                      placeholder="https://example.com"
                      style={{ borderRadius: '0 6px 6px 0' }}
                    />
                  </Space.Compact>
                </div>
              </Form.Item>
              <div style={{ marginTop: -16, marginBottom: 16, fontSize: 12, color: '#999' }}>
                제품 또는 서비스 관련 웹사이트 링크를 입력하세요
              </div>
            </Col>

            <Col span={12}>
              <Form.Item label="파일 첨부">
                <Upload
                  fileList={fileList}
                  onChange={handleFileChange}
                  beforeUpload={beforeUpload}
                  multiple
                >
                  <Button icon={<UploadOutlined />}>파일 선택</Button>
                </Upload>
              </Form.Item>
              <div style={{ marginTop: -16, marginBottom: 16, fontSize: 12, color: '#999' }}>
                최대 10MB까지 업로드 가능합니다
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="notes" label="비고">
                <Input.TextArea rows={2} placeholder="추가 메모를 입력하세요" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 승인/거부 모달 */}
      <Modal
        title={approveAction === 'reject' ? '구매요청 거부' : '구매요청 승인'}
        open={approveModalVisible}
        onCancel={() => {
          setApproveModalVisible(false)
          approveForm.resetFields()
          setApproveAction('approve')
        }}
        onOk={() => approveForm.submit()}
        okText={approveAction === 'reject' ? '거부' : '승인'}
        okButtonProps={approveAction === 'reject' ? { danger: true } : {}}
      >
        <Form form={approveForm} onFinish={handleApproveSubmit} layout="vertical" initialValues={{ action: approveAction }}>
          <Form.Item name="action" hidden>
            <Input />
          </Form.Item>
          {selectedPR && (
            <div style={{ marginBottom: 16 }}>
              <p><strong>PR 번호:</strong> {selectedPR.prNumber}</p>
              <p><strong>총액:</strong> {selectedPR.totalAmount ? `$${selectedPR.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</p>
            </div>
          )}
          {approveAction === 'reject' && (
            <Form.Item
              name="rejectionReason"
              label="거부 사유"
              rules={[{ required: true, message: '거부 사유를 입력하세요' }]}
            >
              <Input.TextArea rows={4} placeholder="거부 사유를 입력하세요" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* PR→PO 변환 모달 */}
      <Modal
        title="구매주문으로 변환"
        open={convertModalVisible}
        onCancel={() => {
          setConvertModalVisible(false)
          convertForm.resetFields()
        }}
        onOk={() => convertForm.submit()}
        width={900}
      >
        {selectedPR && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <p><strong>PR 번호:</strong> {selectedPR.prNumber}</p>
            <p><strong>원본 총액:</strong> {selectedPR.totalAmount ? `$${selectedPR.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</p>
          </div>
        )}
        <Form form={convertForm} onFinish={handleConvertSubmit} layout="vertical">
          <Form.Item
            name="supplier"
            label="공급업체"
            rules={[{ required: true, message: '공급업체를 선택하거나 입력하세요' }]}
          >
            <AutoComplete
              placeholder="공급업체를 선택하거나 직접 입력하세요"
              allowClear
              options={suppliers.map((supplier) => ({
                value: supplier.name,
                label: `${supplier.name}${supplier.email ? ` (${supplier.email})` : ''}`,
              }))}
              filterOption={(inputValue, option) =>
                option?.label?.toLowerCase().includes(inputValue.toLowerCase()) ?? false
              }
            />
          </Form.Item>

          <Form.Item name="paymentTerms" label="결제 조건" initialValue="Net 30">
            <Select>
              <Select.Option value="Net 15">Net 15</Select.Option>
              <Select.Option value="Net 30">Net 30</Select.Option>
              <Select.Option value="Net 45">Net 45</Select.Option>
              <Select.Option value="Net 60">Net 60</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="expectedDeliveryDate" label="예상 납기일">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Divider>구매 항목 (금액 조정 가능)</Divider>

          <Form.Item
            label="구매 항목"
            required
          >
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'description']}
                        rules={[{ required: true, message: '품명을 입력하세요' }]}
                        style={{ width: 200 }}
                      >
                        <Input placeholder="품명" />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'categoryCode']}
                        style={{ width: 150 }}
                      >
                        <Select placeholder="카테고리" allowClear>
                          {categories.map((cat) => (
                            <Select.Option key={cat._id} value={cat.code}>
                              {cat.code} - {cat.name}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: '수량을 입력하세요' }]}
                        style={{ width: 100 }}
                      >
                        <InputNumber 
                          min={1} 
                          placeholder="수량" 
                          style={{ width: '100%' }}
                          onChange={(value) => {
                            const unitPrice = convertForm.getFieldValue(['items', name, 'unitPrice'])
                            if (value && unitPrice) {
                              convertForm.setFieldValue(['items', name, 'total'], value * unitPrice)
                            }
                          }}
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'unitPrice']}
                        style={{ width: 120 }}
                      >
                        <InputNumber
                          min={0}
                          placeholder="단가"
                          prefix="$"
                          style={{ width: '100%' }}
                          onChange={(value) => {
                            const quantity = convertForm.getFieldValue(['items', name, 'quantity'])
                            if (value && quantity) {
                              convertForm.setFieldValue(['items', name, 'total'], value * quantity)
                            }
                          }}
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'total']}
                        style={{ width: 120 }}
                      >
                        <InputNumber
                          min={0}
                          placeholder="총액"
                          prefix="$"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>

                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                      />
                    </Space>
                  ))}
                </>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>

      {/* 상세 정보 모달 */}
      <Modal
        title="구매요청 상세"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedPR(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false)
            setSelectedPR(null)
          }}>
            닫기
          </Button>,
        ]}
        width={800}
      >
        {selectedPR && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="PR 번호">{selectedPR.prNumber}</Descriptions.Item>
              <Descriptions.Item label="상태">
                <Tag color={getStatusColor(selectedPR.status)}>{getStatusText(selectedPR.status)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="총액">{selectedPR.totalAmount ? `$${selectedPR.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="요청일">
                {selectedPR.requestedDate ? new Date(selectedPR.requestedDate).toLocaleDateString('ko-KR') : '-'}
              </Descriptions.Item>
              {selectedPR.approvedByUser && (
                <>
                  <Descriptions.Item label="승인자">
                    {selectedPR.approvedByUser.firstName} {selectedPR.approvedByUser.lastName} ({selectedPR.approvedByUser.username})
                  </Descriptions.Item>
                  <Descriptions.Item label="승인일">
                    {selectedPR.approvedAt ? new Date(selectedPR.approvedAt).toLocaleDateString('ko-KR') : '-'}
                  </Descriptions.Item>
                </>
              )}
              {selectedPR.rejectionReason && (
                <Descriptions.Item label="거부 사유" span={2}>
                  {selectedPR.rejectionReason}
                </Descriptions.Item>
              )}
            </Descriptions>
            {selectedPR.items && selectedPR.items.length > 0 && (
              <>
                <Divider>구매 항목</Divider>
                <Table
                  dataSource={selectedPR.items}
                  rowKey={(_, index) => `item-${index}`}
                  pagination={false}
                  columns={[
                    { title: '품명', dataIndex: 'description', key: 'description', width: 200 },
                    { title: 'MODEL NO', dataIndex: 'modelNo', key: 'modelNo', width: 150 },
                    { 
                      title: '스펙', 
                      dataIndex: 'spec', 
                      key: 'spec', 
                      width: 300,
                      render: (spec: string) => spec ? (
                        <div style={{ maxWidth: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {spec}
                        </div>
                      ) : '-'
                    },
                    { title: '수량', dataIndex: 'quantity', key: 'quantity', width: 80 },
                    {
                      title: '단가',
                      dataIndex: 'unitPrice',
                      key: 'unitPrice',
                      width: 120,
                      render: (price: number) => price ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
                    },
                    {
                      title: '총액',
                      dataIndex: 'estimatedTotal',
                      key: 'estimatedTotal',
                      width: 120,
                      render: (total: number) => total ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
                    },
                  ]}
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PurchaseRequests

