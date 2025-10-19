// ============================================
// T2B Tech2Business - Sentiment Analysis
// Shared Utility Functions
// ============================================

import type {
  EmotionScores,
  EmotionEmojiMap,
  CorsHeaders,
  ValidationResult,
  SocialNetwork
} from './types.ts';

// ============================================
// CONSTANTS
// ============================================

export const CORS_HEADERS: CorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

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

export const EMOTION_EMOJIS: EmotionEmojiMap = {
  // Primarias
  feliz: '😊',
  triste: '😢',
  enojado: '😠',
  neutral: '😐',
  asustado: '😨',
  sorprendido: '😲',
  // Secundarias
  optimista: '😄',
  pesimista: '😔',
  confiado: '😌',
  confundido: '😕',
  impaciente: '😤',
  agradecido: '🙏'
};

export const MAX_CONTENT_LENGTH = 10000;
export const MAX_KEYWORDS = 20;
export const REQUEST_TIMEOUT = 30000;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Valida que una red social sea válida
 */
export function validateSocialNetwork(network: string): ValidationResult {
  if (!network || typeof network !== 'string') {
    return { valid: false, error: 'social_network is required and must be a string' };
  }

  if (!VALID_NETWORKS.includes(network as SocialNetwork)) {
    return {
      valid: false,
      error: `social_network must be one of: ${VALID_NETWORKS.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Valida el contenido del texto
 */
export function validateContent(content: string): ValidationResult {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'content is required and must be a string' };
  }

  if (content.trim().length === 0) {
    return { valid: false, error: 'content cannot be empty' };
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return {
      valid: false,
      error: `content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`
    };
  }

  return { valid: true };
}

/**
 * Valida las keywords
 */
export function validateKeywords(keywords: any): ValidationResult {
  if (!keywords) {
    return { valid: true }; // Keywords son opcionales
  }

  if (!Array.isArray(keywords)) {
    return { valid: false, error: 'keywords must be an array' };
  }

  if (keywords.length > MAX_KEYWORDS) {
    return { valid: false, error: `keywords cannot exceed ${MAX_KEYWORDS} items` };
  }

  if (!keywords.every((k: any) => typeof k === 'string')) {
    return { valid: false, error: 'all keywords must be strings' };
  