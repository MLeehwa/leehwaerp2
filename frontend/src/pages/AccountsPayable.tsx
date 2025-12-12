import { useState, useEffect } from 'react'
import { Table, Tag, message, Button, Modal, Form, Input, Select, InputNumber, DatePicker, Space, Descriptions, Divider, Card, Upload } from 'antd'
import { EyeOutlined, DollarOutlined, FileTextOutlined, FilterOutlined, UploadOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface Location {
  _id: string
  code: string
  name: string
  companyId: string
}

interface AccountsPayable {
  _id: string
  apNumber: string
  status: string
  paymentStatus: string
  total: number
  remainingAmount: number
  dueDate: string
  locationId?: string
  locationData?: {
    code: string
    name: string
  }
  supplier?: string
  supplierData?: {
    name: string
    email?: string
    phone?: string
  }
  purchaseOrder?: string
  purchaseOrderData?: {
    poNumber: string
    orderDate?: string
    locationId?: string
    locationData?: {
      code: string
      name: string
    }
  }
  invoiceNumber?: string
  invoiceDate?: string
  paymentTerms?: string
  payments?: Array<{
    paymentDate: string
    amount: number
    paymentMethod: string
    referenceNumber?: string
    notes?: string
  }>
  subtotal?: number
  tax?: number
  discount?: number
  paidAmount?: number
  notes?: string
}

const AccountsPayable = () => {
  const [payables, setPayables] = useState<AccountsPayable[]>([])
  const [loading, setLoading] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false)
  const [selectedAP, setSelectedAP] = useState<AccountsPayable | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string | undefined>(undefined)
  const [filterLocationId, setFilterLocationId] = useState<string | undefined>(undefined)
  const [filterDueDateRange, setFilterDueDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [receiptFileList, setReceiptFileList] = useState<UploadFile[]>([])
  const [form] = Form.useForm()
  const [invoiceForm] = Form.useForm()

  useEffect(() => {
    fetchLocations()
  }, [])

  useEffect(() => {
    fetchPayables()
  }, [filterStatus, filterPaymentStatus, filterLocationId, filterDueDateRange])

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations?isActive=true')
      setLocations(response.data || [])
    } catch (error) {
      console.error('로케이션 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchPayables = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filterStatus) params.status = filterStatus
      if (filterPaymentStatus) params.paymentStatus = filterPaymentStatus
      if (filterLocationId) params.locationId = filterLocationId
      if (filterDueDateRange && filterDueDateRange[0] && filterDueDateRange[1]) {
        params.startDueDate = filterDueDateRange[0].startOf('day').toISOString()
        params.endDueDate = filterDueDateRange[1].endOf('day').toISOString()
      }

      const response = await api.get('/accounts-payable', { params })
      setPayables(response.data || [])
    } catch (error) {
      message.error('매입채무 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchAPDetail = async (id: string) => {
    try {
      const response = await api.get(`/accounts-payable/${id}`)
      setSelectedAP(response.data)
      setDetailModalVisible(true)
    } catch (error: any) {
      message.error(error.response?.data?.message || '매입채무 상세 정보를 불러오는데 실패했습니다')
    }
  }

  const handlePayment = (ap: AccountsPayable) => {
    setSelectedAP(ap)
    form.resetFields()
    setReceiptFileList([])
    form.setFieldsValue({
      paymentDate: dayjs(),
      paymentMethod: 'bank_transfer',
      amount: ap.remainingAmount,
    })
    setPaymentModalVisible(true)
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

  const handlePaymentSubmit = async (values: any) => {
    if (!selectedAP) return

    try {
      // 영수증 파일 처리
      const receiptAttachments = receiptFileList.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        // 실제 파일은 나중에 별도 업로드 API로 처리하거나, base64로 인코딩할 수 있음
      }))

      const paymentData = {
        amount: values.amount,
        paymentDate: values.paymentDate.toDate().toISOString(),
        paymentMethod: values.paymentMethod,
        referenceNumber: values.referenceNumber,
        notes: values.notes,
        receiptAttachments: receiptAttachments.length > 0 ? receiptAttachments : undefined,
      }

      await api.post(`/accounts-payable/${selectedAP._id}/pay`, paymentData)
      message.success('지급이 처리되었습니다')
      setPaymentModalVisible(false)
      form.resetFields()
      setReceiptFileList([])
      fetchPayables()
      if (detailModalVisible) {
        fetchAPDetail(selectedAP._id)
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '지급 처리에 실패했습니다')
    }
  }


  const [invoiceFileList, setInvoiceFileList] = useState<UploadFile[]>([])

  const handleInvoiceFileChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setInvoiceFileList(newFileList)
  }

  const handleInvoiceUpdate = async (values: any) => {
    if (!selectedAP) return

    try {
      const updateData: any = {}
      if (values.invoiceNumber) updateData.invoiceNumber = values.invoiceNumber
      if (values.invoiceDate) updateData.invoiceDate = values.invoiceDate.toDate().toISOString()

      // 첨부파일 처리
      if (invoiceFileList.length > 0) {
        updateData.attachments = invoiceFileList.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          // url: file.url // If actual upload logic existed
        }));
      }

      await api.put(`/accounts-payable/${selectedAP._id}`, updateData)
      message.success('인보이스 정보가 업데이트되었습니다')
      setInvoiceModalVisible(false)
      invoiceForm.resetFields()
      setInvoiceFileList([]) // Reset files
      fetchPayables()
      if (detailModalVisible) {
        fetchAPDetail(selectedAP._id)
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '인보이스 정보 업데이트에 실패했습니다')
    }
  }

  const handleEditInvoice = (ap: AccountsPayable) => {
    setSelectedAP(ap)
    invoiceForm.resetFields()
    setInvoiceFileList([]) // Clear previous files
    invoiceForm.setFieldsValue({
      invoiceNumber: ap.invoiceNumber || '',
      invoiceDate: ap.invoiceDate ? dayjs(ap.invoiceDate) : undefined,
    })
    // If existing attachments, load them? (Optional, but good UX)
    // For now, simple implementation
    setInvoiceModalVisible(true)
  }

  // ... inside generic render ...

  {/* 인보이스 등록/수정 모달 */ }
  <Modal
    title={`인보이스 등록/수정 - ${selectedAP?.apNumber}`}
    open={invoiceModalVisible}
    onCancel={() => {
      setInvoiceModalVisible(false)
      invoiceForm.resetFields()
      setInvoiceFileList([])
    }}
    onOk={() => invoiceForm.submit()}
    width={500}
  >
    <Form form={invoiceForm} onFinish={handleInvoiceUpdate} layout="vertical">
      <Form.Item name="invoiceNumber" label="인보이스 번호">
        <Input placeholder="인보이스 번호를 입력하세요" />
      </Form.Item>

      <Form.Item name="invoiceDate" label="인보이스 날짜">
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item label="영수증/인보이스 사진 첨부">
        <Upload
          fileList={invoiceFileList}
          onChange={handleInvoiceFileChange}
          beforeUpload={() => false} // Prevent auto upload
          multiple
        >
          <Button icon={<UploadOutlined />}>파일 선택</Button>
        </Upload>
        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
          영수증이나 인보이스 사진을 첨부하세요.
        </div>
      </Form.Item>
    </Form>
  </Modal>

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'default',
      partial: 'warning',
      paid: 'success',
      overdue: 'error',
      cancelled: 'default',
    }
    return colorMap[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      pending: '대기',
      partial: '부분지급',
      paid: '지급완료',
      overdue: '만료',
      cancelled: '취소',
    }
    return textMap[status] || status
  }

  const columns: ColumnsType<AccountsPayable> = [
    {
      title: 'AP 번호',
      dataIndex: 'apNumber',
      key: 'apNumber',
      render: (text: string, record: AccountsPayable) => (
        <Button type="link" onClick={() => fetchAPDetail(record._id)}>
          {text}
        </Button>
      ),
    },
    {
      title: '공급업체',
      key: 'supplier',
      render: (_, record: AccountsPayable) => record.supplierData?.name || '-',
    },
    {
      title: '구매 부서',
      key: 'location',
      render: (_, record: AccountsPayable) => {
        if (record.locationData) {
          return `${record.locationData.code} - ${record.locationData.name}`
        }
        if (record.purchaseOrderData?.locationData) {
          return `${record.purchaseOrderData.locationData.code} - ${record.purchaseOrderData.locationData.name}`
        }
        const locationId = record.locationId || record.purchaseOrderData?.locationId
        if (locationId) {
          const location = locations.find(loc => loc._id === locationId)
          return location ? `${location.code} - ${location.name}` : '-'
        }
        return '-'
      },
    },
    {
      title: 'PO 번호',
      key: 'poNumber',
      render: (_, record: AccountsPayable) => record.purchaseOrderData?.poNumber || '-',
    },
    {
      title: '인보이스 번호',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (text: string) => text || '-',
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
      title: '지급상태',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status: string) => {
        const textMap: Record<string, string> = {
          unpaid: '미지급',
          partial: '부분지급',
          paid: '지급완료',
        }
        return textMap[status] || status
      },
    },
    {
      title: '총액',
      dataIndex: 'total',
      key: 'total',
      render: (amount: number) => `$${amount?.toLocaleString()}`,
    },
    {
      title: '지급액',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      render: (amount: number) => `$${(amount || 0)?.toLocaleString()}`,
    },
    {
      title: '잔액',
      dataIndex: 'remainingAmount',
      key: 'remainingAmount',
      render: (amount: number) => (
        <span style={{ color: amount > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>
          ${amount?.toLocaleString()}
        </span>
      ),
    },
    {
      title: '만료일',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => {
        const dueDate = new Date(date)
        const today = new Date()
        const isOverdue = dueDate < today
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {dueDate.toLocaleDateString('ko-KR')}
          </span>
        )
      },
    },
    {
      title: '작업',
      key: 'action',
      render: (_, record: AccountsPayable) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => fetchAPDetail(record._id)}
          >
            상세
          </Button>
          {record.paymentStatus !== 'paid' && (
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => handlePayment(record)}
            >
              지급
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const handleFilterReset = () => {
    setFilterStatus(undefined)
    setFilterPaymentStatus(undefined)
    setFilterLocationId(undefined)
    setFilterDueDateRange(null)
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>매입채무/지급 (AP)</h1>
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
            <Select.Option value="pending">대기</Select.Option>
            <Select.Option value="partial">부분지급</Select.Option>
            <Select.Option value="paid">지급완료</Select.Option>
            <Select.Option value="overdue">만료</Select.Option>
            <Select.Option value="cancelled">취소</Select.Option>
          </Select>

          <Select
            placeholder="지급상태"
            allowClear
            style={{ width: 150 }}
            value={filterPaymentStatus}
            onChange={setFilterPaymentStatus}
          >
            <Select.Option value="unpaid">미지급</Select.Option>
            <Select.Option value="partial">부분지급</Select.Option>
            <Select.Option value="paid">지급완료</Select.Option>
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
            placeholder={['만료일 시작', '만료일 종료']}
            value={filterDueDateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setFilterDueDateRange([dates[0], dates[1]])
              } else {
                setFilterDueDateRange(null)
              }
            }}
            format="YYYY-MM-DD"
          />


          <Button onClick={handleFilterReset}>
            필터 초기화
          </Button>

          <Button danger onClick={async () => {
            try {
              const res = await api.post('/accounts-payable/debug/fix-data');
              message.success(`복구 완료: 생성 ${res.data.created}, 수정 ${res.data.repaired}`);
              fetchPayables();
            } catch (e) { message.error('복구 실패'); }
          }}>
            데이터 강제 복구 (Debug)
          </Button>
        </div>
      </Card>

      <Table
        columns={columns}
        dataSource={payables}
        loading={loading}
        rowKey="_id"
        locale={{ emptyText: '매입채무가 없습니다' }}
      />

      {/* AP 상세 모달 */}
      <Modal
        title={`매입채무 상세 - ${selectedAP?.apNumber}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedAP(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false)
            setSelectedAP(null)
          }}>
            닫기
          </Button>,
          selectedAP && (
            <Button
              key="invoice"
              icon={<FileTextOutlined />}
              onClick={() => {
                setDetailModalVisible(false)
                handleEditInvoice(selectedAP)
              }}
            >
              인보이스 등록/수정
            </Button>
          ),
          selectedAP && selectedAP.paymentStatus !== 'paid' && (
            <Button
              key="pay"
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => {
                setDetailModalVisible(false)
                handlePayment(selectedAP)
              }}
            >
              지급 처리
            </Button>
          ),
        ]}
        width={800}
      >
        {selectedAP && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="AP 번호">{selectedAP.apNumber}</Descriptions.Item>
              <Descriptions.Item label="상태">
                <Tag color={getStatusColor(selectedAP.status)}>{getStatusText(selectedAP.status)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="지급상태">
                {selectedAP.paymentStatus === 'unpaid' ? '미지급' :
                  selectedAP.paymentStatus === 'partial' ? '부분지급' : '지급완료'}
              </Descriptions.Item>
              <Descriptions.Item label="공급업체">{selectedAP.supplierData?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="PO 번호">{selectedAP.purchaseOrderData?.poNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="인보이스 번호">{selectedAP.invoiceNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="결제 조건">{selectedAP.paymentTerms || '-'}</Descriptions.Item>
              <Descriptions.Item label="만료일">
                {new Date(selectedAP.dueDate).toLocaleDateString('ko-KR')}
              </Descriptions.Item>
              <Descriptions.Item label="소계">${(selectedAP.subtotal || 0)?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="세금">${(selectedAP.tax || 0)?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="할인">${(selectedAP.discount || 0)?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="총액">
                <strong>${selectedAP.total?.toLocaleString()}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="지급액">${(selectedAP.paidAmount || 0)?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="잔액">
                <strong style={{ color: selectedAP.remainingAmount > 0 ? '#ff4d4f' : '#52c41a' }}>
                  ${selectedAP.remainingAmount?.toLocaleString()}
                </strong>
              </Descriptions.Item>
            </Descriptions>

            {selectedAP.notes && (
              <>
                <Divider />
                <div>
                  <strong>비고:</strong>
                  <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{selectedAP.notes}</div>
                </div>
              </>
            )}

            {selectedAP.payments && selectedAP.payments.length > 0 && (
              <>
                <Divider />
                <div>
                  <strong>지급 내역:</strong>
                  <Table
                    dataSource={selectedAP.payments}
                    rowKey={(record, index) => `${index}`}
                    pagination={false}
                    style={{ marginTop: 16 }}
                    columns={[
                      {
                        title: '지급일', dataIndex: 'paymentDate', key: 'paymentDate',
                        render: (date: string) => new Date(date).toLocaleDateString('ko-KR')
                      },
                      {
                        title: '금액', dataIndex: 'amount', key: 'amount',
                        render: (amount: number) => `$${amount?.toLocaleString()}`
                      },
                      {
                        title: '지급 방법', dataIndex: 'paymentMethod', key: 'paymentMethod',
                        render: (method: string) => {
                          const methodMap: Record<string, string> = {
                            cash: '현금',
                            bank_transfer: '계좌이체',
                            check: '수표',
                            credit_card: '신용카드',
                          }
                          return methodMap[method] || method
                        }
                      },
                      { title: '참조번호', dataIndex: 'referenceNumber', key: 'referenceNumber' },
                      { title: '비고', dataIndex: 'notes', key: 'notes' },
                    ]}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* 지급 처리 모달 */}
      <Modal
        title={`지급 처리 - ${selectedAP?.apNumber}`}
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={600}
      >
        {selectedAP && (
          <div style={{ marginBottom: 16 }}>
            <Card size="small">
              <div>총액: <strong>${selectedAP.total?.toLocaleString()}</strong></div>
              <div>이미 지급: <strong>${(selectedAP.paidAmount || 0)?.toLocaleString()}</strong></div>
              <div>잔액: <strong style={{ color: '#ff4d4f' }}>${selectedAP.remainingAmount?.toLocaleString()}</strong></div>
            </Card>
          </div>
        )}
        <Form form={form} onFinish={handlePaymentSubmit} layout="vertical">
          <Form.Item
            name="amount"
            label="지급 금액"
            rules={[
              { required: true, message: '지급 금액을 입력하세요' },
              { type: 'number', min: 0.01, message: '지급 금액은 0보다 커야 합니다' },
            ]}
          >
            <InputNumber
              min={0.01}
              max={selectedAP?.remainingAmount}
              prefix="$"
              style={{ width: '100%' }}
              placeholder="지급 금액을 입력하세요"
            />
          </Form.Item>

          <Form.Item
            name="paymentDate"
            label="지급일"
            rules={[{ required: true, message: '지급일을 선택하세요' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="지급 방법"
            rules={[{ required: true, message: '지급 방법을 선택하세요' }]}
          >
            <Select
              onChange={(value) => {
                // 크레딧 카드 선택 시 자동으로 전체 금액으로 설정
                if (value === 'credit_card' && selectedAP) {
                  form.setFieldsValue({ amount: selectedAP.remainingAmount })
                }
              }}
            >
              <Select.Option value="bank_transfer">은행 계좌 이체</Select.Option>
              <Select.Option value="credit_card">크레딧 카드</Select.Option>
            </Select>
            <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
              크레딧 카드 선택 시 전체 잔액이 자동으로 지급됩니다
            </div>
          </Form.Item>

          <Form.Item name="referenceNumber" label="참조번호 (선택)">
            <Input placeholder="참조번호를 입력하세요" />
          </Form.Item>

          <Form.Item name="notes" label="비고 (선택)">
            <Input.TextArea rows={3} placeholder="지급 관련 비고를 입력하세요" />
          </Form.Item>

          <Form.Item label="영수증 첨부">
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
        </Form>
      </Modal>

      {/* 인보이스 등록/수정 모달 */}
      <Modal
        title={`인보이스 등록/수정 - ${selectedAP?.apNumber}`}
        open={invoiceModalVisible}
        onCancel={() => {
          setInvoiceModalVisible(false)
          invoiceForm.resetFields()
        }}
        onOk={() => invoiceForm.submit()}
        width={500}
      >
        <Form form={invoiceForm} onFinish={handleInvoiceUpdate} layout="vertical">
          <Form.Item name="invoiceNumber" label="인보이스 번호">
            <Input placeholder="인보이스 번호를 입력하세요" />
          </Form.Item>

          <Form.Item name="invoiceDate" label="인보이스 날짜">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="영수증/인보이스 사진 첨부">
            <Upload
              fileList={invoiceFileList}
              onChange={handleInvoiceFileChange}
              beforeUpload={() => false} // Prevent auto upload
              multiple
            >
              <Button icon={<UploadOutlined />}>파일 선택</Button>
            </Upload>
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              영수증이나 인보이스 사진을 첨부하세요.
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AccountsPayable

