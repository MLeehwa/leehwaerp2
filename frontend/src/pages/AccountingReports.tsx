import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, DatePicker, Button, Space } from 'antd'
import { DollarOutlined, ShoppingOutlined, FileTextOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface PaymentSummary {
  totalAP: number
  totalPaid: number
  totalRemaining: number
  overdueAmount: number
}

interface ReceivableSummary {
  totalAR: number
  totalReceived: number
  totalRemaining: number
  overdueAmount: number
}

interface SupplierPayment {
  supplierName: string
  totalAP: number
  totalPaid: number
  totalRemaining: number
}

const AccountingReports = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null)
  const [receivableSummary, setReceivableSummary] = useState<ReceivableSummary | null>(null)
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAccountingReports()
  }, [dateRange])

  const fetchAccountingReports = async () => {
    setLoading(true)
    try {
      const [apRes, arRes, apStatsRes, arStatsRes] = await Promise.all([
        api.get('/accounts-payable'),
        api.get('/accounts-receivable'),
        api.get('/accounts-payable/dashboard/stats').catch(() => ({ data: null })),
        api.get('/accounts-receivable/dashboard/stats'),
      ])

      const aps = apRes.data
      const ars = arRes.data

      // AP 요약 (대시보드 통계 사용 또는 직접 계산)
      if (apStatsRes.data?.summary) {
        const summary = apStatsRes.data.summary
        setPaymentSummary({
          totalAP: summary.total || 0,
          totalPaid: summary.totalPaid || 0,
          totalRemaining: summary.totalRemaining || 0,
          overdueAmount: apStatsRes.data.overdue?.amount || 0,
        })
      } else {
        // 직접 계산
        const totalAP = aps.reduce((sum: number, ap: any) => sum + (ap.total || 0), 0)
        const totalPaid = aps.reduce((sum: number, ap: any) => sum + (ap.paidAmount || 0), 0)
        const totalRemaining = aps.reduce((sum: number, ap: any) => sum + (ap.remainingAmount || 0), 0)
        const overdueAPs = aps.filter((ap: any) => {
          const dueDate = new Date(ap.dueDate)
          return dueDate < new Date() && ap.paymentStatus !== 'paid'
        })
        const overdueAmount = overdueAPs.reduce((sum: number, ap: any) => sum + (ap.remainingAmount || 0), 0)

        setPaymentSummary({
          totalAP,
          totalPaid,
          totalRemaining,
          overdueAmount,
        })
      }

      // AR 요약
      setReceivableSummary(arStatsRes.data)

      // 공급업체별 지급 현황
      const supplierMap = new Map<string, SupplierPayment>()
      aps.forEach((ap: any) => {
        const supplierName = ap.supplierData?.name || ap.supplier || 'Unknown'
        if (!supplierMap.has(supplierName)) {
          supplierMap.set(supplierName, {
            supplierName,
            totalAP: 0,
            totalPaid: 0,
            totalRemaining: 0,
          })
        }

        const supplier = supplierMap.get(supplierName)!
        supplier.totalAP += ap.total || 0
        supplier.totalPaid += ap.paidAmount || 0
        supplier.totalRemaining += ap.remainingAmount || 0
      })

      setSupplierPayments(Array.from(supplierMap.values()))

    } catch (error) {
      console.error('리포트 데이터를 불러오는데 실패했습니다', error)
    } finally {
      setLoading(false)
    }
  }

  const supplierColumns: ColumnsType<SupplierPayment> = [
    {
      title: '공급업체',
      dataIndex: 'supplierName',
      key: 'supplierName',
    },
    {
      title: '총 매입채무',
      dataIndex: 'totalAP',
      key: 'totalAP',
      align: 'right',
      render: (amount) => `$${amount.toLocaleString()}`,
    },
    {
      title: '지급액',
      dataIndex: 'totalPaid',
      key: 'totalPaid',
      align: 'right',
      render: (amount) => `$${amount.toLocaleString()}`,
    },
    {
      title: '미지급액',
      dataIndex: 'totalRemaining',
      key: 'totalRemaining',
      align: 'right',
      render: (amount) => (
        <span style={{ color: amount > 0 ? 'red' : 'green', fontWeight: 'bold' }}>
          ${amount.toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Accounting 리포트</h2>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]])
              }
            }}
          />
          <Button onClick={fetchAccountingReports}>새로고침</Button>
        </Space>
      </div>

      {/* AP 통계 */}
      {paymentSummary && (
        <Card title="매입채무 (AP) 현황" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="총 매입채무"
                value={paymentSummary.totalAP}
                precision={0}
                prefix={<ArrowDownOutlined style={{ color: '#cf1322' }} />}
                suffix="USD"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="총 지급액"
                value={paymentSummary.totalPaid}
                precision={0}
                prefix="$"
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="총 미지급액"
                value={paymentSummary.totalRemaining}
                precision={0}
                prefix="$"
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="연체 금액"
                value={paymentSummary.overdueAmount}
                precision={0}
                prefix="$"
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* AR 통계 */}
      {receivableSummary && (
        <Card title="매출채권 (AR) 현황" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="총 매출채권"
                value={receivableSummary.totalAR}
                precision={0}
                prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
                suffix="USD"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="총 수금액"
                value={receivableSummary.totalReceived}
                precision={0}
                prefix="$"
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="총 미수금"
                value={receivableSummary.totalRemaining}
                precision={0}
                prefix="$"
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="연체 금액"
                value={receivableSummary.overdueAmount}
                precision={0}
                prefix="$"
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 공급업체별 지급 현황 */}
      <Card title="공급업체별 지급 현황">
        <Table
          columns={supplierColumns}
          dataSource={supplierPayments}
          loading={loading}
          rowKey="supplierName"
          pagination={false}
        />
      </Card>
    </div>
  )
}

export default AccountingReports

