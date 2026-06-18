/**
 * Maps technical/system error messages to user-friendly messages.
 * Logs the original technical error internally using console.error for debugging.
 */
export function getFriendlyErrorMessage(
    error: any,
    context?: 'login' | 'register' | 'otp' | 'forgot-password' | 'reset-password' | 'profile'
): string {
    // 1. Extract raw error message
    let rawMessage = '';
    if (typeof error === 'string') {
        rawMessage = error;
    } else if (error && typeof error === 'object') {
        rawMessage = error.message || error.error || error.code || JSON.stringify(error);
    } else {
        rawMessage = String(error || '');
    }

    // Log the actual technical error internally for debugging
    console.error(`[Internal Technical Error Log] Context: ${context || 'generic'}. Raw details:`, error);

    const cleanMsg = rawMessage.trim().toLowerCase();

    // 2. Generic Fallback check for system/technical messages
    const technicalKeywords = [
        'configuration',
        'internal error',
        'mongo error',
        'auth error',
        'unknown error',
        'unhandled exception',
        'mongodb',
        'mongoose',
        'servererror',
        'duplicate key error',
        'e11000'
    ];

    // Check if the message is purely technical or empty
    if (!cleanMsg || technicalKeywords.some(keyword => cleanMsg.includes(keyword))) {
        // If it's a duplicate key/email exists in register/profile context, we map it to duplicate email errors
        if (cleanMsg.includes('duplicate key') || cleanMsg.includes('e11000') || cleanMsg.includes('email_1')) {
            if (context === 'profile') {
                return 'This email address is already associated with another account.';
            }
            return 'An account with this email already exists.\nPlease sign in instead.';
        }
        
        return 'Something went wrong.\nPlease try again later.';
    }

    // 3. Network Failures
    if (
        cleanMsg.includes('unable to connect') ||
        cleanMsg.includes('connection error') ||
        cleanMsg.includes('connection failed') ||
        cleanMsg.includes('failed to connect') ||
        cleanMsg.includes('network error') ||
        cleanMsg.includes('fetch failed') ||
        cleanMsg.includes('net::err')
    ) {
        return 'Unable to connect.\nPlease check your internet connection and try again.';
    }

    // 4. Context-Specific Mappings

    // --- LOGIN ---
    if (context === 'login') {
        if (cleanMsg.includes('user not found') || cleanMsg.includes('no account exists')) {
            return 'User not found.\nPlease check your email address or create an account.';
        }
        if (cleanMsg.includes('incorrect password') || cleanMsg.includes('invalid password')) {
            return 'Incorrect password.\nPlease try again.';
        }
        if (
            cleanMsg.includes('invalid credentials') ||
            cleanMsg.includes('invalid login') ||
            cleanMsg.includes('incorrect email or password') ||
            cleanMsg.includes('credentialscheck') ||
            cleanMsg.includes('credentialssignin')
        ) {
            return 'Incorrect email or password.';
        }
        if (cleanMsg.includes('deactivated') || cleanMsg.includes('disabled')) {
            return 'Your account has been disabled.\nPlease contact support.';
        }
        if (
            cleanMsg.includes('access denied') ||
            cleanMsg.includes('admin portal') ||
            cleanMsg.includes('admin privileges') ||
            cleanMsg.includes('user account required')
        ) {
            return 'This account is not permitted to sign in here.\nPlease use the Admin Portal.';
        }
    }

    // --- REGISTER ---
    if (context === 'register') {
        if (
            cleanMsg.includes('already registered') ||
            cleanMsg.includes('already exists') ||
            cleanMsg.includes('already in use')
        ) {
            return 'An account with this email already exists.\nPlease sign in instead.';
        }
        if (cleanMsg.includes('invalid email') || cleanMsg.includes('valid email')) {
            return 'Please enter a valid email address.';
        }
        if (cleanMsg.includes('password') && (cleanMsg.includes('weak') || cleanMsg.includes('security') || cleanMsg.includes('8 characters'))) {
            return 'Password does not meet security requirements.';
        }
        if (cleanMsg.includes('unable to create') || cleanMsg.includes('failed')) {
            return 'Unable to create your account.\nPlease try again.';
        }
    }

    // --- OTP ---
    if (context === 'otp') {
        if (cleanMsg.includes('incorrect') || cleanMsg.includes('invalid otp') || cleanMsg.includes('all 6 digits')) {
            return 'The OTP entered is incorrect.\nPlease try again.';
        }
        if (cleanMsg.includes('expired')) {
            return 'This OTP has expired.\nPlease request a new one.';
        }
        if (cleanMsg.includes('unable to verify') || cleanMsg.includes('failed')) {
            return 'Unable to verify OTP.\nPlease try again.';
        }
    }

    // --- FORGOT PASSWORD ---
    if (context === 'forgot-password') {
        if (cleanMsg.includes('user not found') || cleanMsg.includes('no account exists')) {
            return 'No account exists with this email address.';
        }
    }

    // --- RESET PASSWORD ---
    if (context === 'reset-password') {
        if (cleanMsg.includes('expired') || cleanMsg.includes('invalid') || cleanMsg.includes('token')) {
            return 'This password reset link has expired.\nPlease request a new one.';
        }
        if (cleanMsg.includes('unable to reset') || cleanMsg.includes('failed')) {
            return 'Unable to reset password.\nPlease try again.';
        }
    }

    // --- PROFILE ---
    if (context === 'profile') {
        if (cleanMsg.includes('already associated') || cleanMsg.includes('already in use') || cleanMsg.includes('duplicate')) {
            return 'This email address is already associated with another account.';
        }
        if (cleanMsg.includes('unable to save') || cleanMsg.includes('failed')) {
            return 'Unable to save your changes.\nPlease try again.';
        }
    }

    // 5. Fallback for specific raw errors that we want to map regardless of context
    if (cleanMsg.includes('user not found')) {
        if (context === 'forgot-password') {
            return 'No account exists with this email address.';
        }
        return 'User not found.\nPlease check your email address or create an account.';
    }
    if (cleanMsg.includes('incorrect password') || cleanMsg.includes('invalid password')) {
        return 'Incorrect password.\nPlease try again.';
    }
    if (cleanMsg.includes('invalid credentials') || cleanMsg.includes('incorrect email or password')) {
        return 'Incorrect email or password.';
    }
    if (cleanMsg.includes('deactivated') || cleanMsg.includes('disabled')) {
        return 'Your account has been disabled.\nPlease contact support.';
    }
    if (cleanMsg.includes('already exists') || cleanMsg.includes('already registered')) {
        return 'An account with this email already exists.\nPlease sign in instead.';
    }
    if (cleanMsg.includes('otp') && cleanMsg.includes('expired')) {
        return 'This OTP has expired.\nPlease request a new one.';
    }
    if (cleanMsg.includes('otp') && cleanMsg.includes('incorrect')) {
        return 'The OTP entered is incorrect.\nPlease try again.';
    }
    if (cleanMsg.includes('reset') && (cleanMsg.includes('expired') || cleanMsg.includes('invalid'))) {
        return 'This password reset link has expired.\nPlease request a new one.';
    }

    // 6. Final generic fallback
    return 'Something went wrong.\nPlease try again later.';
}
