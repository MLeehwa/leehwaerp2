import { useState, useEffect } from 'react'
import { Table, Button, message, Modal, Form, Input, Select, InputNumber, DatePicker, Space, Tag, Card, Statistic, Row, Col } from 'antd'
import { EyeOutlined, DollarOutlined, PlusOutlined, FilterOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface AccountsReceivable {
  _id: string
  arNumber: string
  invoice?: {
    _id: string
    invoiceNumber: string
  }
  customer?: {
    _id: string
    name: string
    company?: string
  }
  project?: {
    _id: string
    projectCode: string
    projectName: string
  }
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  totalAmount: number
  receivedAmount: number
  remainingAmount: number
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  paymentStatus: 'unpaid' | 'partial' | 'paid'
  currency: string
  receipts?: Array<{
    receiptDate: string
    amount: number
    paymentMethod: string
    referenceNumber?: string
    notes?: string
  }>
}

interface Invoice {
  _id: string
  invoiceNumber: string
  project?: {
    _id: string
    projectCode: string
  }
  customer?: {
    _id: string
    name: string
  }
  totalAmount: number
  status: string
  paymentStatus: string
}

interface DashboardStats {
  totalAR: number
  totalReceived: number
  totalRemaining: number
  overdueCount: number
  overdueAmount: number
  dueThisMonthCount: number
  dueThisMonthAmount: number
}

const AccountsReceivable = () => {
  const [ars, setArs] = useState<AccountsReceivable[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [receiveModalVisible, setReceiveModalVisible] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [selectedAR, setSelectedAR] = useState<AccountsReceivable | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string | undefined>(undefined)
  const [filterOverdue, setFilterOverdue] = useState<boolean>(false)
  const [form] = Form.useForm()
  const [receiveForm] = Form.useForm()

  useEffect(() => {
    fetchARs()
    fetchStats()
    fetchInvoices()
  }, [filterStatus, filterPaymentStatus, filterOverdue])

  const fetchARs = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filterStatus) params.status = filterStatus
      if (filterPaymentStatus) params.paymentStatus = filterPaymentStatus
      if (filterOverdue) params.overdue = 'true'

      const response = await api.get('/accounts-receivable', { params })
      setArs(response.data)
    } catch (error) {
      message.error('AR 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/accounts-receivable/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      console.error('통계를 불러오는데 실패했습니다')
    }
  }

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices?status=approved,sent')
      // AR이 아직 생성되지 않은 Invoice만 필터링
      const allARs = await api.get('/accounts-receivable')
      const arInvoiceIds = allARs.data.map((ar: AccountsReceivable) => ar.invoice?._id)
      setInvoices(response.data.filter((inv: Invoice) => !arInvoiceIds.includes(inv._id)))
    } catch (error) {
      console.error('Invoice 목록을 불러오는데 실패했습니다')
    }
  }

  const handleCreateFromInvoice = async (invoiceId: string) => {
    try {
      await api.post('/accounts-receivable', { invoiceId })
      message.success('AR이 생성되었습니다')
      setCreateModalVisible(false)
      fetchARs()
      fetchStats()
      fetchInvoices()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'AR 생성에 실패했습니다')
    }
  }

  const handleViewDetail = async (ar: AccountsReceivable) => {
    try {
      const response = await api.get(`/accounts-receivable/${ar._id}`)
      setSelectedAR(response.data)
      setDetailModalVisible(true)
    } catch (error) {
      message.error('AR 상세 정보를 불러오는데 실패했습니다')
    }
  }

  const handleReceive = (ar: AccountsReceivable) => {
    setSelectedAR(ar)
    receiveForm.resetFields()
    receiveForm.setFieldsValue({
      amount: ar.remainingAmount,
      receiptDate: dayjs(),
      paymentMethod: 'bank_transfer',
    })
    setReceiveModalVisible(true)
  }

  const handleReceiveSubmit = async (values: any) => {
    try {
      await api.post(`/accounts-receivable/${selectedAR?._id}/receive`, {
        ...values,
        receiptDate: values.receiptDate?.toISOString(),
        userId: 'system', // TODO: 실제 사용자 ID
      })
      message.success('수금이 처리되었습니다')
      setReceiveModalVisible(false)
      fetchARs()
      fetchStats()
    } catch (error: any) {
      message.error(error.response?.data?.message || '수금 처리에 실패했습니다')
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'blue',
    partial: 'orange',
    paid: 'green',
    overdue: 'red',
    cancelled: 'default',
  }

  const statusLabels: Record<string, string> = {
    pending: '대기',
    partial: '부분수금',
    paid: '완납',
    overdue: '연체',
    cancelled: '취소',
  }

  const paymentStatusColors: Record<string, string> = {
    unpaid: 'red',
    partial: 'orange',
    paid: 'green',
  }

  const paymentStatusLabels: Record<string, string> = {
    unpaid: '미수금',
    partial: '부분수금',
    paid: '완납',
  }

  const columns: ColumnsType<AccountsReceivable> = [
    {
      title: 'AR 번호',
      dataIndex: 'arNumber',
      key: 'arNumber',
    },
    {
      title: '인보이스 번호',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
    },
    {
      title: '고객',
      key: 'customer',
      render: (_, record) => record.customer?.name || '-',
    },
    {
      title: '프로젝트',
      key: 'project',
      render: (_, record) => record.project?.projectCode || '-',
    },
    {
      title: '총액',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount, record) => `${amount.toLocaleString()} ${record.currency}`,
    },
    {
      title: '수금액',
      dataIndex: 'receivedAmount',
      key: 'receivedAmount',
      render: (amount, record) => `${amount.toLocaleString()} ${record.currency}`,
    },
    {
      title: '미수금',
      dataIndex: 'remainingAmount',
      key: 'remainingAmount',
      render: (amount, record) => (
        <span style={{ color: amount > 0 ? 'red' : 'green', fontWeight: 'bold' }}>
          {amount.toLocaleString()} {record.currency}
        </span>
      ),
    },
    {
      title: '만료일',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status]}
        </Tag>
      ),
    },
    {
      title: '수금 상태',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status) => (
        <Tag color={paymentStatusColors[status]}>
          {paymentStatusLabels[status]}
        </Tag>
      ),
    },
    {
      title: '작업',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            상세
          </Button>
          {record.paymentStatus !== 'paid' && (
            <Button
              type="link"
              icon={<DollarOutlined />}
              onClick={() => handleReceive(record)}
            >
              수금
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>매출채권 (AR)</h2>
        <Space>
          <Button
            icon={<FilterOutlined />}
            onClick={() => {
              setFilterStatus(undefined)
              setFilterPaymentStatus(undefined)
              setFilterOverdue(false)
            }}
          >
            필터 초기화
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            AR 생성
          </Button>
        </Space>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="총 AR"
                value={stats.totalAR}
                precision={0}
                prefix="$"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="총 수금액"
                value={stats.totalReceived}
                precision={0}
                prefix="$"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="총 미수금"
                value={stats.totalRemaining}
                precision={0}
                prefix="$"
                valueStyle={{ color: stats.totalRemaining > 0 ? '#cf1322' : '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="연체 금액"
                value={stats.overdueAmount}
                precision={0}
                prefix="$"
                valueStyle={{ color: '#cf1322' }}
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
                {stats.overdueCount}건 연체
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 필터 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Select
          placeholder="상태 필터"
          allowClear
          style={{ width: 150 }}
          value={filterStatus}
          onChange={setFilterStatus}
        >
          <Select.Option value="pending">대기</Select.Option>
          <Select.Option value="partial">부분수금</Select.Option>
          <Select.Option value="paid">완납</Select.Option>
          <Select.Option value="overdue">연체</Select.Option>
        </Select>
        <Select
          placeholder="수금 상태 필터"
          allowClear
          style={{ width: 150 }}
          value={filterPaymentStatus}
          onChange={setFilterPaymentStatus}
        >
          <Select.Option value="unpaid">미수금</Select.Option>
          <Select.Option value="partial">부분수금</Select.Option>
          <Select.Option value="paid">완납</Select.Option>
        </Select>
        <Button
          type={filterOverdue ? 'primary' : 'default'}
          onClick={() => setFilterOverdue(!filterOverdue)}
        >
          연체만 보기
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={ars}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      {/* AR 생성 모달 */}
      <Modal
        title="AR 생성"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => {
          const invoiceId = form.getFieldValue('invoiceId')
          if (invoiceId) {
            handleCreateFromInvoice(invoiceId)
          } else {
            message.error('Invoice를 선택하세요')
          }
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="invoiceId"
            label="Invoice"
            rules={[{ required: true, message: 'Invoice를 선택하세요' }]}
          >
            <Select placeholder="Invoice 선택">
              {invoices.map((invoice) => (
                <Select.Option key={invoice._id} value={invoice._id}>
                  {invoice.invoiceNumber} - {invoice.project?.projectCode} - {invoice.customer?.name} ({invoice.totalAmount.toLocaleString()} {invoice.currency || 'USD'})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 수금 처리 모달 */}
      <Modal
        title="수금 처리"
        open={receiveModalVisible}
        onCancel={() => setReceiveModalVisible(false)}
        onOk={() => receiveForm.submit()}
        width={600}
      >
        <Form
          form={receiveForm}
          layout="vertical"
          onFinish={handleReceiveSubmit}
        >
          <Form.Item label="미수금">
            <Input
              value={selectedAR?.remainingAmount.toLocaleString()}
              disabled
              suffix={selectedAR?.currency}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="수금 금액"
            rules={[
              { required: true, message: '수금 금액을 입력하세요' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value <= 0) {
                    return Promise.reject(new Error('수금 금액은 0보다 커야 합니다'))
                  }
                  if (value > (selectedAR?.remainingAmount || 0)) {
                    return Promise.reject(new Error('미수금보다 큰 금액은 수금할 수 없습니다'))
                  }
                  return Promise.resolve()
                },
              }),
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={selectedAR?.remainingAmount}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
          <Form.Item
            name="receiptDate"
            label="수금일"
            rules={[{ required: true, message: '수금일을 선택하세요' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="paymentMethod"
            label="수금 방법"
            rules={[{ required: true, message: '수금 방법을 선택하세요' }]}
          >
            <Select>
              <Select.Option value="bank_transfer">계좌이체</Select.Option>
              <Select.Option value="wire_transfer">송금</Select.Option>
              <Select.Option value="check">수표</Select.Option>
              <Select.Option value="cash">현금</Select.Option>
              <Select.Option value="credit_card">신용카드</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="referenceNumber"
            label="거래번호/참조번호"
          >
            <Input placeholder="예: 거래번호, 수표번호 등" />
          </Form.Item>
          <Form.Item
            name="bankAccount"
            label="입금 계좌"
          >
            <Input placeholder="입금된 계좌 정보" />
          </Form.Item>
          <Form.Item
            name="notes"
            label="메모"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 상세 정보 모달 */}
      <Modal
        title={`AR 상세 - ${selectedAR?.arNumber}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedAR && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p><strong>Invoice 번호:</strong> {selectedAR.invoiceNumber}</p>
              <p><strong>고객:</strong> {selectedAR.customer?.name}</p>
              <p><strong>프로젝트:</strong> {selectedAR.project?.projectCode} - {selectedAR.project?.projectName}</p>
              <p><strong>총액:</strong> {selectedAR.totalAmount.toLocaleString()} {selectedAR.currency}</p>
              <p><strong>수금액:</strong> {selectedAR.receivedAmount.toLocaleString()} {selectedAR.currency}</p>
              <p><strong>미수금:</strong> <span style={{ color: 'red', fontWeight: 'bold' }}>{selectedAR.remainingAmount.toLocaleString()} {selectedAR.currency}</span></p>
              <p><strong>만료일:</strong> {dayjs(selectedAR.dueDate).format('YYYY-MM-DD')}</p>
              <p><strong>상태:</strong> <Tag color={statusColors[selectedAR.status]}>{statusLabels[selectedAR.status]}</Tag></p>
            </div>
            {selectedAR.receipts && selectedAR.receipts.length > 0 && (
              <div>
                <h4>수금 내역</h4>
                <Table
                  columns={[
                    { title: '수금일', dataIndex: 'receiptDate', key: 'receiptDate', render: (date) => dayjs(date).format('YYYY-MM-DD') },
                    { title: '금액', dataIndex: 'amount', key: 'amount', render: (amount) => amount.toLocaleString() },
                    { title: '수금 방법', dataIndex: 'paymentMethod', key: 'paymentMethod' },
                    { title: '참조번호', dataIndex: 'referenceNumber', key: 'referenceNumber' },
                    { title: '메모', dataIndex: 'notes', key: 'notes' },
                  ]}
                  dataSource={selectedAR.receipts}
                  rowKey={(record, index) => `receipt-${index}`}
                  pagination={false}
                  size="small"
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AccountsReceivable

