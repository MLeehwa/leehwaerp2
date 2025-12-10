import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Space, Tag, Select, DatePicker, InputNumber, Upload, List } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, PaperClipOutlined, DownloadOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'

const { TextArea } = Input

interface Schedule {
  _id?: string
  scheduleNumber: string
  equipment?: { _id: string; equipmentCode: string; equipmentName: string }
  scheduleType: 'repair' | 'maintenance' // 수리, 점검
  title?: string
  description: string
  scheduledDate: string
  dueDate: string
  frequency?: number
  frequencyUnit?: 'days' | 'weeks' | 'months'
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'overdue'
  assignedTo?: { _id: string; username: string; email?: string }
  estimatedDuration?: number
  actualDuration?: number
  completedDate?: string
  completedBy?: { _id: string; username: string; email?: string }
  laborCost?: number
  materialCost?: number
  totalCost?: number
  currency?: string
  supplier?: { _id: string; supplierCode?: string; name: string; email?: string; phone?: string; contactPerson?: string; paymentTerms?: string }
  invoiceNumber?: string
  paymentMethod?: string
  paymentDueDate?: string
  paymentStatus?: 'pending' | 'paid' | 'partial'
  paymentNotes?: string
  attachments?: Array<{
    fileName: string
    filePath: string
    fileSize?: number
    uploadedAt: string
  }>
  notes?: string
  checklist?: Array<{ item: string; completed: boolean; notes?: string }>
  createdAt?: string
}

interface Equipment {
  _id: string
  equipmentCode: string
  equipmentName: string
  assetType?: 'asset' | 'equipment' // 장비 또는 설비
  category?: string
  subCategory?: string
}

interface Supplier {
  _id: string
  supplierCode?: string
  name: string
  email?: string
  phone?: string
  contactPerson?: string
  paymentTerms?: string
  category?: 'asset' | 'equipment' | 'parts' | 'service' | 'other' // 카테고리
  isActive?: boolean
}

const MaintenanceSchedules = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterType, setFilterType] = useState<string | undefined>(undefined)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [equipmentCurrency, setEquipmentCurrency] = useState<string>('USD')
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchEquipment()
    fetchSchedules()
    fetchSuppliers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterType])

  const fetchEquipment = async () => {
    try {
      // HR과 Operation 모두에서 등록된 설비를 가져옴
      const response = await api.get('/maintenance/equipment?status=active')
      // assetType 정보를 포함하여 저장
      const equipmentList = response.data || []
      setEquipment(equipmentList.map((eq: Equipment) => ({
        _id: eq._id,
        equipmentCode: eq.equipmentCode,
        equipmentName: eq.equipmentName,
        assetType: eq.assetType,
        category: eq.category,
        subCategory: eq.subCategory,
      })))
    } catch (error) {
      console.error('설비 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers?isActive=true')
      setSuppliers(response.data || [])
    } catch (error) {
      console.error('업체 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchEquipmentCurrency = async (equipmentId: string) => {
    try {
      const response = await api.get(`/maintenance/equipment/${equipmentId}`)
      const equipment = response.data
      if (equipment?.company?.currency) {
        setEquipmentCurrency(equipment.company.currency)
      }
      // 설비의 assetType은 equipment state에 이미 포함되어 있음
    } catch (error) {
      console.error('설비 정보를 불러오는데 실패했습니다')
    }
  }

  const handleEquipmentChange = async (equipmentId: string) => {
    await fetchEquipmentCurrency(equipmentId)
  }

  const fetchSchedules = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterStatus) params.status = filterStatus
      if (filterType) params.scheduleType = filterType

      const response = await api.get('/maintenance/schedules', { params })
      setSchedules(response.data || [])
    } catch (error) {
      message.error('정기 점검 일정을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    form.resetFields()
    setFileList([])
    setEquipmentCurrency('USD')
    form.setFieldsValue({
      scheduleType: 'maintenance', // 기본값은 점검
      scheduledDate: dayjs(), // 발생일
      status: 'completed', // 점검 이력은 기본적으로 완료 상태
    })
    setEditingSchedule(null)
    setModalVisible(true)
  }

  const handleEdit = async (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setModalVisible(true)
    
    // 설비의 currency 가져오기
    if (schedule.equipment?._id) {
      await fetchEquipmentCurrency(schedule.equipment._id)
    }
    
    // 모달이 열린 후 form 값 설정
    setTimeout(() => {
      const formValues = {
        ...schedule,
        scheduledDate: schedule.scheduledDate ? dayjs(schedule.scheduledDate) : undefined,
        completedDate: schedule.completedDate ? dayjs(schedule.completedDate) : undefined,
        supplier: schedule.supplier?._id,
        paymentDueDate: schedule.paymentDueDate ? dayjs(schedule.paymentDueDate) : undefined,
        equipment: schedule.equipment?._id,
      }
      form.setFieldsValue(formValues)
      
      // 첨부파일 목록 설정
      if (schedule.attachments && schedule.attachments.length > 0) {
        const files: UploadFile[] = schedule.attachments.map((att, index) => ({
          uid: `-${index}`,
          name: att.fileName,
          status: 'done',
          url: `/api/maintenance/schedules/${schedule._id}/attachments/${index}/download`,
        }))
        setFileList(files)
      } else {
        setFileList([])
      }
    }, 0)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/maintenance/schedules/${id}`)
      message.success('정기 점검 이력이 삭제되었습니다')
      fetchSchedules()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined
      message.error(errorMessage || '일정 삭제에 실패했습니다')
    }
  }


  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const scheduleType = values.scheduleType as string
      const status = values.status as string
      
      // 점검 이력이거나 완료 상태인 경우에만 completedDate 필수
      const completedDate = values.completedDate && typeof values.completedDate === 'object' && 'format' in values.completedDate
        ? (values.completedDate as { format: (format: string) => string }).format('YYYY-MM-DD')
        : undefined
      if ((scheduleType === 'maintenance' || status === 'completed') && !completedDate) {
        message.error('완료일을 입력하세요')
        return
      }

      const scheduledDate = values.scheduledDate && typeof values.scheduledDate === 'object' && 'format' in values.scheduledDate
        ? (values.scheduledDate as { format: (format: string) => string }).format('YYYY-MM-DD')
        : undefined

      const paymentDueDate = values.paymentDueDate && typeof values.paymentDueDate === 'object' && 'format' in values.paymentDueDate
        ? (values.paymentDueDate as { format: (format: string) => string }).format('YYYY-MM-DD')
        : undefined

      const submitData = {
        ...values,
        equipment: values.equipment,
        scheduledDate,
        dueDate: scheduledDate, // dueDate는 scheduledDate와 동일하게 설정
        completedDate,
        totalCost: values.totalCost || undefined,
        currency: equipmentCurrency,
        supplier: values.supplier || undefined,
        invoiceNumber: values.invoiceNumber || undefined,
        paymentMethod: values.paymentMethod || undefined,
        paymentDueDate,
        paymentStatus: values.paymentStatus || 'pending',
        paymentNotes: values.paymentNotes || undefined,
      }

      let scheduleId: string
      const equipmentId = values.equipment as string
      
      if (editingSchedule?._id) {
        await api.put(`/maintenance/schedules/${editingSchedule._id}`, submitData)
        scheduleId = editingSchedule._id
        message.success('정기 점검 이력이 수정되었습니다')
        
        // 수리 이력 상태 변경 시 설비 상태 업데이트
        if (scheduleType === 'repair' && equipmentId) {
          if (status === 'in-progress') {
            // 수리 진행 중이면 설비 상태를 'maintenance'로 변경
            await api.put(`/maintenance/equipment/${equipmentId}`, { status: 'maintenance' })
          } else if (status === 'completed') {
            // 수리 완료되면 설비 상태를 'active'로 복구
            await api.put(`/maintenance/equipment/${equipmentId}`, { status: 'active' })
          }
        }
      } else {
        const response = await api.post('/maintenance/schedules', submitData)
        scheduleId = response.data._id
        message.success('정기 점검 이력이 등록되었습니다')
        
        // 수리 이력 등록 시 설비 상태 업데이트
        if (scheduleType === 'repair' && status === 'in-progress' && equipmentId) {
          await api.put(`/maintenance/equipment/${equipmentId}`, { status: 'maintenance' })
        }
      }

      // 파일 업로드
      if (fileList.length > 0) {
        const uploadPromises = fileList
          .filter((file) => file.originFileObj)
          .map((file) => {
            const formData = new FormData()
            formData.append('file', file.originFileObj!)
            return api.post(`/maintenance/schedules/${scheduleId}/attachments`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          })
        await Promise.all(uploadPromises)
      }

      setModalVisible(false)
      fetchSchedules()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined
      message.error(errorMessage || '일정 저장에 실패했습니다')
    }
  }

  const handleFileChange = (info: { fileList: UploadFile[] }) => {
    setFileList(info.fileList)
  }

  const handleFileRemove = async (file: UploadFile) => {
    if (editingSchedule?._id && file.uid.startsWith('-')) {
      // 기존 첨부파일 삭제
      const index = parseInt(file.uid.replace('-', ''))
      try {
        await api.delete(`/maintenance/schedules/${editingSchedule._id}/attachments/${index}`)
        message.success('첨부파일이 삭제되었습니다')
      } catch (error: unknown) {
        const errorMessage = error instanceof Error && 'response' in error 
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
          : undefined
        message.error(errorMessage || '첨부파일 삭제에 실패했습니다')
      }
    }
    return true
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'in-progress': 'red',
      completed: 'green',
    }
    return colors[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      'in-progress': '고장',
      completed: '완료',
    }
    return texts[status] || status
  }


  const handleViewDetail = async (schedule: Schedule) => {
    try {
      const response = await api.get(`/maintenance/schedules/${schedule._id}`)
      setSelectedSchedule(response.data)
      setDetailModalVisible(true)
    } catch (error) {
      message.error('이력 상세 정보를 불러오는데 실패했습니다')
    }
  }

  const handleDownloadAttachment = async (scheduleId: string, attachmentIndex: number, fileName: string) => {
    try {
      const response = await api.get(`/maintenance/schedules/${scheduleId}/attachments/${attachmentIndex}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      message.success('파일이 다운로드되었습니다')
    } catch (error) {
      message.error('파일 다운로드에 실패했습니다')
    }
  }

  const columns: ColumnsType<Schedule> = [
    {
      title: '일정 번호',
      dataIndex: 'scheduleNumber',
      key: 'scheduleNumber',
      width: 150,
      render: (text: string, record: Schedule) => (
        <a onClick={() => handleViewDetail(record)} style={{ cursor: 'pointer' }}>
          {text}
        </a>
      ),
    },
    {
      title: '설비',
      key: 'equipment',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.equipment?.equipmentCode}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.equipment?.equipmentName}</div>
        </div>
      ),
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '유형',
      dataIndex: 'scheduleType',
      key: 'scheduleType',
      width: 100,
      render: (type: string) => {
        const types: Record<string, string> = {
          repair: '수리 이력',
          maintenance: '점검 이력',
        }
        return types[type] || type
      },
    },
    {
      title: '발생일',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
    },
    {
      title: '완료일',
      dataIndex: 'completedDate',
      key: 'completedDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '비용',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 150,
      render: (cost: number, record: Schedule) => {
        if (!cost) return '-'
        const currency = record.currency || 'USD'
        const currencySymbols: Record<string, string> = {
          USD: '$',
          KRW: '₩',
          MXN: '$',
        }
        const symbol = currencySymbols[currency] || currency
        return `${symbol}${cost.toLocaleString()}`
      },
    },
    {
      title: '작업',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            수정
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              if (record._id && window.confirm('정말 삭제하시겠습니까?')) {
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>이력 등록</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          이력 등록
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="상태"
          value={filterStatus}
          onChange={setFilterStatus}
          allowClear
          style={{ width: 120 }}
        >
          <Select.Option value="in-progress">고장</Select.Option>
          <Select.Option value="completed">완료</Select.Option>
        </Select>
        <Select
          placeholder="유형"
          value={filterType}
          onChange={setFilterType}
          allowClear
          style={{ width: 120 }}
        >
          <Select.Option value="repair">수리 이력</Select.Option>
          <Select.Option value="maintenance">점검 이력</Select.Option>
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={schedules}
        loading={loading}
        rowKey="_id"
        locale={{ emptyText: '등록된 일정이 없습니다' }}
      />

      <Modal
        title={editingSchedule ? '이력 수정' : '이력 등록'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="equipment"
            label="설비"
            rules={[{ required: true, message: '설비를 선택하세요' }]}
          >
            <Select 
              placeholder="설비 선택" 
              showSearch 
              optionFilterProp="children"
              onChange={handleEquipmentChange}
            >
              {equipment.map((eq) => (
                <Select.Option key={eq._id} value={eq._id}>
                  {eq.equipmentCode} - {eq.equipmentName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="scheduleType"
            label="유형"
            rules={[{ required: true, message: '유형을 선택하세요' }]}
          >
            <Select
              onChange={(value) => {
                // 점검 이력은 기본적으로 완료 상태, 수리 이력은 고장 상태
                if (value === 'maintenance') {
                  form.setFieldsValue({ status: 'completed' })
                } else if (value === 'repair') {
                  form.setFieldsValue({ status: 'in-progress' })
                }
              }}
            >
              <Select.Option value="repair">수리 이력</Select.Option>
              <Select.Option value="maintenance">점검 이력</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="설명"
            rules={[{ required: true, message: '설명을 입력하세요' }]}
          >
            <TextArea rows={4} placeholder="이력 설명을 입력하세요" />
          </Form.Item>

          <Form.Item
            name="scheduledDate"
            label="발생일"
            rules={[{ required: true, message: '발생일을 선택하세요' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="status"
            label="상태"
            rules={[{ required: true, message: '상태를 선택하세요' }]}
          >
            <Select>
              <Select.Option value="in-progress">고장</Select.Option>
              <Select.Option value="completed">완료</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="completedDate"
            label="완료일"
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value) => {
                  const scheduleType = getFieldValue('scheduleType')
                  const status = getFieldValue('status')
                  // 점검 이력이거나 완료 상태인 경우에만 필수
                  if ((scheduleType === 'maintenance' || status === 'completed') && !value) {
                    return Promise.reject(new Error('완료일을 선택하세요'))
                  }
                  return Promise.resolve()
                },
              }),
            ]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>


          <Form.Item 
            name="totalCost" 
            label={`비용 (${equipmentCurrency})`}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value) => {
                  const status = getFieldValue('status')
                  // 완료 상태일 때 비용 필수
                  if (status === 'completed' && !value) {
                    return Promise.reject(new Error('완료 처리 시 비용을 입력하세요'))
                  }
                  return Promise.resolve()
                },
              }),
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => {
                if (!value) return ''
                const currencySymbols: Record<string, string> = {
                  USD: '$',
                  KRW: '₩',
                  MXN: '$',
                }
                const symbol = currencySymbols[equipmentCurrency] || equipmentCurrency
                return `${symbol} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
              }}
              // parser는 formatter와 함께 사용 시 자동으로 처리됨
              min={0}
              placeholder="비용을 입력하세요 (완료 시 필수)"
            />
          </Form.Item>

          {/* 완료 상태일 때만 업체 정보 및 인보이스 정보 표시 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.status !== currentValues.status || 
              prevValues.equipment !== currentValues.equipment ||
              prevValues.scheduleType !== currentValues.scheduleType
            }
          >
            {({ getFieldValue }) => {
              const status = getFieldValue('status')
              const scheduleType = getFieldValue('scheduleType')
              const equipmentId = getFieldValue('equipment')
              
              // 완료 상태이거나 수리 이력인 경우 업체 정보 표시
              if (status === 'completed' || scheduleType === 'repair') {
                // 선택된 설비의 assetType 가져오기
                const currentEquipment = equipment.find((eq) => eq._id === equipmentId)
                const equipmentAssetType = currentEquipment?.assetType
                
                // 디버깅: 설비 정보와 assetType 확인
                if (equipmentId && currentEquipment) {
                  console.log('선택된 설비:', {
                    equipmentCode: currentEquipment.equipmentCode,
                    equipmentName: currentEquipment.equipmentName,
                    assetType: equipmentAssetType,
                    category: currentEquipment.category,
                    subCategory: currentEquipment.subCategory
                  })
                }
                
                return (
                  <>
                    <Form.Item
                      name="supplier"
                      label="수리 업체"
                      tooltip={`수리를 진행한 업체를 선택하세요. 기본적으로 ${equipmentAssetType === 'asset' ? '장비' : equipmentAssetType === 'equipment' ? '설비' : equipmentAssetType} 카테고리의 업체만 표시되며, 검색 시 모든 업체를 검색할 수 있습니다.`}
                    >
                      <Select
                        placeholder={equipmentAssetType ? "업체 선택 또는 검색" : "먼저 설비를 선택하세요"}
                        showSearch
                        allowClear
                        disabled={!equipmentAssetType}
                        filterOption={(input, option) => {
                          if (!input || !input.trim()) {
                            // 검색어가 없으면 카테고리 일치 업체만 표시
                            const supplierId = option?.value as string
                            const supplier = suppliers.find(s => s._id === supplierId)
                            return supplier?.category === equipmentAssetType
                          }
                          
                          // 검색어가 있으면 모든 업체에서 검색 (카테고리 무시)
                          const children = option?.children
                          const text = typeof children === 'string' ? children : String(children || '')
                          return text.toLowerCase().includes(input.toLowerCase())
                        }}
                      >
                        {(() => {
                          // 설비가 선택되지 않았으면 빈 목록
                          if (!equipmentAssetType) {
                            return (
                              <Select.Option value="" disabled>
                                먼저 설비를 선택하세요
                              </Select.Option>
                            )
                          }
                          
                          // 모든 업체를 옵션으로 제공 (검색 시 모든 업체 검색 가능)
                          // filterOption에서 검색어가 없을 때는 카테고리 일치만 표시
                          if (suppliers.length === 0) {
                            return (
                              <Select.Option value="" disabled>
                                등록된 업체가 없습니다
                              </Select.Option>
                            )
                          }
                          
                          // 카테고리 일치 업체 확인
                          const matchingSuppliers = suppliers.filter((supplier) => supplier.category === equipmentAssetType)
                          
                          if (matchingSuppliers.length === 0 && suppliers.length > 0) {
                            // 카테고리 일치 업체가 없을 때 안내 메시지와 함께 모든 업체 표시
                            return (
                              <>
                                <Select.Option value="" disabled>
                                  {equipmentAssetType === 'asset' ? '장비' : 
                                   equipmentAssetType === 'equipment' ? '설비' : 
                                   equipmentAssetType} 카테고리에 해당하는 업체가 없습니다. 검색으로 다른 카테고리 업체를 찾을 수 있습니다.
                                </Select.Option>
                                {suppliers.map((supplier) => (
                                  <Select.Option key={supplier._id} value={supplier._id}>
                                    {supplier.supplierCode ? `${supplier.supplierCode} - ` : ''}{supplier.name}
                                    {supplier.contactPerson && ` (${supplier.contactPerson})`}
                                    {supplier.category && ` [${supplier.category === 'asset' ? '장비' : supplier.category === 'equipment' ? '설비' : supplier.category}]`}
                                  </Select.Option>
                                ))}
                              </>
                            )
                          }
                          
                          // 모든 업체를 옵션으로 제공 (검색 시 표시됨)
                          return suppliers.map((supplier) => {
                            const isMatchingCategory = supplier.category === equipmentAssetType
                            return (
                              <Select.Option key={supplier._id} value={supplier._id}>
                                {supplier.supplierCode ? `${supplier.supplierCode} - ` : ''}{supplier.name}
                                {supplier.contactPerson && ` (${supplier.contactPerson})`}
                                {!isMatchingCategory && supplier.category && ` [${supplier.category === 'asset' ? '장비' : supplier.category === 'equipment' ? '설비' : supplier.category}]`}
                              </Select.Option>
                            )
                          })
                        })()}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="invoiceNumber"
                      label="인보이스 번호"
                      tooltip="업체에서 발행한 인보이스 번호를 입력하세요"
                    >
                      <Input placeholder="인보이스 번호" />
                    </Form.Item>

                    <Form.Item
                      name="paymentMethod"
                      label="결제 방법"
                    >
                      <Select placeholder="결제 방법 선택" allowClear>
                        <Select.Option value="bank_transfer">계좌이체</Select.Option>
                        <Select.Option value="check">수표</Select.Option>
                        <Select.Option value="cash">현금</Select.Option>
                        <Select.Option value="credit_card">신용카드</Select.Option>
                        <Select.Option value="wire_transfer">송금</Select.Option>
                        <Select.Option value="other">기타</Select.Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="paymentDueDate"
                      label="결제 예정일"
                    >
                      <DatePicker style={{ width: '100%' }} placeholder="결제 예정일 선택" />
                    </Form.Item>

                    <Form.Item
                      name="paymentStatus"
                      label="결제 상태"
                    >
                      <Select>
                        <Select.Option value="pending">미결제</Select.Option>
                        <Select.Option value="partial">부분 결제</Select.Option>
                        <Select.Option value="paid">결제 완료</Select.Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="paymentNotes"
                      label="결제 비고"
                      tooltip="결제 관련 추가 정보를 입력하세요 (예: 계좌번호, 결제 담당자 등)"
                    >
                      <TextArea rows={2} placeholder="결제 관련 비고" />
                    </Form.Item>
                  </>
                )
              }
              return null
            }}
          </Form.Item>

          <Form.Item label="첨부파일">
            <Upload
              fileList={fileList}
              onChange={handleFileChange}
              onRemove={handleFileRemove}
              beforeUpload={() => false}
              multiple
            >
              <Button icon={<UploadOutlined />}>파일 선택</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* 상세 보기 모달 */}
      <Modal
        title="이력 상세"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            닫기
          </Button>,
        ]}
        width={800}
      >
        {selectedSchedule && (
          <div>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <h3>기본 정보</h3>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div><strong>일정 번호:</strong> {selectedSchedule.scheduleNumber}</div>
                  <div><strong>설비:</strong> {selectedSchedule.equipment?.equipmentCode} - {selectedSchedule.equipment?.equipmentName}</div>
                  <div><strong>유형:</strong> {selectedSchedule.scheduleType === 'repair' ? '수리 이력' : '점검 이력'}</div>
                  <div><strong>설명:</strong> {selectedSchedule.description}</div>
                  <div><strong>발생일:</strong> {selectedSchedule.scheduledDate ? dayjs(selectedSchedule.scheduledDate).format('YYYY-MM-DD') : '-'}</div>
                  <div><strong>완료일:</strong> {selectedSchedule.completedDate ? dayjs(selectedSchedule.completedDate).format('YYYY-MM-DD') : '-'}</div>
                  <div><strong>상태:</strong> <Tag color={getStatusColor(selectedSchedule.status)}>{getStatusText(selectedSchedule.status)}</Tag></div>
                  {selectedSchedule.totalCost && (
                    <div>
                      <strong>비용:</strong> {
                        (() => {
                          const currency = selectedSchedule.currency || 'USD'
                          const currencySymbols: Record<string, string> = {
                            USD: '$',
                            KRW: '₩',
                            MXN: '$',
                          }
                          const symbol = currencySymbols[currency] || currency
                          return `${symbol}${selectedSchedule.totalCost.toLocaleString()}`
                        })()
                      }
                    </div>
                  )}
                  {selectedSchedule.supplier && (
                    <>
                      <div><strong>수리 업체:</strong> {selectedSchedule.supplier.name}</div>
                      {selectedSchedule.supplier.contactPerson && (
                        <div><strong>담당자:</strong> {selectedSchedule.supplier.contactPerson}</div>
                      )}
                      {selectedSchedule.supplier.phone && (
                        <div><strong>연락처:</strong> {selectedSchedule.supplier.phone}</div>
                      )}
                      {selectedSchedule.supplier.email && (
                        <div><strong>이메일:</strong> {selectedSchedule.supplier.email}</div>
                      )}
                    </>
                  )}
                  {selectedSchedule.invoiceNumber && (
                    <div><strong>인보이스 번호:</strong> {selectedSchedule.invoiceNumber}</div>
                  )}
                  {selectedSchedule.paymentMethod && (
                    <div>
                      <strong>결제 방법:</strong> {
                        (() => {
                          const methods: Record<string, string> = {
                            bank_transfer: '계좌이체',
                            check: '수표',
                            cash: '현금',
                            credit_card: '신용카드',
                            wire_transfer: '송금',
                            other: '기타',
                          }
                          return methods[selectedSchedule.paymentMethod] || selectedSchedule.paymentMethod
                        })()
                      }
                    </div>
                  )}
                  {selectedSchedule.paymentDueDate && (
                    <div><strong>결제 예정일:</strong> {dayjs(selectedSchedule.paymentDueDate).format('YYYY-MM-DD')}</div>
                  )}
                  {selectedSchedule.paymentStatus && (
                    <div>
                      <strong>결제 상태:</strong> {
                        (() => {
                          const statuses: Record<string, string> = {
                            pending: '미결제',
                            partial: '부분 결제',
                            paid: '결제 완료',
                          }
                          return statuses[selectedSchedule.paymentStatus] || selectedSchedule.paymentStatus
                        })()
                      }
                    </div>
                  )}
                  {selectedSchedule.paymentNotes && (
                    <div><strong>결제 비고:</strong> {selectedSchedule.paymentNotes}</div>
                  )}
                  {selectedSchedule.notes && (
                    <div><strong>비고:</strong> {selectedSchedule.notes}</div>
                  )}
                </Space>
              </div>

              {selectedSchedule.attachments && selectedSchedule.attachments.length > 0 && (
                <div>
                  <h3>첨부파일</h3>
                  <List
                    dataSource={selectedSchedule.attachments}
                    renderItem={(attachment, index) => (
                      <List.Item
                        actions={[
                          <Button
                            key="download"
                            type="link"
                            icon={<DownloadOutlined />}
                            onClick={() => selectedSchedule._id && handleDownloadAttachment(selectedSchedule._id, index, attachment.fileName)}
                          >
                            다운로드
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<PaperClipOutlined />}
                          title={attachment.fileName}
                          description={attachment.fileSize ? `크기: ${(attachment.fileSize / 1024).toFixed(2)} KB` : ''}
                        />
                      </List.Item>
                    )}
                  />
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default MaintenanceSchedules

