import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Button, Input, Table, Space, message, Statistic, Row, Col, Tag } from 'antd'
import { AppstoreOutlined, SearchOutlined, PrinterOutlined } from '@ant-design/icons'
import api from '../../../utils/api'

const RackView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [loading, setLoading] = useState(false)
  const [rackData, setRackData] = useState<any[]>([])
  const [rackStats, setRackStats] = useState<any>({
    totalInStock: 0,
    rackOccupied: 0,
    outOfRack: 0,
    rackEmpty: 0,
  })
  const [caseNo, setCaseNo] = useState('')
  const [showRackStatus, setShowRackStatus] = useState(false)

  useEffect(() => {
    fetchRackInventory()
  }, [projectId])

  const fetchRackInventory = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (projectId) params.projectId = projectId
      
      if (caseNo) {
        // 케이스 번호로 검색
        const inventoryResponse = await api.get('/vwckd/inventory', {
          params: { caseNumber: caseNo, projectId }
        })
        setRackData(inventoryResponse.data)
      } else {
        // 랙 마스터 데이터 조회
        const rackResponse = await api.get('/vwckd/rack/master', { params })
        const inventoryResponse = await api.get('/vwckd/rack/inventory', { params })
        
        // 통계 계산
        const totalInStock = inventoryResponse.data.length
        const rackOccupied = rackResponse.data.filter((r: any) => r.currentQuantity > 0).length
        const rackEmpty = rackResponse.data.filter((r: any) => r.currentQuantity === 0 && r.status === 'active').length
        
        setRackStats({
          totalInStock,
          rackOccupied,
          outOfRack: totalInStock - rackOccupied,
          rackEmpty,
        })
        
        if (showRackStatus) {
          setRackData(rackResponse.data)
        } else {
          setRackData(inventoryResponse.data)
        }
      }
    } catch (error) {
      message.error('랙 데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handlePrintTable = () => {
    if (rackData.length === 0) {
      message.warning('출력할 데이터가 없습니다')
      return
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rack Inventory Table</title>
        <style>
          @page { size: A4 landscape; margin: 1cm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 10px; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 4px; text-align: center; }
          th { background-color: #f0f0f0; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2 style="text-align: center; margin-bottom: 20px;">Rack Inventory Table</h2>
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Case No</th>
              <th>Quantity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rackData.map((item: any) => `
              <tr>
                <td>${item.rackLocation || item.location || '-'}</td>
                <td>${item.caseNumber || '-'}</td>
                <td>${item.quantity || 0}</td>
                <td>${item.status || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    const printWindow = window.open('', '', 'width=1200,height=800')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  const columns = showRackStatus ? [
    {
      title: 'Rack Location',
      dataIndex: 'rackLocation',
      key: 'rackLocation',
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
    },
    {
      title: 'Current Quantity',
      dataIndex: 'currentQuantity',
      key: 'currentQuantity',
    },
    {
      title: 'Empty',
      key: 'empty',
      render: (_: any, record: any) => (record.capacity || 0) - (record.currentQuantity || 0),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : status === 'maintenance' ? 'orange' : 'red'}>
          {status}
        </Tag>
      ),
    },
  ] : [
    {
      title: 'Location',
      dataIndex: 'rackLocation',
      key: 'rackLocation',
      render: (location: string, record: any) => location || `${record.locationLetter || ''}${record.locationNumber || ''}`.trim() || '-',
    },
    {
      title: 'Case No',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'orange'}>{status}</Tag>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: 8 }}>Rack Inventory Overview</h2>
        <p style={{ color: '#666' }}>Visual rack management and inventory overview</p>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Button 
            type={showRackStatus ? 'primary' : 'default'}
            onClick={() => {
              setShowRackStatus(!showRackStatus)
              fetchRackInventory()
            }}
          >
            RACK STATUS
          </Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrintTable}>
            PRINT TABLE
          </Button>
        </Space>
      </Card>

      {/* Statistics */}
      {!caseNo && !showRackStatus && (
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Total Pallet Qty"
                value={rackStats.totalInStock}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Pallets on Rack"
                value={rackStats.rackOccupied}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Pallets on Floor"
                value={rackStats.outOfRack}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Rack Available"
                value={rackStats.rackEmpty}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Search */}
      <Card style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%' }}>
          <Input
            placeholder="INPUT CASE NO"
            value={caseNo}
            onChange={(e) => setCaseNo(e.target.value)}
            style={{ width: 300 }}
            onPressEnter={fetchRackInventory}
            allowClear
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={fetchRackInventory} loading={loading}>
            SEARCH
          </Button>
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={rackData}
          loading={loading}
          rowKey={(record: any) => record._id || record.rackLocation || record.caseNumber}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  )
}

export default RackView
