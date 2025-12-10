import { useState, useEffect } from 'react'
import { Table, Button, message, Modal, Form, Input, Select, InputNumber, DatePicker, Space, Tag } from 'antd'
import { CheckOutlined, EyeOutlined } from '@ant-design/icons'
import api from '../utils/api'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface PurchaseOrder {
  _id: string
  poNumber: string
  supplier?: {
    _id: string
    name: string
  }
  status: string
  items?: Array<{
    _id: string
    productName: string
    quantity: number
    receivedQuantity?: number
    unit: string
  }>
  orderDate: string
  expectedDeliveryDate?: string
}

const GoodsReceipt = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [receiptModalVisible, setReceiptModalVisible] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await api.get('/purchase-orders', {
        params: { status: 'approved' }
      })
      setOrders(response.data)
    } catch (error) {
      message.error('구매주문 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleReceive = (order: PurchaseOrder) => {
    setSelectedOrder(order)
    form.resetFields()
    // 기본값 설정
    const initialValues: any = {
      receiptDate: dayjs(),
    }
    if (order.items) {
      order.items.forEach((item, index) => {
        initialValues[`items.${index}.receivedQuantity`] = item.quantity - (item.receivedQuantity || 0)
      })
    }
    form.setFieldsValue(initialValues)
    setReceiptModalVisible(true)
  }

  const handleReceiveSubmit = async (values: any) => {
    try {
      if (!selectedOrder) return

      const receiptItems = selectedOrder.items?.map((item, index) => ({
        itemId: item._id,
        receivedQuantity: values.items?.[index]?.receivedQuantity || 0,
      })) || []

      await api.post(`/purchase-orders/${selectedOrder._id}/receive`, {
        receiptDate: values.receiptDate.toISOString(),
        items: receiptItems,
        userId: 'system', // TODO: 실제 사용자 ID
      })

      message.success('입고 처리가 완료되었습니다')
      setReceiptModalVisible(false)
      fetchOrders()
    } catch (error: any) {
      message.error(error.response?.data?.message || '입고 처리에 실패했습니다')
    }
  }

  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: 'PO 번호',
      dataIndex: 'poNumber',
      key: 'poNumber',
    },
    {
      title: '공급업체',
      key: 'supplier',
      render: (_, record) => record.supplier?.name || '-',
    },
    {
      title: '주문일',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '예상 납기일',
      dataIndex: 'expectedDeliveryDate',
      key: 'expectedDeliveryDate',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          draft: { text: '초안', color: 'default' },
          submitted: { text: '제출됨', color: 'processing' },
          approved: { text: '승인됨', color: 'success' },
          received: { text: '입고완료', color: 'success' },
          cancelled: { text: '취소됨', color: 'error' },
        }
        const statusInfo = statusMap[status] || { text: status, color: 'default' }
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
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
            onClick={() => {
              setSelectedOrder(record)
              // 상세 보기 모달 (추후 구현)
            }}
          >
            상세
          </Button>
          {record.status === 'approved' && (
            <Button
              type="link"
              icon={<CheckOutlined />}
              onClick={() => handleReceive(record)}
            >
              입고 처리
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>입고 관리</h2>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={`입고 처리 - ${selectedOrder?.poNumber}`}
        open={receiptModalVisible}
        onCancel={() => setReceiptModalVisible(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleReceiveSubmit}
        >
          <Form.Item
            name="receiptDate"
            label="입고일"
            rules={[{ required: true, message: '입고일을 선택하세요' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          {selectedOrder?.items && selectedOrder.items.length > 0 && (
            <div>
              <h4>입고 수량</h4>
              {selectedOrder.items.map((item, index) => (
                <Form.Item
                  key={item._id}
                  name={['items', index, 'receivedQuantity']}
                  label={`${item.productName} (주문: ${item.quantity} ${item.unit}, 입고: ${item.receivedQuantity || 0} ${item.unit})`}
                  rules={[
                    { required: true, message: '입고 수량을 입력하세요' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || value <= 0) {
                          return Promise.reject(new Error('입고 수량은 0보다 커야 합니다'))
                        }
                        const remaining = item.quantity - (item.receivedQuantity || 0)
                        if (value > remaining) {
                          return Promise.reject(new Error(`남은 수량(${remaining} ${item.unit})보다 클 수 없습니다`))
                        }
                        return Promise.resolve()
                      },
                    }),
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={item.quantity - (item.receivedQuantity || 0)}
                    addonAfter={item.unit}
                  />
                </Form.Item>
              ))}
            </div>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default GoodsReceipt

