import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Modal, Form, Input, Select, DatePicker, message, Space, Tag, Card, Row, Col, Table, Popconfirm } from 'antd'
import { PlusOutlined, SaveOutlined, InboxOutlined } from '@ant-design/icons'
import api from '../utils/api'
import dayjs from 'dayjs'
// @ts-expect-error - react-tabulator 타입 정의가 없음
import { ReactTabulator } from 'react-tabulator'
// @ts-expect-error - CSS 파일 import
import 'react-tabulator/lib/styles.css'
// @ts-expect-error - CSS 파일 import
import 'tabulator-tables/dist/css/tabulator.min.css'

const { TextArea } = Input

interface Container {
  _id?: string
  containerNumber?: string
  trackingNumber?: string
  shippingType: 'sea' | 'air'
  project?: {
    _id: string
    projectCode: string
    projectName: string
  }
  palletProject?: {
    _id: string
    projectCode: string
    projectName: string
  }
  company?: {
    _id: string
    code: string
    name: string
  }
  shipmentType?: 'project' | 'general'
  origin: string
  destination: string
  shippingLine?: string
  airline?: string
  vesselName?: string
  flightNumber?: string
  voyageNumber?: string
  etd?: string
  portEta?: string
  factoryEta?: string
  status: 'pending' | 'in-transit' | 'arrived' | 'delivered' | 'cancelled'
  palletCount?: number
  partCount?: number
  weight?: number
  volume?: number
  sealNumber?: string
  customsStatus?: string
  notes?: string
}

interface PalletProject {
  _id: string
  projectCode: string
  projectName: string
}

interface Company {
  _id: string
  code: string
  name: string
}

const Containers = () => {
  const [containers, setContainers] = useState<Container[]>([])
  const [palletProjects, setPalletProjects] = useState<PalletProject[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingContainer] = useState<Container | null>(null)
  const [filterProject, setFilterProject] = useState<string | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterCompany, setFilterCompany] = useState<string | undefined>(undefined)
  const [filterShipmentType, setFilterShipmentType] = useState<string | undefined>(undefined)
  const [form] = Form.useForm()
  const [selectedPalletProject, setSelectedPalletProject] = useState<string | undefined>(undefined)
  const [summaryData, setSummaryData] = useState({ totalPallets: 0, totalParts: 0 })
  const tableInstanceRef = useRef<any>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [editMode, setEditMode] = useState(false) // 편집 모드 (등록용)

  useEffect(() => {
    fetchPalletProjects()
    fetchCompanies()
  }, [])

  useEffect(() => {
    fetchContainers()
  }, [filterProject, filterStatus, filterCompany, filterShipmentType])

  // 테이블 데이터 업데이트
  useEffect(() => {
    const data = getTableData()
    setTableData(data)
  }, [containers, selectedPalletProject, filterCompany, filterShipmentType])

  const fetchPalletProjects = async () => {
    try {
      const response = await api.get('/pallet-projects')
      setPalletProjects(response.data || [])
    } catch (error) {
      console.error('팔렛트 프로젝트 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies')
      setCompanies(response.data || [])
    } catch (error) {
      console.error('법인 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchContainers = async () => {
    try {
      const params: any = {}
      if (filterProject) params.project = filterProject
      if (filterStatus) params.status = filterStatus
      if (filterCompany) params.company = filterCompany
      if (filterShipmentType) params.shipmentType = filterShipmentType

      const response = await api.get('/containers', { params })
      setContainers(response.data || [])
    } catch (error) {
      console.error('컨테이너 목록을 불러오는데 실패했습니다')
    }
    }


  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        etd: values.etd ? values.etd.toISOString() : undefined,
        portEta: values.portEta ? values.portEta.toISOString() : undefined,
        factoryEta: values.factoryEta ? values.factoryEta.toISOString() : undefined,
      }

      if (editingContainer?._id) {
        await api.put(`/containers/${editingContainer._id}`, submitData)
        message.success('컨테이너가 수정되었습니다')
      } else {
        await api.post('/containers', submitData)
        message.success('컨테이너가 등록되었습니다')
      }

      setModalVisible(false)
      form.resetFields()
      fetchContainers()
    } catch (error: any) {
      message.error(error.response?.data?.message || '컨테이너 저장에 실패했습니다')
    }
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: '대기중',
      'in-transit': '운송중',
      arrived: '도착',
      delivered: '인도완료',
      cancelled: '취소',
      delayed: '지연중',
    }
    return texts[status] || status
  }

  // 컨테이너 상태 자동 계산
  const calculateContainerStatus = (container: any) => {
    // 이미 입고 완료된 것은 그대로 유지
    if (container.status === 'delivered') {
      return 'delivered'
    }

    const today = dayjs().startOf('day')
    const factoryEta = container.factoryEta ? dayjs(container.factoryEta).startOf('day') : null
    const etd = container.etd ? dayjs(container.etd).startOf('day') : null

    // 공장 ETA가 지났으면 지연중
    if (factoryEta && factoryEta.isBefore(today)) {
      return 'delayed'
    }

    // ETD가 오늘 이후면 운송중
    if (etd && (etd.isBefore(today) || etd.isSame(today))) {
      return 'in-transit'
    }

    // 기본값은 기존 상태 유지
    return container.status || 'pending'
  }

  // Tabulator용 데이터 변환
  const getTableData = () => {
    const containerData = containers.map((container) => ({
      id: container._id || `temp-${Math.random()}`,
      containerNumber: container.shippingType === 'air' ? (container.trackingNumber || '') : (container.containerNumber || ''),
      shippingType: container.shippingType || 'sea',
      destination: container.company ? `${container.company.code} - ${container.company.name}` : (container.destination || ''),
      shippingLine: container.shippingType === 'air' ? (container.airline || '') : (container.shippingLine || ''),
      vesselName: container.shippingType === 'air' ? (container.flightNumber || '') : (container.vesselName || ''),
      voyageNumber: container.voyageNumber || '',
      etd: container.etd ? dayjs(container.etd).format('YYYY-MM-DD') : '',
      portEta: container.portEta ? dayjs(container.portEta).format('YYYY-MM-DD') : '',
      factoryEta: container.factoryEta ? dayjs(container.factoryEta).format('YYYY-MM-DD') : '',
      status: getStatusText(container.status),
      quantity: (container.palletCount || container.partCount) ? String((container.palletCount || 0) + (container.partCount || 0)) : '',
      notes: container.notes || '',
      // 숨겨진 필드
      _id: container._id || '',
      shipmentType: container.shipmentType || 'project',
      companyId: container.company?._id || '',
      palletProjectId: container.palletProject?._id || '',
    }))
    
    // 기본 빈 행 2-3개 추가
    const emptyRows = []
    const emptyRowCount = Math.max(0, 3 - containerData.length)
    for (let i = 0; i < emptyRowCount; i++) {
      emptyRows.push({
        id: `empty-${Date.now()}-${i}`,
        containerNumber: '',
        shippingType: 'sea',
        destination: '',
        shippingLine: '',
        vesselName: '',
        voyageNumber: '',
        etd: '',
        portEta: '',
        factoryEta: '',
        status: '대기중',
        quantity: '',
        notes: '',
        _id: '',
        shipmentType: 'project',
        companyId: filterCompany || '',
        palletProjectId: selectedPalletProject || '',
      })
    }
    
    return [...containerData, ...emptyRows]
  }

  // 합계 계산
  const updateSummary = useCallback(() => {
    if (!selectedPalletProject) {
      setSummaryData({ totalPallets: 0, totalParts: 0 })
      return
    }

    const tableData = getTableData()
    let totalQuantity = 0

    tableData.forEach((row) => {
      if (row.palletProjectId === selectedPalletProject) {
        const quantity = parseFloat(row.quantity) || 0
        if (!isNaN(quantity)) totalQuantity += quantity
      }
    })

    setSummaryData((prev) => {
      if (prev.totalPallets === totalQuantity && prev.totalParts === 0) {
        return prev
      }
      return { totalPallets: totalQuantity, totalParts: 0 }
    })
  }, [selectedPalletProject, containers])

  useEffect(() => {
    if (selectedPalletProject) {
      const timer = setTimeout(() => {
        updateSummary()
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setSummaryData({ totalPallets: 0, totalParts: 0 })
    }
  }, [selectedPalletProject, updateSummary])

  // Tabulator 컬럼 정의
  const columns: any[] = [
    { 
      title: '컨테이너번호/추적번호', 
      field: 'containerNumber', 
      width: 150,
      frozen: true,
      editor: 'input',
    },
    {
      title: '운송유형', 
      field: 'shippingType', 
      width: 100,
      editor: 'select',
      editorParams: {
        values: { sea: 'sea', air: 'air' }
      },
    },
    {
      title: '출발지',
      field: 'origin', 
      width: 80, 
      frozen: true,
      editor: 'input',
    },
    { 
      title: '도착지(법인)', 
      field: 'destination', 
      width: 300,
      editor: (cell: any, onRendered: any, success: any) => {
        const input = document.createElement('select')
        input.style.width = '100%'
        input.style.padding = '4px'
        input.style.border = '2px solid #1890ff'
        
        const emptyOption = document.createElement('option')
        emptyOption.value = ''
        emptyOption.textContent = '법인을 선택하세요'
        input.appendChild(emptyOption)
        
        companies.forEach((company) => {
          const option = document.createElement('option')
          option.value = `${company.code} - ${company.name}`
          option.textContent = `${company.code} - ${company.name}`
          input.appendChild(option)
        })
        
        input.value = cell.getValue() || ''
        
        input.addEventListener('change', () => {
          success(input.value)
        })
        
        input.addEventListener('blur', () => {
          success(input.value)
        })
        
        onRendered(() => {
          input.focus()
        })
        
        return input
      },
    },
    { title: '선사/항공사', field: 'shippingLine', width: 120, editor: 'input' },
    { title: '선박명/항공편명', field: 'vesselName', width: 120, editor: 'input' },
    { title: '항차', field: 'voyageNumber', width: 80, editor: 'input' },
    {
      title: 'ETD',
      field: 'etd', 
      width: 100,
      formatter: (cell: any) => {
        const value = cell.getValue()
        if (!value) return ''
        return `<div style="display: flex; align-items: center; gap: 4px;">
          <span style="font-size: 14px; flex-shrink: 0;">📅</span>
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${value}</span>
        </div>`
      },
      editor: (cell: any, onRendered: any, success: any) => {
        const input = document.createElement('input')
        input.type = 'date'
        input.style.width = '100%'
        input.style.padding = '4px'
        input.style.border = '2px solid #1890ff'
        input.value = cell.getValue() || ''
        
        input.addEventListener('change', () => {
          success(input.value)
        })
        
        input.addEventListener('blur', () => {
          success(input.value)
        })
        
        onRendered(() => {
          input.focus()
          if ('showPicker' in input && typeof input.showPicker === 'function') {
            try {
              input.showPicker()
            } catch (e) {
              // 무시
            }
          }
        })
        
        return input
      },
    },
    { 
      title: '항구ETA', 
      field: 'portEta', 
      width: 100,
      formatter: (cell: any) => {
        const value = cell.getValue()
        if (!value) return ''
        return `<div style="display: flex; align-items: center; gap: 4px;">
          <span style="font-size: 14px; flex-shrink: 0;">📅</span>
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${value}</span>
        </div>`
      },
      editor: (cell: any, onRendered: any, success: any) => {
        const input = document.createElement('input')
        input.type = 'date'
        input.style.width = '100%'
        input.style.padding = '4px'
        input.style.border = '2px solid #1890ff'
        input.value = cell.getValue() || ''
        
        input.addEventListener('change', () => {
          success(input.value)
        })
        
        input.addEventListener('blur', () => {
          success(input.value)
        })
        
        onRendered(() => {
          input.focus()
          if ('showPicker' in input && typeof input.showPicker === 'function') {
            try {
              input.showPicker()
            } catch (e) {
              // 무시
            }
          }
        })
        
        return input
      },
    },
    { 
      title: '공장ETA', 
      field: 'factoryEta', 
      width: 100,
      formatter: (cell: any) => {
        const value = cell.getValue()
        if (!value) return ''
        return `<div style="display: flex; align-items: center; gap: 4px;">
          <span style="font-size: 14px; flex-shrink: 0;">📅</span>
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${value}</span>
        </div>`
      },
      editor: (cell: any, onRendered: any, success: any) => {
        const input = document.createElement('input')
        input.type = 'date'
        input.style.width = '100%'
        input.style.padding = '4px'
        input.style.border = '2px solid #1890ff'
        input.value = cell.getValue() || ''
        
        input.addEventListener('change', () => {
          success(input.value)
        })
        
        input.addEventListener('blur', () => {
          success(input.value)
        })
        
        onRendered(() => {
          input.focus()
          if ('showPicker' in input && typeof input.showPicker === 'function') {
            try {
              input.showPicker()
            } catch (e) {
              // 무시
            }
          }
        })
        
        return input
      },
    },
    { title: '상태', field: 'status', width: 80, editor: 'input' },
    { 
      title: '수량', 
      field: 'quantity', 
      width: 100,
      editor: 'number',
    },
    { title: '비고', field: 'notes', width: 250, editor: 'input' },
  ]

  // 저장 처리
  const handleSave = async () => {
    // state에서 직접 데이터 가져오기
    let data = tableData.length > 0 ? tableData : getTableData()
    
    // 테이블 인스턴스가 있으면 최신 데이터 가져오기 시도 (선택적)
    if (tableInstanceRef.current) {
      try {
        const tableDataFromInstance = tableInstanceRef.current.getData()
        if (tableDataFromInstance && tableDataFromInstance.length > 0) {
          data = tableDataFromInstance
          // state도 업데이트
          setTableData(tableDataFromInstance)
        }
      } catch (e) {
        console.warn('테이블 인스턴스에서 데이터를 가져올 수 없습니다. state 데이터 사용:', e)
      }
    } else {
      // 테이블 인스턴스가 없으면 DOM에서 직접 찾기 시도 (선택적)
      const container = document.getElementById('tabulator-container')
      if (container) {
        const tableElement = container.querySelector('.tabulator') as HTMLElement
        if (tableElement) {
          // @ts-expect-error - Tabulator 인스턴스는 DOM 요소에 저장됨
          const table = tableElement.tabulator
          if (table && typeof table.getData === 'function') {
            try {
              const tableDataFromDOM = table.getData()
              if (tableDataFromDOM && tableDataFromDOM.length > 0) {
                data = tableDataFromDOM
                setTableData(tableDataFromDOM)
                tableInstanceRef.current = table
              }
            } catch (e) {
              console.warn('DOM에서 테이블 데이터를 가져올 수 없습니다. state 데이터 사용:', e)
            }
          }
        }
      }
    }

    const results = {
      success: 0,
      errors: 0,
      errorsList: [] as any[],
    }

    message.loading({ content: '저장 중...', key: 'save' })

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (!row.containerNumber && !row.trackingNumber) continue

      try {
        const rowData: any = {
          shippingType: row.shippingType || 'sea',
          origin: row.origin || 'Korea',
          destination: row.destination || '',
          shipmentType: row.shipmentType || 'project',
        }

        // 운송 유형에 따라 필드 설정
        if (row.shippingType === 'air') {
          rowData.trackingNumber = row.containerNumber
          rowData.airline = row.shippingLine
          rowData.flightNumber = row.vesselName
        } else {
          rowData.containerNumber = row.containerNumber?.toUpperCase()
          rowData.shippingLine = row.shippingLine
          rowData.vesselName = row.vesselName
        }

        rowData.voyageNumber = row.voyageNumber

        // 도착지에서 법인 코드 추출
        const destinationMatch = row.destination?.match(/^([^-]+)\s*-\s*(.+)$/)
        if (destinationMatch) {
          const companyCode = destinationMatch[1].trim()
          const companyName = destinationMatch[2].trim()
          const company = companies.find((c) => c.code === companyCode)
          if (company) {
            rowData.company = company._id
            rowData.destination = companyName
          } else {
            rowData.destination = row.destination
          }
        } else {
          rowData.destination = row.destination || ''
        }

        // 법인 설정
        if (row.companyId) {
          rowData.company = row.companyId
        } else if (filterCompany) {
          rowData.company = filterCompany
        }

        // 프로젝트 설정
        if (row.shipmentType === 'project') {
          if (selectedPalletProject) {
            rowData.palletProject = selectedPalletProject
          } else if (row.palletProjectId) {
            rowData.palletProject = row.palletProjectId
          } else {
            results.errors++
            results.errorsList.push({
              row: i + 1,
              message: '프로젝트 선적의 경우 팔렛트 프로젝트를 선택해주세요',
            })
            continue
          }
        }

        // 상태 처리
        const statusMap: Record<string, string> = {
          대기중: 'pending',
          운송중: 'in-transit',
          도착: 'arrived',
          인도완료: 'delivered',
          취소: 'cancelled',
        }
        if (row.status && statusMap[row.status]) {
          rowData.status = statusMap[row.status]
        } else {
          rowData.status = 'pending'
        }

        // 날짜 필드 처리
        if (row.etd) rowData.etd = dayjs(row.etd).toISOString()
        if (row.portEta) rowData.portEta = dayjs(row.portEta).toISOString()
        if (row.factoryEta) rowData.factoryEta = dayjs(row.factoryEta).toISOString()

        // 수량 처리
        if (row.quantity) {
          const qty = parseFloat(row.quantity.toString().replace(/,/g, ''))
          if (!isNaN(qty)) {
            rowData.palletCount = qty
          }
        }

        rowData.notes = row.notes || ''

        if (row._id && row._id.startsWith('temp-')) {
          // 새로 추가된 행
          await api.post('/containers', rowData)
          results.success++
        } else if (row._id) {
          // 기존 행 수정
          await api.put(`/containers/${row._id}`, rowData)
          results.success++
        } else {
          // 새로 추가된 행
          await api.post('/containers', rowData)
          results.success++
        }
      } catch (error: any) {
        results.errors++
        results.errorsList.push({
          row: i + 1,
          message: error.response?.data?.message || '저장 실패',
        })
      }
    }

    if (results.errors > 0) {
      message.warning({
        content: `저장 완료: 성공 ${results.success}건, 실패 ${results.errors}건`,
        key: 'save',
      })
      console.error('저장 오류:', results.errorsList)
    } else {
      message.success({ content: `성공적으로 저장되었습니다: ${results.success}건`, key: 'save' })
    }

    fetchContainers()
  }

  const handleAddRow = () => {
    const newRow = {
      id: `temp-${Date.now()}-${Math.random()}`,
      containerNumber: '',
      shippingType: 'sea',
      destination: '',
      shippingLine: '',
      vesselName: '',
      voyageNumber: '',
      etd: '',
      portEta: '',
      factoryEta: '',
      status: '대기중',
      quantity: '',
      notes: '',
      shipmentType: 'project',
      companyId: filterCompany || '',
      palletProjectId: selectedPalletProject || '',
    }
    
    // state에 직접 추가 (맨 위에 추가)
    setTableData((prev) => [newRow, ...prev])
    message.success('행이 추가되었습니다')
    
    // 테이블 인스턴스가 있으면 스크롤
    setTimeout(() => {
      if (tableInstanceRef.current) {
        try {
          tableInstanceRef.current.scrollToRow(newRow.id, 'top', false)
        } catch (e) {
          // 무시
        }
      }
    }, 100)
  }

  // 등록 모드 진입
  const handleEnterEditMode = () => {
    setEditMode(true)
    // 편집 모드 진입 시 tableData 초기화 (기존 데이터 + 빈 행)
    const data = getTableData()
    setTableData(data)
  }

  // 편집 모드 종료
  const handleExitEditMode = () => {
    setEditMode(false)
    fetchContainers() // 데이터 새로고침
  }

  // 저장 후 편집 모드 종료
  const handleSaveAndExit = async () => {
    await handleSave()
    handleExitEditMode()
  }

  // 입고 완료 처리
  const handleReceiveContainer = async (containerId: string) => {
    try {
      await api.put(`/containers/${containerId}`, {
        status: 'delivered',
      })
      message.success('입고 완료 처리되었습니다')
      fetchContainers()
    } catch (error: any) {
      message.error(error.response?.data?.message || '입고 완료 처리에 실패했습니다')
    }
  }

  // 입고 취소 처리
  const handleCancelReceiveContainer = async (containerId: string) => {
    try {
      const container = containers.find((c) => c._id === containerId)
      if (!container) {
        message.error('컨테이너를 찾을 수 없습니다')
        return
      }

      // 자동 계산된 상태로 되돌리기
      const calculatedStatus = calculateContainerStatus({
        ...container,
        status: 'pending', // 임시로 pending으로 설정하여 계산
      })

      await api.put(`/containers/${containerId}`, {
        status: calculatedStatus,
      })
      message.success('입고 취소 처리되었습니다')
      fetchContainers()
    } catch (error: any) {
      message.error(error.response?.data?.message || '입고 취소 처리에 실패했습니다')
    }
  }

  // Ant Design Table 컬럼 정의 (읽기 전용)
  const tableColumns = [
    {
      title: '컨테이너번호/추적번호',
      dataIndex: 'containerNumber',
      key: 'containerNumber',
      width: 150,
    },
    {
      title: '운송유형',
      dataIndex: 'shippingType',
      key: 'shippingType',
      width: 100,
      render: (text: string) => text === 'air' ? '항공' : '해상',
    },
    {
      title: '도착지(법인)',
      dataIndex: 'destination',
      key: 'destination',
      width: 200,
    },
    {
      title: '선사/항공사',
      dataIndex: 'shippingLine',
      key: 'shippingLine',
      width: 120,
    },
    {
      title: '선박명/항공편명',
      dataIndex: 'vesselName',
      key: 'vesselName',
      width: 120,
    },
    {
      title: '항차',
      dataIndex: 'voyageNumber',
      key: 'voyageNumber',
      width: 80,
    },
    {
      title: 'ETD',
      dataIndex: 'etd',
      key: 'etd',
      width: 100,
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD') : '',
    },
    {
      title: '항구ETA',
      dataIndex: 'portEta',
      key: 'portEta',
      width: 100,
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD') : '',
    },
    {
      title: '공장ETA',
      dataIndex: 'factoryEta',
      key: 'factoryEta',
      width: 100,
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD') : '',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: any) => {
        // 실제 컨테이너 객체 찾기
        const container = containers.find((c) => {
          const containerId = c.shippingType === 'air' ? c.trackingNumber : c.containerNumber
          return containerId === record.containerNumber
        })
        
        if (!container) {
          const statusText = getStatusText(status)
          const colorMap: Record<string, string> = {
            '대기중': 'default',
            '운송중': 'processing',
            '도착': 'success',
            '인도완료': 'success',
            '취소': 'error',
            '지연중': 'warning',
          }
          return <Tag color={colorMap[statusText] || 'default'}>{statusText}</Tag>
        }

        // 상태 자동 계산
        const calculatedStatus = calculateContainerStatus(container)
        const statusText = getStatusText(calculatedStatus)
        const colorMap: Record<string, string> = {
          '대기중': 'default',
          '운송중': 'processing',
          '도착': 'success',
          '인도완료': 'success',
          '취소': 'error',
          '지연중': 'warning',
        }
        return <Tag color={colorMap[statusText] || 'default'}>{statusText}</Tag>
      },
    },
    {
      title: '수량',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (text: string) => {
        const quantity = parseFloat(text) || 0
        return quantity > 0 ? quantity.toLocaleString() : ''
      },
    },
    {
      title: '비고',
      dataIndex: 'notes',
      key: 'notes',
      width: 150,
    },
    {
      title: '작업',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        const container = containers.find((c) => {
          const containerId = c.shippingType === 'air' ? c.trackingNumber : c.containerNumber
          return containerId === record.containerNumber
        })
        
        if (!container || !container._id) return null
        
        // 상태 자동 계산
        const calculatedStatus = calculateContainerStatus(container)
        const containerId = container._id // 타입 가드를 위해 변수에 할당
        
        // 인도완료 상태가 아닐 때만 입고 버튼 표시
        if (calculatedStatus !== 'delivered') {
          return (
            <Popconfirm
              title="입고 완료 처리"
              description="이 컨테이너를 입고 완료 상태로 변경하시겠습니까?"
              onConfirm={() => handleReceiveContainer(containerId)}
              okText="확인"
              cancelText="취소"
            >
          <Button
                type="primary" 
                size="small" 
                icon={<InboxOutlined />}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
                입고
          </Button>
            </Popconfirm>
          )
        }
        
        return (
          <Space>
            <Tag color="success" style={{ margin: 0 }}>
              입고완료
            </Tag>
            <Popconfirm
              title="입고 취소"
              description="입고 완료 상태를 취소하시겠습니까?"
              onConfirm={() => handleCancelReceiveContainer(containerId)}
              okText="확인"
              cancelText="취소"
            >
          <Button
            type="link"
                size="small" 
            danger
                style={{ padding: 0, height: 'auto' }}
          >
                취소
          </Button>
            </Popconfirm>
        </Space>
        )
      },
    },
  ]

  // Ant Design Table용 데이터 변환
  const getTableDataSource = () => {
    return containers.map((container) => ({
      key: container._id,
      containerNumber: container.shippingType === 'air' ? (container.trackingNumber || '') : (container.containerNumber || ''),
      shippingType: container.shippingType || 'sea',
      destination: container.company ? `${container.company.code} - ${container.company.name}` : (container.destination || ''),
      shippingLine: container.shippingType === 'air' ? (container.airline || '') : (container.shippingLine || ''),
      vesselName: container.shippingType === 'air' ? (container.flightNumber || '') : (container.vesselName || ''),
      voyageNumber: container.voyageNumber || '',
      etd: container.etd ? dayjs(container.etd).format('YYYY-MM-DD') : '',
      portEta: container.portEta ? dayjs(container.portEta).format('YYYY-MM-DD') : '',
      factoryEta: container.factoryEta ? dayjs(container.factoryEta).format('YYYY-MM-DD') : '',
      status: container.status,
      quantity: (container.palletCount || container.partCount) ? String((container.palletCount || 0) + (container.partCount || 0)) : '',
      notes: container.notes || '',
    }))
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>컨테이너 관리</h1>
        <Space>
          <Select
            placeholder="선적 유형"
            allowClear
            style={{ width: 120 }}
            value={filterShipmentType}
            onChange={setFilterShipmentType}
          >
            <Select.Option value="project">프로젝트 선적</Select.Option>
            <Select.Option value="general">일반 선적</Select.Option>
          </Select>
          <Select
            placeholder="법인 필터"
            allowClear
            style={{ width: 150 }}
            value={filterCompany}
            onChange={setFilterCompany}
          >
            {companies.map((company) => (
              <Select.Option key={company._id} value={company._id}>
                {company.code} - {company.name}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="팔렛트 프로젝트 필터"
            allowClear
            style={{ width: 200 }}
            value={filterProject}
            onChange={setFilterProject}
          >
            {palletProjects.map((project) => (
              <Select.Option key={project._id} value={project._id}>
                {project.projectCode} - {project.projectName}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="상태 필터"
            allowClear
            style={{ width: 120 }}
            value={filterStatus}
            onChange={setFilterStatus}
          >
            <Select.Option value="pending">대기중</Select.Option>
            <Select.Option value="in-transit">운송중</Select.Option>
            <Select.Option value="arrived">도착</Select.Option>
            <Select.Option value="delivered">인도완료</Select.Option>
            <Select.Option value="cancelled">취소</Select.Option>
          </Select>
          {!editMode && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleEnterEditMode}>
              등록
          </Button>
          )}
          {editMode && (
            <>
              <Button icon={<SaveOutlined />} onClick={handleSaveAndExit}>
                저장
              </Button>
              <Button onClick={handleExitEditMode}>
                취소
              </Button>
            </>
          )}
        </Space>
      </div>

      {!editMode ? (
        // 읽기 전용 테이블 모드
        <Card>
      <Table
            columns={tableColumns}
            dataSource={getTableDataSource()}
        scroll={{ x: 1500 }}
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              showTotal: (total) => `총 ${total}건`,
            }}
          />
        </Card>
      ) : (
        // 편집 모드 (Tabulator)
        <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space wrap>
            <Tag color="blue">Excel처럼 직접 편집할 수 있습니다</Tag>
            <Tag color="green">행 추가/삭제: 우클릭 메뉴 사용</Tag>
            <Tag color="orange">저장 버튼을 눌러 변경사항을 저장하세요</Tag>
            <Tag color="magenta">도착지: 법인 선택 가능</Tag>
          </Space>
          {selectedPalletProject && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
              행 추가
            </Button>
          )}
        </div>
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <span style={{ fontWeight: 'bold' }}>팔렛트 프로젝트 선택:</span>
              <Select
                placeholder="팔렛트 프로젝트를 선택하세요"
                allowClear
                style={{ width: 300 }}
                value={selectedPalletProject}
                onChange={setSelectedPalletProject}
              >
                {palletProjects.map((project) => (
                  <Select.Option key={project._id} value={project._id}>
                    {project.projectCode} - {project.projectName}
                  </Select.Option>
                ))}
              </Select>
            </Space>
          </Space>
        </div>
        {selectedPalletProject ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <Card size="small" style={{ backgroundColor: '#f0f2f5' }}>
                <Space>
                  {(() => {
                    const project = palletProjects.find((p) => p._id === selectedPalletProject)
                    return (
                      <>
                        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                          <strong>프로젝트:</strong> {project?.projectCode} - {project?.projectName}
                        </Tag>
                        <Tag color="green" style={{ fontSize: '14px', padding: '4px 12px' }}>
                          <strong>총 수량:</strong> {summaryData.totalPallets.toLocaleString()}개
                        </Tag>
                      </>
                    )
                  })()}
                </Space>
              </Card>
            </div>
            <div style={{ height: '600px', overflow: 'auto' }} id="tabulator-container">
          <ReactTabulator
            data={tableData}
            columns={columns}
            options={{
              height: '600px',
              layout: 'fitColumns',
              movableColumns: true,
              resizableColumns: true,
              tooltips: true,
              addRowPos: 'bottom',
              history: true,
              pagination: false,
              paginationSize: 50,
              paginationCounter: 'rows',
              placeholder: '데이터가 없습니다',
              headerSort: true,
              footerElement: '<div style="padding: 10px;">Excel처럼 직접 편집할 수 있습니다</div>',
            }}
            events={{
              cellEdited: (cell: any) => {
                console.log('셀 편집됨:', cell.getField(), cell.getValue())
                // state 업데이트
                if (tableInstanceRef.current) {
                  try {
                    const updatedData = tableInstanceRef.current.getData()
                    setTableData(updatedData)
                  } catch (e) {
                    console.warn('데이터 업데이트 실패:', e)
                  }
                }
                if (selectedPalletProject && (cell.getField() === 'quantity')) {
                  updateSummary()
                }
              },
              rowAdded: (row: any) => {
                console.log('행 추가됨:', row.getData())
                // state 업데이트
                if (tableInstanceRef.current) {
                  try {
                    const updatedData = tableInstanceRef.current.getData()
                    setTableData(updatedData)
                  } catch (e) {
                    console.warn('데이터 업데이트 실패:', e)
                  }
                }
              },
              rowDeleted: () => {
                // state 업데이트
                if (tableInstanceRef.current) {
                  try {
                    const updatedData = tableInstanceRef.current.getData()
                    setTableData(updatedData)
                  } catch (e) {
                    console.warn('데이터 업데이트 실패:', e)
                  }
                }
              },
              tableBuilt: () => {
                // tableBuilt 이벤트는 table 인스턴스를 전달하지 않으므로 DOM에서 찾기
                setTimeout(() => {
                  const container = document.getElementById('tabulator-container')
                  if (container) {
                    const tableElement = container.querySelector('.tabulator') as HTMLElement
                    if (tableElement) {
                      // data-instance 속성에서 인스턴스 ID 가져오기
                      const instanceId = tableElement.getAttribute('data-instance')
                      if (instanceId) {
                        // Tabulator 전역 객체에서 인스턴스 찾기
                        // @ts-expect-error - Tabulator 전역 객체
                        const Tabulator = (window as any).Tabulator
                        if (Tabulator) {
                          // @ts-expect-error - Tabulator 인스턴스 찾기
                          const instances = Tabulator.prototype?.instances || Tabulator.instances || {}
                          const foundTable = instances[instanceId]
                          if (foundTable) {
                            tableInstanceRef.current = foundTable
                            console.log('테이블 인스턴스 저장 완료:', foundTable)
                          } else {
                            // 직접 DOM 요소에서 찾기
                            // @ts-expect-error
                            const tabulatorInstance = tableElement.tabulator
                            if (tabulatorInstance) {
                              tableInstanceRef.current = tabulatorInstance
                              console.log('DOM에서 테이블 인스턴스 찾아서 저장 완료')
                            }
                          }
                        } else {
                          // @ts-expect-error
                          const tabulatorInstance = tableElement.tabulator
                          if (tabulatorInstance) {
                            tableInstanceRef.current = tabulatorInstance
                            console.log('DOM에서 테이블 인스턴스 찾아서 저장 완료')
                          }
                        }
                      }
                    }
                  }
                }, 200)
              },
            }}
          />
        </div>
          </>
        ) : (
          <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center', 
            color: '#999',
            fontSize: '16px'
          }}>
            팔렛트 프로젝트를 선택하면 컨테이너를 등록할 수 있습니다
          </div>
        )}
        </Card>
      )}

      <Modal
        title={editingContainer ? '컨테이너 수정' : '컨테이너 등록'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="shippingType" label="운송 유형" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="sea">해상</Select.Option>
                  <Select.Option value="air">항공</Select.Option>
            </Select>
          </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="shipmentType" label="선적 유형" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="project">프로젝트 선적</Select.Option>
                  <Select.Option value="general">일반 선적</Select.Option>
                </Select>
          </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="containerNumber" label="컨테이너 번호" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="trackingNumber" label="추적 번호">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="palletProject" label="팔렛트 프로젝트">
                <Select showSearch optionFilterProp="children">
                  {palletProjects.map((project) => (
                    <Select.Option key={project._id} value={project._id}>
                      {project.projectCode} - {project.projectName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="company" label="법인" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="children">
                  {companies.map((company) => (
                    <Select.Option key={company._id} value={company._id}>
                      {company.code} - {company.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="origin" label="출발지" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="destination" label="도착지" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="etd" label="ETD">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="portEta" label="항구ETA">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="factoryEta" label="공장ETA">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="상태">
                <Select>
                  <Select.Option value="pending">대기중</Select.Option>
                  <Select.Option value="in-transit">운송중</Select.Option>
                  <Select.Option value="arrived">도착</Select.Option>
                  <Select.Option value="delivered">인도완료</Select.Option>
                  <Select.Option value="cancelled">취소</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="비고">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Containers
