import axios from 'axios'
import { message } from 'antd'

// 개발 환경에서는 프록시를 통해 백엔드에 연결
// 프로덕션에서는 환경 변수로 백엔드 URL 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45초 타임아웃 (Serverless Cold Start 대응)
})

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 네트워크 오류나 서버 연결 실패
    if (!error.response) {
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        message.error('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.')
      }
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      // 로그인 페이지에서는 리다이렉트하지 않음
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        message.error('인증이 만료되었습니다. 다시 로그인해주세요.')
      }
    } else if (error.response?.status >= 500) {
      message.error('서버 오류가 발생했습니다.')
    }
    return Promise.reject(error)
  }
)

export default api

