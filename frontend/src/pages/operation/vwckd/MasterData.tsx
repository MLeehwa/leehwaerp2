import React, { useState, useEffect } from 'react'
import { Card, Button, Table, Space, message, Tabs, Modal, Form, Input, InputNumber, Select } from 'antd'
import { SettingOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../../../utils/api'

const MasterData: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('parts')
  const [partsData, setPartsData] = useState<any[]>([])
  const [racksData, setRacksData] = useState<any[]>([])
  const [locationsData, setLocationsData] = useState<any[]>([])
  const [form] = Form.useForm()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  useEffect(() => {
    if (activeTab === 'parts') fetchParts()
    else if (activeTab === 'racks') fetchRacks()
    else if (activeTab === 'locations') fetchLocations()
  }, [activeTab])

  const fetchParts = async () => {
    setLoading(true)
    try {
      const response = await api.get('/vwckd/master/parts')
      setPartsData(response.data)
    } catch (error) {
      message.error('부품 마스터 데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchRacks = async () => {
    setLoading(true)
    try {
      const response = await api.get('/vwckd/master/racks')
      setRacksData(response.data)
    } catch (error) {
      message.error('랙 마스터 데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    setLoading(true)
    try {
      const response = await api.get('/vwckd/master/locations')
      setLocationsData(response.data)
    } catch (error) {
      message.error('위치 마스터 데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: any) => {
    setEditingItem(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (record: any) => {
    try {
      let endpoint = ''
      if (activeTab === 'parts') endpoint = `/vwckd/master/parts/${record._id}`
      else if (activeTab === 'racks') endpoint = `/vwckd/master/racks/${record._id}`
      else if (activeTab === 'locations') endpoint = `/vwckd/master/locations/${record._id}`
      
      await api.delete(endpoint)
      message.success('삭제되었습니다')
      if (activeTab === 'parts') fetchParts()
      else if (activeTab === 'racks') fetchRacks()
      else if (activeTab === 'locations') fetchLocations()
    } catch (error: any) {
      message.error(error.response?.data?.message || '삭제에 실패했습니다')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      let endpoint = ''
      let method = 'POST'
      
      if (activeTab === 'parts') {
        endpoint = '/vwckd/master/parts'
        if (editingItem) {
          method = 'PUT'
          endpoint = `/vwckd/master/parts/${editingItem._id}`
        }
      } else if (activeTab === 'racks') {
        endpoint = '/vwckd/master/racks'
        if (editingItem) {
          method = 'PUT'
          endpoint = `/vwckd/master/racks/${editingItem._id}`
        }
      } else if (activeTab === 'locations') {
        endpoint = '/vwckd/master/locations'
        if (editingItem) {
          method = 'PUT'
          endpoint = `/vwckd/master/locations/${editingItem._id}`
        }
      }
      
      if (method === 'PUT') {
        await api.put(endpoint, values)
      } else {
        await api.post(endpoint, values)
      }
      
      message.success(editingItem ? '수정되었습니다' : '추가되었습니다')
      setModalVisible(false)
      form.resetFields()
      if (activeTab === 'parts') fetchParts()
      else if (activeTab === 'racks') fetchRacks()
      else if (activeTab === 'locations') fetchLocations()
    } catch (error: any) {
      message.error(error.response?.data?.message || '저장에 실패했습니다')
    }
  }

  const partsColumns = [
    { title: 'Part Number', dataIndex: 'partNumber', key: 'partNumber' },
    { title: 'Part Name', dataIndex: 'partName', key: 'partName' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Unit', dataIndex: 'unit', key: 'unit' },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Edit</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>Delete</Button>
        </Space>
      ),
    },
  ]

  const racksColumns = [
    { title: 'Rack Location', dataIndex: 'rackLocation', key: 'rackLocation' },
    { title: 'Zone', dataIndex: 'zone', key: 'zone' },
    { title: 'Aisle', dataIndex: 'aisle', key: 'aisle' },
    { title: 'Level', dataIndex: 'level', key: 'level' },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Edit</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>Delete</Button>
        </Space>
      ),
    },
  ]

  const locationsColumns = [
    { title: 'Letter', dataIndex: 'letter', key: 'letter' },
    { title: 'Number', dataIndex: 'number', key: 'number' },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity' },
    { title: 'Current Quantity', dataIndex: 'currentQuantity', key: 'currentQuantity' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Edit</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>Delete</Button>
        </Space>
      ),
    },
  ]

  const getFormFields = () => {
    if (activeTab === 'parts') {
      return (
        <>
          <Form.Item name="partNumber" label="Part Number" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="partName" label="Part Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="unit" label="Unit">
            <Input />
          </Form.Item>
          <Form.Item name="supplier" label="Supplier">
            <Input />
          </Form.Item>
        </>
      )
    } else if (activeTab === 'racks') {
      return (
        <>
          <Form.Item name="rackLocation" label="Rack Location" rules={[{ required: true }]}>
            <Input placeholder="e.g., 1-B-01" />
          </Form.Item>
          <Form.Item name="zone" label="Zone">
            <Input />
          </Form.Item>
          <Form.Item name="aisle" label="Aisle">
            <Input />
          </Form.Item>
          <Form.Item name="level" label="Level">
            <InputNumber />
          </Form.Item>
          <Form.Item name="capacity" label="Capacity" rules={[{ required: true }]}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
              <Select.Option value="maintenance">Maintenance</Select.Option>
            </Select>
          </Form.Item>
        </>
      )
    } else if (activeTab === 'locations') {
      return (
        <>
          <Form.Item name="letter" label="Letter" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="number" label="Number" rules={[{ required: true }]}>
            <InputNumber />
          </Form.Item>
          <Form.Item name="capacity" label="Capacity" rules={[{ required: true }]}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
            </Select>
          </Form.Item>
        </>
      )
    }
    return null
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: 8 }}>Master Data</h2>
        <p style={{ color: '#666' }}>Manage master data for parts, racks, and locations</p>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="Parts" key="parts">
            <Space style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Part</Button>
            </Space>
            <Table
              columns={partsColumns}
              dataSource={partsData}
              loading={loading}
              rowKey="_id"
              pagination={{ pageSize: 20 }}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Racks" key="racks">
            <Space style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Rack</Button>
            </Space>
            <Table
              columns={racksColumns}
              dataSource={racksData}
              loading={loading}
              rowKey="_id"
              pagination={{ pageSize: 20 }}
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Locations" key="locations">
            <Space style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Location</Button>
            </Space>
            <Table
              columns={locationsColumns}
              dataSource={locationsData}
              loading={loading}
              rowKey="_id"
              pagination={{ pageSize: 20 }}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingItem ? `Edit ${activeTab === 'parts' ? 'Part' : activeTab === 'racks' ? 'Rack' : 'Location'}` : `Add ${activeTab === 'parts' ? 'Part' : activeTab === 'racks' ? 'Rack' : 'Location'}`}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingItem(null)
        }}
        okText="Save"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical">
          {getFormFields()}
        </Form>
      </Modal>
    </div>
  )
}

export default MasterData

