import { useState, useEffect } from 'react'
import { Card, Button, Space, Tag, Descriptions, message, Modal, Input, Alert } from 'antd'
import { DatabaseOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, FileOutlined } from '@ant-design/icons'
import api from '../utils/api'

const { TextArea } = Input

interface StorageStatus {
  storageType: string
  bucketName: string
  region: string
  configured: boolean
  bucketExists: boolean
  bucketAccessible: boolean
  writeTest: boolean
  message: string
  dbStatus?: {
    connected: boolean
    host: string
    name: string
    state: number
  }
}

const StorageStatus = () => {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [testModalVisible, setTestModalVisible] = useState(false)
  const [testContent, setTestContent] = useState('S3 연결 테스트 파일')

  useEffect(() => {
    fetchStatus()
  }, [])

  // 상세 에러 메시지 렌더링 함수 추가
  const renderErrorMessage = () => {
    if (!status?.message) return null;

    // 상세 에러 정보가 있으면 같이 출력
    const description = (
      <div>
        <p>{status.message}</p>
        {(status as any).details && (
          <div style={{ marginTop: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Error Details:</p>
            <pre style={{ fontSize: '11px', maxHeight: '150px', overflow: 'auto', margin: 0 }}>
              {JSON.stringify((status as any).details, null, 2)}
            </pre>
          </div>
        )}
        {(status as any).error && !((status as any).details) && (
          <p style={{ fontSize: '12px', color: '#666' }}>Error: {(status as any).error}</p>
        )}
      </div>
    );

    return (
      <Alert
        message="오류 발생"
        description={description}
        type={status.configured && status.bucketAccessible ? 'success' : 'warning'}
        style={{ marginBottom: 24 }}
        showIcon
      />
    );
  };

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/storage-status')
      setStatus(response.data)
    } catch (error: any) {
      message.error(error.response?.data?.message || '저장소 상태를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleTestWrite = async () => {
    try {
      const response = await api.post('/admin/storage-status/test-write', {
        testContent,
      })

      if (response.data.success) {
        message.success('저장소 쓰기 테스트 성공!')
        setTestModalVisible(false)
        fetchStatus()
      } else {
        message.error(response.data.message || '쓰기 테스트 실패')
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '쓰기 테스트에 실패했습니다')
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>
            <DatabaseOutlined /> S3 저장소 상태 확인
          </h1>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchStatus} loading={loading}>
              새로고침
            </Button>
            <Button
              type="primary"
              icon={<FileOutlined />}
              onClick={() => setTestModalVisible(true)}
              disabled={!status?.bucketAccessible}
            >
              쓰기 테스트
            </Button>
          </Space>
        </div>

        {status && (
          <>
            {renderErrorMessage()}

            <Descriptions title="블록 스토리지 (S3) 정보" bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="저장 타입">
                <Tag color="blue">AWS S3</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="버킷 이름">
                <code>{status.bucketName}</code>
              </Descriptions.Item>
              <Descriptions.Item label="리전">
                <code>{status.region}</code>
              </Descriptions.Item>
              <Descriptions.Item label="설정 상태">
                {status.configured ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>설정됨</Tag>
                ) : (
                  <Tag color="red" icon={<CloseCircleOutlined />}>미설정</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="버킷 존재">
                {status.bucketExists ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>확인됨</Tag>
                ) : (
                  <Tag color="red" icon={<CloseCircleOutlined />}>없음/접근불가</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="접근 권한">
                {status.bucketAccessible ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>가능</Tag>
                ) : (
                  <Tag color="red" icon={<CloseCircleOutlined />}>불가능</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="쓰기 테스트">
                {status.writeTest ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>성공</Tag>
                ) : (
                  <Tag color="orange" icon={<CloseCircleOutlined />}>미실시</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="데이터베이스 (MongoDB) 정보" bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="연결 상태">
                {status.dbStatus?.connected ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>연결됨</Tag>
                ) : (
                  <Tag color="red" icon={<CloseCircleOutlined />}>연결 끊김</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="호스트">
                <code>{status.dbStatus?.host || 'N/A'}</code>
              </Descriptions.Item>
              <Descriptions.Item label="데이터베이스명">
                <code>{status.dbStatus?.name || 'N/A'}</code>
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>

      <Modal
        title="저장소 쓰기 테스트"
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        onOk={handleTestWrite}
      >
        <p>테스트 파일을 생성하여 저장소 쓰기 권한을 확인합니다.</p>
        <TextArea
          rows={4}
          value={testContent}
          onChange={(e) => setTestContent(e.target.value)}
          placeholder="테스트 파일 내용"
        />
      </Modal>
    </div>
  )
}

export default StorageStatus

