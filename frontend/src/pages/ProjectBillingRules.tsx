import { useState, useEffect, useRef } from 'react'
import { Table, Button, message, Modal, Form, Input, Select, InputNumber, DatePicker, Switch, Space, Tag, Card, Divider } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
// @ts-expect-error - react-tabulator 타입 정의가 없음
import { ReactTabulator } from 'react-tabulator'
// @ts-expect-error - CSS 파일 import
import 'react-tabulator/lib/styles.css'
// @ts-expect-error - CSS 파일 import
import 'tabulator-tables/dist/css/tabulator.min.css'

const { TextArea } = Input

interface ProjectBillingRule {
  _id: string
  project?: {
    _id: string
    projectCode: string
    projectName: string
  }
  ruleName: string
  ruleType: 'EA' | 'PALLET' | 'LABOR' | 'FIXED' | 'MIXED' | 'VOLUME' | 'CONTAINER'
  unitBasis: 'EA' | 'Pallet' | 'Hour' | 'Month' | 'Container' | 'KG' | 'CBM' | 'Mixed'
  priceSource: 'price_list' | 'fixed_price' | 'labor_rate' | 'pallet_rate' | 'contract_rate' | 'composite_rate'
  groupingKey: 'part_no' | 'pallet_no' | 'date' | 'work_type' | 'none' | 'mixed'
  description?: string
  config: {
    unitPrice?: number
    priceListId?: string
    priceField?: string
    items?: Array<{
      description: string
      quantity: number
      unit: string
      unitPrice: number
      amount: number
    }>
    groupBy?: string[]
    filters?: Array<{
      field: string
      operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains'
      value: any
    }>
    formula?: string
    metadata?: Record<string, any>
  }
  priority: number
  isActive: boolean
  effectiveFrom?: string
  effectiveTo?: string
}

interface Project {
  _id: string
  projectCode: string
  projectName: string
}

interface BillingRuleItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
}

const ProjectBillingRules = () => {
  const [rules, setRules] = useState<ProjectBillingRule[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRule, setEditingRule] = useState<ProjectBillingRule | null>(null)
  const [form] = Form.useForm()
  const [ruleItems, setRuleItems] = useState<BillingRuleItem[]>([])
  const [showItemsTable, setShowItemsTable] = useState(false)
  const tableInstanceRef = useRef<any>(null)

  useEffect(() => {
    fetchRules()
    fetchProjects()
  }, [])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const response = await api.get('/project-billing-rules')
      setRules(response.data || [])
    } catch (error) {
      message.error('청구 규칙 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects?status=active')
      setProjects(response.data || [])
    } catch (error) {
      console.error('프로젝트 목록을 불러오는데 실패했습니다')
    }
  }

  const handleAdd = () => {
    setEditingRule(null)
    form.resetFields()
    setRuleItems([])
    setShowItemsTable(false)
    form.setFieldsValue({
      isActive: true,
      priority: 0,
      ruleType: 'EA',
      unitBasis: 'EA',
      priceSource: 'fixed_price',
      groupingKey: 'none',
      config: {
        unitPrice: 0,
      },
    })
    setModalVisible(true)
  }

  const handleEdit = (rule: ProjectBillingRule) => {
    setEditingRule(rule)
    const items = rule.config?.items || []
    setRuleItems(items.length > 0 ? items : [])
    setShowItemsTable(items.length > 0 || rule.ruleType === 'FIXED' || rule.ruleType === 'MIXED')
    form.setFieldsValue({
      ...rule,
      project: rule.project?._id,
      effectiveFrom: rule.effectiveFrom ? dayjs(rule.effectiveFrom) : undefined,
      effectiveTo: rule.effectiveTo ? dayjs(rule.effectiveTo) : undefined,
      config: rule.config || { unitPrice: 0 },
    })
    setModalVisible(true)
  }

  const handleRuleTypeChange = (ruleType: string) => {
    // FIXED나 MIXED 타입일 때 항목 테이블 표시
    if (ruleType === 'FIXED' || ruleType === 'MIXED') {
      setShowItemsTable(true)
      if (ruleItems.length === 0) {
        setRuleItems([{ description: '', quantity: 1, unit: 'Month', unitPrice: 0, amount: 0 }])
      }
    } else {
      setShowItemsTable(false)
      setRuleItems([])
    }
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '청구 규칙 삭제',
      content: '이 청구 규칙을 삭제하시겠습니까?',
      onOk: async () => {
        try {
          await api.delete(`/project-billing-rules/${id}`)
          message.success('청구 규칙이 삭제되었습니다')
          fetchRules()
        } catch (error) {
          message.error('청구 규칙 삭제에 실패했습니다')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      // 항목 테이블 데이터 가져오기
      let items: BillingRuleItem[] = []
      if (showItemsTable && tableInstanceRef.current) {
        try {
          const tableData = tableInstanceRef.current.getData()
          items = tableData.map((row: any) => ({
            description: row.description || '',
            quantity: parseFloat(row.quantity) || 1,
            unit: row.unit || 'Month',
            unitPrice: parseFloat(row.unitPrice) || 0,
            amount: (parseFloat(row.quantity) || 1) * (parseFloat(row.unitPrice) || 0),
          })).filter((item: BillingRuleItem) => item.description.trim() !== '')
        } catch (e) {
          console.warn('테이블 데이터 가져오기 실패:', e)
          items = ruleItems
        }
      } else {
        items = ruleItems
      }

      const data = {
        ...values,
        effectiveFrom: values.effectiveFrom?.toISOString(),
        effectiveTo: values.effectiveTo?.toISOString(),
        config: {
          ...(values.config || {}),
          unitPrice: showItemsTable ? undefined : (values.config?.unitPrice || 0),
          items: showItemsTable && items.length > 0 ? items : undefined,
        },
      }

      if (editingRule) {
        await api.put(`/project-billing-rules/${editingRule._id}`, data)
        message.success('청구 규칙이 수정되었습니다')
      } else {
        await api.post('/project-billing-rules', data)
        message.success('청구 규칙이 생성되었습니다')
      }

      setModalVisible(false)
      setRuleItems([])
      setShowItemsTable(false)
      fetchRules()
    } catch (error: any) {
      message.error(error.response?.data?.message || '청구 규칙 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<ProjectBillingRule> = [
    {
      title: '프로젝트',
      dataIndex: ['project', 'projectCode'],
      key: 'project',
      render: (_, record) => (
        <div>
          <div>{record.project?.projectCode}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.project?.projectName}</div>
        </div>
      ),
    },
    {
      title: '규칙명',
      dataIndex: 'ruleName',
      key: 'ruleName',
    },
    {
      title: '규칙 유형',
      dataIndex: 'ruleType',
      key: 'ruleType',
      render: (type) => {
        const typeMap: Record<string, { color: string; label: string }> = {
          EA: { color: 'blue', label: '개당' },
          PALLET: { color: 'green', label: '팔레트' },
          LABOR: { color: 'orange', label: '노무' },
          FIXED: { color: 'purple', label: '고정' },
          MIXED: { color: 'cyan', label: '복합' },
          VOLUME: { color: 'geekblue', label: '부피' },
          CONTAINER: { color: 'magenta', label: '컨테이너' },
        }
        const info = typeMap[type] || { color: 'default', label: type }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '단위',
      dataIndex: 'unitBasis',
      key: 'unitBasis',
    },
    {
      title: '가격 출처',
      dataIndex: 'priceSource',
      key: 'priceSource',
      render: (source) => {
        const sourceMap: Record<string, string> = {
          price_list: '가격표',
          fixed_price: '고정가격',
          labor_rate: '노무단가',
          pallet_rate: '팔레트단가',
          contract_rate: '계약단가',
          composite_rate: '복합계산',
        }
        return sourceMap[source] || source
      },
    },
    {
      title: '단가',
      key: 'unitPrice',
      render: (_, record) => {
        if (record.config?.unitPrice) {
          return record.config.unitPrice.toLocaleString()
        }
        return '-'
      },
    },
    {
      title: '우선순위',
      dataIndex: 'priority',
      key: 'priority',
      sorter: (a, b) => b.priority - a.priority,
    },
    {
      title: '활성화',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? '활성' : '비활성'}</Tag>
      ),
    },
    {
      title: '작업',
      key: 'action',
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
            onClick={() => handleDelete(record._id)}
          >
            삭제
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>프로젝트 청구 규칙 관리</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          규칙 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={rules}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingRule ? '청구 규칙 수정' : '청구 규칙 추가'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setRuleItems([])
          setShowItemsTable(false)
        }}
        onOk={() => form.submit()}
        width={1000}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="project"
            label="프로젝트"
            rules={[{ required: true, message: '프로젝트를 선택하세요' }]}
          >
            <Select placeholder="프로젝트 선택" disabled={!!editingRule}>
              {projects.map((project) => (
                <Select.Option key={project._id} value={project._id}>
                  {project.projectCode} - {project.projectName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="ruleName"
            label="규칙명"
            rules={[{ required: true, message: '규칙명을 입력하세요' }]}
          >
            <Input placeholder="예: VW CKD - Part Billing" />
          </Form.Item>

          <Form.Item
            name="ruleType"
            label="규칙 유형"
            rules={[{ required: true, message: '규칙 유형을 선택하세요' }]}
          >
            <Select onChange={handleRuleTypeChange}>
              <Select.Option value="EA">EA (개당)</Select.Option>
              <Select.Option value="PALLET">PALLET (팔레트)</Select.Option>
              <Select.Option value="LABOR">LABOR (노무)</Select.Option>
              <Select.Option value="FIXED">FIXED (고정)</Select.Option>
              <Select.Option value="MIXED">MIXED (복합)</Select.Option>
              <Select.Option value="VOLUME">VOLUME (부피)</Select.Option>
              <Select.Option value="CONTAINER">CONTAINER (컨테이너)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="unitBasis"
            label="단위 기준"
            rules={[{ required: true, message: '단위 기준을 선택하세요' }]}
          >
            <Select>
              <Select.Option value="EA">EA</Select.Option>
              <Select.Option value="Pallet">Pallet</Select.Option>
              <Select.Option value="Hour">Hour</Select.Option>
              <Select.Option value="Month">Month</Select.Option>
              <Select.Option value="Container">Container</Select.Option>
              <Select.Option value="KG">KG</Select.Option>
              <Select.Option value="CBM">CBM</Select.Option>
              <Select.Option value="Mixed">Mixed</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="priceSource"
            label="가격 출처"
            rules={[{ required: true, message: '가격 출처를 선택하세요' }]}
          >
            <Select>
              <Select.Option value="fixed_price">고정 가격</Select.Option>
              <Select.Option value="price_list">가격표</Select.Option>
              <Select.Option value="labor_rate">노무 단가</Select.Option>
              <Select.Option value="pallet_rate">팔레트 단가</Select.Option>
              <Select.Option value="contract_rate">계약 단가</Select.Option>
              <Select.Option value="composite_rate">복합 계산</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="groupingKey"
            label="그룹핑 기준"
            rules={[{ required: true, message: '그룹핑 기준을 선택하세요' }]}
          >
            <Select>
              <Select.Option value="none">그룹핑 없음</Select.Option>
              <Select.Option value="part_no">부품 번호별</Select.Option>
              <Select.Option value="pallet_no">팔레트 번호별</Select.Option>
              <Select.Option value="date">날짜별</Select.Option>
              <Select.Option value="work_type">작업 유형별</Select.Option>
              <Select.Option value="mixed">복합</Select.Option>
            </Select>
          </Form.Item>

          {!showItemsTable && (
            <Form.Item
              name={['config', 'unitPrice']}
              label="단가 (고정 가격인 경우)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          )}

          {showItemsTable && (
            <>
              <Divider orientation="left">청구 항목</Divider>
              <Card size="small" style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontSize: '12px', color: '#666' }}>
                  Excel처럼 직접 편집할 수 있습니다. 수량과 단가를 입력하면 금액이 자동 계산됩니다.
                </div>
                <div style={{ height: '400px' }}>
                  <ReactTabulator
                    ref={tableInstanceRef}
                    data={ruleItems.length > 0 ? ruleItems : [{ description: '', quantity: 1, unit: 'Month', unitPrice: 0, amount: 0 }]}
                    columns={[
                      {
                        title: '설명',
                        field: 'description',
                        editor: 'input',
                        width: 300,
                        validator: 'required',
                      },
                      {
                        title: '수량',
                        field: 'quantity',
                        editor: 'number',
                        width: 100,
                        align: 'right',
                        formatter: 'money',
                        formatterParams: { precision: 2, symbol: '', thousand: ',', decimal: '.' },
                        validator: 'required|numeric|min:0',
                      },
                      {
                        title: '단위',
                        field: 'unit',
                        editor: 'select',
                        editorParams: {
                          values: ['EA', 'Pallet', 'Hour', 'Month', 'Container', 'KG', 'CBM'],
                        },
                        width: 120,
                        validator: 'required',
                      },
                      {
                        title: '단가',
                        field: 'unitPrice',
                        editor: 'number',
                        width: 150,
                        align: 'right',
                        formatter: 'money',
                        formatterParams: { precision: 2, symbol: '', thousand: ',', decimal: '.' },
                        validator: 'required|numeric|min:0',
                      },
                      {
                        title: '금액',
                        field: 'amount',
                        width: 150,
                        align: 'right',
                        formatter: 'money',
                        formatterParams: { precision: 2, symbol: '', thousand: ',', decimal: '.' },
                        editor: false, // 자동 계산되므로 편집 불가
                        mutator: (value: any, data: any) => {
                          // 수량 × 단가로 자동 계산
                          const qty = parseFloat(data.quantity) || 0
                          const price = parseFloat(data.unitPrice) || 0
                          return qty * price
                        },
                      },
                    ]}
                    options={{
                      height: '350px',
                      layout: 'fitColumns',
                      movableColumns: true,
                      resizableColumns: true,
                      tooltips: true,
                      addRowPos: 'bottom',
                      history: true,
                      pagination: false,
                      placeholder: '데이터가 없습니다',
                      headerSort: false,
                    }}
                    events={{
                      cellEdited: (cell: any) => {
                        const field = cell.getField()
                        // 수량이나 단가가 변경되면 금액 자동 계산
                        if (field === 'quantity' || field === 'unitPrice') {
                          const row = cell.getRow()
                          const data = row.getData()
                          const qty = parseFloat(data.quantity) || 0
                          const price = parseFloat(data.unitPrice) || 0
                          row.update({ amount: qty * price })
                        }
                        // 테이블 데이터 업데이트
                        if (tableInstanceRef.current) {
                          try {
                            const updatedData = tableInstanceRef.current.getData()
                            setRuleItems(updatedData)
                          } catch (e) {
                            console.warn('데이터 업데이트 실패:', e)
                          }
                        }
                      },
                      rowAdded: () => {
                        if (tableInstanceRef.current) {
                          try {
                            const updatedData = tableInstanceRef.current.getData()
                            setRuleItems(updatedData)
                          } catch (e) {
                            console.warn('데이터 업데이트 실패:', e)
                          }
                        }
                      },
                      rowDeleted: () => {
                        if (tableInstanceRef.current) {
                          try {
                            const updatedData = tableInstanceRef.current.getData()
                            setRuleItems(updatedData)
                          } catch (e) {
                            console.warn('데이터 업데이트 실패:', e)
                          }
                        }
                      },
                    }}
                  />
                </div>
                <div style={{ marginTop: 8, textAlign: 'right', fontWeight: 'bold' }}>
                  총액: {ruleItems.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}
                </div>
              </Card>
            </>
          )}

          <Form.Item
            name="priority"
            label="우선순위"
            rules={[{ required: true, message: '우선순위를 입력하세요' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="활성화"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="effectiveFrom"
            label="적용 시작일"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="effectiveTo"
            label="적용 종료일"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="description"
            label="설명"
          >
            <TextArea rows={3} placeholder="규칙에 대한 설명을 입력하세요" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ProjectBillingRules

