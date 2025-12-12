import { useState, useEffect } from 'react'
import { Table, Tag, message, Button, Modal, Form, Input, Select, InputNumber, DatePicker, Space, Card, Upload } from 'antd'
import { PlusOutlined, MinusCircleOutlined, FilterOutlined, CheckOutlined, UploadOutlined, PrinterOutlined, EditOutlined } from '@ant-design/icons'


import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface PurchaseOrder {
  _id: string
  poNumber: string
  status: string
  total: number
  orderDate: string
  items?: any[]
  expectedDeliveryDate?: string
  shippingAddress?: {
    name?: string
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  locationId?: string
  locationData?: {
    code: string
    name: string
  }
  purchaseRequest?: string
  purchaseRequestData?: {
    prNumber: string
    locationId?: string
    locationData?: {
      code: string
      name: string
    }
    requestedByUser?: {
      username: string
    }
  }
  paymentMethod?: 'cash' | 'bank_transfer' | 'check' | 'credit_card'
  approvedBy?: string
  approvedAt?: string
  approvedByUser?: {
    username: string
    firstName?: string
    lastName?: string
  }
}

interface Location {
  _id: string
  code: string
  name: string
  companyId: string
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

interface PurchaseRequest {
  _id: string
  prNumber: string
  status: string
  totalAmount: number
  items?: Array<{
    description: string
    quantity: number
    unitPrice?: number
    estimatedTotal?: number
    categoryCode?: string
  }>
  supplier?: string
  department?: string
  priority?: string
  requiredDate?: string
  estimatedDeliveryDate?: string
  reason?: string
  convertedToPO?: string
}

interface ShippingAddress {
  _id: string
  name: string
  street: string
  city: string
  state?: string
  zipCode?: string
  country: string
  isDefault?: boolean
  isActive?: boolean
}

const PurchaseOrders = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([])
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [receiptFileList, setReceiptFileList] = useState<UploadFile[]>([])
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null)
  const [form] = Form.useForm()

  // 필터 상태
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterLocationId, setFilterLocationId] = useState<string | undefined>(undefined)
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  // 권한 확인
  const canApprove = user?.role === 'admin' || user?.role === 'manager'

  useEffect(() => {
    fetchOrders()
    fetchCategories()
    fetchSuppliers()
    fetchPurchaseRequests()
    fetchShippingAddresses()
    fetchLocations()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [filterStatus, filterLocationId, filterDateRange])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filterStatus) params.status = filterStatus
      if (filterLocationId) params.locationId = filterLocationId
      if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
        params.startDate = filterDateRange[0].startOf('day').toISOString()
        params.endDate = filterDateRange[1].endOf('day').toISOString()
      }

      const response = await api.get('/purchase-orders', { params })
      setOrders(response.data || [])
    } catch (error: any) {
      console.error('구매주문 목록 로드 오류 상세:', JSON.stringify(error, null, 2))
      console.log('Error object keys:', Object.keys(error))
      console.log('Error Type:', typeof error)
      message.error('구매주문 목록을 불러오는데 실패했습니다')
      setOrders([])
    } finally {
      setLoading(false)
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

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories')
      setCategories((response.data || []).filter((cat: Category) => cat.isActive))
    } catch (error: any) {
      console.error('카테고리 목록을 불러오는데 실패했습니다:', error)
      setCategories([])
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers?isActive=true')
      setSuppliers(response.data || [])
    } catch (error: any) {
      console.error('공급업체 목록을 불러오는데 실패했습니다:', error)
      setSuppliers([])
    }
  }

  const fetchPurchaseRequests = async () => {
    try {
      // 승인된 PR과 제출된 PR 모두 가져오기
      const response = await api.get('/purchase-requests')
      const allPRs = response.data || []
      // 승인되었거나 제출된 PR만 필터링 (변환되지 않은 것만)
      const availablePRs = allPRs.filter((pr: PurchaseRequest) =>
        (pr.status === 'approved' || pr.status === 'submitted') && !pr.convertedToPO
      )
      console.log('사용 가능한 PR 목록:', availablePRs)
      setPurchaseRequests(availablePRs)
    } catch (error: any) {
      console.error('구매요청 목록을 불러오는데 실패했습니다:', error)
      setPurchaseRequests([])
    }
  }

  const fetchShippingAddresses = async () => {
    try {
      const response = await api.get('/shipping-addresses?isActive=true')
      setShippingAddresses(response.data || [])
    } catch (error: any) {
      console.error('배송지 목록을 불러오는데 실패했습니다:', error)
      setShippingAddresses([])
    }
  }

  const handleShippingAddressSelect = (addressId: string | null) => {
    if (!addressId) {
      form.setFieldsValue({
        shippingAddress: undefined,
      })
      return
    }

    const address = shippingAddresses.find((addr) => addr._id === addressId)
    if (address) {
      form.setFieldsValue({
        shippingAddress: {
          street: address.street,
          city: address.city,
          state: address.state || '',
          zipCode: address.zipCode || '',
          country: address.country,
        },
      })
    }
  }

  const handlePRSelect = async (prId: string | null) => {
    if (!prId) {
      // PR 선택 해제 시 폼 초기화
      form.setFieldsValue({
        items: [{}],
        supplier: undefined,
        purchaseRequest: undefined,
      })
      return
    }

    try {
      // PR 상세 정보 가져오기
      const response = await api.get(`/purchase-requests/${prId}`)
      const pr: PurchaseRequest = response.data

      console.log('선택된 PR 정보:', pr)

      if (!pr.items || pr.items.length === 0) {
        message.warning('선택한 구매요청에 항목이 없습니다')
        return
      }

      // PR의 items를 PO items로 변환
      const poItems = pr.items.map((item) => {
        // unitPrice가 없으면 estimatedTotal을 quantity로 나눠서 계산
        const unitPrice = item.unitPrice || (item.estimatedTotal && item.quantity ? item.estimatedTotal / item.quantity : 0)
        const total = item.estimatedTotal || (unitPrice * item.quantity)

        return {
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: unitPrice || 0,
          total: total || 0,
          categoryCode: item.categoryCode || undefined,
        }
      })

      console.log('변환된 PO 항목:', poItems)

      // 폼에 PR 정보 채우기 (기존 항목 완전히 교체)
      const formValues: any = {
        items: poItems,
        purchaseRequest: prId,
      }

      // PR에 supplier가 있으면 자동 선택
      if (pr.supplier) {
        formValues.supplier = pr.supplier
      }

      // PR의 필요일자가 있으면 예상 납기일로 설정
      if (pr.estimatedDeliveryDate) {
        formValues.expectedDeliveryDate = dayjs(pr.estimatedDeliveryDate)
      } else if (pr.requiredDate) {
        formValues.expectedDeliveryDate = dayjs(pr.requiredDate)
      }

      form.setFieldsValue(formValues)

      message.success(`구매요청 ${pr.prNumber}의 ${poItems.length}개 항목이 자동으로 불러와졌습니다`)
    } catch (error: any) {
      console.error('구매요청 정보를 불러오는데 실패했습니다:', error)
      if (error.response?.status === 403) {
        message.error('구매요청 정보에 접근할 권한이 없습니다')
      } else if (error.response?.status === 404) {
        message.error('구매요청을 찾을 수 없습니다')
      } else {
        message.error('구매요청 정보를 불러오는데 실패했습니다: ' + (error.response?.data?.message || error.message))
      }
    }
  }

  const handleReceiptFileChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setReceiptFileList(newFileList)
  }

  const beforeUploadReceipt = (file: File) => {
    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      message.error('파일 크기는 10MB 이하여야 합니다')
    }
    return false // 자동 업로드 방지
  }

  const handleEdit = (po: PurchaseOrder) => {
    form.resetFields()
    setReceiptFileList([])

    // items 변환
    const items = po.items?.map((item: any) => ({
      ...item,
      // 필요한 경우 변환 로직 추가
    })) || [{}]

    form.setFieldsValue({
      ...po,
      items,
      orderDate: po.orderDate ? dayjs(po.orderDate) : undefined,
      expectedDeliveryDate: po.expectedDeliveryDate ? dayjs(po.expectedDeliveryDate) : undefined,
      // 배송지는 handleShippingAddressSelect 로직과 맞물릴 수 있으므로 주의. 
      // 여기서는 폼에 직접 매핑된다고 가정.
      shippingAddress: po.shippingAddress,
    })

    setEditingPO(po)
    setModalVisible(true)
  }

  const handleAdd = () => {
    form.resetFields()
    setReceiptFileList([])
    setEditingPO(null)
    form.setFieldsValue({
      paymentTerms: 'Net 30',
      currency: 'USD',
      items: [{}]
    })
    setModalVisible(true)
  }

  // ...

  const handleSubmit = async (values: any) => {
    try {
      // 날짜 변환 (dayjs 객체인 경우)
      const requestData: any = { ...values }

      if (values.orderDate) {
        if (values.orderDate.toDate) {
          requestData.orderDate = values.orderDate.toDate().toISOString()
        } else if (values.orderDate instanceof Date) {
          requestData.orderDate = values.orderDate.toISOString()
        }
      }

      if (values.expectedDeliveryDate) {
        if (values.expectedDeliveryDate.toDate) {
          requestData.expectedDeliveryDate = values.expectedDeliveryDate.toDate().toISOString()
        } else if (values.expectedDeliveryDate instanceof Date) {
          requestData.expectedDeliveryDate = values.expectedDeliveryDate.toISOString()
        }
      }

      // 크레딧 카드 선택 시 영수증 첨부 정보 추가
      if (values.paymentMethod === 'credit_card' && receiptFileList.length > 0) {
        requestData.receiptAttachments = receiptFileList.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        }))
      }

      // items 처리 - total 계산 및 검증
      const items = values.items.map((item: any, index: number) => {
        if (!item.description) {
          throw new Error(`항목 ${index + 1}: 설명을 입력하세요`)
        }
        if (!item.quantity || item.quantity < 1) {
          throw new Error(`항목 ${index + 1}: 수량을 입력하세요 (1 이상)`)
        }
        if (!item.unitPrice || item.unitPrice < 0) {
          throw new Error(`항목 ${index + 1}: 단가를 입력하세요 (0 이상)`)
        }

        const total = item.unitPrice * item.quantity
        const processedItem: any = {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: total,
        }
        if (item.categoryCode) processedItem.categoryCode = item.categoryCode
        return processedItem
      })

      if (items.length === 0) {
        throw new Error('최소 1개 이상의 항목이 필요합니다')
      }

      // 최종 요청 데이터 구성 (selectedShippingAddress는 제외)
      const finalData: any = {
        supplier: requestData.supplier,
        purchaseRequest: requestData.purchaseRequest || undefined,
        items: items,
        tax: requestData.tax || 0,
        shippingCost: requestData.shippingCost || 0,
        discount: requestData.discount || 0,
        paymentTerms: requestData.paymentTerms || 'Net 30',
        orderDate: requestData.orderDate || undefined,
        expectedDeliveryDate: requestData.expectedDeliveryDate || undefined,
        notes: requestData.notes || undefined,
        currency: 'USD',
      }

      // shippingAddress가 있으면 추가 (selectedShippingAddress는 제외)
      if (requestData.shippingAddress && Object.keys(requestData.shippingAddress).length > 0) {
        finalData.shippingAddress = requestData.shippingAddress
      }

      // 크레딧 카드 선택 시 영수증 필수 확인
      if (values.paymentMethod === 'credit_card' && receiptFileList.length === 0) {
        message.error('크레딧 카드 결제 시 영수증을 첨부해야 합니다')
        return
      }

      console.log('구매주문 저장 요청 데이터:', finalData)

      let response;
      if (editingPO) {
        response = await api.put(`/purchase-orders/${editingPO._id}`, finalData);
        message.success('구매주문이 수정되었습니다');
      } else {
        response = await api.post('/purchase-orders', finalData);
        message.success('구매주문이 생성되었습니다');
      }

      console.log('구매주문 저장 응답:', response.data)
      setModalVisible(false)
      form.resetFields()
      setReceiptFileList([])
      setEditingPO(null)
      fetchOrders()
    } catch (error: any) {
      console.error('구매주문 저장 오류 상세:', {
        error,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      })

      if (error.response?.status === 403) {
        message.error('권한이 없습니다.')
      } else if (error.response?.status === 401) {
        message.error('인증이 필요합니다. 다시 로그인해주세요.')
      } else if (error.response?.data?.errors) {
        const errorMsg = error.response.data.errors.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ')
        message.error(`검증 오류: ${errorMsg}`)
      } else if (error.response?.data?.message) {
        message.error(error.response.data.message)
      } else if (error.message) {
        message.error(error.message)
      } else {
        message.error('작업에 실패했습니다: ' + (error.message || '알 수 없는 오류'))
      }
    }
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      draft: 'default',
      sent: 'processing',
      confirmed: 'success',
      partial: 'warning',
      received: 'success',
      cancelled: 'error',
    }
    return colorMap[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      draft: '초안',
      sent: '발송됨',
      confirmed: '확인됨',
      partial: '부분입고',
      received: '입고완료',
      cancelled: '취소됨',
    }
    return textMap[status] || status
  }

  const handleApprove = async (po: PurchaseOrder) => {
    try {
      await api.post(`/purchase-orders/${po._id}/approve`)
      message.success('구매주문이 승인되었습니다')
      fetchOrders()
    } catch (error: any) {
      message.error(error.response?.data?.message || '승인에 실패했습니다')
    }
  }

  const handleCancel = (po: PurchaseOrder) => {
    Modal.confirm({
      title: '구매주문 취소',
      content: '정말로 이 구매주문을 취소하시겠습니까? 취소 후 다시 수정하여 재사용할 수 있습니다.',
      okText: '예, 취소합니다',
      cancelText: '아니오',
      onOk: async () => {
        try {
          await api.put(`/purchase-orders/${po._id}/cancel`)
          message.success('구매주문이 취소되었습니다')
          fetchOrders()
        } catch (error: any) {
          message.error(error.response?.data?.message || '취소에 실패했습니다')
        }
      }
    })
  }

  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: 'PO 번호',
      dataIndex: 'poNumber',
      key: 'poNumber',
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
      title: '구매 부서',
      key: 'location',
      render: (_, record: PurchaseOrder) => {
        // locationData가 있으면 사용
        if (record.locationData) {
          return `${record.locationData.code} - ${record.locationData.name}`
        }
        // purchaseRequestData에서 locationData 확인
        if (record.purchaseRequestData?.locationData) {
          return `${record.purchaseRequestData.locationData.code} - ${record.purchaseRequestData.locationData.name}`
        }
        // locationId로 찾기
        const locationId = record.locationId || record.purchaseRequestData?.locationId
        if (locationId) {
          const location = locations.find(loc => loc._id === locationId)
          return location ? `${location.code} - ${location.name}` : '-'
        }
        return '-'
      },
    },
    {
      title: '총액',
      dataIndex: 'total',
      key: 'total',
      render: (amount: number) => `$${amount?.toLocaleString()}`,
    },
    {
      title: '주문일',
      dataIndex: 'orderDate',
      key: 'orderDate',
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
      width: 150,
      render: (_, record: PurchaseOrder) => {
        const isDraft = record.status === 'draft'
        const isCancelled = record.status === 'cancelled'
        const canApprovePO = isDraft && canApprove
        const canCancel = ['sent', 'confirmed', 'partial'].includes(record.status)

        // 디버깅: Vercel에서 버튼이 안 보이는 원인 파악
        console.log('Action Render:', { id: record._id, status: record.status, isDraft, isCancelled, canApprovePO, canCancel })

        return (

          <Space>
            <Space>
              <span style={{ color: 'red', fontSize: '10px' }}>ACT</span>
              {(isDraft || isCancelled) && (
                <Button size="small" onClick={() => handleEdit(record)}>
                  수정
                </Button>
              )}
              {canApprovePO && (
                <Button size="small" type="primary" onClick={() => handleApprove(record)}>
                  승인
                </Button>
              )}
              {canCancel && (
                <Button size="small" danger onClick={() => handleCancel(record)}>
                  취소
                </Button>
              )}
              <Button size="small" onClick={() => handleDirectPrint(record._id)}>
                인쇄
              </Button>
            </Space>
          </Space>
        )
        )
      },
    },
  ]

const handleDirectPrint = (poId: string) => {
  // Use the new standalone print route
  const printUrl = `/print/purchase-orders/${poId}`

  // Always remove existing iframe to force full reload
  const existingIframe = document.getElementById('po-print-iframe')
  if (existingIframe) {
    document.body.removeChild(existingIframe)
  }

  const iframe = document.createElement('iframe')
  iframe.id = 'po-print-iframe'
  iframe.style.position = 'fixed'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.left = '-9999px' // Hide off-screen
  document.body.appendChild(iframe)

  // Set src to trigger load
  iframe.src = printUrl
}

const handleFilterReset = () => {
  setFilterStatus(undefined)
  setFilterLocationId(undefined)
  setFilterDateRange(null)
}

return (
  <div style={{ padding: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
      <h1>구매주문 (PO)</h1>
      <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
        구매주문 작성
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
          <Select.Option value="sent">발송됨</Select.Option>
          <Select.Option value="confirmed">확인됨</Select.Option>
          <Select.Option value="partial">부분입고</Select.Option>
          <Select.Option value="received">입고완료</Select.Option>
          <Select.Option value="cancelled">취소됨</Select.Option>
        </Select>

        <Select
          placeholder="구매 부서"
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
      dataSource={orders}
      loading={loading}
      rowKey="_id"
      locale={{ emptyText: '구매주문이 없습니다' }}
    />

    <Modal
      title="구매주문 작성"
      open={modalVisible}
      onCancel={() => {
        setModalVisible(false)
        form.resetFields()
      }}
      onOk={() => form.submit()}
      width={900}
    >
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item name="purchaseRequest" label="구매요청 선택 (선택사항)">
          <Select
            placeholder={purchaseRequests.length > 0 ? "구매요청을 선택하면 구매 항목이 자동으로 불러와집니다" : "사용 가능한 구매요청이 없습니다"}
            allowClear
            showSearch
            optionFilterProp="children"
            onChange={handlePRSelect}
            style={{ width: '100%' }}
            disabled={purchaseRequests.length === 0}
          >
            {purchaseRequests.map((pr) => (
              <Select.Option key={pr._id} value={pr._id}>
                {pr.prNumber} - ${pr.totalAmount?.toLocaleString()} ({pr.status === 'approved' ? '승인됨' : '제출됨'})
              </Select.Option>
            ))}
          </Select>
          <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
            {purchaseRequests.length > 0
              ? '구매요청을 선택하면 모든 구매 항목이 자동으로 불러와집니다'
              : '먼저 구매요청을 작성하고 승인해야 합니다'}
          </div>
        </Form.Item>

        <Form.Item name="supplier" label="공급업체" rules={[{ required: true, message: '공급업체를 선택하세요' }]}>
          <Select placeholder="공급업체를 선택하세요" showSearch optionFilterProp="children">
            {suppliers.map((supplier) => (
              <Select.Option key={supplier._id} value={supplier._id}>
                {supplier.name} {supplier.email ? `(${supplier.email})` : ''}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="orderDate" label="주문일자">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="expectedDeliveryDate" label="예상 납기일">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="paymentTerms" label="결제 조건" initialValue="Net 30">
          <Select>
            <Select.Option value="Net 15">Net 15</Select.Option>
            <Select.Option value="Net 30">Net 30</Select.Option>
            <Select.Option value="Net 45">Net 45</Select.Option>
            <Select.Option value="Net 60">Net 60</Select.Option>
            <Select.Option value="Due on Receipt">Due on Receipt</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="paymentMethod" label="결제 방법">
          <Select placeholder="결제 방법을 선택하세요">
            <Select.Option value="bank_transfer">은행 계좌 이체</Select.Option>
            <Select.Option value="credit_card">크레딧 카드</Select.Option>
          </Select>
          <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
            크레딧 카드 선택 시 입고 완료 후 자동으로 지급 완료 처리됩니다
          </div>
        </Form.Item>

        <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.paymentMethod !== currentValues.paymentMethod}>
          {() => {
            const paymentMethod = form.getFieldValue('paymentMethod')
            return paymentMethod === 'credit_card' ? (
              <Form.Item label="영수증 첨부 (필수)">
                <Upload
                  fileList={receiptFileList}
                  onChange={handleReceiptFileChange}
                  beforeUpload={beforeUploadReceipt}
                  multiple
                >
                  <Button icon={<UploadOutlined />}>영수증 파일 선택</Button>
                </Upload>
                <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                  최대 10MB까지 업로드 가능합니다. 여러 파일을 첨부할 수 있습니다.
                </div>
              </Form.Item>
            ) : null
          }}
        </Form.Item>

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
                      rules={[{ required: true, message: '항목 설명을 입력하세요' }]}
                      style={{ width: 200 }}
                    >
                      <Input placeholder="항목 설명" />
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
                      <InputNumber min={1} placeholder="수량" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'unitPrice']}
                      rules={[{ required: true, message: '단가를 입력하세요' }]}
                      style={{ width: 120 }}
                    >
                      <InputNumber
                        min={0}
                        placeholder="단가"
                        prefix="$"
                        style={{ width: '100%' }}
                        onChange={(value) => {
                          const quantity = form.getFieldValue(['items', name, 'quantity'])
                          if (value && quantity) {
                            const total = value * quantity
                            form.setFieldValue(['items', name, 'total'], total)
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
                        readOnly
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
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    항목 추가
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form.Item>

        <Form.Item label="추가 비용">
          <Space style={{ width: '100%' }}>
            <Form.Item name="tax" label="세금" style={{ width: 150, marginBottom: 0 }}>
              <InputNumber min={0} prefix="$" placeholder="0" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="shippingCost" label="배송비" style={{ width: 150, marginBottom: 0 }}>
              <InputNumber min={0} prefix="$" placeholder="0" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="discount" label="할인" style={{ width: 150, marginBottom: 0 }}>
              <InputNumber min={0} prefix="$" placeholder="0" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Form.Item>

        <Form.Item label="배송 주소">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name="selectedShippingAddress" label="등록된 배송지 선택">
              <Select
                placeholder={shippingAddresses.length > 0 ? "배송지를 선택하면 주소가 자동으로 채워집니다" : "등록된 배송지가 없습니다"}
                allowClear
                showSearch
                optionFilterProp="children"
                onChange={handleShippingAddressSelect}
                style={{ width: '100%' }}
                disabled={shippingAddresses.length === 0}
              >
                {shippingAddresses.map((addr) => (
                  <Select.Option key={addr._id} value={addr._id}>
                    {addr.name} {addr.isDefault ? '(기본)' : ''} - {addr.street}, {addr.city}, {addr.country}
                  </Select.Option>
                ))}
              </Select>
              <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                {shippingAddresses.length > 0
                  ? '등록된 배송지를 선택하거나 아래에서 직접 입력할 수 있습니다'
                  : '배송지 관리 메뉴에서 배송지를 등록하세요'}
              </div>
            </Form.Item>

            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500 }}>또는 직접 입력</div>
              <Form.Item name={['shippingAddress', 'street']} style={{ marginBottom: 8 }}>
                <Input placeholder="도로명 주소" />
              </Form.Item>
              <Space style={{ width: '100%' }}>
                <Form.Item name={['shippingAddress', 'city']} style={{ marginBottom: 0, width: 200 }}>
                  <Input placeholder="도시" />
                </Form.Item>
                <Form.Item name={['shippingAddress', 'state']} style={{ marginBottom: 0, width: 150 }}>
                  <Input placeholder="주/도" />
                </Form.Item>
                <Form.Item name={['shippingAddress', 'zipCode']} style={{ marginBottom: 0, width: 120 }}>
                  <Input placeholder="우편번호" />
                </Form.Item>
                <Form.Item name={['shippingAddress', 'country']} style={{ marginBottom: 0, width: 150 }}>
                  <Input placeholder="국가" />
                </Form.Item>
              </Space>
            </div>
          </Space>
        </Form.Item>

        <Form.Item name="notes" label="비고">
          <Input.TextArea rows={3} placeholder="추가 메모를 입력하세요" />
        </Form.Item>
      </Form>
    </Modal>
  </div>
)
}

export default PurchaseOrders

