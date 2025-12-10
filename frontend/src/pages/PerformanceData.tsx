import { Tabs } from 'antd'
import Deliveries from './Deliveries'
import LaborLogs from './LaborLogs'
import ProjectSourceFiles from './ProjectSourceFiles'

const PerformanceData = () => {
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>인보이스 기초 자료</h2>
      <Tabs
        defaultActiveKey="files"
        items={[
          {
            key: 'files',
            label: '파일 업로드',
            children: <ProjectSourceFiles />,
          },
          {
            key: 'deliveries',
            label: '출하 실적',
            children: <Deliveries />,
          },
          {
            key: 'labor',
            label: '노무 실적',
            children: <LaborLogs />,
          },
        ]}
      />
    </div>
  )
}

export default PerformanceData

