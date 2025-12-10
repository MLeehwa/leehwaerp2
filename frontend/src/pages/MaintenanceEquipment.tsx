import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Modal, Form, Input, message, Space, Tag, Select, InputNumber, DatePicker } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { TextArea } = Input

interface Equipment {
  _id?: string
  equipmentCode: string
  equipmentName: string
  assetType?: 'asset' | 'equipment'
  managedBy?: 'hr' | 'operation' | 'admin'
  company?: { _id: string; code: string; name: string }
  category: string // 대분류
  subCategory: string // 소분류
  equipmentType?: string // 기존 호환성 유지
  manufacturer?: string
  model?: string
  serialNumber?: string
  alias?: string // 별칭/명칭 (예: alabama)
  location?: string
  installationDate?: string
  purchaseDate?: string
  purchaseCost?: number
  warrantyExpiryDate?: string
  status: 'active' | 'inactive' | 'maintenance' | 'retired'
  description?: string
  specifications?: Record<string, unknown>
  maintenanceRequired?: boolean
  lastMaintenanceDate?: string
  nextMaintenanceDate?: string
  maintenanceInterval?: number
  maintenanceIntervalUnit?: 'days' | 'weeks' | 'months'
  createdBy?: { _id: string; username: string; email?: string }
  createdAt?: string
  updatedAt?: string
}

const MaintenanceEquipment = () => {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined)
  const [filterSubCategory, setFilterSubCategory] = useState<string | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [categories, setCategories] = useState<string[]>([])
  const [subCategories, setSubCategories] = useState<Array<{ category: string; subCategory: string }>>([])
  const [locations, setLocations] = useState<Array<{ _id: string; code: string; name: string }>>([])
  const [form] = Form.useForm()

  useEffect(() => {
    fetchCategories()
    fetchLocations()
  }, [])

  useEffect(() => {
    fetchEquipment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterCategory, filterSubCategory, searchTerm])

  useEffect(() => {
    if (filterCategory) {
      fetchSubCategories(filterCategory)
    } else {
      setSubCategories([])
    }
  }, [filterCategory])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/maintenance/equipment-types/categories')
      setCategories(response.data || [])
    } catch (error) {
      console.error('대분류 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchSubCategories = async (category: string) => {
    try {
      const response = await api.get('/maintenance/equipment-types/subcategories', {
        params: { category },
      })
      setSubCategories(response.data || [])
    } catch (error) {
      console.error('소분류 목록을 불러오는데 실패했습니다')
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

  const fetchEquipment = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      
      // 필터가 선택된 경우에만 조건 적용
      // 기본적으로 모든 자산/설비 표시 (필터 선택 시에만 필터링)
      if (filterStatus) params.status = filterStatus
      if (filterCategory) params.category = filterCategory
      if (filterSubCategory) params.subCategory = filterSubCategory
      if (searchTerm) params.search = searchTerm

      const response = await api.get('/maintenance/equipment', { params })
      let equipmentList = response.data || []
      
      // 운영 설비 관리 페이지에서는 기본적으로 operation이 관리하는 것만 표시
      // 하지만 필터가 선택되지 않았을 때는 모든 항목 표시 (필터 선택 시에만 필터링)
      // 일단 모든 항목을 가져온 후, operation 관리 항목만 표시하도록 변경
      // 사용자가 원하는 대로 필터 선택 시에만 필터링되도록 수정
      
      setEquipment(equipmentList)
    } catch (error) {
      console.error('Error fetching equipment:', error)
      message.error('설비 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 설비명 자동 생성 함수
  const generateEquipmentName = () => {
    const alias = form.getFieldValue('alias')
    const subCategory = form.getFieldValue('subCategory')
    const manufacturer = form.getFieldValue('manufacturer')
    const model = form.getFieldValue('model')
    const serialNumber = form.getFieldValue('serialNumber')

    // 별칭이 있으면 별칭을 우선 사용
    if (alias && alias.trim()) {
      const parts: string[] = [alias]
      
      // 소분류가 있으면 포함
      if (subCategory) {
        parts.push(`(${subCategory}`)
        if (manufacturer) parts.push(manufacturer)
        if (model) parts.push(model)
        if (serialNumber) parts.push(`${serialNumber})`)
        else parts.push(')')
      } else {
        // 소분류가 없으면 제조사/모델만 포함
        if (manufacturer || model) {
          parts.push('(')
          if (manufacturer) parts.push(manufacturer)
          if (model) parts.push(model)
          if (serialNumber) parts.push(`${serialNumber})`)
          else parts.push(')')
        }
      }
      
      form.setFieldsValue({ equipmentName: parts.join(' ') })
      return
    }

    // 별칭이 없으면 기존 방식
    const parts: string[] = []
    
    // 소분류가 있으면 포함
    if (subCategory) {
      parts.push(subCategory)
    }
    
    // 제조사가 있으면 포함
    if (manufacturer) {
      parts.push(manufacturer)
    }
    
    // 모델명이 있으면 포함
    if (model) {
      parts.push(model)
    }
    
    // 시리얼번호가 있으면 괄호 안에 포함
    let name = parts.join(' ')
    if (serialNumber) {
      name += ` (${serialNumber})`
    }
    
    // 설비명이 비어있지 않으면 설정
    if (name.trim()) {
      form.setFieldsValue({ equipmentName: name.trim() })
    }
  }

  // 설비 추가는 HR 자산 관리에서만 가능
  // const handleAdd = () => {
  //   form.resetFields()
  //   form.setFieldsValue({
  //     assetType: 'equipment',
  //     managedBy: 'operation',
  //     status: 'active',
  //     maintenanceRequired: false,
  //     maintenanceIntervalUnit: 'months',
  //   })
  //   setEditingEquipment(null)
  //   setSubCategories([]) // 소분류 목록 초기화
  //   setModalVisible(true)
  // }

  const handleEdit = async (eq: Equipment) => {
    const formValues = {
      ...eq,
      installationDate: eq.installationDate ? dayjs(eq.installationDate) : undefined,
      purchaseDate: eq.purchaseDate ? dayjs(eq.purchaseDate) : undefined,
      warrantyExpiryDate: eq.warrantyExpiryDate ? dayjs(eq.warrantyExpiryDate) : undefined,
      lastMaintenanceDate: eq.lastMaintenanceDate ? dayjs(eq.lastMaintenanceDate) : undefined,
      nextMaintenanceDate: eq.nextMaintenanceDate ? dayjs(eq.nextMaintenanceDate) : undefined,
    }
    form.setFieldsValue(formValues)
    
    // 다음 점검일이 없고 점검 주기가 있으면 자동 계산
    if (!eq.nextMaintenanceDate && eq.maintenanceInterval && eq.maintenanceIntervalUnit) {
      const baseDate = eq.lastMaintenanceDate ? dayjs(eq.lastMaintenanceDate) : dayjs()
      const nextDate = calculateNextMaintenanceDate(
        baseDate,
        eq.maintenanceInterval,
        eq.maintenanceIntervalUnit
      )
      if (nextDate) {
        form.setFieldsValue({ nextMaintenanceDate: nextDate })
      }
    }
    
    setEditingEquipment(eq)
    // 수정 시 대분류가 있으면 소분류 목록 로드
    if (eq.category) {
      await fetchSubCategories(eq.category)
    }
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/maintenance/equipment/${id}`)
      message.success('설비가 삭제되었습니다')
      fetchEquipment()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined
      message.error(errorMessage || '설비 삭제에 실패했습니다')
    }
  }

  // 다음 점검일 자동 계산 함수
  const calculateNextMaintenanceDate = (
    baseDate: dayjs.Dayjs,
    interval: number | undefined,
    unit: string | undefined
  ): dayjs.Dayjs | null => {
    if (!interval || !unit) return null

    let nextDate = baseDate
    if (unit === 'days') {
      nextDate = baseDate.add(interval, 'day')
    } else if (unit === 'weeks') {
      nextDate = baseDate.add(interval, 'week')
    } else if (unit === 'months') {
      nextDate = baseDate.add(interval, 'month')
    }

    return nextDate
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      // 다음 점검일 자동 계산
      let nextMaintenanceDate = values.nextMaintenanceDate
      
      // 점검 주기가 있고, 다음 점검일이 설정되지 않은 경우 자동 계산
      if (values.maintenanceInterval && values.maintenanceIntervalUnit && !nextMaintenanceDate) {
        const baseDate = values.lastMaintenanceDate 
          ? dayjs(values.lastMaintenanceDate as string)
          : dayjs() // 마지막 점검일이 없으면 오늘 날짜 기준
        
        const calculated = calculateNextMaintenanceDate(
          baseDate,
          values.maintenanceInterval as number,
          values.maintenanceIntervalUnit as string
        )
        
        if (calculated) {
          nextMaintenanceDate = calculated
        }
      }

      const submitData: Record<string, unknown> = {
        equipmentName: values.equipmentName,
        assetType: 'equipment',
        managedBy: 'operation',
        category: values.category,
        subCategory: values.subCategory,
        manufacturer: values.manufacturer,
        model: values.model,
        serialNumber: values.serialNumber,
        alias: values.alias,
        location: values.location,
        status: values.status || 'active',
        description: values.description,
        maintenanceRequired: values.maintenanceRequired || false,
        maintenanceInterval: values.maintenanceInterval,
        maintenanceIntervalUnit: values.maintenanceIntervalUnit || 'months',
        installationDate: values.installationDate ? values.installationDate.toISOString() : undefined,
        purchaseDate: values.purchaseDate ? values.purchaseDate.toISOString() : undefined,
        purchaseCost: values.purchaseCost,
        warrantyExpiryDate: values.warrantyExpiryDate ? values.warrantyExpiryDate.toISOString() : undefined,
        lastMaintenanceDate: values.lastMaintenanceDate ? values.lastMaintenanceDate.toISOString() : undefined,
        nextMaintenanceDate: nextMaintenanceDate ? (nextMaintenanceDate as dayjs.Dayjs).toISOString() : undefined,
      }

      if (editingEquipment?._id) {
        // 수정 시에만 설비 코드 포함
        submitData.equipmentCode = editingEquipment.equipmentCode
        await api.put(`/maintenance/equipment/${editingEquipment._id}`, submitData)
        message.success('설비가 수정되었습니다')
      } else {
        // 신규 생성은 HR 자산 관리에서만 가능
        message.error('자산 등록은 HR 자산 관리에서 진행해주세요')
        return
      }
      setModalVisible(false)
      fetchEquipment()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined
      message.error(errorMessage || '설비 저장에 실패했습니다')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'green',
      inactive: 'default',
      maintenance: 'orange',
      retired: 'red',
    }
    return colors[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      active: '운영중',
      inactive: '비활성',
      maintenance: '점검중',
      retired: '폐기',
    }
    return texts[status] || status
  }

  const columns: ColumnsType<Equipment> = [
    {
      title: '설비 코드',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: 150,
    },
    {
      title: '설비명',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
      render: (text: string, record: Equipment) => (
        <a onClick={() => navigate(`/maintenance/equipment/${record._id}`)} style={{ cursor: 'pointer' }}>
          {text}
        </a>
      ),
    },
    {
      title: '대분류',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: '소분류',
      dataIndex: 'subCategory',
      key: 'subCategory',
      width: 120,
    },
    {
      title: '제조사',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 120,
    },
    {
      title: '위치',
      dataIndex: 'location',
      key: 'location',
      width: 120,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '다음 점검일',
      dataIndex: 'nextMaintenanceDate',
      key: 'nextMaintenanceDate',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
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
        <h1>설비 관리</h1>
        <div style={{ color: '#999', fontSize: '14px' }}>
          자산 등록은 HR 자산 관리에서 진행해주세요
        </div>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="설비 코드, 이름, 시리얼 번호 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          placeholder="상태"
          value={filterStatus}
          onChange={setFilterStatus}
          allowClear
          style={{ width: 120 }}
        >
          <Select.Option value="active">운영중</Select.Option>
          <Select.Option value="inactive">비활성</Select.Option>
          <Select.Option value="maintenance">점검중</Select.Option>
          <Select.Option value="retired">폐기</Select.Option>
        </Select>
        <Select
          placeholder="대분류"
          value={filterCategory}
          onChange={(value) => {
            setFilterCategory(value)
            setFilterSubCategory(undefined)
          }}
          allowClear
          style={{ width: 120 }}
        >
          {categories.map((cat) => (
            <Select.Option key={cat} value={cat}>
              {cat}
            </Select.Option>
          ))}
        </Select>
        {filterCategory && (
          <Select
            placeholder="소분류"
            value={filterSubCategory}
            onChange={setFilterSubCategory}
            allowClear
            style={{ width: 150 }}
          >
            {subCategories
              .filter((sc) => sc.category === filterCategory)
              .map((sc) => (
                <Select.Option key={sc.subCategory} value={sc.subCategory}>
                  {sc.subCategory}
                </Select.Option>
              ))}
          </Select>
        )}
      </Space>

      <Table
        columns={columns}
        dataSource={equipment}
        loading={loading}
        rowKey="_id"
        locale={{ emptyText: '등록된 설비가 없습니다' }}
      />

      <Modal
        title="설비 수정"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {editingEquipment && (
            <Form.Item name="equipmentCode" label="설비 코드">
              <Input disabled />
            </Form.Item>
          )}

          <Form.Item
            name="category"
            label="대분류"
            rules={[{ required: true, message: '대분류를 선택하세요' }]}
          >
            <Select
              placeholder="대분류 선택"
              onChange={(value) => {
                form.setFieldsValue({ subCategory: undefined })
                if (value) {
                  fetchSubCategories(value)
                }
                generateEquipmentName()
              }}
            >
              {categories.map((cat) => (
                <Select.Option key={cat} value={cat}>
                  {cat}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.category !== currentValues.category}
          >
            {({ getFieldValue }) => (
              <Form.Item
                name="subCategory"
                label="소분류"
                rules={[{ required: true, message: '소분류를 선택하세요' }]}
              >
                <Select 
                  placeholder="소분류 선택" 
                  disabled={!getFieldValue('category')}
                  onChange={() => generateEquipmentName()}
                >
                  {subCategories
                    .filter((sc) => sc.category === getFieldValue('category'))
                    .map((sc) => (
                      <Select.Option key={sc.subCategory} value={sc.subCategory}>
                        {sc.subCategory}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            )}
          </Form.Item>

          <Form.Item name="manufacturer" label="제조사">
            <Input 
              placeholder="제조사명" 
              onChange={() => generateEquipmentName()}
            />
          </Form.Item>

          <Form.Item name="model" label="모델">
            <Input 
              placeholder="모델명" 
              onChange={() => generateEquipmentName()}
            />
          </Form.Item>

          <Form.Item name="serialNumber" label="시리얼 번호">
            <Input 
              placeholder="시리얼 번호" 
              onChange={() => generateEquipmentName()}
            />
          </Form.Item>

          <Form.Item 
            name="alias" 
            label="별칭/명칭"
            tooltip="지게차 등에 부여하는 별칭을 입력하세요 (예: alabama). 별칭이 있으면 설비명에 우선 표시됩니다."
          >
            <Input 
              placeholder="별칭/명칭 (예: alabama)" 
              onChange={() => generateEquipmentName()}
            />
          </Form.Item>

          <Form.Item
            name="equipmentName"
            label="설비명"
            rules={[{ required: true, message: '설비명을 입력하세요' }]}
            tooltip="별칭, 제조사, 모델명, 시리얼번호를 입력하면 자동으로 생성됩니다. 필요시 수정 가능합니다."
          >
            <Input placeholder="설비명 (자동 생성)" />
          </Form.Item>

          <Form.Item name="location" label="위치">
            <Select
              placeholder="로케이션 선택"
              showSearch
              optionFilterProp="children"
              allowClear
              filterOption={(input, option) => {
                const label = typeof option?.label === 'string' ? option.label : String(option?.label ?? '')
                return label.toLowerCase().includes(input.toLowerCase())
              }}
            >
              {locations.map((location) => (
                <Select.Option 
                  key={location._id} 
                  value={location.code}
                  label={`${location.code} - ${location.name}`}
                >
                  {location.code} - {location.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="status" label="상태">
            <Select>
              <Select.Option value="active">운영중</Select.Option>
              <Select.Option value="inactive">비활성</Select.Option>
              <Select.Option value="maintenance">점검중</Select.Option>
              <Select.Option value="retired">폐기</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="installationDate" label="설치일">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="purchaseDate" label="구매일">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="purchaseCost" label="구매 비용">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="구매 비용" />
          </Form.Item>

          <Form.Item name="warrantyExpiryDate" label="보증 만료일">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="lastMaintenanceDate" label="마지막 점검일">
            <DatePicker 
              style={{ width: '100%' }}
              onChange={(date) => {
                // 마지막 점검일 변경 시 다음 점검일 자동 계산
                const interval = form.getFieldValue('maintenanceInterval')
                const unit = form.getFieldValue('maintenanceIntervalUnit')
                if (date && interval && unit) {
                  const baseDate = date
                  const nextDate = calculateNextMaintenanceDate(baseDate, interval, unit)
                  if (nextDate) {
                    form.setFieldsValue({ nextMaintenanceDate: nextDate })
                  }
                }
              }}
            />
          </Form.Item>

          <Form.Item name="nextMaintenanceDate" label="다음 점검일">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="maintenanceInterval" label="점검 주기" initialValue={3}>
            <InputNumber 
              style={{ width: '100%' }} 
              min={1} 
              placeholder="점검 주기"
              onChange={(value) => {
                // 점검 주기 변경 시 다음 점검일 자동 계산
                const lastDate = form.getFieldValue('lastMaintenanceDate')
                const unit = form.getFieldValue('maintenanceIntervalUnit')
                const baseDate = lastDate || dayjs()
                if (value && unit) {
                  const nextDate = calculateNextMaintenanceDate(baseDate, value, unit)
                  if (nextDate) {
                    form.setFieldsValue({ nextMaintenanceDate: nextDate })
                  }
                }
              }}
            />
          </Form.Item>

          <Form.Item name="maintenanceIntervalUnit" label="점검 주기 단위" initialValue="months">
            <Select
              onChange={(value) => {
                // 점검 주기 단위 변경 시 다음 점검일 자동 계산
                const interval = form.getFieldValue('maintenanceInterval')
                const lastDate = form.getFieldValue('lastMaintenanceDate')
                const baseDate = lastDate || dayjs()
                if (interval && value) {
                  const nextDate = calculateNextMaintenanceDate(baseDate, interval, value)
                  if (nextDate) {
                    form.setFieldsValue({ nextMaintenanceDate: nextDate })
                  }
                }
              }}
            >
              <Select.Option value="days">일</Select.Option>
              <Select.Option value="weeks">주</Select.Option>
              <Select.Option value="months">월</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="설명">
            <TextArea rows={3} placeholder="설비 설명" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default MaintenanceEquipment

