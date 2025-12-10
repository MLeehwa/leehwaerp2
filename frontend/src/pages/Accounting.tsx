import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Menu, Card } from 'antd'
import {
  TagsOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  DollarOutlined,
  ShopOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'

const Accounting = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems: MenuProps['items'] = [
    {
      key: '/accounting/categories',
      icon: <TagsOutlined />,
      label: '카테고리 관리',
    },
    {
      key: '/accounting/purchase-requests',
      icon: <FileTextOutlined />,
      label: '구매요청 (PR)',
    },
    {
      key: '/accounting/purchase-orders',
      icon: <ShoppingOutlined />,
      label: '구매주문 (PO)',
    },
    {
      key: '/accounting/accounts-payable',
      icon: <DollarOutlined />,
      label: '매입채무/지급 (AP)',
    },
    {
      key: '/accounting/suppliers',
      icon: <ShopOutlined />,
      label: '공급업체 관리',
    },
    {
      key: '/accounting/shipping-addresses',
      icon: <EnvironmentOutlined />,
      label: '배송지 관리',
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  // 현재 선택된 메뉴 키 결정
  const getSelectedKeys = () => {
    const path = location.pathname
    if (path === '/accounting') {
      // 기본적으로 카테고리 관리 선택
      return ['/accounting/categories']
    }
    return [path]
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Accounting</h1>
      <Card>
        <Menu
          mode="horizontal"
          selectedKeys={getSelectedKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ marginBottom: 24, borderBottom: 'none' }}
        />
        <div style={{ marginTop: 24 }}>
          <Outlet />
        </div>
      </Card>
    </div>
  )
}

export default Accounting

