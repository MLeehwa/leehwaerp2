import { Form, Input, Button, Card, Typography, Select } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const { Title } = Typography
const { Option } = Select

const Register = () => {
  const navigate = useNavigate()
  const { register } = useAuth()

  const onFinish = async (values: any) => {
    try {
      await register(values)
      navigate('/accounting')
    } catch (error) {
      // 에러는 AuthContext에서 처리됨
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 500 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          회원가입
        </Title>
        <Form
          name="register"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="사용자명"
            rules={[{ required: true, message: '사용자명을 입력하세요' }, { min: 3, message: '최소 3자 이상이어야 합니다' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="사용자명" />
          </Form.Item>

          <Form.Item
            name="email"
            label="이메일"
            rules={[
              { required: true, message: '이메일을 입력하세요' },
              { type: 'email', message: '유효한 이메일을 입력하세요' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="이메일" />
          </Form.Item>

          <Form.Item
            name="password"
            label="비밀번호"
            rules={[{ required: true, message: '비밀번호를 입력하세요' }, { min: 6, message: '최소 6자 이상이어야 합니다' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
          </Form.Item>

          <Form.Item
            name="firstName"
            label="이름"
            rules={[{ required: true, message: '이름을 입력하세요' }]}
          >
            <Input placeholder="이름" />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="성"
            rules={[{ required: true, message: '성을 입력하세요' }]}
          >
            <Input placeholder="성" />
          </Form.Item>

          <Form.Item
            name="role"
            label="권한"
            initialValue="employee"
          >
            <Select>
              <Option value="employee">직원</Option>
              <Option value="manager">매니저</Option>
              <Option value="admin">관리자</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              회원가입
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default Register

