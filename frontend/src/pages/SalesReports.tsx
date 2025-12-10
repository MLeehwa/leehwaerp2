import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, DatePicker, Select, Button, Space } from 'antd'
import { DollarOutlined, FileDoneOutlined, ProjectOutlined, UserOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface Company {
  _id: string
  code: string
  name: string
}

interface ProjectSales {
  projectCode: string
  projectName: string
  companyCode?: string
  companyName?: string
  totalInvoices: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
}

interface CustomerSales {
  customerName: string
  totalInvoices: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
}

interface InvoiceStatus {
  status: string
  count: number
  totalAmount: number
}

const SalesReports = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])
  const [selectedCompany, setSelectedCompany] = useState<string | undefined>(undefined)
  const [companies, setCompanies] = useState<Company[]>([])
  const [projectSales, setProjectSales] = useState<ProjectSales[]>([])
  const [customerSales, setCustomerSales] = useState<CustomerSales[]>([])
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    if (companies.length > 0 || !selectedCompany) {
      fetchSalesReports()
    }
  }, [dateRange, selectedCompany, companies])

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies?isActive=true')
      setCompanies(response.data || [])
    } catch (error) {
      console.error('법인 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchSalesReports = async () => {
    setLoading(true)
    try {
      const [invoicesRes, arsRes, projectsRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/accounts-receivable'),
        api.get('/projects'),
      ])

      const invoices = invoicesRes.data
      const ars = arsRes.data
      const projects = projectsRes.data

      // 프로젝트를 법인별로 매핑
      const projectCompanyMap = new Map<string, string>()
      const projectCompanyInfoMap = new Map<string, { code: string; name: string }>()
      projects.forEach((project: any) => {
        if (project.company?._id || project.company) {
          const companyId = typeof project.company === 'string' ? project.company : project.company._id
          const companyInfo = typeof project.company === 'string' 
            ? companies.find(c => c._id === companyId)
            : project.company
          
          projectCompanyMap.set(project._id, companyId)
          if (companyInfo) {
            projectCompanyInfoMap.set(project._id, {
              code: companyInfo.code,
              name: companyInfo.name,
            })
          }
        }
      })

      // 날짜 필터링
      let filteredInvoices = invoices.filter((inv: any) => {
        const invoiceDate = dayjs(inv.invoiceDate)
        return invoiceDate >= dateRange[0] && invoiceDate <= dateRange[1]
      })

      // 법인 필터링
      if (selectedCompany) {
        filteredInvoices = filteredInvoices.filter((inv: any) => {
          const projectId = inv.project?._id || inv.project
          const companyId = projectCompanyMap.get(projectId)
          return companyId === selectedCompany
        })
      }

      // 프로젝트별 매출 집계
      const projectMap = new Map<string, ProjectSales>()
      filteredInvoices.forEach((inv: any) => {
        const projectCode = inv.project?.projectCode || 'Unknown'
        const projectName = inv.project?.projectName || 'Unknown'
        const projectId = inv.project?._id || inv.project
        const key = projectCode

        if (!projectMap.has(key)) {
          const companyInfo = projectCompanyInfoMap.get(projectId)
          projectMap.set(key, {
            projectCode,
            projectName,
            companyCode: companyInfo?.code,
            companyName: companyInfo?.name,
            totalInvoices: 0,
            totalAmount: 0,
            paidAmount: 0,
            remainingAmount: 0,
          })
        }

        const project = projectMap.get(key)!
        project.totalInvoices++
        project.totalAmount += inv.totalAmount || 0
      })

      // AR에서 수금 정보 추가 (법인 필터링 적용)
      ars.forEach((ar: any) => {
        const projectId = ar.project?._id || ar.project
        const companyId = projectCompanyMap.get(projectId)
        
        // 법인 필터가 있으면 해당 법인의 AR만 포함
        if (selectedCompany && companyId !== selectedCompany) {
          return
        }
        
        const projectCode = ar.project?.projectCode
        if (projectCode && projectMap.has(projectCode)) {
          const project = projectMap.get(projectCode)!
          project.paidAmount += ar.receivedAmount || 0
          project.remainingAmount += ar.remainingAmount || 0
        }
      })

      setProjectSales(Array.from(projectMap.values()))

      // 고객별 매출 집계
      const customerMap = new Map<string, CustomerSales>()
      filteredInvoices.forEach((inv: any) => {
        const customerName = inv.customer?.name || 'Unknown'
        if (!customerMap.has(customerName)) {
          customerMap.set(customerName, {
            customerName,
            totalInvoices: 0,
            totalAmount: 0,
            paidAmount: 0,
            remainingAmount: 0,
          })
        }

        const customer = customerMap.get(customerName)!
        customer.totalInvoices++
        customer.totalAmount += inv.totalAmount || 0
      })

      ars.forEach((ar: any) => {
        const projectId = ar.project?._id || ar.project
        const companyId = projectCompanyMap.get(projectId)
        
        // 법인 필터가 있으면 해당 법인의 AR만 포함
        if (selectedCompany && companyId !== selectedCompany) {
          return
        }
        
        const customerName = ar.customer?.name
        if (customerName && customerMap.has(customerName)) {
          const customer = customerMap.get(customerName)!
          customer.paidAmount += ar.receivedAmount || 0
          customer.remainingAmount += ar.remainingAmount || 0
        }
      })

      setCustomerSales(Array.from(customerMap.values()))

      // 인보이스 상태별 집계
      const statusMap = new Map<string, InvoiceStatus>()
      filteredInvoices.forEach((inv: any) => {
        const status = inv.status || 'draft'
        if (!statusMap.has(status)) {
          statusMap.set(status, {
            status,
            count: 0,
            totalAmount: 0,
          })
        }

        const statusData = statusMap.get(status)!
        statusData.count++
        statusData.totalAmount += inv.totalAmount || 0
      })

      setInvoiceStatus(Array.from(statusMap.values()))

    } catch (error) {
      console.error('리포트 데이터를 불러오는데 실패했습니다', error)
    } finally {
      setLoading(false)
    }
  }

  const totalSales = projectSales.reduce((sum, p) => sum + p.totalAmount, 0)
  const totalPaid = projectSales.reduce((sum, p) => sum + p.paidAmount, 0)
  const totalRemaining = projectSales.reduce((sum, p) => sum + p.remainingAmount, 0)
  const totalInvoices = projectSales.reduce((sum, p) => sum + p.totalInvoices, 0)

  const projectColumns: ColumnsType<ProjectSales> = [
    {
      title: '법인',
      key: 'company',
      render: (_, record) => record.companyCode ? `${record.companyCode} - ${record.companyName}` : '-',
    },
    {
      title: '프로젝트 코드',
      dataIndex: 'projectCode',
      key: 'projectCode',
    },
    {
      title: '프로젝트명',
      dataIndex: 'projectName',
      key: 'projectName',
    },
    {
      title: '인보이스 수',
      dataIndex: 'totalInvoices',
      key: 'totalInvoices',
      align: 'right',
    },
    {
      title: '총 매출',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (amount) => `$${amount.toLocaleString()}`,
    },
    {
      title: '수금액',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      align: 'right',
      render: (amount) => `$${amount.toLocaleString()}`,
    },
    {
      title: '미수금',
      dataIndex: 'remainingAmount',
      key: 'remainingAmount',
      align: 'right',
      render: (amount) => (
        <span style={{ color: amount > 0 ? 'red' : 'green', fontWeight: 'bold' }}>
          ${amount.toLocaleString()}
        </span>
      ),
    },
  ]

  const customerColumns: ColumnsType<CustomerSales> = [
    {
      title: '고객명',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: '인보이스 수',
      dataIndex: 'totalInvoices',
      key: 'totalInvoices',
      align: 'right',
    },
    {
      title: '총 매출',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (amount) => `$${amount.toLocaleString()}`,
    },
    {
      title: '수금액',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      align: 'right',
      render: (amount) => `$${amount.toLocaleString()}`,
    },
    {
      title: '미수금',
      dataIndex: 'remainingAmount',
      key: 'remainingAmount',
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
        <h2>Sales 리포트</h2>
        <Space>
          <Select
            placeholder="법인 선택 (전체)"
            allowClear
            style={{ width: 200 }}
            value={selectedCompany}
            onChange={setSelectedCompany}
          >
            {companies.map((company) => (
              <Select.Option key={company._id} value={company._id}>
                {company.code} - {company.name}
              </Select.Option>
            ))}
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]])
              }
            }}
          />
          <Button onClick={fetchSalesReports}>새로고침</Button>
        </Space>
      </div>

      {/* 통계 카드 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="총 인보이스"
              value={totalInvoices}
              prefix={<FileDoneOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="총 매출"
              value={totalSales}
              precision={0}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              suffix="USD"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="총 수금액"
              value={totalPaid}
              precision={0}
              prefix="$"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="총 미수금"
              value={totalRemaining}
              precision={0}
              prefix="$"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 프로젝트별 매출 */}
      <Card title="프로젝트별 매출 현황" style={{ marginBottom: 24 }}>
        <Table
          columns={projectColumns}
          dataSource={projectSales}
          loading={loading}
          rowKey="projectCode"
          pagination={false}
        />
      </Card>

      {/* 고객별 매출 */}
      <Card title="고객별 매출 현황" style={{ marginBottom: 24 }}>
        <Table
          columns={customerColumns}
          dataSource={customerSales}
          loading={loading}
          rowKey="customerName"
          pagination={false}
        />
      </Card>

      {/* 인보이스 상태별 현황 */}
      <Card title="인보이스 상태별 현황">
        <Row gutter={16}>
          {invoiceStatus.map((status) => (
            <Col span={6} key={status.status}>
              <Card>
                <Statistic
                  title={status.status}
                  value={status.count}
                  suffix={`건 ($${status.totalAmount.toLocaleString()})`}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  )
}

export default SalesReports

