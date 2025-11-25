// Version mapping utility
// Maps backend version IDs to frontend display IDs and names

export const VERSION_MAPPING: Record<string, { frontendId: string; displayName: string; acronym?: string }> = {
    'irv': {
        frontendId: 'bsi',
        displayName: 'బైబిల్ సొసైటీ ఆఫ్ ఇండియా (BSI)', // Bible Society of India in Telugu with English acronym
        acronym: 'BSI' // Explicit acronym to display in compact views
    }
};

/**
 * Converts backend version ID to frontend version ID
 * @param backendId - The version ID from the backend (e.g., 'irv')
 * @returns The frontend version ID (e.g., 'bsi')
 */
export function toFrontendVersionId(backendId: string): string {
    return VERSION_MAPPING[backendId]?.frontendId || backendId;
}

/**
 * Converts frontend version ID to backend version ID
 * @param frontendId - The version ID used in the frontend (e.g., 'bsi')
 * @returns The backend version ID (e.g., 'irv')
 */
export function toBackendVersionId(frontendId: string): string {
    const entry = Object.entries(VERSION_MAPPING).find(([_, v]) => v.frontendId === frontendId);
    return entry ? entry[0] : frontendId;
}

/**
 * Gets the display name for a version
 * @param backendId - The version ID from the backend
 * @param originalDisplayName - The original display name from the backend
 * @returns The mapped display name or original if no mapping exists
 */
export function getVersionDisplayName(backendId: string, originalDisplayName: string): string {
    return VERSION_MAPPING[backendId]?.displayName || originalDisplayName;
}

/**
 * Transforms a version object from backend to frontend format
 * @param version - Version object from backend
 * @returns Transformed version object for frontend
 */
export function transformVersionForFrontend(version: any): any {
    if (!version) return version;

    const mapping = VERSION_MAPPING[version.id];
    if (mapping) {
        return {
            ...version,
            id: mapping.frontendId,
            displayName: mapping.displayName,
            acronym: mapping.acronym, // Add explicit acronym if defined
            _backendId: version.id // Keep original for API calls
        };
    }
    return version;
}

/**
 * Transforms an array of version objects from backend to frontend format
 * @param versions - Array of version objects from backend
 * @returns Transformed array for frontend
 */
export function transformVersionsForFrontend(versions: any[]): any[] {
    return versions.map(transformVersionForFrontend);
}

