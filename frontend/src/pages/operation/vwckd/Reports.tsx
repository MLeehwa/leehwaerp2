import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { 
  Card, Button, Select, DatePicker, Space, message, Table, Statistic, Row, Col, Tag 
} from 'antd'
import { BarChartOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import api from '../../../utils/api'

const { RangePicker } = DatePicker

const Reports: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [reportType, setReportType] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  const generateReport = async () => {
    if (!reportType) {
      message.warning('리포트 유형을 선택하세요')
      return
    }

    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning('날짜 범위를 선택하세요')
      return
    }

    setLoading(true)
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD')
      const params: any = { startDate, endDate }
      if (projectId) params.projectId = projectId

      let endpoint = ''
      if (reportType === 'daily-activity') {
        endpoint = '/vwckd/reports/daily-activity'
      } else if (reportType === 'vehicle-shipping') {
        endpoint = '/vwckd/reports/vehicle-shipping'
      }

      const response = await api.get(endpoint, { params })
      setReportData({ type: reportType, ...response.data })
      message.success('리포트가 생성되었습니다')
    } catch (error: any) {
      message.error(error.response?.data?.message || '리포트 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async () => {
    if (!reportType || !dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning('리포트 유형과 날짜 범위를 선택하세요')
      return
    }

    try {
      setLoading(true)
      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD')
      const params: any = { reportType, startDate, endDate }
      if (projectId) params.projectId = projectId

      const response = await api.get('/vwckd/reports/export', {
        params,
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${reportType}_${startDate}_to_${endDate}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      message.success('리포트가 내보내졌습니다')
    } catch (error: any) {
      message.error('리포트 내보내기에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const dailyActivityColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Received',
      dataIndex: 'received',
      key: 'received',
      render: (val: number) => <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{val}</span>,
    },
    {
      title: 'Picked',
      dataIndex: 'picked',
      key: 'picked',
      render: (val: number) => <span style={{ color: '#faad14', fontWeight: 'bold' }}>{val}</span>,
    },
    {
      title: 'Shipped',
      dataIndex: 'shipped',
      key: 'shipped',
      render: (val: number) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{val}</span>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (val: number) => <strong>{val}</strong>,
    },
  ]

  const vehicleShippingColumns = [
    {
      title: 'Vehicle Number',
      dataIndex: 'vehicleNumber',
      key: 'vehicleNumber',
    },
    {
      title: 'Order Count',
      dataIndex: 'orderCount',
      key: 'orderCount',
    },
    {
      title: 'Case Count',
      dataIndex: 'caseCount',
      key: 'caseCount',
    },
    {
      title: 'Details',
      key: 'details',
      render: (_: any, record: any) => (
        <div>
          {record.orders.map((order: any, idx: number) => (
            <div key={idx} style={{ fontSize: '12px', marginBottom: 4 }}>
              {order.orderNumber} - {dayjs(order.shippingDate).format('YYYY-MM-DD')} 
              <Tag color={order.status === 'completed' ? 'green' : 'orange'} style={{ marginLeft: 8 }}>
                {order.status}
              </Tag>
            </div>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: 8 }}>Reports & Analytics</h2>
        <p style={{ color: '#666' }}>Daily activity reports and data analytics</p>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', marginBottom: 16 }} direction="vertical" size="middle">
          <Space>
            <Select
              value={reportType}
              onChange={setReportType}
              placeholder="Select Report Type"
              style={{ width: 250 }}
            >
              <Select.Option value="daily-activity">Daily Activity Report</Select.Option>
              <Select.Option value="vehicle-shipping">Vehicle Shipping Report</Select.Option>
            </Select>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
              style={{ width: 300 }}
            />
            <Button 
              type="primary" 
              icon={<BarChartOutlined />} 
              onClick={generateReport}
              loading={loading}
            >
              Generate
            </Button>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={exportReport}
              loading={loading}
              disabled={!reportData}
            >
              Export
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => {
                setReportData(null)
                setReportType('')
                setDateRange(null)
              }}
            >
              Reset
            </Button>
          </Space>
        </Space>
      </Card>

      {reportData && (
        <Card>
          {reportData.type === 'daily-activity' && reportData.summary && (
            <>
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Statistic
                    title="Total Received"
                    value={reportData.summary.totalReceived}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Total Picked"
                    value={reportData.summary.totalPicked}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Total Shipped"
                    value={reportData.summary.totalShipped}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Total Actions"
                    value={reportData.summary.totalActions}
                  />
                </Col>
              </Row>
              <Table
                columns={dailyActivityColumns}
                dataSource={reportData.dailyStats}
                rowKey="date"
                pagination={{ pageSize: 20 }}
              />
            </>
          )}

          {reportData.type === 'vehicle-shipping' && reportData.summary && (
            <>
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                  <Statistic
                    title="Total Vehicles"
                    value={reportData.summary.totalVehicles}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Total Orders"
                    value={reportData.summary.totalOrders}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Total Cases"
                    value={reportData.summary.totalCases}
                  />
                </Col>
              </Row>
              <Table
                columns={vehicleShippingColumns}
                dataSource={reportData.vehicleStats}
                rowKey="vehicleNumber"
                pagination={{ pageSize: 20 }}
              />
            </>
          )}
        </Card>
      )}

      {!reportData && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            리포트를 생성하려면 리포트 유형과 날짜 범위를 선택하고 Generate 버튼을 클릭하세요.
          </div>
        </Card>
      )}
    </div>
  )
}

export default Reports
