import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Space, Tag, Select, Upload, List } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, PaperClipOutlined, DownloadOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'

const { TextArea } = Input

interface Supplier {
  _id?: string
  supplierCode: string
  name: string
  email?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  contactPerson?: string
  paymentTerms?: string
  category?: 'asset' | 'equipment' | 'parts' | 'service' | 'other'
  paymentMethod?: 'ACH' | 'WIRE' | 'Check' | 'Bank Transfer' | 'Credit Card' | 'Cash' | 'Other'
  bankInfo?: {
    bankName?: string
    accountNumber?: string
    routingNumber?: string
    swiftCode?: string
    accountHolderName?: string
    bankAddress?: string
    currency?: string
  }
  attachments?: Array<{
    fileName: string
    filePath?: string
    fileSize?: number
    fileType?: 'VOID_CHECK' | 'W9' | 'BANK_LETTER' | 'OTHER'
    uploadedAt: string
  }>
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined)
  const [filterActive, setFilterActive] = useState<string | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    fetchSuppliers()
  }, [filterCategory, filterActive, searchTerm])

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterCategory) params.category = filterCategory
      if (filterActive !== undefined) params.isActive = filterActive
      if (searchTerm) params.search = searchTerm

      const response = await api.get('/suppliers', { params })
      setSuppliers(response.data || [])
    } catch (error) {
      message.error('공급업체 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    form.resetFields()
    setFileList([])
    form.setFieldsValue({
      isActive: true,
    })
    setEditingSupplier(null)
    setModalVisible(true)
  }

  const handleEdit = (supplier: Supplier) => {
    form.setFieldsValue({
      ...supplier,
      address: supplier.address ? {
        street: supplier.address.street || '',
        city: supplier.address.city || '',
        state: supplier.address.state || '',
        zipCode: supplier.address.zipCode || '',
        country: supplier.address.country || '',
      } : undefined,
      bankInfo: supplier.bankInfo ? {
        bankName: supplier.bankInfo.bankName || '',
        accountNumber: supplier.bankInfo.accountNumber || '',
        routingNumber: supplier.bankInfo.routingNumber || '',
        swiftCode: supplier.bankInfo.swiftCode || '',
        accountHolderName: supplier.bankInfo.accountHolderName || '',
        bankAddress: supplier.bankInfo.bankAddress || '',
        currency: supplier.bankInfo.currency || '',
      } : undefined,
    })
    
    // 첨부파일 목록 설정
    if (supplier.attachments && supplier.attachments.length > 0) {
      const files: UploadFile[] = supplier.attachments.map((att, index) => ({
        uid: `-${index}`,
        name: att.fileName,
        status: 'done',
        url: `/api/suppliers/${supplier._id}/attachments/${index}/download`,
      }))
      setFileList(files)
    } else {
      setFileList([])
    }
    
    setEditingSupplier(supplier)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/suppliers/${id}`)
      message.success('공급업체가 비활성화되었습니다')
      fetchSuppliers()
    } catch (error: any) {
      message.error(error.response?.data?.message || '공급업체 삭제에 실패했습니다')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        isActive: values.isActive !== undefined ? values.isActive : true,
        address: values.address && Object.values(values.address).some((v: any) => v) 
          ? values.address 
          : undefined,
        bankInfo: values.bankInfo && Object.values(values.bankInfo).some((v: any) => v) 
          ? values.bankInfo 
          : undefined,
      }

      let supplierId: string
      if (editingSupplier?._id) {
        await api.put(`/suppliers/${editingSupplier._id}`, submitData)
        supplierId = editingSupplier._id
        message.success('공급업체가 수정되었습니다')
      } else {
        const response = await api.post('/suppliers', submitData)
        supplierId = response.data._id
        message.success('공급업체가 등록되었습니다')
      }

      // 파일 업로드
      if (fileList.length > 0) {
        const uploadPromises = fileList
          .filter((file) => file.originFileObj)
          .map((file) => {
            const formData = new FormData()
            formData.append('file', file.originFileObj!)
            // 파일 타입 설정 (fileType이 있으면 사용, 없으면 OTHER)
            const fileType = (file as any).fileType || 'OTHER'
            formData.append('fileType', fileType)
            return api.post(`/suppliers/${supplierId}/attachments`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          })
        await Promise.all(uploadPromises)
      }

      setModalVisible(false)
      fetchSuppliers()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '공급업체 저장에 실패했습니다'
      message.error(errorMessage)
    }
  }

  const handleFileChange = (info: { fileList: UploadFile[] }) => {
    setFileList(info.fileList)
  }

  const handleFileRemove = async (file: UploadFile) => {
    if (editingSupplier?._id && file.uid.startsWith('-')) {
      // 기존 첨부파일 삭제
      const index = parseInt(file.uid.replace('-', ''))
      try {
        await api.delete(`/suppliers/${editingSupplier._id}/attachments/${index}`)
        message.success('첨부파일이 삭제되었습니다')
      } catch (error: any) {
        message.error(error.response?.data?.message || '첨부파일 삭제에 실패했습니다')
      }
    }
    return true
  }

  const handleDownloadAttachment = async (supplierId: string, attachmentIndex: number, fileName: string) => {
    try {
      const response = await api.get(`/suppliers/${supplierId}/attachments/${attachmentIndex}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      message.success('파일이 다운로드되었습니다')
    } catch (error) {
      message.error('파일 다운로드에 실패했습니다')
    }
  }

  const columns: ColumnsType<Supplier> = [
    {
      title: '코드',
      dataIndex: 'supplierCode',
      key: 'supplierCode',
      width: 100,
      fixed: 'left',
    },
    {
      title: '공급업체명',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const categories: Record<string, { text: string; color: string }> = {
          asset: { text: '장비', color: 'blue' },
          equipment: { text: '설비', color: 'green' },
          parts: { text: '부속품', color: 'orange' },
          service: { text: '서비스', color: 'purple' },
          other: { text: '기타', color: 'default' },
        }
        const cat = categories[category]
        return cat ? <Tag color={cat.color}>{cat.text}</Tag> : '-'
      },
    },
    {
      title: '담당자',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      width: 150,
    },
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '전화번호',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: '결제 조건',
      dataIndex: 'paymentTerms',
      key: 'paymentTerms',
      width: 150,
    },
    {
      title: '지급 방법',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method: string) => {
        const methods: Record<string, string> = {
          ACH: 'ACH',
          WIRE: 'WIRE',
          Check: '수표',
          'Bank Transfer': '계좌이체',
          'Credit Card': '신용카드',
          Cash: '현금',
          Other: '기타',
        }
        return method ? methods[method] || method : '-'
      },
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '활성' : '비활성'}
        </Tag>
      ),
    },
    {
      title: '작업',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            수정
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              if (record._id && window.confirm('정말 비활성화하시겠습니까?')) {
                handleDelete(record._id)
              }
            }}
          >
            삭제
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>공급업체 관리</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          공급업체 등록
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="검색 (코드, 이름, 이메일, 담당자, 전화번호)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Select
          placeholder="카테고리"
          value={filterCategory}
          onChange={setFilterCategory}
          allowClear
          style={{ width: 120 }}
        >
          <Select.Option value="asset">장비</Select.Option>
          <Select.Option value="equipment">설비</Select.Option>
          <Select.Option value="parts">부속품</Select.Option>
          <Select.Option value="service">서비스</Select.Option>
          <Select.Option value="other">기타</Select.Option>
        </Select>
        <Select
          placeholder="상태"
          value={filterActive}
          onChange={setFilterActive}
          allowClear
          style={{ width: 120 }}
        >
          <Select.Option value="true">활성</Select.Option>
          <Select.Option value="false">비활성</Select.Option>
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={suppliers}
        loading={loading}
        rowKey="_id"
        locale={{ emptyText: '등록된 공급업체가 없습니다' }}
      />

      <Modal
        title={editingSupplier ? '공급업체 수정' : '공급업체 등록'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onFieldsChange={(changedFields) => {
            // 카테고리 변경 시 코드 자동 생성 (신규 등록일 때만)
            if (!editingSupplier && changedFields.some(field => field.name[0] === 'category')) {
              const category = form.getFieldValue('category')
              const currentCode = form.getFieldValue('supplierCode')
              // 수동으로 코드를 입력하지 않은 경우에만 자동 생성
              if (category && !currentCode) {
                const prefixMap: Record<string, string> = {
                  asset: 'A',
                  equipment: 'B',
                  parts: 'C',
                  service: 'D',
                  other: 'E',
                }
                const prefix = prefixMap[category] || 'E'
                // 자동 생성은 백엔드에서 처리하므로 여기서는 힌트만 표시
                form.setFieldsValue({ supplierCode: '' })
              }
            }
          }}
        >
          <Form.Item
            name="supplierCode"
            label="공급업체 코드"
            tooltip={editingSupplier ? "코드를 수정할 수 있습니다 (예: A001, B001)" : "카테고리 선택 시 자동 생성되거나 수동으로 입력하세요 (예: A001, B001)"}
            rules={[
              { 
                pattern: /^[A-Z]\d{3}$/, 
                message: '코드 형식이 올바르지 않습니다. (예: A001, B001)' 
              }
            ]}
          >
            <Input 
              placeholder={editingSupplier ? "A001" : "카테고리 선택 시 자동 생성 또는 수동 입력"}
              style={{ textTransform: 'uppercase' }}
              onChange={(e) => {
                // 대문자로 변환
                const value = e.target.value.toUpperCase()
                form.setFieldsValue({ supplierCode: value })
              }}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="공급업체명"
            rules={[{ required: true, message: '공급업체명을 입력하세요' }]}
          >
            <Input placeholder="공급업체명" />
          </Form.Item>

          <Form.Item
            name="category"
            label="카테고리"
            rules={[{ required: true, message: '카테고리를 선택하세요' }]}
            tooltip="업체의 주요 카테고리를 선택하세요. 코드는 자동 생성됩니다 (A: 장비, B: 설비, C: 부속품, D: 서비스, E: 기타)"
          >
            <Select placeholder="카테고리 선택" disabled={!!editingSupplier}>
              <Select.Option value="asset">장비 (A)</Select.Option>
              <Select.Option value="equipment">설비 (B)</Select.Option>
              <Select.Option value="parts">부속품 (C)</Select.Option>
              <Select.Option value="service">서비스 (D)</Select.Option>
              <Select.Option value="other">기타 (E)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="contactPerson"
            label="담당자"
          >
            <Input placeholder="담당자명" />
          </Form.Item>

          <Form.Item
            name="email"
            label="이메일"
            rules={[
              { type: 'email', message: '유효한 이메일을 입력하세요' },
            ]}
          >
            <Input placeholder="이메일 주소" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="전화번호"
          >
            <Input placeholder="전화번호" />
          </Form.Item>

          <Form.Item
            name="paymentTerms"
            label="결제 조건"
            tooltip="예: Net 30, Net 60 등"
          >
            <Input placeholder="결제 조건" />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="지급 방법"
            tooltip="주로 사용하는 지급 방법을 선택하세요"
          >
            <Select placeholder="지급 방법 선택" allowClear>
              <Select.Option value="ACH">ACH</Select.Option>
              <Select.Option value="WIRE">WIRE</Select.Option>
              <Select.Option value="Check">수표</Select.Option>
              <Select.Option value="Bank Transfer">계좌이체</Select.Option>
              <Select.Option value="Credit Card">신용카드</Select.Option>
              <Select.Option value="Cash">현금</Select.Option>
              <Select.Option value="Other">기타</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="은행 정보">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item name={['bankInfo', 'bankName']} noStyle>
                <Input placeholder="은행명" />
              </Form.Item>
              <Form.Item name={['bankInfo', 'accountHolderName']} noStyle>
                <Input placeholder="계좌 소유자명" />
              </Form.Item>
              <Form.Item name={['bankInfo', 'accountNumber']} noStyle>
                <Input placeholder="계좌번호" />
              </Form.Item>
              <Space>
                <Form.Item name={['bankInfo', 'routingNumber']} noStyle>
                  <Input placeholder="라우팅 번호 (ACH)" style={{ width: 200 }} />
                </Form.Item>
                <Form.Item name={['bankInfo', 'swiftCode']} noStyle>
                  <Input placeholder="SWIFT 코드 (WIRE)" style={{ width: 200 }} />
                </Form.Item>
                <Form.Item name={['bankInfo', 'currency']} noStyle>
                  <Select placeholder="통화" style={{ width: 120 }} allowClear>
                    <Select.Option value="USD">USD</Select.Option>
                    <Select.Option value="KRW">KRW</Select.Option>
                    <Select.Option value="MXN">MXN</Select.Option>
                  </Select>
                </Form.Item>
              </Space>
              <Form.Item name={['bankInfo', 'bankAddress']} noStyle>
                <Input placeholder="은행 주소" />
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item label="주소">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item name={['address', 'street']} noStyle>
                <Input placeholder="도로명 주소" />
              </Form.Item>
              <Space>
                <Form.Item name={['address', 'city']} noStyle>
                  <Input placeholder="도시" style={{ width: 150 }} />
                </Form.Item>
                <Form.Item name={['address', 'state']} noStyle>
                  <Input placeholder="주/도" style={{ width: 150 }} />
                </Form.Item>
                <Form.Item name={['address', 'zipCode']} noStyle>
                  <Input placeholder="우편번호" style={{ width: 120 }} />
                </Form.Item>
                <Form.Item name={['address', 'country']} noStyle>
                  <Input placeholder="국가" style={{ width: 120 }} />
                </Form.Item>
              </Space>
            </Space>
          </Form.Item>

          <Form.Item
            name="isActive"
            label="상태"
            initialValue={true}
          >
            <Select>
              <Select.Option value={true}>활성</Select.Option>
              <Select.Option value={false}>비활성</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="첨부파일 (VOID CHECK, W-9, BANK LETTER 등)">
            <Upload
              fileList={fileList}
              onChange={handleFileChange}
              onRemove={handleFileRemove}
              beforeUpload={(file) => {
                ;(file as any).fileType = 'OTHER'
                return false // 자동 업로드 방지
              }}
              multiple
            >
              <Button icon={<UploadOutlined />}>파일 선택</Button>
            </Upload>
            <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
              <div>파일 타입별 업로드:</div>
              <Space style={{ marginTop: 4 }}>
                <Button
                  size="small"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.onchange = (e: any) => {
                      const file = e.target.files[0]
                      if (file) {
                        const uploadFile: UploadFile = {
                          uid: Date.now().toString(),
                          name: file.name,
                          status: 'done',
                          originFileObj: file,
                        } as any
                        ;(uploadFile as any).fileType = 'VOID_CHECK'
                        setFileList([...fileList, uploadFile])
                      }
                    }
                    input.click()
                  }}
                >
                  VOID CHECK
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.onchange = (e: any) => {
                      const file = e.target.files[0]
                      if (file) {
                        const uploadFile: UploadFile = {
                          uid: Date.now().toString(),
                          name: file.name,
                          status: 'done',
                          originFileObj: file,
                        } as any
                        ;(uploadFile as any).fileType = 'W9'
                        setFileList([...fileList, uploadFile])
                      }
                    }
                    input.click()
                  }}
                >
                  W-9
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.onchange = (e: any) => {
                      const file = e.target.files[0]
                      if (file) {
                        const uploadFile: UploadFile = {
                          uid: Date.now().toString(),
                          name: file.name,
                          status: 'done',
                          originFileObj: file,
                        } as any
                        ;(uploadFile as any).fileType = 'BANK_LETTER'
                        setFileList([...fileList, uploadFile])
                      }
                    }
                    input.click()
                  }}
                >
                  BANK LETTER
                </Button>
              </Space>
            </div>
            {editingSupplier?.attachments && editingSupplier.attachments.length > 0 && (
              <List
                size="small"
                style={{ marginTop: 8 }}
                dataSource={editingSupplier.attachments}
                renderItem={(attachment, index) => (
                  <List.Item
                    actions={[
                      <Button
                        key="download"
                        type="link"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => editingSupplier._id && handleDownloadAttachment(editingSupplier._id, index, attachment.fileName)}
                      >
                        다운로드
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<PaperClipOutlined />}
                      title={attachment.fileName}
                      description={
                        <Space>
                          <Tag>
                            {attachment.fileType === 'VOID_CHECK' ? 'VOID CHECK' :
                             attachment.fileType === 'W9' ? 'W-9' :
                             attachment.fileType === 'BANK_LETTER' ? 'BANK LETTER' : '기타'}
                          </Tag>
                          {attachment.fileSize && `크기: ${(attachment.fileSize / 1024).toFixed(2)} KB`}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Suppliers
