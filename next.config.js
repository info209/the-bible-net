/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        instrumentationHook: true,
        serverComponentsExternalPackages: ['mongoose'],
    },
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            'mongodb-client-encryption': false,
            'aws-crt': false,
            '@aws-sdk/credential-providers': false,
            'gcp-metadata': false,
            'snappy': false,
            'socks': false,
            'aws4': false,
            'kerberos': false,
        };
        return config;
    },
};

const withNextIntl = require('next-intl/plugin')();

module.exports = withNextIntl(nextConfig);
