import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

interface ComingSoonProps {
    title?: string;
    description?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({
    title = "Coming Soon",
    description = "This feature is currently under development. We are working hard to bring it to you!"
}) => {
    const navigate = useNavigate();

    return (
        <div style={{ padding: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Result
                status="404"
                title={title}
                subTitle={description}
                extra={
                    <Button type="primary" onClick={() => navigate('/')}>
                        Back Home
                    </Button>
                }
            />
        </div>
    );
};

export default ComingSoon;
