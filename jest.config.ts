export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{ts,tsx}'],
    coverageDirectory: 'coverage',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@agents/(.*)$': '<rootDir>/src/agents/$1',
        '^@api/(.*)$': '<rootDir>/src/api/$1',
        '^@db/(.*)$': '<rootDir>/src/db/$1',
        '^@models/(.*)$': '<rootDir>/src/models/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
    },
};
