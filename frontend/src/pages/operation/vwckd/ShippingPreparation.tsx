import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { 
  Card, Button, Input, Select, Table, Space, message, Upload, Modal, 
  Tag, Descriptions, Divider, Popconfirm 
} from 'antd'
import { 
  TruckOutlined, UploadOutlined, DownloadOutlined, EditOutlined, 
  CheckCircleOutlined, PrinterOutlined, EyeOutlined 
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import api from '../../../utils/api'

const ShippingPreparation: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [loading, setLoading] = useState(false)
  const [shippingData, setShippingData] = useState<any[]>([])
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false)
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [orderCases, setOrderCases] = useState<any[]>([])
  const [orderDetailVisible, setOrderDetailVisible] = useState(false)

  useEffect(() => {
    fetchShippingOrders()
  }, [projectId])

  const fetchShippingOrders = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (projectId) params.projectId = projectId
      
      const response = await api.get('/vwckd/shipping/orders', { params })
      setShippingData(response.data)
    } catch (error) {
      message.error('출고 주문 데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderCases = async (orderId: string) => {
    try {
      const response = await api.get(`/vwckd/shipping/orders/${orderId}/cases`)
      setOrderCases(response.data)
    } catch (error) {
      message.error('주문 케이스 데이터를 불러오는데 실패했습니다')
    }
  }

  const handleViewOrder = async (order: any) => {
    setSelectedOrder(order)
    setOrderDetailVisible(true)
    await fetchOrderCases(order._id)
  }

  const handlePickCase = async (caseId: string) => {
    try {
      await api.put(`/vwckd/shipping/orders/${selectedOrder._id}/cases/${caseId}/pick`)
      message.success('케이스가 픽킹되었습니다')
      await fetchOrderCases(selectedOrder._id)
      await fetchShippingOrders()
    } catch (error: any) {
      message.error(error.response?.data?.message || '픽킹 처리에 실패했습니다')
    }
  }

  const handleCompleteOrder = async () => {
    try {
      await api.put(`/vwckd/shipping/orders/${selectedOrder._id}/complete`)
      message.success('주문이 완료되었습니다')
      setOrderDetailVisible(false)
      await fetchShippingOrders()
    } catch (error: any) {
      message.error(error.response?.data?.message || '주문 완료 처리에 실패했습니다')
    }
  }

  const handlePrintOrder = () => {
    if (!selectedOrder || !orderCases.length) {
      message.warning('출력할 주문이 없습니다')
      return
    }

    // 위치별로 정렬
    const sortedCases = [...orderCases].sort((a, b) => {
      const locA = (a.location || '').toString()
      const locB = (b.location || '').toString()
      return locA.localeCompare(locB)
    })

    // 출력 HTML 생성
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shipping Order - ${selectedOrder.orderNumber}</title>
        <style>
          @page { size: A4; margin: 0.5cm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 10px; font-size: 11px; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .order-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .order-info { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 10px; }
          .vehicle-number { font-size: 16px; font-weight: bold; color: #000; background-color: #ffff00; 
                            padding: 5px 10px; border: 2px solid #000; border-radius: 5px; text-align: center; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
          th, td { border: 1px solid #000; padding: 4px; text-align: center; font-size: 9px; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .table-container { display: flex; gap: 15px; }
          .table-section { flex: 1; }
          .case-count { text-align: center; font-size: 12px; font-weight: bold; margin: 10px 0; 
                        padding: 5px; background-color: #ffff00; border: 2px solid #000; 
                        display: inline-block; min-width: 100px; }
          @media print { body { margin: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="order-title">SHIPPING ORDER</div>
          <div class="order-info">
            <div>
              <p><strong>Order:</strong> ${selectedOrder.orderNumber}</p>
              <p><strong>Date:</strong> ${new Date(selectedOrder.shippingDate || selectedOrder.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="case-count">Total Cases<br>${sortedCases.length}</div>
          </div>
          <div class="vehicle-number">VEHICLE: ${selectedOrder.customerName || 'N/A'}</div>
        </div>
        <div class="table-container">
          <div class="table-section">
            <table>
              <thead>
                <tr><th>CASE NO</th><th>LOCATION</th></tr>
              </thead>
              <tbody>
                ${sortedCases.slice(0, Math.ceil(sortedCases.length / 2)).map((c: any) => `
                  <tr>
                    <td>${c.caseNumber || ''}</td>
                    <td>${c.location || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="table-section">
            <table>
              <thead>
                <tr><th>CASE NO</th><th>LOCATION</th></tr>
              </thead>
              <tbody>
                ${sortedCases.slice(Math.ceil(sortedCases.length / 2)).map((c: any) => `
                  <tr>
                    <td>${c.caseNumber || ''}</td>
                    <td>${c.location || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  const handleCsvUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options
    
    setPendingFile(file as File)
    setVehicleModalVisible(true)
    onSuccess?.(file)
  }

  const processCsvUpload = async () => {
    if (!pendingFile || !vehicleNumber.trim()) {
      message.error('차량 번호를 입력하세요')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', pendingFile)
      formData.append('vehicleNumber', vehicleNumber.trim())
      if (projectId) formData.append('projectId', projectId)
      
      const response = await api.post('/vwckd/shipping/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (response.data.errors && response.data.errors.length > 0) {
        message.warning(`${response.data.message} (오류: ${response.data.errors.length}건)`)
      } else {
        message.success(response.data.message || 'CSV 파일이 업로드되었습니다')
      }
      
      setVehicleModalVisible(false)
      setVehicleNumber('')
      setPendingFile(null)
      fetchShippingOrders()
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'CSV 파일 업로드에 실패했습니다'
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const exportData = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (projectId) params.projectId = projectId
      
      const response = await api.get('/vwckd/shipping/export', {
        params,
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `shipping_export_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      message.success('데이터가 성공적으로 내보내졌습니다')
    } catch (error: any) {
      message.error('데이터 내보내기에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const today = new Date().toISOString().split('T')[0]
    const template = `Date,Case No
${today},A123456789
${today},B987654321
${today},C555666777`
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'shipping_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('Shipping 템플릿이 다운로드되었습니다')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange'
      case 'preparing': return 'blue'
      case 'completed': return 'green'
      case 'shipped': return 'purple'
      default: return 'default'
    }
  }

  const getCaseStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange'
      case 'picked': return 'blue'
      case 'packed': return 'cyan'
      case 'shipped': return 'green'
      default: return 'default'
    }
  }

  const columns = [
    {
      title: 'Order No',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
    },
    {
      title: 'Customer/Vehicle',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: 'Shipping Date',
      dataIndex: 'shippingDate',
      key: 'shippingDate',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewOrder(record)}
          >
            View
          </Button>
        </Space>
      ),
    },
  ]

  const caseColumns = [
    {
      title: 'Case No',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (location: string) => location || <span style={{ color: '#999' }}>No location</span>,
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
        <Tag color={getCaseStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'pending' && (
            <Popconfirm
              title="이 케이스를 픽킹하시겠습니까?"
              onConfirm={() => handlePickCase(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Button size="small" icon={<CheckCircleOutlined />} type="primary">
                Pick
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const allCasesPicked = orderCases.length > 0 && orderCases.every((c: any) => c.status !== 'pending')

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: 8 }}>Shipping Preparation</h2>
        <p style={{ color: '#666' }}>Order management and picking preparation</p>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>Template</Button>
          <Upload
            customRequest={handleCsvUpload}
            accept=".csv"
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} type="primary" loading={loading}>
              Upload CSV
            </Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={exportData} loading={loading}>
            Export
          </Button>
          <Button icon={<EditOutlined />} onClick={() => {
            Modal.info({
              title: 'Excel-like Editor',
              content: (
                <div>
                  <p>Excel-like Editor 기능은 현재 개발 중입니다.</p>
                  <p>현재는 CSV 업로드와 템플릿 다운로드를 사용하여 데이터를 관리할 수 있습니다.</p>
                </div>
              ),
              width: 500,
            })
          }}>
            Editor
          </Button>
        </Space>
      </Card>

      {/* 차량 번호 입력 모달 */}
      <Modal
        title="차량 번호 입력"
        open={vehicleModalVisible}
        onOk={processCsvUpload}
        onCancel={() => {
          setVehicleModalVisible(false)
          setVehicleNumber('')
          setPendingFile(null)
        }}
        okText="업로드"
        cancelText="취소"
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>차량 번호 *</label>
          <Input
            placeholder="차량 번호를 입력하세요"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            onPressEnter={processCsvUpload}
          />
        </div>
      </Modal>

      {/* 주문 상세 모달 */}
      <Modal
        title={`Shipping Order: ${selectedOrder?.orderNumber || ''}`}
        open={orderDetailVisible}
        onCancel={() => {
          setOrderDetailVisible(false)
          setSelectedOrder(null)
          setOrderCases([])
        }}
        width={900}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrintOrder}>
            Print Order
          </Button>,
          <Popconfirm
            key="complete"
            title="모든 케이스가 픽킹되었는지 확인하세요. 주문을 완료하시겠습니까?"
            onConfirm={handleCompleteOrder}
            disabled={!allCasesPicked}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              key="complete" 
              type="primary" 
              disabled={!allCasesPicked}
            >
              Complete Order
            </Button>
          </Popconfirm>,
          <Button key="close" onClick={() => {
            setOrderDetailVisible(false)
            setSelectedOrder(null)
            setOrderCases([])
          }}>
            Close
          </Button>,
        ]}
      >
        {selectedOrder && (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Order Number">{selectedOrder.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="Customer/Vehicle">{selectedOrder.customerName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Shipping Date">
                {selectedOrder.shippingDate ? new Date(selectedOrder.shippingDate).toLocaleDateString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedOrder.status)}>{selectedOrder.status.toUpperCase()}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <div style={{ marginBottom: 16 }}>
              <strong>Cases ({orderCases.length})</strong>
            </div>
            <Table
              columns={caseColumns}
              dataSource={orderCases}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </>
        )}
      </Modal>

      <Card>
        <Table
          columns={columns}
          dataSource={shippingData}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  )
}

export default ShippingPreparation
