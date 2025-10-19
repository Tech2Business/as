// ============================================
// T2B Tech2Business - Sentiment Analysis
// Shared Constants
// ============================================

import type { SocialNetwork, EmotionEmojiMap } from './types.ts';

// ============================================
// API CONFIGURATION
// ============================================

export const API_VERSION = '1.0.0';
export const API_NAME = 'T2B Sentiment Analysis API';

// ============================================
// LIMITS AND TIMEOUTS
// ============================================

export const MAX_CONTENT_LENGTH = 10000;
export const MAX_KEYWORDS = 20;
export const REQUEST_TIMEOUT = 30000; // 30 segundos
export const GEMINI_TIMEOUT = 25000; // 25 segundos

// ============================================
// PAGINATION
// ============================================

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;
export const MIN_LIMIT = 1;

// ============================================
// RATE LIMITING
// ============================================

export const RATE_LIMIT_MAX_REQUESTS = 100;
export const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hora

// ============================================
// SOCIAL NETWORKS
// ============================================

export const VALID_NETWORKS: SocialNetwork[] = [
  'email',
  'whatsapp',
  'twitter',
  'facebook',
  'instagram',
  'linkedin',
  'telegram',
  'sms'
];

export const NETWORK_DISPLAY_NAMES: Record<SocialNetwork, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  twitter: 'Twitter (X)',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  telegram: 'Telegram',
  sms: 'SMS'
};

// ============================================
// EMOTIONS
// ============================================

export const PRIMARY_EMOTIONS = [
  'feliz',
  'triste',
  'enojado',
  'neutral',
  'asustado',
  'sorprendido'
] as const;

export const SECONDARY_EMOTIONS = [
  'optimista',
  'pesimista',
  'confiado',
  'confundido',
  'impaciente',
  'agradecido'
] as const;

export const EMOTION_EMOJIS: EmotionEmojiMap = {
  // Emociones primarias
  feliz: '😊',
  triste: '😢',
  enojado: '😠',
  neutral: '😐',
  asustado: '😨',
  sorprendido: '😲',
  // Emociones secundarias
  optimista: '😄',
  pesimista: '😔',
  confiado: '😌',
  confundido: '😕',
  impaciente: '😤',
  agradecido: '🙏'
};

export const EMOTION_COLORS: Record<string, string> = {
  // Primarias
  feliz: '#FFD700',      // Dorado
  triste: '#4169E1',     // Azul real
  enojado: '#DC143C',    // Carmesí
  neutral: '#808080',    // Gris
  asustado: '#9370DB',   // Púrpura medio
  sorprendido: '#FF69B4', // Rosa intenso
  // Secundarias
  optimista: '#32CD32',  // Verde lima
  pesimista: '#2F4F4F',  // Gris pizarra oscuro
  confiado: '#20B2AA',   // Verde mar claro
  confundido: '#DAA520', // Vara de oro
  impaciente: '#FF6347', // Tomate
  agradecido: '#FF1493'  // Rosa profundo
};

// ============================================
// SENTIMENT SCORE CATEGORIES
// ============================================

export const SENTIMENT_CATEGORIES = {
  VERY_POSITIVE: { min: 80, max: 100, label: 'Muy Positivo', color: '#00C853' },
  POSITIVE: { min: 60, max: 79, label: 'Positivo', color: '#64DD17' },
  NEUTRAL: { min: 40, max: 59, label: 'Neutral', color: '#FFD600' },
  NEGATIVE: { min: 20, max: 39, label: 'Negativo', color: '#FF6D00' },
  VERY_NEGATIVE: { min: 0, max: 19, label: 'Muy Negativo', color: '#DD2C00' }
};

// ============================================
// GEMINI API
// ============================================

export const GEMINI_MODEL = 'gemini-2.0-flash-exp';
export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export const GEMINI_GENERATION_CONFIG = {
  temperature: 0.3,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
};

export const GEMINI_PROMPT_TEMPLATE = `Analiza el siguiente texto y determina las emociones presentes. 
Responde EXCLUSIVAMENTE con un JSON válido en este formato (sin markdown, sin bloques de código, solo el JSON):

{
  "primary_emotions": {
    "feliz": 0-100,
    "triste": 0-100, 
    "enojado": 0-100,
    "neutral": 0-100,
    "asustado": 0-100,
    "sorprendido": 0-100
  },
  "secondary_emotions": {
    "optimista": 0-100,
    "pesimista": 0-100,
    "confiado": 0-100,
    "confundido": 0-100,
    "impaciente": 0-100,
    "agradecido": 0-100
  },
  "sentiment_score": 0-100,
  "analysis_summary": "Resumen breve en español"
}

IMPORTANTE: 
- Todos los scores deben sumar aproximadamente 100 en cada categoría
- sentiment_score es independiente (0=muy negativo, 50=neutral, 100=muy positivo)
- Considera el contexto y las palabras clave proporcionadas
- Responde SOLO con el JSON, sin texto adicional

Texto a analizar: "{CONTENT}"

Palabras clave a considerar: {KEYWORDS}`;

// ============================================
// HTTP STATUS CODES
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// ============================================
// ERROR CODES
// ============================================

export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FIELD: 'INVALID_FIELD',
  
  // Method errors
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  
  // API errors
  GEMINI_API_ERROR: 'GEMINI_API_ERROR',
  GEMINI_TIMEOUT: 'GEMINI_TIMEOUT',
  GEMINI_INVALID_RESPONSE: 'GEMINI_INVALID_RESPONSE',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_TIMEOUT: 'DATABASE_TIMEOUT',
  
  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  TIMEOUT: 'TIMEOUT',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Environment errors
  MISSING_ENV_VARS: 'MISSING_ENV_VARS',
  INVALID_CONFIG: 'INVALID_CONFIG'
};

// ============================================
// CORS HEADERS
// ============================================

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info',
  'Content-Type': 'application/json',
};

// ============================================
// LOGGING
// ============================================

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
} as const;

export const LOG_RETENTION_DAYS = 30;

// ============================================
// DATABASE
// ============================================

export const TABLE_NAMES = {
  SENTIMENT_ANALYSIS: 'sentiment_analysis',
  ANALYSIS_HISTORY: 'analysis_history',
  ANALYSIS_STATS: 'analysis_stats',
  API_LOGS: 'api_logs'
} as const;

// ============================================
// RETRY CONFIGURATION
// ============================================

export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 10000,
  BACKOFF_MULTIPLIER: 2
};

// ============================================
// CACHE
// ============================================

export const CACHE_TTL = {
  SHORT: 300,    // 5 minutos
  MEDIUM: 1800,  // 30 minutos
  LONG: 3600,    // 1 hora
  DAY: 86400     // 24 horas
};

// ============================================
// VALIDATION PATTERNS
// ============================================

export const VALIDATION_PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ISO_DATE: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

// ============================================
// ENVIRONMENT
// ============================================

export const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'GEMINI_API_KEY'
];

export const OPTIONAL_ENV_VARS = [
  'ENVIRONMENT',
  'LOG_LEVEL',
  'RATE_LIMIT_MAX_REQUESTS',
  'CACHE_TTL'
];

// ============================================
// FEATURE FLAGS
// ============================================

export const FEATURE_FLAGS = {
  ENABLE_RATE_LIMITING: false,
  ENABLE_CACHING: false,
  ENABLE_DETAILED_LOGGING: true,
  ENABLE_RETRY: true,
  ENABLE_STATISTICS: true
};

// ============================================
// EXPORT ALL
// ============================================

export default {
  API_VERSION,
  API_NAME,
  MAX_CONTENT_LENGTH,
  MAX_KEYWORDS,
  REQUEST_TIMEOUT,
  GEMINI_TIMEOUT,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  VALID_NETWORKS,
  NETWORK_DISPLAY_NAMES,
  PRIMARY_EMOTIONS,
  SECONDARY_EMOTIONS,
  EMOTION_EMOJIS,
  EMOTION_COLORS,
  SENTIMENT_CATEGORIES,
  GEMINI_MODEL,
  GEMINI_API_BASE_URL,
  GEMINI_GENERATION_CONFIG,
  GEMINI_PROMPT_TEMPLATE,
  HTTP_STATUS,
  ERROR_CODES,
  CORS_HEADERS,
  LOG_LEVELS,
  LOG_RETENTION_DAYS,
  TABLE_NAMES,
  RETRY_CONFIG,
  CACHE_TTL,
  VALIDATION_PATTERNS,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS,
  FEATURE_FLAGS
};