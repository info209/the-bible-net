import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Upload a file buffer to Cloudinary
 * @param fileBuffer - The file buffer to upload
 * @param folder - Optional folder path in Cloudinary (e.g., 'profiles', 'bible-images')
 * @param resourceType - Type of resource: 'image' | 'video' | 'raw' | 'auto'
 * @returns Promise with the secure URL and public_id
 */
export async function uploadToCloudinary(
    fileBuffer: Buffer,
    folder: string = 'uploads',
    resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'
): Promise<{ url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: resourceType,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else if (result) {
                    resolve({
                        url: result.secure_url,
                        public_id: result.public_id,
                    });
                } else {
                    reject(new Error('Upload failed without error'));
                }
            }
        );

        uploadStream.end(fileBuffer);
    });
}

/**
 * Delete a file from Cloudinary
 * @param publicId - The public_id of the file to delete
 * @param resourceType - Type of resource
 */
export async function deleteFromCloudinary(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export default cloudinary;
