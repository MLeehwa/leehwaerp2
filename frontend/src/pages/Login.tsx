import { Form, Input, Button, Card, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const { Title } = Typography

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const onFinish = async (values: { loginId: string; password: string }) => {
    try {
      // 이메일 형식인지 확인
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.loginId);
      if (isEmail) {
        await login(values.loginId, values.password, 'email')
      } else {
        await login(values.loginId, values.password, 'username')
      }
      navigate('/accounting')
    } catch (error) {
      // 에러는 AuthContext에서 처리됨
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
          ERP 시스템 로그인
        </Title>
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="loginId"
            label="이메일 또는 아이디"
            rules={[
              { required: true, message: '이메일 또는 아이디를 입력하세요' },
            ]}
            tooltip="사용자 추가 시 입력한 이메일 또는 아이디를 입력하세요"
          >
            <Input prefix={<UserOutlined />} placeholder="이메일 또는 아이디" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '비밀번호를 입력하세요' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              로그인
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            계정이 없으신가요? <Link to="/register">회원가입</Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default Login

