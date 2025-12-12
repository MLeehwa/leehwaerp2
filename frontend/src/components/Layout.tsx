import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import React, { useEffect, useState, useMemo } from 'react'
import { Layout as AntLayout, Avatar, Dropdown, Space, Tabs, Menu, Input, Modal, List, Tag, Button, message } from 'antd'
import {
  LogoutOutlined,
  UserOutlined,
  AccountBookOutlined,
  TagsOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  DollarOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  DatabaseOutlined,
  BankOutlined,
  GlobalOutlined,
  DollarCircleOutlined,
  ProjectOutlined,
  FileDoneOutlined,
  TruckOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  FolderOutlined,
  FileExcelOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  UserSwitchOutlined,
  SafetyOutlined,
  SearchOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  CarOutlined,
  WarningOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { useTabs } from '../contexts/TabContext'
import type { MenuProps } from 'antd'
import api from '../utils/api'
import dayjs from 'dayjs'
import NotificationBanner from './NotificationBanner'

const { Header, Content, Sider } = AntLayout

// 페이지 라벨 매핑
const pageLabels: Record<string, string> = {
  // Sales Master
  '/master-data/sales/customers': '고객 관리',
  '/sales/projects': '프로젝트 관리',
  '/master-data/sales/billing-rules': '청구 규칙 관리',
  // Company Master
  '/master-data/companies': '법인 관리',
  // Location Master
  '/master-data/locations': '로케이션 관리',
  '/master-data/shipping-addresses': '배송지 관리',
  // Supplier Master
  '/master-data/suppliers': '공급업체 관리',
  // Category Master
  '/master-data/categories': '카테고리 관리',
  '/master-data/equipment-types': '자산 유형 관리',
  // Sales
  '/sales/invoices': '인보이스',
  '/sales/ar': 'AR 현황',
  '/sales/reports': 'Sales 리포트',
  // Accounting
  '/accounting/accounts-payable': '매입채무/지급 (AP)',
  '/accounting/accounts-receivable': '매출채권/수금 (AR)',
  '/accounting/reports': 'Accounting 리포트',
  // Purchase
  '/purchase/purchase-requests': '구매요청 (PR)',
  '/purchase/purchase-orders': '구매주문 (PO)',
  '/purchase/goods-receipt': '입고 관리',
  '/purchase/reports': '구매 리포트',
  // Operation
  '/operation/source-data': '월마감자료',
  '/operation/projects/:projectId/source-data': '월마감자료',
  '/operation/projects/:projectId/tm-packaging': 'TM 포장',
  '/operation/projects/:projectId/tm-storage': 'TM 보관',
  '/operation/projects/:projectId/vw-ckd': 'VW CKD',
  '/operation/projects/:projectId/bsa': 'BSA',
  '/operation/projects/:projectId/mobis-ckd': 'MOBIS CKD',
  // Production
  '/sales/pallet-projects': '팔렛트 프로젝트 관리',
  '/production/pallet-schedules': '파렛트 일정 관리',
  '/production/containers': '컨테이너 관리',
  '/production/projects/:projectId/dashboard': '프로젝트 대시보드',
  '/production/plans': '생산 계획',
  '/production/work-orders': '작업 지시',
  '/production/status': '생산 현황',
  '/production/tracking': '생산 추적',
  '/production/reports': '생산 리포트',
  // Quality
  '/quality/inspections': '품질 검사',
  '/quality/defects': '불량 관리',
  '/quality/certificates': '인증서 관리',
  '/quality/reports': '품질 리포트',
  // Operation Maintenance
  '/operation/maintenance/equipment': '설비 관리',
  '/operation/maintenance/schedules': '이력 등록',
  '/operation/maintenance/reports': '유지보수 리포트',
  // HR
  '/hr/employees': '직원 관리',
  '/hr/attendance': '근태 관리',
  '/hr/payroll': '급여 관리',
  '/hr/recruitment': '채용 관리',
  '/hr/reports': '인사 리포트',
  // System Admin
  '/system-admin/users': '사용자 관리',
  '/system-admin/database': '데이터베이스 관리',
  '/system-admin/storage-status': '저장소 상태',
  '/system-admin/menu-codes': '메뉴 코드 관리',
  '/system-admin/notifications': '알림 관리',
  '/system-admin/roles': '역할 관리',
  '/system-admin/permissions': '권한 관리',
  // Admin (총무)
  '/admin/assets': '총무 자산 관리',
}

const Layout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { tabs, activeTab, addTab, removeTab, setActiveTab } = useTabs()
  const [operationProject, setOperationProject] = useState<any>(null)
  const [operationProjects, setOperationProjects] = useState<any[]>([])
  const [menuCodeInput, setMenuCodeInput] = useState('')
  const [notificationModalVisible, setNotificationModalVisible] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [currentSection, setCurrentSection] = useState<string | null>(null)
  const [showInitialNotifications, setShowInitialNotifications] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)

  // 현재 경로에 따라 탭 추가
  useEffect(() => {
    const path = location.pathname
    // 프로젝트별 운영 페이지인 경우
    const projectMatch = path.match(/^\/operation\/projects\/([^/]+)\/(.+)$/)
    if (projectMatch) {
      const [, projectId, subPath] = projectMatch
      const label = pageLabels[path] || '월마감자료'
      addTab({
        key: path,
        label,
        path,
      })
    } else if (
      (path.startsWith('/accounting/') && path !== '/accounting') ||
      (path.startsWith('/sales/') && path !== '/sales') ||
      (path.startsWith('/purchase/') && path !== '/purchase') ||
      (path.startsWith('/master-data/') && path !== '/master-data') ||
      (path.startsWith('/operation/projects/')) ||
      (path.startsWith('/hr/') && path !== '/hr') ||
      (path.startsWith('/admin/') && path !== '/admin') ||
      (path.startsWith('/system-admin/') && path !== '/system-admin')
    ) {
      const label = pageLabels[path] || path
      addTab({
        key: path,
        label,
        path,
      })
    }
  }, [location.pathname, addTab])

  // Sales Master 드롭다운 메뉴
  const salesMasterMenuItems: MenuProps['items'] = [
    {
      key: '/master-data/sales/customers',
      icon: <UserOutlined />,
      label: '고객 관리',
    },
    {
      key: '/master-data/sales/billing-rules',
      icon: <SettingOutlined />,
      label: '청구 규칙 관리',
    },
  ]

  // Company Master 메뉴
  const companyMasterMenuItems: MenuProps['items'] = [
    {
      key: '/master-data/companies',
      icon: <BankOutlined />,
      label: '법인 관리',
    },
  ]

  // Location Master 메뉴
  const locationMasterMenuItems: MenuProps['items'] = [
    {
      key: '/master-data/locations',
      icon: <GlobalOutlined />,
      label: '로케이션 관리',
    },
    {
      key: '/master-data/shipping-addresses',
      icon: <EnvironmentOutlined />,
      label: '배송지 관리',
    },
  ]

  // Supplier Master 메뉴
  const supplierMasterMenuItems: MenuProps['items'] = [
    {
      key: '/master-data/suppliers',
      icon: <ShopOutlined />,
      label: '공급업체 관리',
    },
  ]

  // Category Master 메뉴
  const categoryMasterMenuItems: MenuProps['items'] = [
    {
      key: '/master-data/categories',
      icon: <TagsOutlined />,
      label: '카테고리 관리',
    },
  ]

  // Equipment Type Master 메뉴
  const equipmentTypeMasterMenuItems: MenuProps['items'] = [
    {
      key: '/master-data/equipment-types',
      icon: <ToolOutlined />,
      label: '자산 유형 관리',
    },
  ]

  // Sales 드롭다운 메뉴
  const salesMenuItems: MenuProps['items'] = [
    {
      key: '/sales/projects',
      icon: <ProjectOutlined />,
      label: '프로젝트 관리',
    },
    {
      key: '/sales/pallet-projects',
      icon: <ProjectOutlined />,
      label: '팔렛트 프로젝트 관리',
    },
    {
      key: '/sales/invoices',
      icon: <FileDoneOutlined />,
      label: '인보이스',
    },
    {
      key: '/sales/ar',
      icon: <DollarCircleOutlined />,
      label: 'AR 현황',
    },
    {
      key: '/sales/reports',
      icon: <FileTextOutlined />,
      label: '리포트',
    },
  ]

  // Accounting 드롭다운 메뉴
  const accountingMenuItems: MenuProps['items'] = [
    {
      key: '/accounting/accounts-payable',
      icon: <DollarOutlined />,
      label: '매입채무/지급 (AP)',
    },
    {
      key: '/accounting/accounts-receivable',
      icon: <DollarCircleOutlined />,
      label: '매출채권/수금 (AR)',
    },
    {
      key: '/accounting/reports',
      icon: <FileTextOutlined />,
      label: '리포트',
    },
  ]

  // Purchase 드롭다운 메뉴
  const purchaseMenuItems: MenuProps['items'] = [
    {
      key: '/purchase/purchase-requests',
      icon: <FileTextOutlined />,
      label: '구매요청 (PR)',
    },
    {
      key: '/purchase/purchase-orders',
      icon: <ShoppingOutlined />,
      label: '구매주문 (PO)',
    },
    {
      key: '/purchase/goods-receipt',
      icon: <InboxOutlined />,
      label: '입고 관리',
    },
    {
      key: '/purchase/reports',
      icon: <FileTextOutlined />,
      label: '리포트',
    },
  ]

  // 프로젝트 코드별 중분류 메뉴 매핑 (월마감자료 제외)
  const getProjectSubMenus = (projectCode: string, projectId: string) => {
    const baseMenus: MenuProps['items'] = []

    // 프로젝트 코드에 따라 중분류 메뉴 추가
    const code = projectCode.toUpperCase()

    if (code.includes('TM')) {
      baseMenus.push(
        {
          key: `/operation/projects/${projectId}/tm-packaging`,
          icon: <FileExcelOutlined />,
          label: 'TM 포장',
        },
        {
          key: `/operation/projects/${projectId}/tm-storage`,
          icon: <FileExcelOutlined />,
          label: 'TM 보관',
        }
      )
    }

    if (code.includes('BSA')) {
      baseMenus.push({
        key: `/operation/projects/${projectId}/bsa`,
        icon: <FileExcelOutlined />,
        label: 'BSA',
      })
    }

    if (code.includes('MOBIS') && code.includes('CKD')) {
      baseMenus.push({
        key: `/operation/projects/${projectId}/mobis-ckd`,
        icon: <FileExcelOutlined />,
        label: 'MOBIS CKD',
      })
    }

    return baseMenus
  }

  // Operation 드롭다운 메뉴 (프로젝트별 서브메뉴 + Maintenance)
  const operationMenuItems: MenuProps['items'] = useMemo(() => {
    const items: MenuProps['items'] = []

    // 월마감자료 공통 메뉴 추가
    items.push({
      key: '/operation/source-data',
      icon: <FolderOutlined />,
      label: '월마감자료',
    })

    if (operationProjects.length === 0) {
      items.push({
        key: 'no-projects',
        label: '프로젝트가 없습니다',
        disabled: true,
      })
    } else {
      // 프로젝트별 메뉴 추가
      operationProjects.forEach((project) => {
        const code = project.projectCode?.toUpperCase() || ''
        const subMenus = getProjectSubMenus(project.projectCode, project._id)

        // VW CKD 프로젝트는 바로 VW CKD 페이지로 이동 (서브메뉴 없음)
        if (code.includes('VW') && code.includes('CKD')) {
          items.push({
            key: `/operation/projects/${project._id}/vw-ckd`,
            icon: <ProjectOutlined />,
            label: project.projectName || project.projectCode,
          })
        } else if (subMenus && subMenus.length > 0) {
          // 서브메뉴가 있는 프로젝트
          items.push({
            key: `project-${project._id}`,
            icon: <ProjectOutlined />,
            label: project.projectName || project.projectCode,
            children: subMenus,
          })
        } else {
          // 서브메뉴가 없는 프로젝트는 기본 페이지로 이동
          items.push({
            key: `/operation/projects/${project._id}/source-data`,
            icon: <ProjectOutlined />,
            label: project.projectName || project.projectCode,
          })
        }
      })
    }

    // 구분선 추가
    items.push({
      type: 'divider',
    })

    // Maintenance 메뉴 추가
    items.push({
      key: '/operation/maintenance/equipment',
      icon: <ToolOutlined />,
      label: '설비 관리',
    })
    items.push({
      key: '/operation/maintenance/schedules',
      icon: <ClockCircleOutlined />,
      label: '이력 등록',
    })
    items.push({
      key: '/operation/maintenance/reports',
      icon: <FileTextOutlined />,
      label: '리포트',
    })

    return items
  }, [operationProjects])

  // Production 드롭다운 메뉴
  const productionMenuItems: MenuProps['items'] = [
    {
      key: '/production/pallet-schedules',
      icon: <CalendarOutlined />,
      label: '파렛트 일정 관리',
    },
    {
      key: '/production/containers',
      icon: <TruckOutlined />,
      label: '컨테이너 관리',
    },
    {
      type: 'divider',
    },
    {
      key: '/production/plans',
      icon: <FileTextOutlined />,
      label: '생산 계획',
    },
    {
      key: '/production/work-orders',
      icon: <FileDoneOutlined />,
      label: '작업 지시',
    },
    {
      key: '/production/status',
      icon: <ThunderboltOutlined />,
      label: '생산 현황',
    },
    {
      key: '/production/tracking',
      icon: <ClockCircleOutlined />,
      label: '생산 추적',
    },
    {
      key: '/production/reports',
      icon: <FileTextOutlined />,
      label: '리포트',
    },
  ]

  // Quality 드롭다운 메뉴
  const qualityMenuItems: MenuProps['items'] = [
    {
      key: '/quality/inspections',
      icon: <CheckCircleOutlined />,
      label: '품질 검사',
    },
    {
      key: '/quality/defects',
      icon: <FileTextOutlined />,
      label: '불량 관리',
    },
    {
      key: '/quality/certificates',
      icon: <FileDoneOutlined />,
      label: '인증서 관리',
    },
    {
      key: '/quality/reports',
      icon: <FileTextOutlined />,
      label: '리포트',
    },
  ]

  // HR/Admin 드롭다운 메뉴 (HR과 Admin 통합)
  const hrMenuItems: MenuProps['items'] = [
    {
      key: '/hr/employees',
      icon: <TeamOutlined />,
      label: '직원 관리',
    },
    {
      key: '/hr/assets',
      icon: <DatabaseOutlined />,
      label: '자산 관리',
    },
    {
      key: '/admin/assets',
      icon: <CarOutlined />,
      label: '총무 자산 관리',
    },
    {
      key: '/hr/attendance',
      icon: <ClockCircleOutlined />,
      label: '근태 관리',
    },
    {
      key: '/hr/payroll',
      icon: <DollarCircleOutlined />,
      label: '급여 관리',
    },
    {
      key: '/hr/recruitment',
      icon: <UserOutlined />,
      label: '채용 관리',
    },
    {
      key: '/hr/reports',
      icon: <FileTextOutlined />,
      label: '리포트',
    },
  ]

  // System Admin 드롭다운 메뉴 (시스템 관리)
  const systemAdminMenuItems: MenuProps['items'] = [
    {
      key: '/system-admin/users',
      icon: <UserSwitchOutlined />,
      label: '사용자 관리',
    },
    {
      key: '/system-admin/database',
      icon: <DatabaseOutlined />,
      label: '데이터베이스 관리',
    },
    {
      key: '/system-admin/storage-status',
      icon: <DatabaseOutlined />,
      label: '저장소 상태',
    },
    {
      key: '/system-admin/menu-codes',
      icon: <SettingOutlined />,
      label: '메뉴 코드 관리',
    },
    {
      key: '/system-admin/notifications',
      icon: <BellOutlined />,
      label: '알림 관리',
    },
    {
      key: '/system-admin/roles',
      icon: <SafetyOutlined />,
      label: '역할 관리',
    },
    {
      key: '/system-admin/permissions',
      icon: <SettingOutlined />,
      label: '권한 관리',
    },
  ]

  const handleSalesMasterMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleAccountingMasterMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  // 메뉴 코드로 이동
  const handleMenuCodeNavigate = async (code: string) => {
    try {
      const response = await api.get(`/menu-codes/${code}`)
      if (response.data && response.data.isActive) {
        navigate(response.data.path)
        message.success(`${response.data.name}로 이동했습니다`)
        setMenuCodeInput('')
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '메뉴 코드를 찾을 수 없습니다')
    }
  }

  // 섹션별 알림 가져오기 (모달 표시 없이 - 사용하지 않음)
  // const fetchSectionNotifications = async (section: string) => {
  //   // 메뉴 클릭 시에는 알림 모달을 띄우지 않음
  // }

  // 경로별 알림 가져오기 (모달 표시 없이)
  const fetchPathNotifications = async (path: string) => {
    // 메뉴 클릭 시에는 알림 모달을 띄우지 않음
    // 배너가 자동으로 업데이트됨
  }

  const handleSalesMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleAccountingMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handlePurchaseMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleOperationMenuClick = ({ key }: { key: string }) => {
    // VW CKD 직접 경로 처리
    if (key.startsWith('/operation/projects/')) {
      navigate(key)
    }
    // Maintenance 메뉴 처리
    else if (key.startsWith('/operation/maintenance/')) {
      navigate(key)
    }
    // 'no-projects'나 'project-'로 시작하는 키는 무시 (children 메뉴가 자동으로 표시됨)
  }

  const handleAdminMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleQualityMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleHrMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleProductionMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '프로필',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      danger: true,
    },
  ]

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout()
      navigate('/login')
    } else if (key === 'profile') {
      // 프로필 페이지로 이동 (추후 구현)
    }
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    navigate(key)
  }

  const handleTabEdit = (targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove') => {
    if (action === 'remove' && typeof targetKey === 'string') {
      removeTab(targetKey)
      // 탭을 닫은 후 활성 탭으로 이동
      const remainingTabs = tabs.filter((tab) => tab.key !== targetKey)
      if (remainingTabs.length > 0) {
        const newActiveTab = remainingTabs[remainingTabs.length - 1]
        navigate(newActiveTab.path)
      } else {
        // 기본 경로로 이동
        if (targetKey.startsWith('/master-data')) {
          navigate('/master-data/sales/customers')
        } else if (targetKey.startsWith('/sales')) {
          navigate('/sales/invoices')
        } else if (targetKey.startsWith('/purchase')) {
          navigate('/purchase/purchase-requests')
        } else if (targetKey.startsWith('/operation')) {
          // Operation 탭을 닫으면 프로젝트 선택 없이 Operation 메뉴만 유지
          navigate('/sales')
        } else if (targetKey.startsWith('/production')) {
          navigate('/production/plans')
        } else if (targetKey.startsWith('/quality')) {
          navigate('/quality/inspections')
        } else if (targetKey.startsWith('/operation/maintenance')) {
          navigate('/operation/maintenance/equipment')
        } else if (targetKey.startsWith('/hr')) {
          navigate('/hr/employees')
        } else if (targetKey.startsWith('/admin')) {
          navigate('/admin/assets')
        } else if (targetKey.startsWith('/system-admin')) {
          navigate('/system-admin/users')
        } else {
          navigate('/accounting/accounts-payable')
        }
      }
    }
  }

  const isMasterDataActive = location.pathname === '/master-data' || location.pathname.startsWith('/master-data/')
  const isSalesActive = location.pathname === '/sales' || location.pathname.startsWith('/sales/')
  const isAccountingActive = location.pathname === '/accounting' || location.pathname.startsWith('/accounting/')
  const isPurchaseActive = location.pathname === '/purchase' || location.pathname.startsWith('/purchase/')
  const isOperationActive = location.pathname === '/operation' || location.pathname.startsWith('/operation/')
  const isProductionActive = location.pathname === '/production' || location.pathname.startsWith('/production/')
  const isQualityActive = location.pathname === '/quality' || location.pathname.startsWith('/quality/')
  const isHrActive = location.pathname === '/hr' || location.pathname.startsWith('/hr/') || location.pathname === '/admin' || location.pathname.startsWith('/admin/')
  const isSystemAdminActive = location.pathname === '/system-admin' || location.pathname.startsWith('/system-admin/')

  // 사용자별 메뉴 권한 확인
  const hasMenuAccess = (menuPath: string): boolean => {
    if (!user) return false
    // Admin은 항상 모든 메뉴 접근 가능
    if (user.role === 'admin') return true
    // allowedMenus가 없거나 비어있으면 전체 접근
    if (!user.allowedMenus || user.allowedMenus.length === 0) return true
    // allowedMenus에 포함되어 있으면 접근 가능
    return user.allowedMenus.includes(menuPath)
  }

  // 프로젝트별 운영 페이지인 경우 프로젝트 정보 가져오기
  useEffect(() => {
    const projectMatch = location.pathname.match(/^\/operation\/projects\/([^/]+)/)
    if (projectMatch) {
      const projectId = projectMatch[1]
      api.get(`/projects/${projectId}`)
        .then((response) => {
          setOperationProject(response.data)
        })
        .catch(() => {
          setOperationProject(null)
        })
    } else {
      setOperationProject(null)
    }
  }, [location.pathname])

  // OPERATION 메뉴용 프로젝트 목록 가져오기
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/projects?status=active')
        const projects = response.data || []
        console.log('Operation 프로젝트 목록:', projects)
        setOperationProjects(projects)
      } catch (error: any) {
        // MongoDB 연결 오류인 경우 조용히 처리
        if (error.response?.status === 503 || error.response?.status === 500) {
          console.warn('프로젝트 목록을 불러올 수 없습니다. MongoDB 연결을 확인하세요.')
        } else {
          console.error('프로젝트 목록 로드 실패:', error)
        }
        setOperationProjects([])
      }
    }
    fetchProjects()
  }, [])

  // 로그인 시 전체 알림 확인
  useEffect(() => {
    if (user && !showInitialNotifications) {
      const checkInitialNotifications = async () => {
        try {
          const response = await api.get('/notifications', {
            params: {
              isResolved: 'false',
              includeOverdue: 'true',
            },
          })
          const data = response.data || []

          // 임박/지난 항목만 필터링
          const now = new Date()
          const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
          const filtered = data.filter((notif: any) => {
            if (!notif.dueDate) return true
            const dueDate = new Date(notif.dueDate)
            return dueDate <= threeDaysLater
          })

          if (filtered.length > 0) {
            setNotifications(filtered)
            setCurrentSection('all')
            setNotificationModalVisible(true)
            setShowInitialNotifications(true)
          }
        } catch (error: any) {
          // MongoDB 연결 오류인 경우 조용히 처리
          if (error.response?.status === 503 || error.response?.status === 500) {
            console.warn('알림을 불러올 수 없습니다. MongoDB 연결을 확인하세요.')
          } else {
            console.error('초기 알림 확인 실패:', error)
          }
        }
      }

      // 약간의 지연 후 알림 확인 (페이지 로드 완료 후)
      setTimeout(() => {
        checkInitialNotifications()
      }, 1000)
    }
  }, [user, showInitialNotifications])

  // 미해결 알림 개수 업데이트 (30초마다)
  useEffect(() => {
    if (!user) return

    const updateNotificationCount = async () => {
      try {
        const response = await api.get('/notifications', {
          params: {
            isResolved: 'false',
            includeOverdue: 'true',
          },
        })
        const data = response.data || []

        // 임박/지난 항목만 필터링
        const now = new Date()
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        const filtered = data.filter((notif: any) => {
          if (!notif.dueDate) return true
          const dueDate = new Date(notif.dueDate)
          return dueDate <= threeDaysLater
        })

        setUnreadNotificationCount(filtered.length)
      } catch (error: any) {
        // MongoDB 연결 오류인 경우 조용히 처리
        if (error.response?.status === 503 || error.response?.status === 500) {
          // 조용히 처리 (너무 많은 경고 방지)
        } else {
          console.error('알림 개수 업데이트 실패:', error)
        }
      }
    }

    updateNotificationCount()
    const interval = setInterval(updateNotificationCount, 30000) // 30초마다 업데이트

    return () => clearInterval(interval)
  }, [user])

  // 사이드바 메뉴 선택 키
  const getSidebarSelectedKeys = () => {
    const path = location.pathname
    if (path.startsWith('/accounting/')) {
      return [path]
    }
    if (path.startsWith('/sales/')) {
      return [path]
    }
    if (path.startsWith('/purchase/')) {
      return [path]
    }
    if (path.startsWith('/master-data/')) {
      return [path]
    }
    if (path.startsWith('/operation/projects/')) {
      // 프로젝트별 운영 페이지인 경우
      return [path]
    }
    if (path.startsWith('/operation/maintenance/')) {
      // Operation Maintenance 페이지인 경우
      return [path]
    }
    if (path.startsWith('/hr/') || path.startsWith('/admin/')) {
      return [path]
    }
    if (path.startsWith('/system-admin/')) {
      return [path]
    }
    return []
  }

  const handleSidebarMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#001529',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        height: '64px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#fff',
              cursor: 'pointer',
            }}
            onClick={async () => {
              // LEEHWA 클릭 시 전체 알림 확인
              try {
                const response = await api.get('/notifications', {
                  params: {
                    isResolved: 'false',
                    includeOverdue: 'true',
                  },
                })
                const data = response.data || []

                // 임박/지난 항목만 필터링
                const now = new Date()
                const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
                const filtered = data.filter((notif: any) => {
                  if (!notif.dueDate) return true
                  const dueDate = new Date(notif.dueDate)
                  return dueDate <= threeDaysLater
                })

                if (filtered.length > 0) {
                  setNotifications(filtered)
                  setCurrentSection('all')
                  setNotificationModalVisible(true)
                } else {
                  navigate('/sales')
                }
              } catch (error) {
                console.error('알림 확인 실패:', error)
                navigate('/sales')
              }
            }}
          >
            LEEHWA
          </div>

          {/* 알림 아이콘 */}
          <div
            style={{
              position: 'relative',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={async () => {
              // 알림 아이콘 클릭 시 전체 알림 확인
              try {
                const response = await api.get('/notifications', {
                  params: {
                    isResolved: 'false',
                    includeOverdue: 'true',
                  },
                })
                const data = response.data || []

                // 임박/지난 항목만 필터링
                const now = new Date()
                const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
                const filtered = data.filter((notif: any) => {
                  if (!notif.dueDate) return true
                  const dueDate = new Date(notif.dueDate)
                  return dueDate <= threeDaysLater
                })

                if (filtered.length > 0) {
                  setNotifications(filtered)
                  setCurrentSection('all')
                  setNotificationModalVisible(true)
                } else {
                  message.info('표시할 알림이 없습니다')
                }
              } catch (error) {
                console.error('알림 확인 실패:', error)
                message.error('알림을 불러오는데 실패했습니다')
              }
            }}
          >
            <BellOutlined style={{ fontSize: '18px', color: '#fff' }} />
            {unreadNotificationCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  backgroundColor: '#ff4d4f',
                  color: '#fff',
                  borderRadius: '10px',
                  minWidth: '18px',
                  height: '18px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  fontWeight: 'bold',
                }}
              >
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
          </div>

          {/* 메뉴 코드 입력 */}
          <Input
            placeholder="메뉴 코드 입력 (예: 0010)"
            value={menuCodeInput}
            onChange={(e) => setMenuCodeInput(e.target.value.toUpperCase())}
            onPressEnter={() => {
              if (menuCodeInput.trim()) {
                handleMenuCodeNavigate(menuCodeInput.trim())
              }
            }}
            prefix={<SearchOutlined style={{ color: '#999' }} />}
            style={{
              width: 200,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
            }}
            allowClear
          />
          {hasMenuAccess('/hr') && (
            <Dropdown
              menu={{
                items: hrMenuItems,
                onClick: handleHrMenuClick,
              }}
              trigger={['click']}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  backgroundColor: isHrActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <TeamOutlined style={{ fontSize: '14px' }} />
                <span>HR</span>
              </div>
            </Dropdown>
          )}
          {hasMenuAccess('/sales') && (
            <Dropdown
              menu={{
                items: salesMenuItems,
                onClick: handleSalesMenuClick,
              }}
              trigger={['click']}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  backgroundColor: isSalesActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <DollarCircleOutlined style={{ fontSize: '14px' }} />
                <span>Sales</span>
              </div>
            </Dropdown>
          )}
          {hasMenuAccess('/accounting') && (
            <Dropdown
              menu={{
                items: accountingMenuItems,
                onClick: handleAccountingMenuClick,
              }}
              trigger={['click']}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  backgroundColor: isAccountingActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AccountBookOutlined style={{ fontSize: '14px' }} />
                <span>Accounting</span>
              </div>
            </Dropdown>
          )}
          {hasMenuAccess('/purchase') && (
            <Dropdown
              menu={{
                items: purchaseMenuItems,
                onClick: handlePurchaseMenuClick,
              }}
              trigger={['click']}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  backgroundColor: isPurchaseActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShoppingCartOutlined style={{ fontSize: '14px' }} />
                <span>Purchase</span>
              </div>
            </Dropdown>
          )}
          {hasMenuAccess('/production') && (
            <Dropdown
              menu={{
                items: productionMenuItems,
                onClick: handleProductionMenuClick,
              }}
              trigger={['click']}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  backgroundColor: isProductionActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ThunderboltOutlined style={{ fontSize: '14px' }} />
                <span>Production</span>
              </div>
            </Dropdown>
          )}
          {hasMenuAccess('/operation') && (
            <Dropdown
              menu={{
                items: operationMenuItems,
                onClick: handleOperationMenuClick,
              }}
              trigger={['click']}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  backgroundColor: isOperationActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <SettingOutlined style={{ fontSize: '14px' }} />
                <span>Operation</span>
              </div>
            </Dropdown>
          )}
          {hasMenuAccess('/quality') && (
            <Dropdown
              menu={{
                items: qualityMenuItems,
                onClick: handleQualityMenuClick,
              }}
              trigger={['click']}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  backgroundColor: isQualityActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircleOutlined style={{ fontSize: '14px' }} />
                <span>Quality</span>
              </div>
            </Dropdown>
          )}
          {/* 공통 메뉴 - 캘린더 */}
          <Dropdown
            menu={{
              items: [
                {
                  key: '/calendar',
                  icon: <CalendarOutlined />,
                  label: '일정 관리',
                },
              ],
              onClick: ({ key }) => navigate(key),
            }}
            trigger={['click']}
          >
            <div
              style={{
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '4px',
                backgroundColor: location.pathname === '/calendar' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CalendarOutlined style={{ fontSize: '14px' }} />
              <span>캘린더</span>
            </div>
          </Dropdown>
        </div>
        <Space>
          {hasMenuAccess('/master-data') && (
            <Button
              type="text"
              icon={<DatabaseOutlined style={{ fontSize: '16px' }} />}
              onClick={() => navigate('/master-data')}
              style={{
                color: '#fff',
                border: isMasterDataActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
                backgroundColor: isMasterDataActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              }}
              title="Master"
            />
          )}
          {hasMenuAccess('/system-admin') && (
            <Button
              type="text"
              icon={<SafetyOutlined style={{ fontSize: '16px' }} />}
              onClick={() => navigate('/system-admin')}
              style={{
                color: '#fff',
                border: isSystemAdminActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
                backgroundColor: isSystemAdminActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              }}
              title="System Admin"
            />
          )}
          <span style={{ color: '#fff' }}>{user?.firstName} {user?.lastName}</span>
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: handleUserMenuClick,
            }}
            placement="bottomRight"
          >
            <Avatar style={{ cursor: 'pointer', backgroundColor: '#1890ff' }}>
              {user?.firstName?.[0]}
            </Avatar>
          </Dropdown>
        </Space>
      </Header>
      {tabs.length > 0 && (
        <div style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            onEdit={handleTabEdit}
            type="editable-card"
            hideAdd
            style={{ margin: 0 }}
            items={tabs.map((tab) => ({
              key: tab.key,
              label: tab.label,
              closable: tabs.length > 1,
            }))}
          />
        </div>
      )}
      <AntLayout>
        {/* Operation 사이드바 - 프로젝트별 페이지 또는 Maintenance 페이지일 때 표시 */}
        {isOperationActive &&
          (location.pathname.match(/^\/operation\/projects\/([^/]+)/) || location.pathname.startsWith('/operation/maintenance/')) &&
          !location.pathname.includes('/vw-ckd') && (
            <Sider
              width={250}
              style={{
                background: '#fff',
                borderRight: '1px solid #f0f0f0',
              }}
            >
              <div style={{
                padding: '16px',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}>
                  Operation
                </div>
              </div>
              <Menu
                mode="inline"
                selectedKeys={getSidebarSelectedKeys()}
                items={
                  location.pathname.startsWith('/operation/maintenance/')
                    ? [
                      {
                        key: '/operation/maintenance/equipment',
                        icon: <ToolOutlined />,
                        label: '설비 관리',
                      },
                      {
                        key: '/operation/maintenance/schedules',
                        icon: <ClockCircleOutlined />,
                        label: '이력 등록',
                      },
                      {
                        key: '/operation/maintenance/reports',
                        icon: <FileTextOutlined />,
                        label: '리포트',
                      },
                    ]
                    : operationProject
                      ? getProjectSubMenus(operationProject.projectCode, operationProject._id)
                      : []
                }
                onClick={handleSidebarMenuClick}
                style={{
                  borderRight: 'none',
                  height: tabs.length > 0
                    ? 'calc(100vh - 64px - 49px - 48px)'
                    : 'calc(100vh - 64px - 48px)',
                }}
              />
            </Sider>
          )}
        {isMasterDataActive && (
          <Sider
            width={250}
            style={{
              background: '#fff',
              borderRight: '1px solid #f0f0f0',
            }}
          >
            <div style={{
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderBottom: '1px solid #f0f0f0',
            }}>
              Master
            </div>
            <Menu
              mode="inline"
              selectedKeys={getSidebarSelectedKeys()}
              items={[
                {
                  key: 'sales-master-group',
                  label: 'Sales Master',
                  type: 'group',
                  children: salesMasterMenuItems,
                },
                {
                  key: 'company-master-group',
                  label: 'Company Master',
                  type: 'group',
                  children: companyMasterMenuItems,
                },
                {
                  key: 'location-master-group',
                  label: 'Location Master',
                  type: 'group',
                  children: locationMasterMenuItems,
                },
                {
                  key: 'supplier-master-group',
                  label: 'Supplier Master',
                  type: 'group',
                  children: supplierMasterMenuItems,
                },
                {
                  key: 'category-master-group',
                  label: 'Category Master',
                  type: 'group',
                  children: categoryMasterMenuItems,
                },
                {
                  key: 'equipment-type-master-group',
                  label: 'Equipment Type Master',
                  type: 'group',
                  children: equipmentTypeMasterMenuItems,
                },
              ]}
              onClick={handleSidebarMenuClick}
              style={{
                borderRight: 'none',
                height: tabs.length > 0
                  ? 'calc(100vh - 64px - 49px - 48px)'
                  : 'calc(100vh - 64px - 48px)',
              }}
            />
          </Sider>
        )}
        {isHrActive && (
          <Sider
            width={250}
            style={{
              background: '#fff',
              borderRight: '1px solid #f0f0f0',
            }}
          >
            <div style={{
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderBottom: '1px solid #f0f0f0',
            }}>
              HR/Admin
            </div>
            <Menu
              mode="inline"
              selectedKeys={getSidebarSelectedKeys()}
              items={hrMenuItems}
              onClick={handleSidebarMenuClick}
              style={{
                borderRight: 'none',
                height: tabs.length > 0
                  ? 'calc(100vh - 64px - 49px - 48px)'
                  : 'calc(100vh - 64px - 48px)',
              }}
            />
          </Sider>
        )}
        {isSystemAdminActive && (
          <Sider
            width={250}
            style={{
              background: '#fff',
              borderRight: '1px solid #f0f0f0',
            }}
          >
            <div style={{
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderBottom: '1px solid #f0f0f0',
            }}>
              System Admin
            </div>
            <Menu
              mode="inline"
              selectedKeys={getSidebarSelectedKeys()}
              items={systemAdminMenuItems}
              onClick={handleSidebarMenuClick}
              style={{
                borderRight: 'none',
                height: tabs.length > 0
                  ? 'calc(100vh - 64px - 49px - 48px)'
                  : 'calc(100vh - 64px - 48px)',
              }}
            />
          </Sider>
        )}
        {isSalesActive && (
          <Sider
            width={250}
            style={{
              background: '#fff',
              borderRight: '1px solid #f0f0f0',
            }}
          >
            <div style={{
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderBottom: '1px solid #f0f0f0',
            }}>
              Sales
            </div>
            <Menu
              mode="inline"
              selectedKeys={getSidebarSelectedKeys()}
              items={salesMenuItems}
              onClick={handleSidebarMenuClick}
              style={{
                borderRight: 'none',
                height: tabs.length > 0
                  ? 'calc(100vh - 64px - 49px - 48px)'
                  : 'calc(100vh - 64px - 48px)',
              }}
            />
          </Sider>
        )}
        {isAccountingActive && (
          <Sider
            width={250}
            style={{
              background: '#fff',
              borderRight: '1px solid #f0f0f0',
            }}
          >
            <div style={{
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderBottom: '1px solid #f0f0f0',
            }}>
              Accounting
            </div>
            <Menu
              mode="inline"
              selectedKeys={getSidebarSelectedKeys()}
              items={accountingMenuItems}
              onClick={handleSidebarMenuClick}
              style={{
                borderRight: 'none',
                height: tabs.length > 0
                  ? 'calc(100vh - 64px - 49px - 48px)'
                  : 'calc(100vh - 64px - 48px)',
              }}
            />
          </Sider>
        )}
        <Content style={{
          margin: '24px',
          background: '#fff',
          padding: 0,
          minHeight: 'calc(100vh - 64px)',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          {/* 알림 배너 (상단 노란색 영역) */}
          <NotificationBanner
            currentPath={location.pathname}
            onNotificationClick={(notifications) => {
              setNotifications(notifications)
              setCurrentSection('all')
              setNotificationModalVisible(true)
            }}
          />

          <div style={{ padding: '24px' }}>
            <Outlet />
          </div>
        </Content>
      </AntLayout>

      {/* 알림 모달 */}
      <Modal
        title={
          <Space>
            <BellOutlined />
            <span>{currentSection?.toUpperCase()} 섹션 알림</span>
            {notifications.length > 0 && (
              <Tag color="red">{notifications.length}</Tag>
            )}
          </Space>
        }
        open={notificationModalVisible}
        onCancel={() => {
          setNotificationModalVisible(false)
          setCurrentSection(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setNotificationModalVisible(false)
            setCurrentSection(null)
          }}>
            닫기
          </Button>,
        ]}
        width={600}
      >
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            알림이 없습니다
          </div>
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification: any) => {
              const isOverdue = notification.dueDate && new Date(notification.dueDate) < new Date()
              const isDueSoon = notification.dueDate &&
                new Date(notification.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) &&
                new Date(notification.dueDate) > new Date()

              return (
                <List.Item
                  style={{
                    borderLeft: `4px solid ${notification.priority === 'urgent' ? '#ff4d4f' :
                        notification.priority === 'high' ? '#ff7875' :
                          notification.priority === 'medium' ? '#ffa940' : '#95de64'
                      }`,
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: isOverdue ? '#fff1f0' : isDueSoon ? '#fff7e6' : '#fafafa',
                  }}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span style={{ fontWeight: 500 }}>{notification.title}</span>
                        <Tag color={
                          notification.type === 'error' ? 'red' :
                            notification.type === 'warning' ? 'orange' :
                              notification.type === 'success' ? 'green' : 'blue'
                        }>
                          {notification.type}
                        </Tag>
                        {isOverdue && <Tag color="red">기한 초과</Tag>}
                        {isDueSoon && !isOverdue && <Tag color="orange">임박</Tag>}
                      </Space>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: 8 }}>{notification.message}</div>
                        <Space size="small" style={{ fontSize: '12px', color: '#999' }}>
                          {notification.dueDate && (
                            <span>
                              마감일: {dayjs(notification.dueDate).format('YYYY-MM-DD HH:mm')}
                            </span>
                          )}
                          <span>우선순위: {notification.priority}</span>
                        </Space>
                      </div>
                    }
                  />
                </List.Item>
              )
            }}
          />
        )}
      </Modal>
    </AntLayout>
  )
}

export default Layout

