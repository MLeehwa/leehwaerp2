import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import koKR from 'antd/locale/ko_KR'
import 'antd/dist/reset.css'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // StrictMode를 일시적으로 비활성화하여 react-tabulator의 findDOMNode 경고 제거
  // 프로덕션에서는 StrictMode를 다시 활성화하는 것을 권장합니다
    <ConfigProvider locale={koKR}>
      <App />
  </ConfigProvider>,
)

