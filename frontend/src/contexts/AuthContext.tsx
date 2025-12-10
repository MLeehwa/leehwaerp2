import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { message } from 'antd'
import api from '../utils/api'

interface User {
  id: string
  username: string
  email: string
  role: string
  firstName: string
  lastName: string
  allowedMenus?: string[]
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (loginId: string, password: string, type?: 'email' | 'username') => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
    }
    setLoading(false)
  }, [])

  const login = async (loginId: string, password: string, type: 'email' | 'username' = 'email') => {
    try {
      // 이메일 또는 아이디로 로그인
      const payload = type === 'email' 
        ? { email: loginId, password }
        : { username: loginId, password };
      
      const response = await api.post('/auth/login', payload)
      const { token: newToken, user: newUser } = response.data

      setToken(newToken)
      setUser(newUser)
      localStorage.setItem('token', newToken)
      localStorage.setItem('user', JSON.stringify(newUser))
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

      message.success('로그인 성공')
    } catch (error: any) {
      console.error('로그인 오류:', error)
      if (error.code === 'ECONNREFUSED' || !error.response) {
        message.error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인하세요.')
      } else if (error.response?.status === 503) {
        if (error.response?.data?.error === 'DATABASE_CONNECTION_ERROR' || error.response?.data?.error === 'DATABASE_ERROR') {
          message.error('데이터베이스에 연결할 수 없습니다. MongoDB가 실행 중인지 확인하세요.')
        } else {
          message.error(error.response?.data?.message || '서버 오류가 발생했습니다.')
        }
      } else if (error.response?.status === 401) {
        message.error(error.response?.data?.message || '이메일/아이디 또는 비밀번호가 올바르지 않습니다.')
      } else if (error.response?.data?.message) {
        message.error(error.response.data.message)
      } else if (error.response?.data?.errors) {
        const errorMsg = error.response.data.errors.map((e: any) => e.msg).join(', ')
        message.error(errorMsg)
      } else {
        message.error('로그인 실패: ' + (error.message || '알 수 없는 오류'))
      }
      throw error
    }
  }

  const register = async (data: any) => {
    try {
      const response = await api.post('/auth/register', data)
      const { token: newToken, user: newUser } = response.data

      setToken(newToken)
      setUser(newUser)
      localStorage.setItem('token', newToken)
      localStorage.setItem('user', JSON.stringify(newUser))
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

      message.success('회원가입 성공')
    } catch (error: any) {
      console.error('회원가입 오류:', error)
      if (error.code === 'ECONNREFUSED' || !error.response) {
        message.error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인하세요.')
      } else if (error.response?.status === 503) {
        if (error.response?.data?.error === 'DATABASE_CONNECTION_ERROR' || error.response?.data?.error === 'DATABASE_ERROR') {
          message.error('데이터베이스에 연결할 수 없습니다. MongoDB가 실행 중인지 확인하세요.')
        } else {
          message.error(error.response?.data?.message || '서버 오류가 발생했습니다.')
        }
      } else if (error.response?.status === 400) {
        // validation 오류 또는 중복 오류
        if (error.response?.data?.errors) {
          const errorMsg = error.response.data.errors.map((e: any) => e.msg || e.message).join(', ')
          message.error(errorMsg)
        } else {
          message.error(error.response?.data?.message || '입력 정보를 확인하세요.')
        }
      } else if (error.response?.data?.message) {
        message.error(error.response.data.message)
      } else {
        message.error('회원가입 실패: ' + (error.message || '알 수 없는 오류'))
      }
      throw error
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    message.success('로그아웃되었습니다')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

