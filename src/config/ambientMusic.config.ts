export const AMBIENT_MUSIC_CONFIG = {
    MAX_TRACKS: 5,
    SUPPORTED_EXTENSIONS: ['.mp3', '.wav', '.ogg', '.m4a'],
    SUPPORTED_MIME_TYPES: [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/ogg',
        'application/ogg',
        'audio/x-m4a',
        'audio/m4a',
        'audio/mp4'
    ],
    MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB
    IMAGE_SUPPORTED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
    IMAGE_SUPPORTED_MIME_TYPES: [
        'image/jpeg',
        'image/png',
        'image/webp'
    ],
    IMAGE_MAX_FILE_SIZE: 5 * 1024 * 1024 // 5MB
};
