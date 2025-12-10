import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Button, Input, Select, Table, Space, message, Tag } from 'antd'
import { DatabaseOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons'
import api from '../../../utils/api'

const InventoryManagement: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [loading, setLoading] = useState(false)
  const [inventoryData, setInventoryData] = useState<any[]>([])
  const [searchType, setSearchType] = useState('case_no')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (searchTerm) {
      fetchInventory()
    }
  }, [projectId, searchType, searchTerm])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (projectId) params.projectId = projectId
      
      if (searchType === 'case_no' && searchTerm) {
        params.caseNumber = searchTerm
      } else if (searchType === 'container_no' && searchTerm) {
        params.containerNo = searchTerm
      } else if (searchType === 'location' && searchTerm) {
        params.location = searchTerm
      }
      
      const response = await api.get('/vwckd/inventory', { params })
      setInventoryData(response.data)
    } catch (error) {
      message.error('재고 데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (projectId) params.projectId = projectId
      
      if (searchType === 'case_no' && searchTerm) {
        params.caseNumber = searchTerm
      } else if (searchType === 'container_no' && searchTerm) {
        params.containerNo = searchTerm
      } else if (searchType === 'location' && searchTerm) {
        params.location = searchTerm
      }
      
      const response = await api.get('/vwckd/inventory/export', {
        params,
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `inventory_export_${Date.now()}.csv`)
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

  const columns = [
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
      title: 'Location',
      key: 'location',
      render: (_: any, record: any) => {
        const location = record.locationLetter && record.locationNumber 
          ? `${record.locationLetter}-${record.locationNumber}` 
          : record.location || '-'
        return location
      },
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
      render: (status: string) => {
        const colorMap: any = {
          'active': 'green',
          'shipped': 'blue',
          'damaged': 'red',
          'In Stock': 'green',
          'Shipped': 'blue',
          'Before Arrival': 'orange',
        }
        const color = colorMap[status] || 'default'
        return <Tag color={color}>{status}</Tag>
      },
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: 8 }}>Inventory Management</h2>
        <p style={{ color: '#666' }}>Search and manage warehouse inventory by Case No or Container No</p>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', marginBottom: 16 }}>
          <Select
            value={searchType}
            onChange={setSearchType}
            style={{ width: 150 }}
          >
            <Select.Option value="case_no">Case No</Select.Option>
            <Select.Option value="container_no">Container No</Select.Option>
            <Select.Option value="location">Location</Select.Option>
          </Select>
          <Input
            placeholder="Enter search term"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={fetchInventory} loading={loading}>
            Search
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport} loading={loading}>
            Export Data
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={inventoryData}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  )
}

export default InventoryManagement

