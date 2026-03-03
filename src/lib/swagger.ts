import swaggerJsdoc from 'swagger-jsdoc';

let cachedSpec: any = null;

export const getApiDocs = async () => {
    if (cachedSpec) {
        return cachedSpec;
    }

    const options = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'The Bible Net API',
                version: '1.0.0',
                description: 'API documentation for The Bible Net application',
            },
            components: {
                securitySchemes: {
                    BearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
                schemas: {
                    User: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            firstName: { type: 'string' },
                            lastName: { type: 'string' },
                            email: { type: 'string' },
                            role: { type: 'string', enum: ['SUPER_ADMIN', 'SUB_ADMIN', 'USER'] },
                            preferredLanguage: { type: 'string' },
                            preferredBibleVersion: { type: 'string' },
                            country: { type: 'string' },
                            emailVerified: { type: 'boolean' },
                            onboardingCompleted: { type: 'boolean' },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Content: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            type: { type: 'string', enum: ['verse', 'devotion'] },
                            title: { type: 'string' },
                            reference: { type: 'string' },
                            text: { type: 'string' },
                            createdBy: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            security: [],
        },
        apis: ['./src/app/api/**/*.ts'],
    };

    const spec = swaggerJsdoc(options);
    cachedSpec = spec;
    return spec;
};
