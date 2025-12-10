import React, { useState, useRef, useEffect } from 'react';
import { Button, Drawer, Input, Avatar, Spin, FloatButton, Typography, Card, Space } from 'antd';
import { RobotOutlined, SendOutlined, UserOutlined, LoadingOutlined, ClearOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const { Text } = Typography;
const { TextArea } = Input;

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
}

const AiAssistant: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I am your ERP Assistant. How can I help you today? I can help you navigate or find data.' }
    ]);
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, visible]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Send chat history to backend
            const response = await api.post('/ai/chat', {
                messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content }))
            });

            const { message, action, path } = response.data;

            const aiMessage: Message = { role: 'assistant', content: message, timestamp: new Date() };
            setMessages(prev => [...prev, aiMessage]);

            if (action === 'navigate' && path) {
                navigate(path);
            }

        } catch (error) {
            console.error('AI Chat Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please check if the API key is configured.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setMessages([{ role: 'assistant', content: 'Chat history cleared. How can I help you?' }]);
    };

    return (
        <>
            <FloatButton
                icon={<RobotOutlined />}
                type="primary"
                style={{ right: 24, bottom: 24, width: 60, height: 60 }}
                onClick={() => setVisible(true)}
                tooltip="AI Assistant"
            />

            <Drawer
                title={
                    <Space>
                        <Avatar style={{ backgroundColor: '#1890ff' }} icon={<RobotOutlined />} />
                        <Text strong>ERP Assistant</Text>
                    </Space>
                }
                extra={
                    <Button type="text" icon={<ClearOutlined />} onClick={handleClear}>
                        Clear
                    </Button>
                }
                placement="right"
                onClose={() => setVisible(false)}
                open={visible}
                width={450}
                bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}
            >
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {messages.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start',
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    flexDirection: item.role === 'user' ? 'row-reverse' : 'row',
                                    gap: '12px',
                                    maxWidth: '85%'
                                }}>
                                    <Avatar
                                        size="small"
                                        icon={item.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                                        style={{
                                            backgroundColor: item.role === 'user' ? '#52c41a' : '#1890ff',
                                            flexShrink: 0
                                        }}
                                    />
                                    <Card
                                        size="small"
                                        bordered={false}
                                        style={{
                                            borderRadius: '12px',
                                            borderTopLeftRadius: item.role === 'assistant' ? '2px' : '12px',
                                            borderTopRightRadius: item.role === 'user' ? '2px' : '12px',
                                            backgroundColor: item.role === 'user' ? '#1890ff' : '#ffffff',
                                            color: item.role === 'user' ? '#ffffff' : 'rgba(0,0,0,0.85)',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}
                                        bodyStyle={{ padding: '8px 12px' }}
                                    >
                                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '14px' }}>
                                            {item.content}
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <Avatar size="small" icon={<RobotOutlined />} style={{ backgroundColor: '#1890ff' }} />
                                <Card size="small" bordered={false} style={{ borderRadius: '12px', borderTopLeftRadius: '2px' }}>
                                    <Space>
                                        <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} />
                                        <Text type="secondary" style={{ fontSize: '13px' }}>Thinking...</Text>
                                    </Space>
                                </Card>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <div style={{ padding: '16px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                        <TextArea
                            placeholder="Ask anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onPressEnter={(e) => {
                                if (!e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            style={{ borderRadius: '8px' }}
                        />
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handleSend}
                            loading={loading}
                            shape="circle"
                            size="large"
                        />
                    </div>
                </div>
            </Drawer>
        </>
    );
};

export default AiAssistant;
