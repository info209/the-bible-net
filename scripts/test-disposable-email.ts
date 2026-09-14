import {
    isDisposableEmail,
    validateRegistrationEmail,
    normalizeEmail,
    isDomainDisposable,
    refreshDisposableDomains,
    getDisposableDomainsStats,
    DISPOSABLE_EMAIL_ERROR_MESSAGE,
} from '../src/lib/disposableEmail';

interface TestResult {
    category: string;
    description: string;
    passed: boolean;
    details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, category: string, description: string, details?: string) {
    results.push({
        category,
        description,
        passed: !!condition,
        details,
    });
    const mark = condition ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [${category}] ${description}${details ? ` (${details})` : ''}`);
}

async function runTests() {
    console.log('===========================================================');
    console.log('   RUNNING DISPOSABLE EMAIL PROTECTION TEST SUITE');
    console.log('===========================================================\n');

    // -------------------------------------------------------------
    // Test Category 1: Gmail, Outlook, Yahoo, iCloud, etc. -> ALLOWED
    // -------------------------------------------------------------
    console.log('--- 1. Legitimate Major Email Providers (Must be Allowed) ---');
    const legitEmails = [
        'john.doe@gmail.com',
        'jane_doe@googlemail.com',
        'alex.smith@outlook.com',
        'user123@hotmail.com',
        'work@live.com',
        'legacy@msn.com',
        'person@yahoo.com',
        'person@ymail.com',
        'apple.user@icloud.com',
        'macuser@me.com',
        'secure@proton.me',
        'secure2@protonmail.com',
        'pm@pm.me',
        'business@zoho.com',
        'old@aol.com',
        'german@gmx.de',
        'mailuser@mail.com',
        'fast@fastmail.com',
        'vip@hey.com',
    ];

    for (const email of legitEmails) {
        const check = isDisposableEmail(email);
        const validation = validateRegistrationEmail(email);
        assert(
            !check.isDisposable && validation.isValid,
            'Major Providers',
            `Should allow legitimate address: ${email}`,
            `isDisposable: ${check.isDisposable}, isValid: ${validation.isValid}`
        );
    }

    // -------------------------------------------------------------
    // Test Category 2: Known Temp-Mail Domains -> REJECTED
    // -------------------------------------------------------------
    console.log('\n--- 2. Known Disposable / Temp-Mail Domains (Must be Rejected) ---');
    const tempEmails = [
        'throwaway@mailinator.com',
        'spammer@yopmail.com',
        'burner@temp-mail.org',
        'temp@tempmail.com',
        'temp@tempmail.net',
        'quick@10minutemail.com',
        'guerrilla@guerrillamail.com',
        'guerrilla2@sharklasers.com',
        'guerrilla3@grr.la',
        'disposable@dispostable.com',
        'trash@trashmail.com',
        'trash2@trashmail.net',
        'air@getairmail.com',
        'throw@throwawaymail.com',
        'kitten@inboxkitten.com',
        'nada@nada.ltd',
        'deck@emailondeck.com',
    ];

    for (const email of tempEmails) {
        const check = isDisposableEmail(email);
        const validation = validateRegistrationEmail(email);
        assert(
            check.isDisposable &&
                !validation.isValid &&
                validation.error === DISPOSABLE_EMAIL_ERROR_MESSAGE,
            'Known Temp-Mail',
            `Should reject disposable domain: ${email}`,
            `matched: ${check.matchedDomain}`
        );
    }

    // -------------------------------------------------------------
    // Test Category 3: Uppercase & Mixed Casing Domains -> REJECTED CORRECTLY
    // -------------------------------------------------------------
    console.log('\n--- 3. Case-Insensitive Matching (Must Normalize and Reject) ---');
    const mixedCaseEmails = [
        'TEST@MAILINATOR.COM',
        'User@YoPmAiL.CoM',
        'RANDOM@TEMP-MAIL.ORG',
        'SPAM@10MINUTEMAIL.COM',
        'Shark@SHARKLASERS.COM',
        '   padded@yopmail.com   ',
        '  UpperPadded@MAILINATOR.COM  ',
    ];

    for (const email of mixedCaseEmails) {
        const check = isDisposableEmail(email);
        const validation = validateRegistrationEmail(email);
        assert(
            check.isDisposable && !validation.isValid,
            'Case Insensitivity',
            `Should reject mixed-case/whitespace email: "${email}"`,
            `normalized: ${validation.normalizedEmail}`
        );
    }

    // Also verify uppercase legitimate domains are allowed
    const uppercaseLegit = ['USER@GMAIL.COM', 'Admin@OUTLOOK.COM', 'Test@ICLOUD.COM'];
    for (const email of uppercaseLegit) {
        const check = isDisposableEmail(email);
        const validation = validateRegistrationEmail(email);
        assert(
            !check.isDisposable && validation.isValid,
            'Case Insensitivity',
            `Should allow uppercase legitimate email: "${email}"`,
            `normalized: ${validation.normalizedEmail}`
        );
    }

    // -------------------------------------------------------------
    // Test Category 4: Disposable Subdomains -> REJECTED WHERE APPLICABLE
    // -------------------------------------------------------------
    console.log('\n--- 4. Subdomain Handling (Must Catch Subdomains of Disposable Services) ---');
    const subdomainEmails = [
        'sub1@box1.mailinator.com',
        'sub2@alpha.beta.mailinator.com',
        'sub3@xyz.temp-mail.org',
        'sub4@user.yopmail.com',
        'sub5@custom.trashmail.com',
        'sub6@test.10minutemail.com',
    ];

    for (const email of subdomainEmails) {
        const check = isDisposableEmail(email);
        const validation = validateRegistrationEmail(email);
        assert(
            check.isDisposable && !validation.isValid,
            'Subdomain Handling',
            `Should reject subdomain of disposable domain: ${email}`,
            `matched parent: ${check.matchedDomain}`
        );
    }

    // Legitimate corporate/custom subdomains should not be falsely blocked
    const legitSubdomains = [
        'user@mail.google.com',
        'support@custom.salesforce.com',
        'student@cs.stanford.edu',
    ];
    for (const email of legitSubdomains) {
        const check = isDisposableEmail(email);
        const validation = validateRegistrationEmail(email);
        assert(
            !check.isDisposable && validation.isValid,
            'Subdomain Handling',
            `Should not block normal institution/corporate subdomain: ${email}`
        );
    }

    // -------------------------------------------------------------
    // Test Category 5: Malformed Email -> Handled by Existing Validation
    // -------------------------------------------------------------
    console.log('\n--- 5. Malformed Emails (Proper Format Validation) ---');
    const malformedEmails = [
        '',
        'not-an-email',
        'missing-at-sign.com',
        '@no-local-part.com',
        'no-domain@',
        'spaces inside@domain.com',
        'two@@signs.com',
        'no-tld@domain',
    ];

    for (const email of malformedEmails) {
        const norm = normalizeEmail(email);
        const validation = validateRegistrationEmail(email);
        assert(
            !norm.isValidFormat && !validation.isValid && validation.error === 'Invalid email address',
            'Malformed Email',
            `Should cleanly reject malformed email: "${email}"`,
            `error: ${validation.error}`
        );
    }

    // -------------------------------------------------------------
    // Test Category 6: Legitimate Forwarding & Privacy Aliases -> NOT INCORRECTLY REJECTED
    // -------------------------------------------------------------
    console.log('\n--- 6. Legitimate Privacy / Forwarding Aliases (Must be Allowed) ---');
    const privacyAliases = [
        'privacy.user@duck.com',
        'relay_12345@relay.firefox.com',
        'firefox_alias@mozmail.com',
        'alias@simplelogin.com',
        'alias2@simplelogin.io',
        'anon@anonaddy.com',
        'addy_alias@addy.io',
        'apple_relay@privaterelay.appleid.com',
        'pass@passinbox.com',
    ];

    for (const email of privacyAliases) {
        const check = isDisposableEmail(email);
        const validation = validateRegistrationEmail(email);
        assert(
            !check.isDisposable && validation.isValid,
            'Privacy & Forwarding',
            `Should allow privacy relay / forwarding alias: ${email}`,
            `isDisposable: ${check.isDisposable}`
        );
    }

    // -------------------------------------------------------------
    // Test Category 7: Resilience & Dataset Integrity
    // -------------------------------------------------------------
    console.log('\n--- 7. Dataset Resilience & Memory Lookups ---');
    const stats = getDisposableDomainsStats();
    assert(
        stats.totalDomains > 8000,
        'Resilience',
        `Bundled dataset loaded successfully with ${stats.totalDomains} domains`,
        `allowed domains count: ${stats.allowedDomainsCount}`
    );

    // Test remote refresh error handling: simulating failed refresh must retain current valid dataset
    const originalCount = stats.totalDomains;
    // Calling refresh without force should return false because interval hasn't elapsed
    const skipRefresh = await refreshDisposableDomains(false);
    assert(
        !skipRefresh,
        'Resilience',
        'Refresh skips when interval has not elapsed (avoids redundant network traffic)'
    );

    const postStats = getDisposableDomainsStats();
    assert(
        postStats.totalDomains === originalCount,
        'Resilience',
        'Dataset remains intact and never empties on skipped or failed refresh'
    );

    // -------------------------------------------------------------
    // Test Category 8: Error Mapper & API Route Rejection Tests
    // -------------------------------------------------------------
    console.log('\n--- 8. Error Mapper & Route Rejection Integration ---');
    const { getFriendlyErrorMessage } = await import('../src/utils/errorMapper');

    const mappedRegisterError = getFriendlyErrorMessage(DISPOSABLE_EMAIL_ERROR_MESSAGE, 'register');
    assert(
        mappedRegisterError === DISPOSABLE_EMAIL_ERROR_MESSAGE,
        'Error Mapper',
        'Error mapper preserves exact disposable email message in register context'
    );

    const mappedOtpError = getFriendlyErrorMessage(DISPOSABLE_EMAIL_ERROR_MESSAGE, 'otp');
    assert(
        mappedOtpError === DISPOSABLE_EMAIL_ERROR_MESSAGE,
        'Error Mapper',
        'Error mapper preserves exact disposable email message in OTP context'
    );

    // Test Next.js Request simulation on /api/auth/register
    const { POST: registerPOST } = await import('../src/app/api/auth/register/route');
    const mockRegisterReq = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            firstName: 'Test',
            lastName: 'User',
            email: 'disposable@mailinator.com',
            password: 'Password123!',
        }),
    });

    const regRes = await registerPOST(mockRegisterReq as any);
    const regData = await regRes.json();
    assert(
        regRes.status === 400 && regData.error === DISPOSABLE_EMAIL_ERROR_MESSAGE,
        'API Rejection',
        '/api/auth/register rejects disposable email with 400 and standard error message',
        `status: ${regRes.status}, error: "${regData.error}"`
    );

    // Test Next.js Request simulation on /api/v1/auth/register
    const { POST: v1RegisterPOST } = await import('../src/app/api/v1/auth/register/route');
    const mockV1Req = new Request('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            firstName: 'Test',
            lastName: 'User',
            email: 'burner@temp-mail.org',
            password: 'Password123!',
        }),
    });

    const v1Res = await v1RegisterPOST(mockV1Req as any);
    const v1Data = await v1Res.json();
    assert(
        v1Res.status === 400 && v1Data.error === DISPOSABLE_EMAIL_ERROR_MESSAGE,
        'API Rejection',
        '/api/v1/auth/register rejects disposable email with 400 and standard error message',
        `status: ${v1Res.status}, error: "${v1Data.error}"`
    );

    // Test Next.js Request simulation on /api/auth/resend-otp
    const { POST: resendOtpPOST } = await import('../src/app/api/auth/resend-otp/route');
    const mockResendReq = new Request('http://localhost:3000/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: '65e9b8f10b7a8a1b2c3d4e5f',
            email: 'unverified@yopmail.com',
        }),
    });

    const resendRes = await resendOtpPOST(mockResendReq as any);
    const resendData = await resendRes.json();
    assert(
        resendRes.status === 400 && resendData.error === DISPOSABLE_EMAIL_ERROR_MESSAGE,
        'API Rejection',
        '/api/auth/resend-otp rejects disposable email with 400 and standard error message',
        `status: ${resendRes.status}, error: "${resendData.error}"`
    );

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n===========================================================');
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;

    console.log(`TOTAL TESTS : ${total}`);
    console.log(`PASSED      : ${passed}`);
    console.log(`FAILED      : ${failed}`);
    console.log('===========================================================');

    if (failed > 0) {
        console.error(`\n❌ ${failed} test(s) failed!`);
        process.exit(1);
    } else {
        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
    }
}

runTests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
