import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface Tab {
  key: string
  label: string
  path: string
}

interface TabContextType {
  tabs: Tab[]
  activeTab: string
  addTab: (tab: Tab) => void
  removeTab: (key: string) => void
  setActiveTab: (key: string) => void
}

const TabContext = createContext<TabContextType | undefined>(undefined)

export const TabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTab, setActiveTab] = useState<string>('')

  const addTab = useCallback((tab: Tab) => {
    setTabs((prevTabs) => {
      // 이미 존재하는 탭인지 확인
      const exists = prevTabs.some((t) => t.key === tab.key)
      if (exists) {
        setActiveTab(tab.key)
        return prevTabs
      }
      // 새 탭 추가
      setActiveTab(tab.key)
      return [...prevTabs, tab]
    })
  }, [])

  const removeTab = useCallback((key: string) => {
    setTabs((prevTabs) => {
      const newTabs = prevTabs.filter((tab) => tab.key !== key)
      // 닫은 탭이 활성 탭이었다면 다른 탭으로 이동
      if (activeTab === key && newTabs.length > 0) {
        const currentIndex = prevTabs.findIndex((tab) => tab.key === key)
        const newActiveIndex = currentIndex > 0 ? currentIndex - 1 : 0
        setActiveTab(newTabs[newActiveIndex].key)
      } else if (newTabs.length === 0) {
        setActiveTab('')
      }
      return newTabs
    })
  }, [activeTab])

  return (
    <TabContext.Provider value={{ tabs, activeTab, addTab, removeTab, setActiveTab }}>
      {children}
    </TabContext.Provider>
  )
}

export const useTabs = () => {
  const context = useContext(TabContext)
  if (!context) {
    throw new Error('useTabs must be used within a TabProvider')
  }
  return context
}

