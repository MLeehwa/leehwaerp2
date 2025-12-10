import { useState, useEffect, useMemo } from 'react'
import { Space, Tag, Button } from 'antd'
import { CloseOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import api from '../utils/api'
import dayjs from 'dayjs'

interface Notification {
  _id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  section: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  isResolved: boolean
}

interface NotificationBannerProps {
  currentPath?: string
  onNotificationClick?: (notifications: Notification[]) => void
}

const NotificationBanner = ({ currentPath, onNotificationClick }: NotificationBannerProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [expanded, setExpanded] = useState(false)
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0)

  // 로컬 스토리지에서 오늘 하루 숨긴 알림 가져오기
  const getHiddenNotifications = (): Record<string, string> => {
    try {
      const hidden = localStorage.getItem('hiddenNotifications')
      if (!hidden) return {}
      const hiddenData = JSON.parse(hidden)
      const today = dayjs().format('YYYY-MM-DD')
      
      // 오늘 날짜가 아닌 항목 제거
      const filtered: Record<string, string> = {}
      Object.keys(hiddenData).forEach(id => {
        if (hiddenData[id] === today) {
          filtered[id] = hiddenData[id]
        }
      })
      
      // 필터링된 데이터 다시 저장
      if (Object.keys(filtered).length !== Object.keys(hiddenData).length) {
        localStorage.setItem('hiddenNotifications', JSON.stringify(filtered))
      }
      
      return filtered
    } catch {
      return {}
    }
  }

  // 알림을 오늘 하루 숨기기
  const handleHideToday = (id: string) => {
    try {
      const hidden = getHiddenNotifications()
      hidden[id] = dayjs().format('YYYY-MM-DD')
      localStorage.setItem('hiddenNotifications', JSON.stringify(hidden))
      
      // 로컬 상태에서 제거
      setNotifications(prev => prev.filter(n => n._id !== id))
    } catch (error) {
      console.error('알림 숨기기 실패:', error)
    }
  }

  useEffect(() => {
    if (!currentPath) {
      setNotifications([])
      return
    }

    const fetchNotifications = async () => {
      try {
        const response = await api.get(`/notifications/path${currentPath}`)
        const data = response.data || []
        
        // 오늘 하루 숨긴 알림 필터링
        const hidden = getHiddenNotifications()
        
        // 임박/지난 항목만 필터링
        const now = new Date()
        const filtered = data.filter((notif: Notification) => {
          // 숨긴 알림 제외
          if (hidden[notif._id]) return false
          
          if (!notif.dueDate) return true // 마감일 없으면 표시
          const dueDate = new Date(notif.dueDate)
          const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
          return dueDate <= threeDaysLater // 3일 이내 또는 지난 항목
        })
        
        setNotifications(filtered)
      } catch (error: unknown) {
        // MongoDB 연결 오류인 경우 조용히 처리
        const axiosError = error as { response?: { status?: number } }
        if (axiosError.response?.status === 503 || axiosError.response?.status === 500) {
          // 조용히 처리 (너무 많은 경고 방지)
        }
        // 에러 발생 시 빈 배열로 설정 (알림이 없거나 서버 오류)
        setNotifications([])
      }
    }
    
    fetchNotifications()
    
    // 30초마다 알림 업데이트
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [currentPath])

  // CSS 애니메이션 스타일 동적 추가
  useEffect(() => {
    const styleId = 'notification-ticker-style'
    if (document.getElementById(styleId)) {
      return // 이미 스타일이 있으면 추가하지 않음
    }

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .notification-ticker {
        animation: notification-blink 3s ease-in-out infinite;
      }
      @keyframes notification-blink {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.3;
        }
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [])

  // 우선순위별 정렬 (긴급 > 높음 > 중간 > 낮음) - useMemo로 메모이제이션
  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
    })
  }, [notifications])

  // 긴급/높은 우선순위 알림 개수
  const urgentCount = useMemo(() => {
    return notifications.filter(n => 
      n.priority === 'urgent' || n.priority === 'high'
    ).length
  }, [notifications])

  // 알림이 변경되면 인덱스 리셋
  useEffect(() => {
    setCurrentNotificationIndex(0)
  }, [notifications.length])

  // 알림 자동 전환 (6초마다 - 깜빡이는 애니메이션과 함께)
  useEffect(() => {
    if (sortedNotifications.length <= 1 || expanded) return

    const interval = setInterval(() => {
      setCurrentNotificationIndex((prev) => (prev + 1) % sortedNotifications.length)
    }, 6000) // 6초마다 다음 알림으로 (깜빡이는 애니메이션 3초 + 표시 시간 3초)

    return () => clearInterval(interval)
  }, [sortedNotifications.length, expanded])

  // 전광판용 알림 텍스트 생성 (현재 알림만)
  const getCurrentTickerText = () => {
    if (sortedNotifications.length === 0) return ''
    
    // 인덱스 범위 체크
    const safeIndex = currentNotificationIndex % sortedNotifications.length
    const notification = sortedNotifications[safeIndex]
    const isOverdue = notification.dueDate && new Date(notification.dueDate) < new Date()
    const isDueSoon = notification.dueDate && 
      new Date(notification.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) &&
      new Date(notification.dueDate) > new Date()
    
    let statusTag = ''
    if (isOverdue) statusTag = '[기한 초과] '
    else if (isDueSoon) statusTag = '[임박] '
    
    let priorityTag = ''
    if (notification.priority === 'urgent') priorityTag = '[긴급] '
    else if (notification.priority === 'high') priorityTag = '[높음] '
    
    const dueDateText = notification.dueDate 
      ? ` (마감일: ${dayjs(notification.dueDate).format('YYYY-MM-DD HH:mm')})`
      : ''
    
    return `${statusTag}${priorityTag}${notification.message}${dueDateText}`
  }

  const tickerText = getCurrentTickerText()

  if (notifications.length === 0) {
    return null
  }

  return (
    <div 
      style={{ 
        backgroundColor: urgentCount > 0 ? '#fff1f0' : '#fffbe6', 
        borderBottom: urgentCount > 0 ? '3px solid #ff4d4f' : '2px solid #ffd591',
        padding: '8px 16px',
        marginBottom: 0,
        transition: 'all 0.3s',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 알림 헤더 */}
      {expanded && (
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <Space>
            {notifications.length > 3 && (
              <Button
                type="text"
                size="small"
                icon={expanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => setExpanded(!expanded)}
                style={{ padding: '0 4px' }}
              >
                {expanded ? '접기' : `전체 보기 (${notifications.length}건)`}
              </Button>
            )}
            <Button
              type="text"
              size="small"
              onClick={() => {
                if (onNotificationClick && notifications.length > 0) {
                  onNotificationClick(notifications)
                }
              }}
              style={{ padding: '0 4px' }}
            >
              상세 보기
            </Button>
          </Space>
        </div>
      )}

      {/* 전광판 스타일 알림 (펼쳐지지 않았을 때) */}
      {!expanded && tickerText && (
        <div
          style={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            position: 'relative',
            height: '24px',
            lineHeight: '24px',
            width: '100%',
          }}
        >
          <div
            className="notification-ticker"
            key={`ticker-${currentNotificationIndex}`}
            style={{
              display: 'inline-block',
              fontSize: '14px',
              color: '#000',
              fontWeight: 600,
              textAlign: 'center',
              width: '100%',
            }}
          >
            {tickerText}
          </div>
        </div>
      )}

      {/* 펼쳐진 알림 목록 */}
      {expanded && (
        <div>
          {sortedNotifications.map((notification) => {
            const isOverdue = notification.dueDate && new Date(notification.dueDate) < new Date()
            const isDueSoon = notification.dueDate && 
              new Date(notification.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) &&
              new Date(notification.dueDate) > new Date()

            return (
              <div 
                key={notification._id}
                style={{
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '4px',
                  borderLeft: `3px solid ${
                    notification.priority === 'urgent' ? '#ff4d4f' :
                    notification.priority === 'high' ? '#ff7875' :
                    notification.priority === 'medium' ? '#ffa940' : '#95de64'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 500 }}>{notification.title}</span>
                      {isOverdue && <Tag color="red">기한 초과</Tag>}
                      {isDueSoon && !isOverdue && <Tag color="orange">임박</Tag>}
                      {notification.priority === 'urgent' && <Tag color="red">긴급</Tag>}
                      {notification.priority === 'high' && <Tag color="orange">높음</Tag>}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                      {notification.message}
                    </div>
                    {notification.dueDate && (
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        마감일: {dayjs(notification.dueDate).format('YYYY-MM-DD HH:mm')}
                      </span>
                    )}
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleHideToday(notification._id)
                    }}
                    style={{ 
                      padding: '0 4px',
                      fontSize: '12px',
                      color: '#999',
                      flexShrink: 0
                    }}
                    title="오늘 하루 보지 않기"
                  >
                    숨기기
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default NotificationBanner
