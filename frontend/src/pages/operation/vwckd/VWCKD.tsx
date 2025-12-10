import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Menu } from 'antd'
import {
  FileTextOutlined,
  TruckOutlined,
  DatabaseOutlined,
  SwapOutlined,
  AppstoreOutlined,
  SettingOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import api from '../../../utils/api'
import ARNManagement from './ARNManagement'
import ShippingPreparation from './ShippingPreparation'
import InventoryManagement from './InventoryManagement'
import ContainerRelocation from './ContainerRelocation'
import RackView from './RackView'
import MasterData from './MasterData'
import Reports from './Reports'

// TODO: PDA 모드는 나중에 별도로 구현 예정
// 현재는 Desktop 모드(관리자 모드)만 구현
const MODE = 'desktop' // 'desktop' | 'pda' (향후 PDA 모드 추가 예정)

const VWCKD: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [selectedMenu, setSelectedMenu] = useState<string>('dashboard')
  const [project, setProject] = useState<any>(null)

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`)
      setProject(response.data)
    } catch (error) {
      console.error('프로젝트 정보 로드 실패:', error)
    }
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <AppstoreOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'arn',
      icon: <FileTextOutlined />,
      label: 'ARN Management',
    },
    {
      key: 'shipping',
      icon: <TruckOutlined />,
      label: 'Shipping Preparation',
    },
    {
      key: 'inventory',
      icon: <DatabaseOutlined />,
      label: 'Inventory Management',
    },
    {
      key: 'relocation',
      icon: <SwapOutlined />,
      label: 'Container Relocation',
    },
    {
      key: 'rack',
      icon: <AppstoreOutlined />,
      label: 'Rack View',
    },
    {
      key: 'master',
      icon: <SettingOutlined />,
      label: 'Master Data',
    },
    {
      key: 'reports',
      icon: <BarChartOutlined />,
      label: 'Reports',
    },
    {
      key: 'database',
      icon: <SettingOutlined />,
      label: 'Database Editor',
    },
  ]

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    setSelectedMenu(e.key)
  }

  const renderContent = () => {
    switch (selectedMenu) {
      case 'dashboard':
        return (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: 24 }}>Dashboard</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ padding: 8, background: '#e6f7ff', borderRadius: 8, marginRight: 16 }}>
                    <FileTextOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Total ARN</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>0</p>
                  </div>
                </div>
              </Card>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ padding: 8, background: '#f6ffed', borderRadius: 8, marginRight: 16 }}>
                    <TruckOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Active Orders</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>0</p>
                  </div>
                </div>
              </Card>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ padding: 8, background: '#fffbe6', borderRadius: 8, marginRight: 16 }}>
                    <AppstoreOutlined style={{ fontSize: '20px', color: '#faad14' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Rack Locations</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>0</p>
                  </div>
                </div>
              </Card>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ padding: 8, background: '#f9f0ff', borderRadius: 8, marginRight: 16 }}>
                    <DatabaseOutlined style={{ fontSize: '20px', color: '#722ed1' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Inventory Items</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>0</p>
                  </div>
                </div>
              </Card>
            </div>
            <Card>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: 16 }}>Recent Activity</h3>
              <p style={{ color: '#999' }}>No recent activity</p>
            </Card>
          </div>
        )
      case 'arn':
        return <ARNManagement />
      case 'shipping':
        return <ShippingPreparation />
      case 'inventory':
        return <InventoryManagement />
      case 'relocation':
        return <ContainerRelocation />
      case 'rack':
        return <RackView />
      case 'master':
        return <MasterData />
      case 'reports':
        return <Reports />
      case 'database':
        return (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: 8 }}>Database Editor</h2>
            <p style={{ color: '#666', marginBottom: 24 }}>
              MongoDB 데이터베이스를 직접 편집할 수 있습니다. 
              <a href="/admin/database" target="_blank" style={{ marginLeft: 8 }}>
                Database Admin 페이지로 이동
              </a>
            </p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 112px)' }}>
      {/* Sidebar */}
      <div style={{ width: 250, background: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <Menu
          mode="inline"
          selectedKeys={[selectedMenu]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 'none', height: '100%' }}
        />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
        {renderContent()}
      </div>
    </div>
  )
}

export default VWCKD

