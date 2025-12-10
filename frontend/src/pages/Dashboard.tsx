import { Card, Row, Col, Statistic } from 'antd'
import { ShoppingOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons'

const Dashboard = () => {
  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>대시보드</h1>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="총 매입채무"
              value={0}
              prefix="$"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="미지급 금액"
              value={0}
              prefix="$"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="진행 중인 구매주문"
              value={0}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="대기 중인 구매요청"
              value={0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard

