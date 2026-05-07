import { Metadata } from 'next';
import LegalCMSClient from './LegalCMSClient';

export const metadata: Metadata = {
    title: 'Legal CMS | Admin Dashboard',
    description: 'Manage Terms & Conditions and Privacy Policy',
};

export default function LegalCMSPage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Legal Content Management</h1>
                    <p className="text-gray-400 mt-1">Manage Terms & Conditions and Privacy Policy content</p>
                </div>
            </div>
            
            <LegalCMSClient />
        </div>
    );
}
