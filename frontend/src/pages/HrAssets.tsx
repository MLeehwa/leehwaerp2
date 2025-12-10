import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Space, Tag, Select, InputNumber, DatePicker, Switch } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { TextArea } = Input

interface Asset {
  _id?: string
  equipmentCode: string
  equipmentName: string
  assetType: 'asset' | 'equipment'
  company?: { _id: string; code: string; name: string }
  managedBy: 'hr' | 'operation' | 'admin'
  category: string
  subCategory: string
  manufacturer?: string
  equipmentModel?: string
  serialNumber?: string
  alias?: string // 별칭/명칭 (예: alabama)
  location?: string
  purchaseDate?: string
  purchaseCost?: number
  warrantyExpiryDate?: string
  status: 'active' | 'inactive' | 'maintenance' | 'retired'
  description?: string
  maintenanceRequired: boolean
  maintenanceInterval?: number
  maintenanceIntervalUnit?: 'days' | 'weeks' | 'months'
  createdAt?: string
  updatedAt?: string
}

const HrAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [subCategories, setSubCategories] = useState<Array<{ category: string; subCategory: string }>>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined)
  const [filterManagedBy, setFilterManagedBy] = useState<string | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [form] = Form.useForm()

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies?isActive=true')
      setCompanies(response.data || [])
    } catch (error) {
      console.error('법인 목록을 불러오는데 실패했습니다')
    }
  }

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

  useEffect(() => {
    fetchCompanies()
    fetchCategories()
    fetchLocations()
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [filterStatus, filterCategory, filterManagedBy, searchTerm])

  useEffect(() => {
    if (filterCategory) {
      fetchSubCategories(filterCategory)
    } else {
      setSubCategories([])
    }
  }, [filterCategory])

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const params: any = {}
      
      // 필터가 선택된 경우에만 조건 적용
      // 관리주체 필터가 선택된 경우에만 적용
      if (filterManagedBy && filterManagedBy !== 'total') {
        params.managedBy = filterManagedBy
      }
      
      if (filterStatus) params.status = filterStatus
      if (filterCategory) params.category = filterCategory
      if (searchTerm) params.search = searchTerm

      const response = await api.get('/maintenance/equipment', { params })
      let assets = response.data || []
      
      // 관리주체 필터가 'total'이거나 선택되지 않은 경우 hr과 admin만 표시
      // 필터가 선택되지 않았을 때는 모든 항목 표시 (필터 선택 시에만 필터링)
      // 사용자 요청에 따라 필터 선택 시에만 필터링되도록 변경
      if (filterManagedBy === 'total') {
        assets = assets.filter((asset: Asset) => asset.managedBy === 'hr' || asset.managedBy === 'admin')
      }
      // filterManagedBy가 undefined이거나 'total'이 아닌 경우는 이미 백엔드에서 필터링됨
      
      setAssets(assets)
    } catch (error) {
      message.error('자산 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 자산명 자동 생성 함수
  const generateAssetName = () => {
    const alias = form.getFieldValue('alias')
    const subCategory = form.getFieldValue('subCategory')
    const manufacturer = form.getFieldValue('manufacturer')
    const equipmentModel = form.getFieldValue('equipmentModel')
    const serialNumber = form.getFieldValue('serialNumber')

    // 별칭이 있으면 별칭을 우선 사용
    if (alias && alias.trim()) {
      const parts: string[] = [alias]
      
      // 소분류가 있으면 포함
      if (subCategory) {
        parts.push(`(${subCategory}`)
        if (manufacturer) parts.push(manufacturer)
        if (equipmentModel) parts.push(equipmentModel)
        if (serialNumber) parts.push(`${serialNumber})`)
        else parts.push(')')
      } else {
        // 소분류가 없으면 제조사/모델만 포함
        if (manufacturer || equipmentModel) {
          parts.push('(')
          if (manufacturer) parts.push(manufacturer)
          if (equipmentModel) parts.push(equipmentModel)
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
    if (equipmentModel) {
      parts.push(equipmentModel)
    }
    
    // 시리얼번호가 있으면 괄호 안에 포함
    let name = parts.join(' ')
    if (serialNumber) {
      name += ` (${serialNumber})`
    }
    
    // 자산명이 비어있지 않으면 설정
    if (name.trim()) {
      form.setFieldsValue({ equipmentName: name.trim() })
    }
  }

  const handleAdd = () => {
    form.resetFields()
    form.setFieldsValue({
      assetType: 'asset',
      managedBy: 'hr', // 기본값은 HR
      status: 'active',
      maintenanceRequired: false,
      maintenanceIntervalUnit: 'months',
    })
    setEditingAsset(null)
    setModalVisible(true)
  }

  const handleEdit = async (asset: Asset) => {
    setEditingAsset(asset)
    // 수정 시 대분류가 있으면 소분류 목록 로드
    if (asset.category) {
      await fetchSubCategories(asset.category)
    }
    setModalVisible(true)
    // form 값 설정은 afterOpenChange에서 처리
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/maintenance/equipment/${id}`)
      message.success('자산이 삭제되었습니다')
      fetchAssets()
    } catch (error: any) {
      message.error(error.response?.data?.message || '자산 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    const submitData = {
      ...values,
      purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : undefined,
      warrantyExpiryDate: values.warrantyExpiryDate ? values.warrantyExpiryDate.format('YYYY-MM-DD') : undefined,
      model: values.equipmentModel,
    }
    delete submitData.equipmentModel

    try {
      if (editingAsset?._id) {
        await api.put(`/maintenance/equipment/${editingAsset._id}`, submitData)
        message.success('자산이 수정되었습니다')
      } else {
        await api.post('/maintenance/equipment', submitData)
        message.success('자산이 등록되었습니다')
      }
      setModalVisible(false)
      fetchAssets()
    } catch (error: any) {
      console.error('자산 저장 오류:', error)
      console.error('요청 데이터:', submitData)
      console.error('에러 상세:', error.response?.data)
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || '자산 저장에 실패했습니다'
      message.error(`자산 저장 실패: ${errorMessage}`)
    }
  }

  const columns: ColumnsType<Asset> = [
    {
      title: '자산 코드',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: 150,
    },
    {
      title: '자산명',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
    },
    {
      title: '법인',
      dataIndex: ['company', 'name'],
      key: 'company',
      render: (_, record) => record.company?.name || '-',
    },
    {
      title: '관리주체',
      dataIndex: 'managedBy',
      key: 'managedBy',
      width: 100,
      render: (managedBy: string) => {
        const labels: Record<string, string> = {
          hr: '총무',
          admin: '총무',
          operation: '운영',
        }
        return <Tag>{labels[managedBy] || managedBy}</Tag>
      },
    },
    {
      title: '대분류',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: '소분류',
      dataIndex: 'subCategory',
      key: 'subCategory',
    },
    {
      title: '위치',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '점검 필요',
      dataIndex: 'maintenanceRequired',
      key: 'maintenanceRequired',
      width: 100,
      render: (required: boolean) => (
        <Tag color={required ? 'orange' : 'default'}>
          {required ? '필요' : '불필요'}
        </Tag>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          active: 'green',
          inactive: 'default',
          maintenance: 'orange',
          retired: 'red',
        }
        const labels: Record<string, string> = {
          active: '활성',
          inactive: '비활성',
          maintenance: '점검중',
          retired: '폐기',
        }
        return <Tag color={colors[status]}>{labels[status]}</Tag>
      },
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
        <h1>자산 관리</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          자산 등록
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="검색 (코드, 이름, 시리얼번호)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          placeholder="상태"
          value={filterStatus}
          onChange={setFilterStatus}
          style={{ width: 120 }}
          allowClear
        >
          <Select.Option value="active">활성</Select.Option>
          <Select.Option value="inactive">비활성</Select.Option>
          <Select.Option value="maintenance">점검중</Select.Option>
          <Select.Option value="retired">폐기</Select.Option>
        </Select>
        <Select
          placeholder="대분류"
          value={filterCategory}
          onChange={setFilterCategory}
          style={{ width: 150 }}
          allowClear
        >
          {categories.map((cat) => (
            <Select.Option key={cat} value={cat}>
              {cat}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="관리주체"
          value={filterManagedBy}
          onChange={setFilterManagedBy}
          style={{ width: 120 }}
          allowClear
        >
          <Select.Option value="total">총무</Select.Option>
          <Select.Option value="operation">운영</Select.Option>
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={assets}
        loading={loading}
        rowKey="_id"
        locale={{ emptyText: '등록된 자산이 없습니다' }}
      />

      <Modal
        title={editingAsset ? '자산 수정' : '자산 등록'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={800}
        afterOpenChange={(open) => {
          // Modal이 열릴 때 form 값 설정
          if (open && editingAsset) {
            setTimeout(() => {
              form.setFieldsValue({
                ...editingAsset,
                company: editingAsset.company?._id,
                purchaseDate: editingAsset.purchaseDate ? dayjs(editingAsset.purchaseDate) : undefined,
                warrantyExpiryDate: editingAsset.warrantyExpiryDate ? dayjs(editingAsset.warrantyExpiryDate) : undefined,
              })
            }, 0)
          } else if (!open) {
            form.resetFields()
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item name="assetType" hidden>
            <Input />
          </Form.Item>

          <Form.Item
            name="managedBy"
            label="관리주체"
            rules={[{ required: true, message: '관리주체를 선택하세요' }]}
          >
            <Select placeholder="관리주체 선택">
              <Select.Option value="hr">총무</Select.Option>
              <Select.Option value="admin">총무</Select.Option>
              <Select.Option value="operation">운영</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="company"
            label="법인"
          >
            <Select
              placeholder="법인 선택"
              showSearch
              optionFilterProp="children"
              allowClear
            >
              {companies.map((company) => (
                <Select.Option key={company._id} value={company._id}>
                  {company.code} - {company.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

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
                } else {
                  setSubCategories([])
                }
                generateAssetName()
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
            {({ getFieldValue }) => {
              const category = getFieldValue('category')
              const filteredSubCategories = subCategories.filter(
                (item) => item.category === category
              )
              return (
                <Form.Item
                  name="subCategory"
                  label="소분류"
                  rules={[{ required: true, message: '소분류를 선택하세요' }]}
                >
                  <Select 
                    placeholder="소분류 선택" 
                    disabled={!category}
                    onChange={() => generateAssetName()}
                  >
                    {filteredSubCategories.map((item) => (
                      <Select.Option key={item.subCategory} value={item.subCategory}>
                        {item.subCategory}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )
            }}
          </Form.Item>

          <Form.Item name="manufacturer" label="제조사">
            <Input 
              placeholder="제조사" 
              onChange={() => generateAssetName()}
            />
          </Form.Item>

          <Form.Item name="equipmentModel" label="모델">
            <Input 
              placeholder="모델명" 
              onChange={() => generateAssetName()}
            />
          </Form.Item>

          <Form.Item name="serialNumber" label="시리얼 번호">
            <Input 
              placeholder="시리얼 번호" 
              onChange={() => generateAssetName()}
            />
          </Form.Item>

          <Form.Item 
            name="alias" 
            label="별칭/명칭"
            tooltip="지게차 등에 부여하는 별칭을 입력하세요 (예: alabama). 별칭이 있으면 자산명에 우선 표시됩니다."
          >
            <Input 
              placeholder="별칭/명칭 (예: alabama)" 
              onChange={() => generateAssetName()}
            />
          </Form.Item>

          <Form.Item
            name="equipmentName"
            label="자산명"
            rules={[{ required: true, message: '자산명을 입력하세요' }]}
            tooltip="별칭, 제조사, 모델명, 시리얼번호를 입력하면 자동으로 생성됩니다. 필요시 수정 가능합니다."
          >
            <Input placeholder="자산명 (자동 생성)" />
          </Form.Item>

          <Form.Item name="location" label="위치">
            <Select
              placeholder="로케이션 선택"
              showSearch
              optionFilterProp="children"
              allowClear
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
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

          <Form.Item name="purchaseDate" label="구매일">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="purchaseCost" label="구매가">
            <InputNumber
              style={{ width: '100%' }}
              placeholder="구매가"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item name="warrantyExpiryDate" label="보증 만료일">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="maintenanceRequired"
            label="점검 필요"
            valuePropName="checked"
          >
            <Switch checkedChildren="필요" unCheckedChildren="불필요" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.maintenanceRequired !== currentValues.maintenanceRequired
            }
          >
            {({ getFieldValue }) => {
              const maintenanceRequired = getFieldValue('maintenanceRequired')
              return maintenanceRequired ? (
                <>
                  <Form.Item name="maintenanceInterval" label="점검 주기">
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="점검 주기"
                      min={1}
                    />
                  </Form.Item>
                  <Form.Item
                    name="maintenanceIntervalUnit"
                    label="점검 주기 단위"
                  >
                    <Select>
                      <Select.Option value="days">일</Select.Option>
                      <Select.Option value="weeks">주</Select.Option>
                      <Select.Option value="months">월</Select.Option>
                    </Select>
                  </Form.Item>
                </>
              ) : null
            }}
          </Form.Item>

          <Form.Item name="status" label="상태">
            <Select>
              <Select.Option value="active">활성</Select.Option>
              <Select.Option value="inactive">비활성</Select.Option>
              <Select.Option value="maintenance">점검중</Select.Option>
              <Select.Option value="retired">폐기</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="설명">
            <TextArea rows={3} placeholder="설명" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default HrAssets

