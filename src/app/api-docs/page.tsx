import dynamic from 'next/dynamic';
import { Metadata } from 'next';

const SwaggerClient = dynamic(() => import('@/components/SwaggerClient'), { ssr: false });

export const metadata: Metadata = {
    title: 'API Documentation',
    description: 'Interactive API documentation for The Bible Net application',
};

export default function ApiDocs() {
    return (
        <div className="bg-white min-h-screen">
            <SwaggerClient />
        </div>
    );
}
