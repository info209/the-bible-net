import { NextRequest, NextResponse } from 'next/server';
import { LegalService } from '@/services/legalService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const content = await LegalService.getLegalContent('terms');
        if (!content) {
            return NextResponse.json({ 
                title: 'Terms & Conditions', 
                content: '<p>Content unavailable. Please try again later.</p>',
                lastUpdated: new Date() 
            });
        }
        return NextResponse.json({
            title: content.title,
            content: content.content,
            lastUpdated: content.lastUpdated
        });
    } catch (error: any) {
        console.error('Fetch terms error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
