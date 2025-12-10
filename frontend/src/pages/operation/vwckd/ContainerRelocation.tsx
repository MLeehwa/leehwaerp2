import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { 
  Card, Button, Input, Table, Space, message, Modal, Checkbox, 
  InputNumber, Tag, Divider 
} from 'antd'
import { 
  SwapOutlined, SearchOutlined, DownloadOutlined, 
  PrinterOutlined, CheckCircleOutlined 
} from '@ant-design/icons'
import api from '../../../utils/api'

const ContainerRelocation: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [loading, setLoading] = useState(false)
  const [containerCases, setContainerCases] = useState<any[]>([])
  const [containerNo, setContainerNo] = useState('')
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set())
  const [relocationModalVisible, setRelocationModalVisible] = useState(false)
  const [toLocation, setToLocation] = useState('')
  const [caseSearchVisible, setCaseSearchVisible] = useState(false)
  const [caseSearchNo, setCaseSearchNo] = useState('')

  const searchContainer = async () => {
    if (!containerNo.trim()) {
      message.warning('컨테이너 번호를 입력하세요')
      return
    }
    setLoading(true)
    try {
      const response = await api.get(`/vwckd/relocation/containers/${containerNo}/cases`, {
        params: { projectId }
      })
      setContainerCases(response.data)
      setSelectedCases(new Set())
      if (response.data.length === 0) {
        message.warning('In Stock 상태인 케이스가 없습니다')
      } else {
        message.success(`${response.data.length}개의 케이스를 찾았습니다`)
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '컨테이너 검색에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCase = (caseId: string, checked: boolean) => {
    const newSelected = new Set(selectedCases)
    if (checked) {
      newSelected.add(caseId)
    } else {
      newSelected.delete(caseId)
    }
    setSelectedCases(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCases(new Set(containerCases.map((c: any) => c._id)))
    } else {
      setSelectedCases(new Set())
    }
  }

  const handleRelocate = async () => {
    if (selectedCases.size === 0) {
      message.warning('재배치할 케이스를 선택하세요')
      return
    }

    if (!toLocation.trim()) {
      message.warning('새 위치를 입력하세요 (예: A-1, B-2)')
      return
    }

    setLoading(true)
    try {
      const casesToRelocate = containerCases.filter((c: any) => selectedCases.has(c._id))
      
      const response = await api.post('/vwckd/relocation', {
        cases: casesToRelocate,
        toLocation: toLocation.trim(),
        projectId,
      })

      if (response.data.errors && response.data.errors.length > 0) {
        message.warning(`${response.data.message} (오류: ${response.data.errors.length}건)`)
      } else {
        message.success(response.data.message || '케이스가 재배치되었습니다')
      }

      setRelocationModalVisible(false)
      setToLocation('')
      setSelectedCases(new Set())
      await searchContainer() // 목록 새로고침
    } catch (error: any) {
      message.error(error.response?.data?.message || '재배치에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (projectId) params.projectId = projectId
      
      const response = await api.get('/vwckd/relocation/export', {
        params,
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `relocation_export_${Date.now()}.csv`)
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

  const handleReprintCase = async () => {
    if (!caseSearchNo.trim()) {
      message.warning('케이스 번호를 입력하세요')
      return
    }

    setLoading(true)
    try {
      // 케이스 정보 조회
      const inventoryResponse = await api.get('/vwckd/inventory', {
        params: { caseNumber: caseSearchNo, projectId }
      })

      if (!inventoryResponse.data || inventoryResponse.data.length === 0) {
        message.warning('케이스를 찾을 수 없습니다')
        return
      }

      const caseItem = inventoryResponse.data[0]
      if (!caseItem.location) {
        message.warning('이 케이스에는 위치가 할당되지 않았습니다')
        return
      }

      // 라벨 출력
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Case Label - ${caseItem.caseNumber || caseSearchNo}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page { size: 4in 2in; margin: 0.2cm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 10px; font-size: 12px; }
            .label { border: 2px solid #000; padding: 10px; text-align: center; }
            .case-no { font-size: 18px; font-weight: bold; margin: 10px 0; }
            .container-no { font-size: 14px; margin: 5px 0; }
            .location { font-size: 12px; color: #666; margin: 5px 0; }
            .barcode { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="case-no">${caseItem.caseNumber || caseSearchNo}</div>
            <div class="container-no">Container: ${caseItem.containerNo || '-'}</div>
            ${caseItem.location ? `<div class="location">Location: ${caseItem.location}</div>` : ''}
            <div class="barcode">
              <svg id="barcode-${caseItem.caseNumber || caseSearchNo}"></svg>
            </div>
          </div>
          <script>
            JsBarcode('#barcode-${caseItem.caseNumber || caseSearchNo}', '${caseItem.caseNumber || caseSearchNo}', {
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
      
      setCaseSearchVisible(false)
      setCaseSearchNo('')
    } catch (error: any) {
      message.error('케이스 검색에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: (
        <Checkbox
          checked={selectedCases.size === containerCases.length && containerCases.length > 0}
          indeterminate={selectedCases.size > 0 && selectedCases.size < containerCases.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      key: 'select',
      width: 50,
      render: (_: any, record: any) => (
        <Checkbox
          checked={selectedCases.has(record._id)}
          onChange={(e) => handleSelectCase(record._id, e.target.checked)}
        />
      ),
    },
    {
      title: 'Case No',
      dataIndex: 'caseNumber',
      key: 'caseNumber',
    },
    {
      title: 'Container No',
      dataIndex: 'containerNo',
      key: 'containerNo',
    },
    {
      title: 'Current Location',
      dataIndex: 'location',
      key: 'location',
      render: (location: string) => location || <span style={{ color: '#999' }}>No location</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'In Stock' ? 'green' : 'orange'}>{status}</Tag>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: 8 }}>Container Relocation</h2>
        <p style={{ color: '#666' }}>Move cases from containers to new locations</p>
      </div>

      {/* Container Search */}
      <Card style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', marginBottom: 16 }} direction="vertical" size="middle">
          <Space>
            <Input
              placeholder="Enter container number"
              value={containerNo}
              onChange={(e) => setContainerNo(e.target.value)}
              style={{ width: 300 }}
              onPressEnter={searchContainer}
              allowClear
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={searchContainer} loading={loading}>
              Search Cases
            </Button>
            <Button onClick={() => {
              setContainerNo('')
              setContainerCases([])
              setSelectedCases(new Set())
            }}>
              Clear
            </Button>
          </Space>
          {containerCases.length > 0 && (
            <Space>
              <Button
                type="primary"
                icon={<SwapOutlined />}
                disabled={selectedCases.size === 0}
                onClick={() => setRelocationModalVisible(true)}
              >
                Relocate Selected Cases ({selectedCases.size})
              </Button>
              <Button
                icon={<PrinterOutlined />}
                onClick={() => setCaseSearchVisible(true)}
              >
                Re-print Label
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                Export Data
              </Button>
            </Space>
          )}
        </Space>
      </Card>

      {/* Cases List */}
      <Card>
        {containerCases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            컨테이너 번호를 입력하고 검색하세요
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={containerCases}
            loading={loading}
            rowKey="_id"
            pagination={{ pageSize: 20 }}
          />
        )}
      </Card>

      {/* Relocation Modal */}
      <Modal
        title="케이스 재배치"
        open={relocationModalVisible}
        onOk={handleRelocate}
        onCancel={() => {
          setRelocationModalVisible(false)
          setToLocation('')
        }}
        okText="재배치"
        cancelText="취소"
        confirmLoading={loading}
      >
        <div style={{ marginBottom: 16 }}>
          <p>선택된 케이스: <strong>{selectedCases.size}개</strong></p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>새 위치 *</label>
          <Input
            placeholder="예: A-1, B-2, C-3"
            value={toLocation}
            onChange={(e) => setToLocation(e.target.value)}
            onPressEnter={handleRelocate}
          />
          <p style={{ marginTop: 4, fontSize: '12px', color: '#999' }}>
            위치 형식: 문자-숫자 (예: A-1, B-2)
          </p>
        </div>
      </Modal>

      {/* Case Search Modal for Re-print */}
      <Modal
        title="케이스 라벨 재출력"
        open={caseSearchVisible}
        onOk={handleReprintCase}
        onCancel={() => {
          setCaseSearchVisible(false)
          setCaseSearchNo('')
        }}
        okText="출력"
        cancelText="취소"
        confirmLoading={loading}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Case No *</label>
          <Input
            placeholder="케이스 번호를 입력하세요"
            value={caseSearchNo}
            onChange={(e) => setCaseSearchNo(e.target.value)}
            onPressEnter={handleReprintCase}
          />
        </div>
      </Modal>
    </div>
  )
}

export default ContainerRelocation
