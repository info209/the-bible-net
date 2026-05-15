import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/auth/admin';
import { UserRole } from '@/types/user';
import path from 'path';
import fs from 'fs';


export const dynamic = 'force-dynamic';

// Public upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'daily-content');

function ensureUploadDir() {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
}

function generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    return `bg-${timestamp}-${rand}${ext}`;
}

/**
 * POST /api/admin/daily-content/image-upload
 * Uploads a background image locally and returns its public URL.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.name).toLowerCase();

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
            return NextResponse.json({
                success: false,
                error: 'Only JPG, PNG, and WEBP images are supported.'
            }, { status: 400 });
        }

        // Validate size (max 10MB)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ success: false, error: 'Image size exceeds 10MB limit.' }, { status: 400 });
        }

        ensureUploadDir();

        const filename = generateUniqueFilename(file.name);
        const filePath = path.join(UPLOAD_DIR, filename);

        // Write file to disk
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        const publicUrl = `/uploads/daily-content/${filename}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename,
            size: file.size,
        });
    } catch (error: any) {
        console.error('Image upload error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
    }
}

/**
 * GET /api/admin/daily-content/image-upload
 * Returns list of uploaded background images.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        ensureUploadDir();

        const files = fs.readdirSync(UPLOAD_DIR)
            .filter(f => ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(f).toLowerCase()))
            .map(f => {
                const stat = fs.statSync(path.join(UPLOAD_DIR, f));
                return {
                    filename: f,
                    url: `/uploads/daily-content/${f}`,
                    size: stat.size,
                    uploadedAt: stat.birthtime.toISOString(),
                };
            })
            .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
            .slice(0, 50); // Latest 50

        return NextResponse.json({ success: true, data: files });
    } catch (error: any) {
        console.error('Image list error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
