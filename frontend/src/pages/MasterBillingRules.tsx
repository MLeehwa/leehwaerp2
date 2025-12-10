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

interface MasterBillingRule {
  _id: string
  project: {
    _id: string
    projectCode: string
    projectName: string
  }
  description?: string
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

interface BillingRuleItem {
  isFixed: boolean
  itemName: string
  quantity?: number
  unit?: string
  unitPrice: number
  amount?: number
}

interface FixedItem {
  itemName: string
  unitPrice: number
  amount: number
}

interface VariableItem {
  itemName: string
  unit: string
  unitPrice: number
}

interface Project {
  _id: string
  projectCode: string
  projectName: string
}

const MasterBillingRules = () => {
  const [rules, setRules] = useState<MasterBillingRule[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRule, setEditingRule] = useState<MasterBillingRule | null>(null)
  const [form] = Form.useForm()
  const [ruleItems, setRuleItems] = useState<BillingRuleItem[]>([])
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([])
  const [variableItems, setVariableItems] = useState<VariableItem[]>([])
  const fixedTableRef = useRef<any>(null)
  const variableTableRef = useRef<any>(null)
  const [filterProject, setFilterProject] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetchRules()
    fetchProjects()
  }, [filterProject])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterProject) params.projectId = filterProject
      const response = await api.get('/master-billing-rules', { params })
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
    setFixedItems([])
    setVariableItems([])
    form.setFieldsValue({
      isActive: true,
      project: filterProject || undefined,
    })
    setModalVisible(true)
  }

  const handleEdit = (rule: MasterBillingRule) => {
    setEditingRule(rule)
    const items = rule.items || []
    // 고정 항목과 변동 항목 분리
    const fixed: FixedItem[] = []
    const variable: VariableItem[] = []
    
    items.forEach((item: BillingRuleItem) => {
      if (item.isFixed) {
        fixed.push({
          itemName: item.itemName,
          unitPrice: item.unitPrice,
          amount: item.amount || item.unitPrice,
        })
      } else {
        variable.push({
          itemName: item.itemName,
          unit: item.unit || 'EA',
          unitPrice: item.unitPrice || 0,
        })
      }
    })
    
    setFixedItems(fixed.length > 0 ? fixed : [])
    setVariableItems(variable.length > 0 ? variable : [])
    form.setFieldsValue({
      ...rule,
      project: rule.project._id,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '청구 규칙 삭제',
      content: '이 청구 규칙을 삭제하시겠습니까?',
      onOk: async () => {
        try {
          await api.delete(`/master-billing-rules/${id}`)
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
      // 고정 항목과 변동 항목 데이터 가져오기
      // 저장 직전에 테이블에서 최신 데이터를 확실히 가져오기
      let fixedData: FixedItem[] = []
      let variableData: VariableItem[] = []
      
      // 저장 직전에 테이블에서 최신 데이터를 가져와서 상태와 동기화
      // DOM 업데이트가 완료되도록 약간의 지연
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 테이블 ref에서 직접 최신 데이터 가져오기
      // getData()는 현재 테이블에 표시된 모든 행의 데이터를 반환 (삭제된 행은 제외됨)
      if (fixedTableRef.current) {
        try {
          // getData()를 직접 사용 - 이것이 가장 확실한 방법
          const tableData = fixedTableRef.current.getData()
          
          console.log('저장 시 고정 항목 - 테이블 getData():', tableData)
          console.log('저장 시 고정 항목 - 상태 데이터:', fixedItems)
          
          // 빈 항목명 제거하고 유효한 데이터만 필터링
          fixedData = tableData
            .filter((row: any) => row && row.itemName && row.itemName.trim() !== '')
            .map((row: any) => ({
              itemName: row.itemName,
              unitPrice: parseFloat(row.unitPrice) || 0,
              amount: parseFloat(row.amount) || parseFloat(row.unitPrice) || 0,
            }))
          
          console.log('최종 저장할 고정 항목:', fixedData, '개수:', fixedData.length)
          
          // 상태도 동기화
          setFixedItems(fixedData)
        } catch (e) {
          console.error('고정 항목 데이터 가져오기 실패:', e)
          // 실패 시 상태에서 가져오기
          fixedData = fixedItems.filter(item => item.itemName && item.itemName.trim() !== '')
        }
      } else {
        // 테이블 ref가 없으면 상태에서 가져오기
        fixedData = fixedItems.filter(item => item.itemName && item.itemName.trim() !== '')
      }
      
      if (variableTableRef.current) {
        try {
          // getData()를 직접 사용 - 이것이 가장 확실한 방법
          const tableData = variableTableRef.current.getData()
          
          console.log('저장 시 변동 항목 - 테이블 getData():', tableData)
          console.log('저장 시 변동 항목 - 상태 데이터:', variableItems)
          
          // 빈 항목명 제거하고 유효한 데이터만 필터링
          variableData = tableData
            .filter((row: any) => row && row.itemName && row.itemName.trim() !== '')
            .map((row: any) => ({
              itemName: row.itemName,
              unit: row.unit || 'EA',
              unitPrice: parseFloat(row.unitPrice) || 0,
            }))
          
          console.log('최종 저장할 변동 항목:', variableData, '개수:', variableData.length)
          
          // 상태도 동기화
          setVariableItems(variableData)
        } catch (e) {
          console.error('변동 항목 데이터 가져오기 실패:', e)
          // 실패 시 상태에서 가져오기
          variableData = variableItems.filter(item => item.itemName && item.itemName.trim() !== '')
        }
      } else {
        // 테이블 ref가 없으면 상태에서 가져오기
        variableData = variableItems.filter(item => item.itemName && item.itemName.trim() !== '')
      }
      
      // 고정 항목과 변동 항목을 하나의 배열로 합치기
      const items: BillingRuleItem[] = [
        ...fixedData.map((item: FixedItem) => ({
          isFixed: true,
          itemName: item.itemName,
          quantity: 1,
          unit: 'EA',
          unitPrice: item.unitPrice,
          amount: item.amount || item.unitPrice,
        })),
        ...variableData.map((item: VariableItem) => ({
          isFixed: false,
          itemName: item.itemName,
          quantity: 1, // 기본값, 나중에 인보이스 생성 시 계산
          unit: item.unit || 'EA',
          unitPrice: item.unitPrice || 0,
          amount: 0, // 변동 항목은 금액 없음
        })),
      ]

      console.log('최종 저장할 items:', items)
      console.log('items 개수:', items.length)

      // 항목이 없어도 저장 가능 (빈 규칙 허용)

      const data = {
        ...values,
        items,
      }

      console.log('저장할 전체 데이터:', data)

      if (editingRule) {
        await api.put(`/master-billing-rules/${editingRule._id}`, data)
        message.success('청구 규칙이 수정되었습니다')
      } else {
        await api.post('/master-billing-rules', data)
        message.success('청구 규칙이 생성되었습니다')
      }

      setModalVisible(false)
      setFixedItems([])
      setVariableItems([])
      fetchRules()
    } catch (error: any) {
      message.error(error.response?.data?.message || '청구 규칙 저장에 실패했습니다')
    }
  }

  const columns: ColumnsType<MasterBillingRule> = [
    {
      title: '프로젝트',
      dataIndex: ['project', 'projectCode'],
      key: 'project',
      render: (_, record) => (
        <div>
          <div>{record.project.projectCode}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.project.projectName}</div>
        </div>
      ),
    },
    {
      title: '항목 수',
      key: 'itemCount',
      render: (_, record) => {
        if (record.items && record.items.length > 0) {
          return `${record.items.length}개`
        }
        return '0개'
      },
    },
    {
      title: '총액',
      key: 'totalAmount',
      align: 'right',
      render: (_, record) => {
        if (record.items && record.items.length > 0) {
          const total = record.items.reduce((sum, item) => sum + (item.amount || 0), 0)
          return total.toLocaleString()
        }
        return '0'
      },
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
        <h2>마스터 청구 규칙 관리</h2>
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
          setFixedItems([])
          setVariableItems([])
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
            <Select placeholder="프로젝트 선택">
              {projects.map((project) => (
                <Select.Option key={project._id} value={project._id}>
                  {project.projectCode} - {project.projectName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Divider orientation="left">고정 항목</Divider>
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ padding: '8px 12px', backgroundColor: '#f6ffed', borderRadius: '4px', fontSize: '12px', color: '#52c41a', flex: 1, marginRight: 8 }}>
                <strong>💡 고정 항목:</strong> 단가를 입력하면 금액이 자동 계산됩니다 (수량은 항상 1)
              </div>
              <Button 
                type="dashed" 
                icon={<PlusOutlined />} 
                onClick={() => {
                  const newRow = { itemName: '', unitPrice: 0, amount: 0 }
                  setFixedItems([...fixedItems, newRow])
                  if (fixedTableRef.current) {
                    try {
                      fixedTableRef.current.addRow(newRow, false)
                      setTimeout(() => {
                        if (fixedTableRef.current) {
                          const rows = fixedTableRef.current.getRows()
                          if (rows.length > 0) {
                            rows[rows.length - 1].getCells()[0].edit()
                          }
                        }
                      }, 200)
                    } catch (e) {
                      console.warn('테이블에 행 추가 실패:', e)
                    }
                  }
                }}
              >
                행 추가
              </Button>
            </div>
            <div style={{ height: '250px' }}>
              <ReactTabulator
                data={fixedItems}
                    columns={[
                      {
                        title: '',
                        field: 'actions',
                        width: 120,
                        hozAlign: 'center',
                        headerSort: false,
                        cellClick: (e: any, cell: any) => {
                          const target = e.target
                          if (!target.classList.contains('tabulator-btn-up') && 
                              !target.classList.contains('tabulator-btn-down') && 
                              !target.classList.contains('tabulator-btn-delete')) {
                            return
                          }
                          
                          e.stopPropagation()
                          e.preventDefault()
                          e.stopImmediatePropagation()
                          
                          try {
                            const row = cell.getRow()
                            const table = cell.getTable()
                            
                            if (!row || !table) {
                              return
                            }
                            
                            const rowIndex = row.getPosition()
                            const rowCount = table.getDataCount()
                            
                            if (target.classList.contains('tabulator-btn-up')) {
                              if (rowIndex > 0) {
                                const rowData = row.getData()
                                const prevRow = table.getRowFromPosition(rowIndex - 1)
                                if (prevRow) {
                                  const prevRowData = prevRow.getData()
                                  row.update(prevRowData)
                                  prevRow.update(rowData)
                                  // 상태 동기화
                                  setTimeout(() => {
                                    if (fixedTableRef.current) {
                                      const updatedData = fixedTableRef.current.getData()
                                      setFixedItems(updatedData)
                                    }
                                  }, 0)
                                }
                              }
                            } else if (target.classList.contains('tabulator-btn-down')) {
                              if (rowIndex < rowCount - 1) {
                                const rowData = row.getData()
                                const nextRow = table.getRowFromPosition(rowIndex + 1)
                                if (nextRow) {
                                  const nextRowData = nextRow.getData()
                                  row.update(nextRowData)
                                  nextRow.update(rowData)
                                  // 상태 동기화
                                  setTimeout(() => {
                                    if (fixedTableRef.current) {
                                      const updatedData = fixedTableRef.current.getData()
                                      setFixedItems(updatedData)
                                    }
                                  }, 0)
                                }
                              }
                            } else if (target.classList.contains('tabulator-btn-delete')) {
                              // 테이블에서 먼저 행 삭제
                              row.delete()
                              
                              // 삭제 후 테이블의 최신 데이터로 상태 업데이트
                              const updateState = () => {
                                if (fixedTableRef.current) {
                                  try {
                                    // getData()를 직접 사용 - 삭제된 행은 자동으로 제외됨
                                    const updatedData = fixedTableRef.current.getData()
                                    console.log('삭제 버튼 클릭 - 고정 항목 업데이트:', updatedData)
                                    setFixedItems(updatedData || [])
                                  } catch (e) {
                                    console.warn('상태 동기화 실패:', e)
                                  }
                                }
                              }
                              
                              // 즉시 업데이트 시도
                              updateState()
                              // 비동기 업데이트도 시도 (테이블 업데이트 완료 대기)
                              setTimeout(updateState, 100)
                              setTimeout(updateState, 200)
                            }
                          } catch (err) {
                            console.error('버튼 클릭 오류:', err)
                          }
                          
                          return false
                        },
                        editor: false,
                        formatter: (cell: any, formatterParams: any, onRendered: any) => {
                          const row = cell.getRow()
                          const rowIndex = row.getPosition()
                          const rowCount = row.getTable().getDataCount()
                          
                          return `
                            <div style="display: flex; gap: 4px; justify-content: center;">
                              <button class="tabulator-btn-up" style="padding: 2px 6px; font-size: 12px; border: 1px solid #d9d9d9; background: white; cursor: pointer; border-radius: 2px;" ${rowIndex === 0 ? 'disabled' : ''} title="위로 이동">↑</button>
                              <button class="tabulator-btn-down" style="padding: 2px 6px; font-size: 12px; border: 1px solid #d9d9d9; background: white; cursor: pointer; border-radius: 2px;" ${rowIndex === rowCount - 1 ? 'disabled' : ''} title="아래로 이동">↓</button>
                              <button class="tabulator-btn-delete" style="padding: 2px 6px; font-size: 12px; border: 1px solid #ff4d4f; background: white; color: #ff4d4f; cursor: pointer; border-radius: 2px;" title="삭제">×</button>
                            </div>
                          `
                        },
                      },
                      {
                        title: '항목',
                        field: 'itemName',
                        editor: 'input',
                        width: 400,
                        validator: ['required'],
                        editorParams: {
                          elementAttributes: {
                            maxLength: 200,
                          },
                        },
                      },
                      {
                        title: '단가',
                        field: 'unitPrice',
                        editor: 'number',
                        width: 200,
                        hozAlign: 'right',
                        formatter: 'money',
                        formatterParams: { precision: 2, symbol: '', thousand: ',', decimal: '.' },
                        validator: ['required', 'numeric', 'min:0'],
                        editorParams: {
                          min: 0,
                          step: 0.01,
                        },
                      },
                      {
                        title: '금액',
                        field: 'amount',
                        width: 200,
                        hozAlign: 'right',
                        formatter: 'money',
                        formatterParams: { precision: 2, symbol: '', thousand: ',', decimal: '.' },
                        editor: false, // 자동 계산되므로 편집 불가
                        mutator: (value: any, data: any) => {
                          // 고정 항목은 단가 = 금액
                          return parseFloat(data.unitPrice) || 0
                        },
                      },
                    ]}
                    options={{
                      height: '200px',
                      layout: 'fitColumns',
                      movableColumns: true,
                      resizableColumns: true,
                      tooltips: true,
                      addRowPos: 'bottom',
                      history: true,
                      pagination: false,
                      placeholder: '고정 항목이 없습니다',
                      headerSort: false,
                      // Excel처럼 바로 타이핑하면 편집 시작
                      editTriggerEvent: 'click', // 클릭하면 바로 편집 시작
                      tabEndNewRow: false, // Tab 키로 새 행 추가 비활성화 (수동 버튼 사용)
                      keybindings: {
                        navNext: 'tab', // Tab으로 다음 셀 이동
                        navPrev: 'shift + tab', // Shift+Tab으로 이전 셀 이동
                        navUp: 'up',
                        navDown: 'down',
                        navLeft: 'left',
                        navRight: 'right',
                      },
                      // 행 이동 기능
                      rowMove: true, // 행 드래그 앤 드롭으로 순서 변경
                      rowMoveManual: false, // 자동 이동
                      rowMoveHoverClass: 'tabulator-row-move-hover', // 드래그 시 스타일
                      rowMoveHandle: false, // 전체 행을 드래그 가능
                      // Excel 클립보드 기능
                      clipboard: true, // 클립보드 복사/붙여넣기 지원
                      clipboardCopyRowRange: 'active', // 활성 행 복사
                      clipboardPasteParser: 'table', // 테이블 형식 붙여넣기
                    }}
                    events={{
                      tableBuilt: (table: any) => {
                        fixedTableRef.current = table
                      },
                      cellEdited: (cell: any) => {
                        const field = cell.getField()
                        const row = cell.getRow()
                        const data = row.getData()
                        
                        // 단가가 변경되면 금액 자동 계산
                        if (field === 'unitPrice') {
                          const price = parseFloat(data.unitPrice) || 0
                          row.update({ amount: price })
                        }
                        // 테이블 데이터 업데이트
                        if (fixedTableRef.current) {
                          try {
                            const updatedData = fixedTableRef.current.getData()
                            setFixedItems(updatedData)
                          } catch (e) {
                            console.warn('데이터 업데이트 실패:', e)
                          }
                        }
                      },
                      rowAdded: () => {
                        if (fixedTableRef.current) {
                          try {
                            const updatedData = fixedTableRef.current.getData()
                            setFixedItems(updatedData)
                          } catch (e) {
                            console.warn('데이터 업데이트 실패:', e)
                          }
                        }
                      },
                      rowDeleted: () => {
                        // rowDeleted 이벤트는 삭제 후에 발생하므로 즉시 상태 업데이트
                        const updateState = () => {
                          if (fixedTableRef.current) {
                            try {
                              // getData()를 직접 사용 - 삭제된 행은 자동으로 제외됨
                              const updatedData = fixedTableRef.current.getData()
                              console.log('rowDeleted - 고정 항목 업데이트:', updatedData)
                              setFixedItems(updatedData || [])
                            } catch (e) {
                              console.warn('rowDeleted - 데이터 업데이트 실패:', e)
                            }
                          }
                        }
                        // 즉시 업데이트
                        updateState()
                        // 비동기 업데이트도 시도 (테이블 업데이트 완료 대기)
                        setTimeout(updateState, 100)
                        setTimeout(updateState, 200)
                      },
                      rowMoved: () => {
                        if (fixedTableRef.current) {
                          try {
                            const updatedData = fixedTableRef.current.getData()
                            setFixedItems(updatedData)
                          } catch (e) {
                            console.warn('데이터 업데이트 실패:', e)
                          }
                        }
                      },
                    }}
                  />
                </div>
                <div style={{ marginTop: 8, textAlign: 'right', fontWeight: 'bold' }}>
                  총액: {fixedItems.reduce((sum, item) => sum + (item.amount || item.unitPrice || 0), 0).toLocaleString()}
                </div>
              </Card>

          <Divider orientation="left">변동 항목</Divider>
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ padding: '8px 12px', backgroundColor: '#e6f7ff', borderRadius: '4px', fontSize: '12px', color: '#1890ff', flex: 1, marginRight: 8 }}>
                <strong>💡 변동 항목:</strong> 항목명과 단위만 입력하세요. 수량과 단가는 인보이스 생성 시 계산됩니다
              </div>
              <Button 
                type="dashed" 
                icon={<PlusOutlined />} 
                onClick={() => {
                  const newRow = { itemName: '', unit: 'EA', unitPrice: 0 }
                  setVariableItems([...variableItems, newRow])
                  if (variableTableRef.current) {
                    try {
                      variableTableRef.current.addRow(newRow, false)
                      setTimeout(() => {
                        if (variableTableRef.current) {
                          const rows = variableTableRef.current.getRows()
                          if (rows.length > 0) {
                            rows[rows.length - 1].getCells()[0].edit()
                          }
                        }
                      }, 200)
                    } catch (e) {
                      console.warn('테이블에 행 추가 실패:', e)
                    }
                  }
                }}
              >
                행 추가
              </Button>
            </div>
            <div style={{ height: '250px' }}>
              <ReactTabulator
                data={variableItems}
                    columns={[
                      {
                        title: '',
                        field: 'actions',
                        width: 120,
                        hozAlign: 'center',
                        headerSort: false,
                        cellClick: (e: any, cell: any) => {
                          const target = e.target
                          if (!target.classList.contains('tabulator-btn-up') && 
                              !target.classList.contains('tabulator-btn-down') && 
                              !target.classList.contains('tabulator-btn-delete')) {
                            return
                          }
                          
                          e.stopPropagation()
                          e.preventDefault()
                          e.stopImmediatePropagation()
                          
                          try {
                            const row = cell.getRow()
                            const table = cell.getTable()
                            
                            if (!row || !table) {
                              return
                            }
                            
                            const rowIndex = row.getPosition()
                            const rowCount = table.getDataCount()
                            
                            if (target.classList.contains('tabulator-btn-up')) {
                              if (rowIndex > 0) {
                                const rowData = row.getData()
                                const prevRow = table.getRowFromPosition(rowIndex - 1)
                                if (prevRow) {
                                  const prevRowData = prevRow.getData()
                                  row.update(prevRowData)
                                  prevRow.update(rowData)
                                  // 상태 동기화
                                  setTimeout(() => {
                                    if (variableTableRef.current) {
                                      const updatedData = variableTableRef.current.getData()
                                      setVariableItems(updatedData)
                                    }
                                  }, 0)
                                }
                              }
                            } else if (target.classList.contains('tabulator-btn-down')) {
                              if (rowIndex < rowCount - 1) {
                                const rowData = row.getData()
                                const nextRow = table.getRowFromPosition(rowIndex + 1)
                                if (nextRow) {
                                  const nextRowData = nextRow.getData()
                                  row.update(nextRowData)
                                  nextRow.update(rowData)
                                  // 상태 동기화
                                  setTimeout(() => {
                                    if (variableTableRef.current) {
                                      const updatedData = variableTableRef.current.getData()
                                      setVariableItems(updatedData)
                                    }
                                  }, 0)
                                }
                              }
                            } else if (target.classList.contains('tabulator-btn-delete')) {
                              // 테이블에서 먼저 행 삭제
                              row.delete()
                              
                              // 삭제 후 테이블의 최신 데이터로 상태 업데이트
                              const updateState = () => {
                                if (variableTableRef.current) {
                                  try {
                                    // getData()를 직접 사용 - 삭제된 행은 자동으로 제외됨
                                    const updatedData = variableTableRef.current.getData()
                                    console.log('삭제 버튼 클릭 - 변동 항목 업데이트:', updatedData)
                                    setVariableItems(updatedData || [])
                                  } catch (e) {
                                    console.warn('상태 동기화 실패:', e)
                                  }
                                }
                              }
                              
                              // 즉시 업데이트 시도
                              updateState()
                              // 비동기 업데이트도 시도 (테이블 업데이트 완료 대기)
                              setTimeout(updateState, 100)
                              setTimeout(updateState, 200)
                            }
                          } catch (err) {
                            console.error('버튼 클릭 오류:', err)
                          }
                          
                          return false
                        },
                        editor: false,
                        formatter: (cell: any, formatterParams: any, onRendered: any) => {
                          const row = cell.getRow()
                          const rowIndex = row.getPosition()
                          const rowCount = row.getTable().getDataCount()
                          
                          return `
                            <div style="display: flex; gap: 4px; justify-content: center;">
                              <button class="tabulator-btn-up" style="padding: 2px 6px; font-size: 12px; border: 1px solid #d9d9d9; background: white; cursor: pointer; border-radius: 2px;" ${rowIndex === 0 ? 'disabled' : ''} title="위로 이동">↑</button>
                              <button class="tabulator-btn-down" style="padding: 2px 6px; font-size: 12px; border: 1px solid #d9d9d9; background: white; cursor: pointer; border-radius: 2px;" ${rowIndex === rowCount - 1 ? 'disabled' : ''} title="아래로 이동">↓</button>
                              <button class="tabulator-btn-delete" style="padding: 2px 6px; font-size: 12px; border: 1px solid #ff4d4f; background: white; color: #ff4d4f; cursor: pointer; border-radius: 2px;" title="삭제">×</button>
                            </div>
                          `
                        },
                      },
                      {
                        title: '항목',
                        field: 'itemName',
                        editor: 'input',
                        width: 400,
                        validator: ['required'],
                        editorParams: {
                          elementAttributes: {
                            maxLength: 200,
                          },
                        },
                      },
                      {
                        title: '단위',
                        field: 'unit',
                        editor: 'autocomplete',
                        editorParams: {
                          values: ['EA', 'Pallet', 'Hour', 'Month', 'Container', 'KG', 'CBM', 'Lot', 'Set', 'Box'],
                          listOnEmpty: true,
                          allowEmpty: false,
                          freetext: true,
                          searchFunc: (term: string, values: string[]) => {
                            return values.filter((v: string) => v.toLowerCase().includes(term.toLowerCase()))
                          },
                        },
                        width: 200,
                        validator: ['required'],
                      },
                      {
                        title: '단가',
                        field: 'unitPrice',
                        editor: 'number',
                        width: 200,
                        hozAlign: 'right',
                        formatter: 'money',
                        formatterParams: { precision: 2, symbol: '', thousand: ',', decimal: '.' },
                        validator: ['required', 'numeric', 'min:0'],
                        editorParams: {
                          min: 0,
                          step: 0.01,
                        },
                      },
                    ]}
                    options={{
                      height: '200px',
                      layout: 'fitColumns',
                      movableColumns: true,
                      resizableColumns: true,
                      tooltips: true,
                      addRowPos: 'bottom',
                      history: true,
                      pagination: false,
                      placeholder: '변동 항목이 없습니다',
                      headerSort: false,
                      editTriggerEvent: 'click',
                      tabEndNewRow: false,
                      keybindings: {
                        navNext: 'tab',
                        navPrev: 'shift + tab',
                        navUp: 'up',
                        navDown: 'down',
                        navLeft: 'left',
                        navRight: 'right',
                      },
                      rowMove: true,
                      rowMoveManual: false,
                      rowMoveHoverClass: 'tabulator-row-move-hover',
                      rowMoveHandle: false,
                      clipboard: true,
                      clipboardCopyRowRange: 'active',
                      clipboardPasteParser: 'table',
                    }}
                    events={{
                      tableBuilt: (table: any) => {
                        variableTableRef.current = table
                      },
                      cellEdited: () => {
                        if (variableTableRef.current) {
                          try {
                            const updatedData = variableTableRef.current.getData()
                            setVariableItems(updatedData)
                          } catch (e) {
                            console.warn('데이터 업데이트 실패:', e)
                          }
                        }
                      },
                      rowAdded: () => {
                        if (variableTableRef.current) {
                          try {
                            const updatedData = variableTableRef.current.getData()
                            setVariableItems(updatedData)
                          } catch (e) {
                            console.warn('데이터 업데이트 실패:', e)
                          }
                        }
                      },
                      rowDeleted: () => {
                        // rowDeleted 이벤트는 삭제 후에 발생하므로 즉시 상태 업데이트
                        const updateState = () => {
                          if (variableTableRef.current) {
                            try {
                              // getData()를 직접 사용 - 삭제된 행은 자동으로 제외됨
                              const updatedData = variableTableRef.current.getData()
                              console.log('rowDeleted - 변동 항목 업데이트:', updatedData)
                              setVariableItems(updatedData || [])
                            } catch (e) {
                              console.warn('rowDeleted - 데이터 업데이트 실패:', e)
                            }
                          }
                        }
                        // 즉시 업데이트
                        updateState()
                        // 비동기 업데이트도 시도 (테이블 업데이트 완료 대기)
                        setTimeout(updateState, 100)
                        setTimeout(updateState, 200)
                      },
                      rowMoved: () => {
                        if (variableTableRef.current) {
                          try {
                            const updatedData = variableTableRef.current.getData()
                            setVariableItems(updatedData)
                          } catch (e) {
                            console.warn('데이터 업데이트 실패:', e)
                          }
                        }
                      },
                    }}
                  />
                </div>
              </Card>

          <Form.Item
            name="description"
            label="설명 (선택사항)"
          >
            <TextArea rows={2} placeholder="규칙에 대한 설명을 입력하세요" />
          </Form.Item>


          <Form.Item
            name="isActive"
            label="활성화"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default MasterBillingRules

