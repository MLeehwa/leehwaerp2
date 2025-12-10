import { useState, useEffect } from 'react'
import { Card, Row, Col, Input, message } from 'antd'
import { ProjectOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

interface Project {
  _id: string
  projectCode: string
  projectName: string
  customer?: {
    _id: string
    name: string
  }
  company?: {
    _id: string
    code: string
    name: string
  }
  status: 'active' | 'completed' | 'on-hold' | 'cancelled'
}

const OperationProjectSelect = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (searchText) {
      const filtered = projects.filter(
        (p) =>
          p.projectCode.toLowerCase().includes(searchText.toLowerCase()) ||
          p.projectName.toLowerCase().includes(searchText.toLowerCase()) ||
          p.customer?.name.toLowerCase().includes(searchText.toLowerCase())
      )
      setFilteredProjects(filtered)
    } else {
      setFilteredProjects(projects)
    }
  }, [searchText, projects])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await api.get('/projects?status=active')
      setProjects(response.data)
      setFilteredProjects(response.data)
    } catch (error) {
      message.error('프로젝트 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleProjectClick = (projectId: string) => {
    navigate(`/operation/projects/${projectId}/source-data`)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2>프로젝트 선택</h2>
        <p style={{ color: '#666', marginTop: 8 }}>
          운영 작업을 진행할 프로젝트를 선택하세요
        </p>
      </div>

      <Input.Search
        placeholder="프로젝트 코드, 프로젝트명, 고객명으로 검색"
        allowClear
        size="large"
        style={{ marginBottom: 24 }}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      <Row gutter={[16, 16]}>
        {filteredProjects.map((project) => (
          <Col xs={24} sm={12} md={8} lg={6} key={project._id}>
            <Card
              hoverable
              style={{ height: '100%' }}
              onClick={() => handleProjectClick(project._id)}
              loading={loading}
            >
              <div style={{ textAlign: 'center' }}>
                <ProjectOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{project.projectCode}</div>
                <div style={{ color: '#666', marginBottom: 8, fontSize: '14px' }}>
                  {project.projectName}
                </div>
                {project.customer && (
                  <div style={{ color: '#999', fontSize: '12px' }}>
                    {project.customer.name}
                  </div>
                )}
                {project.company && (
                  <div style={{ color: '#999', fontSize: '12px', marginTop: 4 }}>
                    {project.company.code} - {project.company.name}
                  </div>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {filteredProjects.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          {searchText ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}
        </div>
      )}
    </div>
  )
}

export default OperationProjectSelect

