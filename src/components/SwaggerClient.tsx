'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerClient = () => {
    return <SwaggerUI url="/api/v1/docs" />;
};

export default SwaggerClient;
