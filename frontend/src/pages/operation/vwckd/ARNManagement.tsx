import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Button, Input, Select, Table, Space, message, Upload, Modal, Tag, Descriptions, Divider } from 'antd'
import { FileTextOutlined, UploadOutlined, DownloadOutlined, EditOutlined, EyeOutlined, PrinterOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import api from '../../../utils/api'

const ARNManagement: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [loading, setLoading] = useState(false)
  const [arnData, setArnData] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stats, setStats] = useState({ total: 0, pending: 0, received: 0 })
  const [selectedContainer, setSelectedContainer] = useState<any>(null)
  const [containerCases, setContainerCases] = useState<any[]>([])
  const [caseModalVisible, setCaseModalVisible] = useState(false)

  useEffect(() => {
    fetchARNs()
  }, [projectId, searchTerm, statusFilter])

  const fetchARNs = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (projectId) params.projectId = projectId
      if (searchTerm) {
        params.containerNo = searchTerm
        params.caseNumber = searchTerm
      }
      if (statusFilter) params.status = statusFilter
      
      const response = await api.get('/vwckd/arn', { params })
      setArnData(response.data)
      
      // 통계 계산 (컨테이너별로 집계)
      const uniqueContainers = new Set(response.data.map((a: any) => a.containerNo))
      const total = uniqueContainers.size
      const containers = Array.from(uniqueContainers).map((cn: any) => {
        const cases = response.data.filter((a: any) => a.containerNo === cn)
        const allCompleted = cases.every((c: any) => c.status === 'completed')
        return { containerNo: cn, status: allCompleted ? 'completed' : 'pending' }
      })
      const pending = containers.filter((c: any) => c.status === 'pending').length
      const received = containers.filter((c: any) => c.status === 'completed').length
      setStats({ total, pending, received })
    } catch (error) {
      message.error('ARN 데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleCsvUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file as File)
      if (projectId) formData.append('projectId', projectId)
      
      const response = await api.post('/vwckd/arn/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (response.data.errors && response.data.errors.length > 0) {
        message.warning(`${response.data.message} (오류: ${response.data.errors.length}건)`)
      } else {
        message.success(response.data.message || 'CSV 파일이 업로드되었습니다')
      }
      onSuccess?.(file)
      fetchARNs()
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'CSV 파일 업로드에 실패했습니다'
      message.error(errorMsg)
      onError?.(error as Error)
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    // ARN 템플릿 CSV 생성 (기존 wms-new-system 형식)
    const today = new Date().toISOString().split('T')[0]
    const template = `upload_date,container_no,case_no,part_name
${today},TEST1,R12345,45762-4G620R
${today},TEST1,R12346,
${today},TEST2,R12347,ELECTRONIC_BOARD
${today},TEST2,R12348,MECHANICAL_PART`
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'arn_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('ARN 템플릿이 다운로드되었습니다')
  }

  const exportData = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (projectId) params.projectId = projectId
      if (statusFilter) params.status = statusFilter
      if (searchTerm) {
        params.containerNo = searchTerm
        params.caseNumber = searchTerm
      }
      
      const response = await api.get('/vwckd/arn/export', {
        params,
        responseType: 'blob'
      })
      
      // Blob을 다운로드
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `arn_export_${Date.now()}.csv`)
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

  const handleViewContainer = async (containerNo: string) => {
    setLoading(true)
    try {
      const response = await api.get(`/vwckd/arn/containers/${containerNo}/cases`, {
        params: { projectId }
      })
      setSelectedContainer({ containerNo })
      setContainerCases(response.data)
      setCaseModalVisible(true)
    } catch (error: any) {
      message.error('컨테이너 케이스 조회에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handlePrintLabel = (caseItem: any) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Case Label - ${caseItem.caseNumber}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @page { size: 4in 2in; margin: 0.2cm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 10px; font-size: 12px; }
          .label { border: 2px solid #000; padding: 10px; text-align: center; }
          .case-no { font-size: 18px; font-weight: bold; margin: 10px 0; }
          .container-no { font-size: 14px; margin: 5px 0; }
          .location { font-size: 12px; color: #666; margin: 5px 0; }
          .barcode { margin: 10px 0; }
          ${caseItem.hasRisk ? '.risk { background-color: #ff0000; color: #fff; padding: 5px; font-weight: bold; margin: 5px 0; }' : ''}
        </style>
      </head>
      <body>
        <div class="label">
          <div class="case-no">${caseItem.caseNumber || ''}</div>
          <div class="container-no">Container: ${caseItem.containerNo || ''}</div>
          ${caseItem.location ? `<div class="location">Location: ${caseItem.location}</div>` : ''}
          <div class="barcode">
            <svg id="barcode-${caseItem.caseNumber}"></svg>
          </div>
          ${caseItem.hasRisk ? '<div class="risk">⚠ RISK</div>' : ''}
        </div>
        <script>
          JsBarcode('#barcode-${caseItem.caseNumber}', '${caseItem.caseNumber || ''}', {
            format: "CODE128",
            lineColor: "#000",
            width: 1.5,
            height: 40,
            displayValue: true,
            margin: 5
          });
          window.onload = function() {
            setTimeout(() => {
              window.print();
              setTimeout(() => {
                window.close();
              }, 500);
            }, 100);
          };
        </script>
      </body>
      </html>
    `
    const printWindow = window.open('', '', 'width=400,height=300')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
    }
  }

  const columns = [
    {
      title: 'ARN Number',
      dataIndex: 'arnNumber',
      key: 'arnNumber',
    },
    {
      title: 'Container No',
      dataIndex: 'containerNo',
      key: 'containerNo',
      render: (text: string, record: any) => (
        <Button 
          type="link" 
          onClick={() => handleViewContainer(text)}
          style={{ padding: 0 }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Case No',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
    },
    {
      title: 'Part Name',
      dataIndex: 'partName',
      key: 'partName',
    },
    {
      title: 'Upload Date',
      dataIndex: 'uploadDate',
      key: 'uploadDate',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : status === 'processed' ? 'blue' : 'orange'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'RISK',
      dataIndex: 'hasRisk',
      key: 'hasRisk',
      render: (hasRisk: boolean) => hasRisk ? (
        <Tag color="red" icon={<ExclamationCircleOutlined />}>RISK</Tag>
      ) : null,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintLabel(record)}>
            Print
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
      title: 'Part Name',
      dataIndex: 'partName',
      key: 'partName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : 'orange'}>{status}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintLabel(record)}>
            Print Label
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: 8 }}>ARN Management</h2>
        <p style={{ color: '#666' }}>Arrival Notice Registration and Management</p>
      </div>

      {/* Header Actions */}
      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
            Template
          </Button>
          <Upload
            customRequest={handleCsvUpload}
            accept=".csv"
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} type="primary" loading={loading}>
              Upload CSV
            </Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={exportData}>
            Export
          </Button>
          <Button icon={<EditOutlined />} onClick={() => {
            Modal.info({
              title: 'Excel-like Editor',
              content: (
                <div>
                  <p>Excel-like Editor 기능은 현재 개발 중입니다.</p>
                  <p>현재는 CSV 업로드와 템플릿 다운로드를 사용하여 데이터를 관리할 수 있습니다.</p>
                  <p style={{ marginTop: 16 }}>
                    <strong>사용 방법:</strong>
                  </p>
                  <ol style={{ paddingLeft: 20 }}>
                    <li>Template 버튼을 클릭하여 템플릿을 다운로드합니다</li>
                    <li>Excel에서 템플릿을 열고 데이터를 입력합니다</li>
                    <li>CSV 형식으로 저장합니다</li>
                    <li>Upload CSV 버튼을 클릭하여 업로드합니다</li>
                  </ol>
                </div>
              ),
              width: 500,
            })
          }}>
            Editor
          </Button>
        </Space>
      </Card>

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>{stats.total}</div>
            <div style={{ color: '#666', marginTop: 8 }}>Total Containers</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>{stats.pending}</div>
            <div style={{ color: '#666', marginTop: 8 }}>Pending Containers</div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>{stats.received}</div>
            <div style={{ color: '#666', marginTop: 8 }}>Received Containers</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', marginBottom: 16 }}>
          <Input
            placeholder="Container or Case number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onPressEnter={fetchARNs}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
            style={{ width: 200 }}
            allowClear
          >
            <Select.Option value="pending">Pending</Select.Option>
            <Select.Option value="processed">Processed</Select.Option>
            <Select.Option value="completed">Completed</Select.Option>
          </Select>
          <Button onClick={fetchARNs}>Search</Button>
        </Space>
      </Card>

      {/* ARN Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={arnData}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* Container Cases Modal */}
      <Modal
        title={`Container Cases: ${selectedContainer?.containerNo || ''}`}
        open={caseModalVisible}
        onCancel={() => {
          setCaseModalVisible(false)
          setSelectedContainer(null)
          setContainerCases([])
        }}
        width={800}
        footer={null}
      >
        <Table
          columns={caseColumns}
          dataSource={containerCases}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </div>
  )
}

export default ARNManagement

