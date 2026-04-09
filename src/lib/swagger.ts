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
                            summary: { type: 'string' },
                            highlightQuote: { type: 'string' },
                            likeCount: { type: 'number' },
                            commentCount: { type: 'number' },
                            audioUrl: { type: 'string' },
                            bgColor: { type: 'string' },
                            version: { type: 'string' },
                            createdBy: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Prayer: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            userId: { $ref: '#/components/schemas/User' },
                            text: { type: 'string' },
                            isPublic: { type: 'boolean' },
                            anonymous: { type: 'boolean' },
                            intercessionCount: { type: 'number' },
                            intercessors: { type: 'array', items: { type: 'string' } },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Comment: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            userId: { $ref: '#/components/schemas/User' },
                            contentId: { type: 'string' },
                            contentType: { type: 'string', enum: ['verse', 'devotion'] },
                            commentText: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    BibleVersion: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            fullName: { type: 'string' },
                            language: { type: 'string' },
                        },
                    },
                    BibleBook: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            testament: { type: 'string', enum: ['Old', 'New'] },
                            order: { type: 'number' },
                            chaptersCount: { type: 'number' },
                        },
                    },
                    BibleVerse: {
                        type: 'object',
                        properties: {
                            bookId: { type: 'string' },
                            chapter: { type: 'number' },
                            number: { type: 'number' },
                            text: { type: 'string' },
                        },
                    },
                    Error: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean', example: false },
                            error: { type: 'string' },
                        },
                    },
                },
            },
            security: [
                {
                    BearerAuth: [],
                },
            ],
        },
        apis: ['./src/app/api/**/*.ts'],
    };

    const spec = swaggerJsdoc(options);
    cachedSpec = spec;
    return spec;
};
