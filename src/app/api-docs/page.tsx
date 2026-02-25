import dynamic from 'next/dynamic';
import { Metadata } from 'next';

const SwaggerClient = dynamic(() => import('@/components/SwaggerClient'), { ssr: false });

export const metadata: Metadata = {
    title: 'API Documentation | The Bible Net',
    description: 'Interactive API documentation for The Bible Net application',
};

export default function ApiDocs() {
    return (
        <div className="container mx-auto p-4 bg-white dark:bg-gray-900 min-h-screen">
            <SwaggerClient />
        </div>
    );
}
