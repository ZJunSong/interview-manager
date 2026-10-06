// 全局配置：独立成模块，避免 auth.ts 与 middleware.ts 循环依赖
export const JWT_SECRET = process.env.JWT_SECRET || 'interview-manager-secret-key-change-in-production';
