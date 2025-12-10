import { useState, useEffect } from 'react'
import { Table, Button, message, Modal, Form, Input, Select, DatePicker, Space, Tag, Tabs, Descriptions, Divider, InputNumber, Card } from 'antd'
import { PlusOutlined, EyeOutlined, CheckOutlined, SendOutlined, DollarCircleOutlined, DownloadOutlined, FileSearchOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'

const { RangePicker } = DatePicker

interface Invoice {
  _id: string
  invoiceNumber: string
  project?: {
    _id: string
    projectCode: string
    projectName: string
  }
  customer?: {
    _id: string
    name: string
  }
  periodMonth: string
  totalAmount: number
  currency: string
  status: 'draft' | 'approved' | 'sent' | 'paid' | 'cancelled' | 'overdue'
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded'
  invoiceDate: string
  dueDate: string
  items?: InvoiceItem[]
  ar?: {
    _id: string
    arNumber: string
    remainingAmount: number
    paymentStatus: 'unpaid' | 'partial' | 'paid'
    status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  }
}

interface InvoiceItem {
  _id: string
  lineNumber: number
  description: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
}

interface Project {
  _id: string
  projectCode: string
  projectName: string
}

interface MasterBillingRule {
  _id: string
  project: {
    _id: string
    projectCode: string
    projectName: string
  }
  items: Array<{
    isFixed: boolean
    itemName: string
    quantity: number
    unit: string
    unitPrice: number
    amount: number
  }>
  isActive: boolean
}

interface InvoiceItemInput {
  isFixed: boolean
  itemName: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
}

const Invoices = () => {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [generateModalVisible, setGenerateModalVisible] = useState(false)
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [form] = Form.useForm()
  const [masterBillingRule, setMasterBillingRule] = useState<MasterBillingRule | null>(null)
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemInput[]>([])
  const [loadingRule, setLoadingRule] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetchInvoices()
    fetchProjects()
  }, [])

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const response = await api.get('/invoices')
      const invoicesData = response.data
      
      // 각 인보이스에 대한 AR 정보 가져오기
      const invoicesWithAR = await Promise.all(
        invoicesData.map(async (invoice: Invoice) => {
          try {
            const arResponse = await api.get('/accounts-receivable', {
              params: { invoiceId: invoice._id }
            })
            if (arResponse.data && arResponse.data.length > 0) {
              invoice.ar = arResponse.data[0]
            }
          } catch (error) {
            // AR이 없을 수도 있음
          }
          return invoice
        })
      )
      
      setInvoices(invoicesWithAR)
    } catch (error) {
      message.error('인보이스 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects?status=active')
      setProjects(response.data)
    } catch (error) {
      console.error('프로젝트 목록을 불러오는데 실패했습니다')
    }
  }

  const handleGenerate = () => {
    form.resetFields()
    setPreviewData(null)
    setMasterBillingRule(null)
    setInvoiceItems([])
    setSelectedProjectId(undefined)
    setGenerateModalVisible(true)
  }

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId)
    if (!projectId) {
      setMasterBillingRule(null)
      setInvoiceItems([])
      return
    }

    setLoadingRule(true)
    try {
      const response = await api.get('/master-billing-rules', {
        params: { projectId, isActive: 'true' }
      })
      
      if (response.data && response.data.length > 0) {
        const rule = response.data[0] // 첫 번째 활성 규칙 사용
        setMasterBillingRule(rule)
        
        // 마스터 규칙의 항목들을 인보이스 항목으로 변환
        const items: InvoiceItemInput[] = rule.items.map((item: any) => ({
          isFixed: item.isFixed,
          itemName: item.itemName,
          quantity: item.isFixed ? 1 : (item.quantity || 0),
          unit: item.unit || 'EA',
          unitPrice: item.unitPrice,
          amount: item.isFixed ? item.unitPrice : (item.quantity || 0) * item.unitPrice,
        }))
        setInvoiceItems(items)
      } else {
        setMasterBillingRule(null)
        setInvoiceItems([])
        message.warning('해당 프로젝트에 활성화된 마스터 청구 규칙이 없습니다.')
      }
    } catch (error: any) {
      console.error('마스터 청구 규칙 불러오기 실패:', error)
      setMasterBillingRule(null)
      setInvoiceItems([])
    } finally {
      setLoadingRule(false)
    }
  }

  const handlePreview = async () => {
    try {
      const values = await form.validateFields(['projectId', 'period'])
      if (!values.projectId || !values.period) {
        message.warning('프로젝트와 기간을 선택하세요')
        return
      }

      setPreviewLoading(true)
      const [startDate, endDate] = values.period
      const response = await api.post('/invoices/preview', {
        projectId: values.projectId,
        periodStart: startDate.format('YYYY-MM-DD'),
        periodEnd: endDate.format('YYYY-MM-DD'),
      })
      setPreviewData(response.data)
      setPreviewModalVisible(true)
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation error
        return
      }
      message.error(error.response?.data?.message || '미리보기를 불러오는데 실패했습니다')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleGenerateSubmit = async (values: any) => {
    try {
      if (!invoiceItems || invoiceItems.length === 0) {
        message.warning('인보이스 항목이 없습니다. 마스터 청구 규칙을 확인하세요.')
        return
      }

      const [startDate, endDate] = values.period
      // periodMonth는 시작일의 년월로 자동 설정
      const periodMonth = startDate.format('YYYY-MM')
      
      // 수량이 입력된 항목만 필터링
      const validItems = invoiceItems.filter(item => {
        if (item.isFixed) return true
        return item.quantity > 0 && item.itemName.trim() !== ''
      })

      if (validItems.length === 0) {
        message.warning('유효한 인보이스 항목이 없습니다.')
        return
      }

      const response = await api.post('/invoices/generate', {
        projectId: values.projectId,
        periodMonth,
        periodStart: startDate.format('YYYY-MM-DD'),
        periodEnd: endDate.format('YYYY-MM-DD'),
        userId: 'system', // TODO: 실제 사용자 ID
        items: validItems.map(item => ({
          isFixed: item.isFixed,
          itemName: item.itemName,
          quantity: item.isFixed ? 1 : item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
        })),
      })
      message.success('인보이스가 생성되었습니다')
      setGenerateModalVisible(false)
      setPreviewModalVisible(false)
      setPreviewData(null)
      setMasterBillingRule(null)
      setInvoiceItems([])
      fetchInvoices()
    } catch (error: any) {
      message.error(error.response?.data?.message || '인보이스 생성에 실패했습니다')
    }
  }

  const handleQuantityChange = (index: number, quantity: number) => {
    const updatedItems = [...invoiceItems]
    const item = updatedItems[index]
    if (!item.isFixed) {
      item.quantity = quantity
      item.amount = quantity * item.unitPrice
      setInvoiceItems(updatedItems)
    }
  }

  const handleViewDetail = async (invoice: Invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice._id}`)
      const invoiceData = response.data
      
      // AR 정보 가져오기
      try {
        const arResponse = await api.get('/accounts-receivable', {
          params: { invoiceId: invoice._id }
        })
        if (arResponse.data && arResponse.data.length > 0) {
          invoiceData.ar = arResponse.data[0]
        }
      } catch (error) {
        // AR이 없을 수도 있음
      }
      
      setSelectedInvoice(invoiceData)
      setDetailModalVisible(true)
    } catch (error) {
      message.error('인보이스 상세 정보를 불러오는데 실패했습니다')
    }
  }

  const handleViewAR = (invoice: Invoice) => {
    if (invoice.ar) {
      navigate(`/sales/ar?arId=${invoice.ar._id}`)
    } else {
      navigate('/sales/ar')
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/invoices/${id}/approve`, { userId: 'system' })
      message.success('인보이스가 승인되었습니다')
      fetchInvoices()
    } catch (error) {
      message.error('인보이스 승인에 실패했습니다')
    }
  }

  const handleSend = async (id: string) => {
    try {
      await api.patch(`/invoices/${id}/send`)
      message.success('인보이스가 발송되었습니다')
      fetchInvoices()
    } catch (error) {
      message.error('인보이스 발송에 실패했습니다')
    }
  }

  const handleDownloadPDF = async () => {
    if (!selectedInvoice) return

    try {
      // html2pdf 동적 import
      const html2pdf = (await import('html2pdf.js')).default

      // HTML 콘텐츠 생성
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
              padding: 40px;
              background: #fff;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid #1890ff;
            }
            .header h1 {
              color: #1890ff;
              font-size: 32px;
              margin-bottom: 10px;
              font-weight: bold;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-section {
              flex: 1;
            }
            .info-section h3 {
              color: #1890ff;
              margin-bottom: 15px;
              font-size: 18px;
            }
            .info-item {
              margin-bottom: 8px;
              font-size: 14px;
            }
            .info-item strong {
              display: inline-block;
              width: 120px;
              color: #666;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .items-table thead {
              background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
              color: white;
            }
            .items-table th {
              padding: 12px;
              text-align: left;
              font-weight: bold;
              border: 1px solid #e8e8e8;
            }
            .items-table td {
              padding: 12px;
              border: 1px solid #e8e8e8;
              background: white;
            }
            .items-table tbody tr:nth-child(even) {
              background: #fafafa;
            }
            .total-section {
              margin-top: 30px;
              text-align: right;
            }
            .total-row {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .total-row strong {
              display: inline-block;
              width: 150px;
              text-align: right;
              margin-right: 20px;
            }
            .total-row.final {
              font-size: 20px;
              font-weight: bold;
              color: #1890ff;
              border-top: 2px solid #1890ff;
              padding-top: 10px;
              margin-top: 10px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e8e8e8;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <div style="color: #666; font-size: 14px;">Invoice Number: ${selectedInvoice.invoiceNumber}</div>
          </div>

          <div class="invoice-info">
            <div class="info-section">
              <h3>Bill To</h3>
              <div class="info-item"><strong>고객:</strong> ${selectedInvoice.customer?.name || '-'}</div>
              <div class="info-item"><strong>회사:</strong> ${selectedInvoice.customer?.company || '-'}</div>
              ${selectedInvoice.customer?.email ? `<div class="info-item"><strong>이메일:</strong> ${selectedInvoice.customer.email}</div>` : ''}
            </div>
            <div class="info-section">
              <h3>Project Information</h3>
              <div class="info-item"><strong>프로젝트:</strong> ${selectedInvoice.project?.projectCode || '-'} - ${selectedInvoice.project?.projectName || '-'}</div>
              <div class="info-item"><strong>청구 기간:</strong> ${selectedInvoice.periodMonth || '-'}</div>
              <div class="info-item"><strong>인보이스 일자:</strong> ${dayjs(selectedInvoice.invoiceDate).format('YYYY-MM-DD')}</div>
              <div class="info-item"><strong>만기일:</strong> ${dayjs(selectedInvoice.dueDate).format('YYYY-MM-DD')}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 60px;">라인</th>
                <th>설명</th>
                <th style="width: 100px; text-align: right;">수량</th>
                <th style="width: 80px;">단위</th>
                <th style="width: 120px; text-align: right;">단가</th>
                <th style="width: 120px; text-align: right;">금액</th>
              </tr>
            </thead>
            <tbody>
      `

      if (selectedInvoice.items && selectedInvoice.items.length > 0) {
        selectedInvoice.items.forEach((item: InvoiceItem) => {
          htmlContent += `
            <tr>
              <td>${item.lineNumber}</td>
              <td>${item.description}</td>
              <td style="text-align: right;">${item.quantity.toLocaleString()}</td>
              <td>${item.unit}</td>
              <td style="text-align: right;">${item.unitPrice.toLocaleString()}</td>
              <td style="text-align: right;">${item.amount.toLocaleString()}</td>
            </tr>
          `
        })
      } else {
        htmlContent += `
          <tr>
            <td colspan="6" style="text-align: center; padding: 20px; color: #999;">항목이 없습니다</td>
          </tr>
        `
      }

      htmlContent += `
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <strong>소계:</strong>
              <span>${selectedInvoice.subtotal?.toLocaleString() || selectedInvoice.totalAmount.toLocaleString()} ${selectedInvoice.currency}</span>
            </div>
            ${selectedInvoice.tax ? `
            <div class="total-row">
              <strong>세금 (10%):</strong>
              <span>${selectedInvoice.tax.toLocaleString()} ${selectedInvoice.currency}</span>
            </div>
            ` : ''}
            ${selectedInvoice.discount ? `
            <div class="total-row">
              <strong>할인:</strong>
              <span>-${selectedInvoice.discount.toLocaleString()} ${selectedInvoice.currency}</span>
            </div>
            ` : ''}
            <div class="total-row final">
              <strong>총액:</strong>
              <span>${selectedInvoice.totalAmount.toLocaleString()} ${selectedInvoice.currency}</span>
            </div>
          </div>

          ${selectedInvoice.ar ? `
          <div style="margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 4px;">
            <h3 style="color: #1890ff; margin-bottom: 10px;">AR 정보</h3>
            <div class="info-item"><strong>AR 번호:</strong> ${selectedInvoice.ar.arNumber}</div>
            <div class="info-item"><strong>AR 상태:</strong> ${selectedInvoice.ar.paymentStatus === 'paid' ? '완납' : selectedInvoice.ar.paymentStatus === 'partial' ? '부분수금' : '미수금'}</div>
            <div class="info-item"><strong>미수금:</strong> ${selectedInvoice.ar.remainingAmount.toLocaleString()} ${selectedInvoice.currency}</div>
          </div>
          ` : ''}

          <div class="footer">
            <p>본 인보이스는 시스템에서 자동으로 생성되었습니다.</p>
            <p>LEEHWA ERP System - Invoice Management</p>
            <p>생성일: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
          </div>
        </body>
        </html>
      `

      // HTML 요소 생성
      const element = document.createElement('div')
      element.innerHTML = htmlContent
      // 요소를 화면에 보이게 하지만 사용자에게는 보이지 않게
      element.style.position = 'fixed'
      element.style.top = '0'
      element.style.left = '0'
      element.style.width = '210mm'
      element.style.maxWidth = '210mm'
      element.style.backgroundColor = 'white'
      element.style.zIndex = '9999'
      element.style.opacity = '0'
      element.style.pointerEvents = 'none'
      document.body.appendChild(element)

      // 약간의 지연을 주어 렌더링 완료 대기
      await new Promise(resolve => setTimeout(resolve, 100))

      // PDF 옵션 설정
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Invoice_${selectedInvoice.invoiceNumber}_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          letterRendering: true,
          backgroundColor: '#ffffff',
          windowWidth: 794, // A4 width in pixels at 96 DPI
          windowHeight: element.scrollHeight
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }

      // PDF 생성 및 다운로드
      try {
        await html2pdf()
          .set(opt)
          .from(element)
          .save()
        
        // 요소 제거
        document.body.removeChild(element)
        message.success('PDF 인보이스가 다운로드되었습니다')
      } catch (error: any) {
        // 에러 발생 시에도 요소 제거
        if (document.body.contains(element)) {
          document.body.removeChild(element)
        }
        console.error('PDF 생성 오류:', error)
        message.error('PDF 생성 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'))
      }
    } catch (error: any) {
      console.error('PDF 다운로드 오류:', error)
      message.error('PDF 다운로드 중 오류가 발생했습니다')
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'default',
    approved: 'processing',
    sent: 'warning',
    paid: 'success',
    cancelled: 'error',
    overdue: 'error',
  }

  const statusLabels: Record<string, string> = {
    draft: '초안',
    approved: '승인됨',
    sent: '발송됨',
    paid: '결제완료',
    cancelled: '취소됨',
    overdue: '연체',
  }

  const columns: ColumnsType<Invoice> = [
    {
      title: '인보이스 번호',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
    },
    {
      title: '프로젝트',
      key: 'project',
      render: (_, record) => record.project?.projectCode || '-',
    },
    {
      title: '고객',
      key: 'customer',
      render: (_, record) => record.customer?.name || '-',
    },
    {
      title: '청구 기간',
      dataIndex: 'periodMonth',
      key: 'periodMonth',
    },
    {
      title: '총액',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount, record) => `${amount.toLocaleString()} ${record.currency}`,
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
      title: 'AR 상태',
      key: 'ar',
      render: (_, record) => {
        if (!record.ar) {
          return record.status === 'approved' || record.status === 'sent' ? (
            <Tag color="orange">AR 미생성</Tag>
          ) : (
            <Tag>-</Tag>
          )
        }
        const arStatusColors: Record<string, string> = {
          unpaid: 'red',
          partial: 'orange',
          paid: 'green',
        }
        const arStatusLabels: Record<string, string> = {
          unpaid: '미수금',
          partial: '부분수금',
          paid: '완납',
        }
        return (
          <Tag color={arStatusColors[record.ar.paymentStatus]}>
            {arStatusLabels[record.ar.paymentStatus]}
            {record.ar.remainingAmount > 0 && (
              <span style={{ marginLeft: 4 }}>
                ({record.ar.remainingAmount.toLocaleString()} {record.currency})
              </span>
            )}
          </Tag>
        )
      },
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
          {(record.status === 'approved' || record.status === 'sent') && record.ar && (
            <Button
              type="link"
              icon={<DollarCircleOutlined />}
              onClick={() => handleViewAR(record)}
            >
              AR 보기
            </Button>
          )}
          {record.status === 'draft' && (
            <Button
              type="link"
              icon={<CheckOutlined />}
              onClick={() => handleApprove(record._id)}
            >
              승인
            </Button>
          )}
          {record.status === 'approved' && (
            <Button
              type="link"
              icon={<SendOutlined />}
              onClick={() => handleSend(record._id)}
            >
              발송
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>인보이스 관리</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleGenerate}>
          인보이스 생성
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={invoices}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="인보이스 생성"
        open={generateModalVisible}
        onCancel={() => {
          setGenerateModalVisible(false)
          setPreviewData(null)
          setSelectedProjectId(undefined)
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setGenerateModalVisible(false)
            setPreviewData(null)
            setSelectedProjectId(undefined)
          }}>
            취소
          </Button>,
          <Button key="preview" icon={<FileSearchOutlined />} onClick={handlePreview} loading={previewLoading}>
            미리보기
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            생성
          </Button>,
        ]}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGenerateSubmit}
        >
          <Form.Item
            name="projectId"
            label="프로젝트"
            rules={[{ required: true, message: '프로젝트를 선택하세요' }]}
          >
            <Select 
              placeholder="프로젝트 선택"
              onChange={handleProjectChange}
              loading={loadingRule}
            >
              {projects.map((project) => (
                <Select.Option key={project._id} value={project._id}>
                  {project.projectCode} - {project.projectName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {masterBillingRule && invoiceItems.length > 0 && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>마스터 청구 규칙 항목</strong>
                <span style={{ marginLeft: 8, color: '#999', fontSize: '12px' }}>
                  (수량을 입력하세요)
                </span>
              </div>
              <Table
                dataSource={invoiceItems}
                rowKey={(record, index) => `item-${index}`}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: '항목명',
                    dataIndex: 'itemName',
                    key: 'itemName',
                    width: 300,
                  },
                  {
                    title: '유형',
                    key: 'isFixed',
                    width: 80,
                    render: (_, record) => (
                      <Tag color={record.isFixed ? 'blue' : 'green'}>
                        {record.isFixed ? '고정' : '변동'}
                      </Tag>
                    ),
                  },
                  {
                    title: '수량',
                    key: 'quantity',
                    width: 120,
                    render: (_, record, index) => {
                      if (record.isFixed) {
                        return <span>1</span>
                      }
                      return (
                        <InputNumber
                          min={0}
                          value={record.quantity}
                          onChange={(value) => handleQuantityChange(index, value || 0)}
                          style={{ width: '100%' }}
                        />
                      )
                    },
                  },
                  {
                    title: '단위',
                    dataIndex: 'unit',
                    key: 'unit',
                    width: 100,
                  },
                  {
                    title: '단가',
                    dataIndex: 'unitPrice',
                    key: 'unitPrice',
                    width: 120,
                    align: 'right',
                    render: (price) => price.toLocaleString(),
                  },
                  {
                    title: '금액',
                    dataIndex: 'amount',
                    key: 'amount',
                    width: 120,
                    align: 'right',
                    render: (amount, record) => {
                      const calculatedAmount = record.isFixed 
                        ? record.unitPrice 
                        : record.quantity * record.unitPrice
                      return <strong>{calculatedAmount.toLocaleString()}</strong>
                    },
                  },
                ]}
              />
              <div style={{ marginTop: 8, textAlign: 'right', fontWeight: 'bold' }}>
                총액: {invoiceItems.reduce((sum, item) => {
                  const amount = item.isFixed ? item.unitPrice : (item.quantity * item.unitPrice)
                  return sum + amount
                }, 0).toLocaleString()}
              </div>
            </Card>
          )}

          {masterBillingRule === null && selectedProjectId && !loadingRule && (
            <div style={{ padding: '12px', backgroundColor: '#fff7e6', borderRadius: '4px', marginBottom: 16 }}>
              <span style={{ color: '#fa8c16' }}>⚠️ 해당 프로젝트에 활성화된 마스터 청구 규칙이 없습니다.</span>
            </div>
          )}
          <Form.Item
            name="period"
            label="청구 기간"
            rules={[{ required: true, message: '청구 기간을 선택하세요' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`인보이스 상세 - ${selectedInvoice?.invoiceNumber}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={handleDownloadPDF}>
            PDF 다운로드
          </Button>,
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            닫기
          </Button>
        ]}
        width={800}
      >
        {selectedInvoice && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p><strong>프로젝트:</strong> {selectedInvoice.project?.projectCode} - {selectedInvoice.project?.projectName}</p>
              <p><strong>고객:</strong> {selectedInvoice.customer?.name}</p>
              <p><strong>청구 기간:</strong> {selectedInvoice.periodMonth}</p>
              <p><strong>총액:</strong> {selectedInvoice.totalAmount.toLocaleString()} {selectedInvoice.currency}</p>
              <p><strong>상태:</strong> <Tag color={statusColors[selectedInvoice.status]}>{statusLabels[selectedInvoice.status]}</Tag></p>
              {selectedInvoice.ar && (
                <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                  <p style={{ marginBottom: 8 }}><strong>AR 정보:</strong></p>
                  <p><strong>AR 번호:</strong> {selectedInvoice.ar.arNumber}</p>
                  <p><strong>AR 상태:</strong> 
                    <Tag color={selectedInvoice.ar.paymentStatus === 'paid' ? 'green' : selectedInvoice.ar.paymentStatus === 'partial' ? 'orange' : 'red'} style={{ marginLeft: 8 }}>
                      {selectedInvoice.ar.paymentStatus === 'paid' ? '완납' : selectedInvoice.ar.paymentStatus === 'partial' ? '부분수금' : '미수금'}
                    </Tag>
                  </p>
                  <p><strong>미수금:</strong> 
                    <span style={{ color: selectedInvoice.ar.remainingAmount > 0 ? 'red' : 'green', fontWeight: 'bold', marginLeft: 8 }}>
                      {selectedInvoice.ar.remainingAmount.toLocaleString()} {selectedInvoice.currency}
                    </span>
                  </p>
                  <Button
                    type="link"
                    icon={<DollarCircleOutlined />}
                    onClick={() => {
                      setDetailModalVisible(false)
                      handleViewAR(selectedInvoice)
                    }}
                    style={{ padding: 0, marginTop: 8 }}
                  >
                    AR 상세 보기
                  </Button>
                </div>
              )}
            </div>
            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
              <Table
                columns={[
                  { title: '라인', dataIndex: 'lineNumber', key: 'lineNumber', width: 60 },
                  { title: '설명', dataIndex: 'description', key: 'description' },
                  { title: '수량', dataIndex: 'quantity', key: 'quantity', width: 100 },
                  { title: '단위', dataIndex: 'unit', key: 'unit', width: 80 },
                  { title: '단가', dataIndex: 'unitPrice', key: 'unitPrice', width: 100, render: (price) => price.toLocaleString() },
                  { title: '금액', dataIndex: 'amount', key: 'amount', width: 120, render: (amount) => amount.toLocaleString() },
                ]}
                dataSource={selectedInvoice.items}
                rowKey="_id"
                pagination={false}
                size="small"
              />
            )}
          </div>
        )}
      </Modal>

      {/* 미리보기 모달 */}
      <Modal
        title="인보이스 미리보기"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            닫기
          </Button>,
          <Button key="generate" type="primary" onClick={() => {
            setPreviewModalVisible(false)
            form.submit()
          }}>
            인보이스 생성
          </Button>,
        ]}
        width={1000}
      >
        {previewData && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="프로젝트">
                {previewData.project?.projectCode} - {previewData.project?.projectName}
              </Descriptions.Item>
              <Descriptions.Item label="기간">
                {dayjs(previewData.periodStart).format('YYYY-MM-DD')} ~ {dayjs(previewData.periodEnd).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="출하 건수">
                {previewData.performanceData?.deliveryCount || 0}건
              </Descriptions.Item>
              <Descriptions.Item label="노무 로그 건수">
                {previewData.performanceData?.laborLogCount || 0}건
              </Descriptions.Item>
              <Descriptions.Item label="활성 규칙">
                {previewData.activeRules?.length || 0}개
              </Descriptions.Item>
              <Descriptions.Item label="Invoice 라인 수">
                {previewData.summary?.lineCount || 0}개
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Tabs
              items={[
                {
                  key: 'invoice-lines',
                  label: `Invoice 라인 (${previewData.invoiceLines?.length || 0})`,
                  children: (
                    <Table
                      dataSource={previewData.invoiceLines || []}
                      rowKey={(record, index) => `${record.ruleId}-${index}`}
                      pagination={false}
                      size="small"
                      columns={[
                        { title: '설명', dataIndex: 'description', key: 'description' },
                        { title: '수량', dataIndex: 'quantity', key: 'quantity', align: 'right' },
                        { title: '단위', dataIndex: 'unit', key: 'unit' },
                        {
                          title: '단가',
                          dataIndex: 'unitPrice',
                          key: 'unitPrice',
                          align: 'right',
                          render: (price) => price?.toLocaleString() || '0',
                        },
                        {
                          title: '금액',
                          dataIndex: 'amount',
                          key: 'amount',
                          align: 'right',
                          render: (amount) => amount?.toLocaleString() || '0',
                        },
                        {
                          title: '규칙 유형',
                          dataIndex: 'ruleType',
                          key: 'ruleType',
                          render: (type) => <Tag>{type}</Tag>,
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: 'deliveries',
                  label: `출하 실적 (${previewData.performanceData?.deliveryCount || 0})`,
                  children: (
                    <Table
                      dataSource={previewData.performanceData?.deliveries || []}
                      rowKey="_id"
                      pagination={false}
                      size="small"
                      columns={[
                        { title: '출하번호', dataIndex: 'deliveryNumber', key: 'deliveryNumber' },
                        {
                          title: '출하일',
                          dataIndex: 'deliveryDate',
                          key: 'deliveryDate',
                          render: (date) => dayjs(date).format('YYYY-MM-DD'),
                        },
                        { title: '부품번호', dataIndex: 'partNo', key: 'partNo' },
                        { title: '부품명', dataIndex: 'partName', key: 'partName' },
                        {
                          title: '수량',
                          dataIndex: 'quantity',
                          key: 'quantity',
                          align: 'right',
                        },
                        { title: '단위', dataIndex: 'unit', key: 'unit' },
                      ]}
                    />
                  ),
                },
                {
                  key: 'labor-logs',
                  label: `노무 실적 (${previewData.performanceData?.laborLogCount || 0})`,
                  children: (
                    <Table
                      dataSource={previewData.performanceData?.laborLogs || []}
                      rowKey="_id"
                      pagination={false}
                      size="small"
                      columns={[
                        { title: '로그번호', dataIndex: 'logNumber', key: 'logNumber' },
                        {
                          title: '작업일',
                          dataIndex: 'workDate',
                          key: 'workDate',
                          render: (date) => dayjs(date).format('YYYY-MM-DD'),
                        },
                        { title: '작업유형', dataIndex: 'workType', key: 'workType' },
                        { title: '설명', dataIndex: 'workDescription', key: 'workDescription' },
                        {
                          title: '시간',
                          dataIndex: 'hours',
                          key: 'hours',
                          align: 'right',
                        },
                        {
                          title: '단가',
                          dataIndex: 'laborRate',
                          key: 'laborRate',
                          align: 'right',
                          render: (rate) => rate?.toLocaleString() || '-',
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: 'rules',
                  label: `활성 규칙 (${previewData.activeRules?.length || 0})`,
                  children: (
                    <Table
                      dataSource={previewData.activeRules || []}
                      rowKey="_id"
                      pagination={false}
                      size="small"
                      columns={[
                        { title: '규칙명', dataIndex: 'ruleName', key: 'ruleName' },
                        {
                          title: '규칙 유형',
                          dataIndex: 'ruleType',
                          key: 'ruleType',
                          render: (type) => <Tag>{type}</Tag>,
                        },
                        { title: '단위', dataIndex: 'unitBasis', key: 'unitBasis' },
                        { title: '가격 출처', dataIndex: 'priceSource', key: 'priceSource' },
                        {
                          title: '우선순위',
                          dataIndex: 'priority',
                          key: 'priority',
                          align: 'right',
                        },
                        {
                          title: '상태',
                          dataIndex: 'isActive',
                          key: 'isActive',
                          render: (isActive) => (
                            <Tag color={isActive ? 'green' : 'red'}>
                              {isActive ? '활성' : '비활성'}
                            </Tag>
                          ),
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />

            <Divider />

            <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: 'bold' }}>
              <Space size="large">
                <span>소계: {previewData.summary?.subtotal?.toLocaleString() || '0'}</span>
                <span>세금 (10%): {previewData.summary?.tax?.toLocaleString() || '0'}</span>
                <span style={{ color: '#1890ff', fontSize: '18px' }}>
                  총액: {previewData.summary?.totalAmount?.toLocaleString() || '0'}
                </span>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Invoices

