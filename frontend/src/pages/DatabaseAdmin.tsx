import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Select, Space, Tag, Card, Row, Col, InputNumber } from 'antd'
import { DatabaseOutlined, EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'

const { TextArea } = Input
const { Option } = Select

interface CollectionData {
  _id: string
  [key: string]: any
}

const DatabaseAdmin = () => {
  const [collections, setCollections] = useState<string[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [data, setData] = useState<CollectionData[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<CollectionData | null>(null)
  const [form] = Form.useForm()
  const [jsonEditorValue, setJsonEditorValue] = useState<any>({})
  const [searchText, setSearchText] = useState('')
  const [filterText, setFilterText] = useState('')

  useEffect(() => {
    fetchCollections()
  }, [])

  useEffect(() => {
    if (selectedCollection) {
      fetchData()
    }
  }, [selectedCollection, page, pageSize])

  const fetchCollections = async () => {
    try {
      const response = await api.get('/admin/database/collections')
      setCollections(response.data)
    } catch (error) {
      message.error('컬렉션 목록을 불러오는데 실패했습니다')
    }
  }

  const fetchData = async () => {
    if (!selectedCollection) return

    setLoading(true)
    try {
      const params: any = {
        page: page.toString(),
        limit: pageSize.toString(),
        sort: '_id',
        order: 'desc',
      }
      
      if (searchText) {
        params.search = searchText
      }
      
      if (filterText) {
        params.filter = filterText
      }

      const response = await api.get(`/admin/database/${selectedCollection}`, { params })
      setData(response.data.data)
      setTotal(response.data.total)
    } catch (error: any) {
      message.error(error.response?.data?.message || '데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (record: CollectionData) => {
    setSelectedRecord(record)
    setJsonEditorValue(record)
    form.setFieldsValue({ jsonData: JSON.stringify(record, null, 2) })
    setEditModalVisible(true)
  }

  const handleAdd = () => {
    setSelectedRecord(null)
    setJsonEditorValue({})
    form.resetFields()
    setAddModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    if (!selectedCollection) return
    
    Modal.confirm({
      title: '문서 삭제',
      content: '정말 이 문서를 삭제하시겠습니까?',
      onOk: async () => {
        try {
          await api.delete(`/admin/database/${selectedCollection}/${id}`)
          message.success('문서가 삭제되었습니다')
          fetchData()
        } catch (error: any) {
          message.error(error.response?.data?.message || '문서 삭제에 실패했습니다')
        }
      },
    })
  }

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields()
      let updateData: any

      try {
        updateData = JSON.parse(values.jsonData)
      } catch (e) {
        message.error('유효한 JSON 형식이 아닙니다')
        return
      }

      if (!selectedRecord?._id) return

      await api.put(`/admin/database/${selectedCollection}/${selectedRecord._id}`, updateData)
      message.success('문서가 수정되었습니다')
      setEditModalVisible(false)
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || '문서 수정에 실패했습니다')
    }
  }

  const handleAddSubmit = async () => {
    try {
      const values = await form.validateFields()
      let insertData: any

      try {
        insertData = JSON.parse(values.jsonData)
      } catch (e) {
        message.error('유효한 JSON 형식이 아닙니다')
        return
      }

      await api.post(`/admin/database/${selectedCollection}`, insertData)
      message.success('문서가 생성되었습니다')
      setAddModalVisible(false)
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.message || '문서 생성에 실패했습니다')
    }
  }

  const generateColumns = (): ColumnsType<CollectionData> => {
    if (data.length === 0) return []

    // 첫 번째 레코드의 키를 기반으로 컬럼 생성
    const keys = Object.keys(data[0])
    
    return keys.slice(0, 10).map(key => ({
      title: key,
      dataIndex: key,
      key,
      width: 150,
      ellipsis: true,
      render: (value: any) => {
        if (value === null || value === undefined) return '-'
        if (typeof value === 'object') {
          return <Tag color="blue">Object</Tag>
        }
        if (typeof value === 'boolean') {
          return <Tag color={value ? 'green' : 'red'}>{value.toString()}</Tag>
        }
        const str = String(value)
        return str.length > 50 ? str.substring(0, 50) + '...' : str
      },
    }))
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>
            <DatabaseOutlined /> 데이터베이스 관리
          </h1>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchCollections}>
              컬렉션 새로고침
            </Button>
            {selectedCollection && (
              <>
                <Button icon={<PlusOutlined />} type="primary" onClick={handleAdd}>
                  새 문서 추가
                </Button>
                <Button onClick={fetchData}>데이터 새로고침</Button>
              </>
            )}
          </Space>
        </div>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="컬렉션 선택"
              value={selectedCollection}
              onChange={(value) => {
                setSelectedCollection(value)
                setPage(1)
                setSearchText('')
                setFilterText('')
              }}
            >
              {collections.map(col => (
                <Option key={col} value={col}>{col}</Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <Input
              placeholder="검색어 입력 (모든 필드)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={fetchData}
              suffix={<SearchOutlined />}
            />
          </Col>
          <Col span={8}>
            <Input
              placeholder='필터 JSON (예: {"status":"active"})'
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onPressEnter={fetchData}
            />
          </Col>
        </Row>

        {selectedCollection && (
          <>
            <div style={{ marginBottom: 8 }}>
              <Tag color="blue">컬렉션: {selectedCollection}</Tag>
              <Tag>총 {total.toLocaleString()}개 문서</Tag>
            </div>

            <Table
              columns={[
                ...generateColumns(),
                {
                  title: '작업',
                  key: 'action',
                  width: 150,
                  fixed: 'right',
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
              ]}
              dataSource={data}
              loading={loading}
              rowKey="_id"
              scroll={{ x: 'max-content' }}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showTotal: (total) => `총 ${total.toLocaleString()}개`,
                onChange: (page, pageSize) => {
                  setPage(page)
                  setPageSize(pageSize)
                },
              }}
            />
          </>
        )}
      </Card>

      {/* 수정 모달 */}
      <Modal
        title={`문서 수정 - ${selectedCollection}`}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleEditSubmit}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="jsonData"
            label="JSON 데이터"
            rules={[{ required: true, message: 'JSON 데이터를 입력하세요' }]}
          >
            <TextArea
              rows={20}
              placeholder='{"field": "value"}'
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 추가 모달 */}
      <Modal
        title={`새 문서 추가 - ${selectedCollection}`}
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onOk={handleAddSubmit}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="jsonData"
            label="JSON 데이터"
            rules={[{ required: true, message: 'JSON 데이터를 입력하세요' }]}
          >
            <TextArea
              rows={20}
              placeholder='{"field": "value"}'
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DatabaseAdmin

