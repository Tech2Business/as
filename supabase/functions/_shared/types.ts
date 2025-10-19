// ============================================
// T2B Tech2Business - Sentiment Analysis
// Shared TypeScript Types
// ============================================

/**
 * Redes sociales soportadas
 */
export type SocialNetwork = 
  | 'email'
  | 'whatsapp'
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'telegram'
  | 'sms';

/**
 * Emociones primarias reconocidas
 */
export type PrimaryEmotion = 
  | 'feliz'
  | 'triste'
  | 'enojado'
  | 'neutral'
  | 'asustado'
  | 'sorprendido';

/**
 * Emociones secundarias reconocidas
 */
export type SecondaryEmotion = 
  | 'optimista'
  | 'pesimista'
  | 'confiado'
  | 'confundido'
  | 'impaciente'
  | 'agradecido';

/**
 * Categorías de emoción basadas en el score
 */
export type EmotionCategory = 
  | 'positivo'
  | 'negativo'
  | 'neutral'
  | 'mixto';

/**
 * Scores de emociones
 */
export interface EmotionScores {
  [emotion: string]: number;
}

/**
 * Emojis asociados a emociones
 */
export interface EmotionEmojis {
  primary: string[];
  secondary: string[];
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

/**
 * Request para análisis de sentimiento
 */
export interface AnalysisRequest {
  social_network: SocialNetwork;
  keywords?: string[];
  content: string;
}

/**
 * Respuesta de Gemini API
 */
export interface GeminiResponse {
  primary_emotions: EmotionScores;
  secondary_emotions: EmotionScores;
  sentiment_score: number;
  analysis_summary: string;
}

/**
 * Datos de análisis almacenados en DB
 */
export interface SentimentAnalysis {
  id: string;
  created_at: string;
  updated_at: string;
  social_network: SocialNetwork;
  keywords: string[];
  content: string;
  primary_emotions: EmotionScores;
  secondary_emotions: EmotionScores;
  sentiment_score: number;
  analysis_summary: string;
  dominant_primary_emotion: string;
  dominant_secondary_emotion: string;
  processing_time: number;
  gemini_model: string;
  api_version: string;
  client_ip?: string;
  user_agent?: string;
  request_id: string;
}

/**
 * Respuesta exitosa de análisis
 */
export interface AnalysisSuccessResponse {
  success: true;
  data: {
    analysis_id: string;
    primary_emotions: EmotionScores;
    secondary_emotions: EmotionScores;
    sentiment_score: number;
    analysis_summary: string;
    processing_time: number;
    emojis: EmotionEmojis;
  };
}

/**
 * Respuesta de error
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  };
}

/**
 * Respuesta de análisis (exitosa o error)
 */
export type AnalysisResponse = AnalysisSuccessResponse | ErrorResponse;

// ============================================
// HISTORY TYPES
// ============================================

/**
 * Item del historial
 */
export interface HistoryItem {
  id: string;
  created_at: string;
  social_network: SocialNetwork;
  sentiment_score: number;
  primary_emotion: string;
  keywords: string[];
  emotion_category?: EmotionCategory;
  content_preview?: string;
}

/**
 * Parámetros de query para historial
 */
export interface HistoryQueryParams {
  limit?: number;
  offset?: number;
  social_network?: SocialNetwork;
  min_score?: number;
  max_score?: number;
  start_date?: string;
  end_date?: string;
  emotion?: PrimaryEmotion;
}

/**
 * Metadata de paginación
 */
export interface PaginationMetadata {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * Estadísticas de análisis
 */
export interface AnalysisStatistics {
  total_analyses: number;
  average_sentiment_score: number;
  emotion_distribution: { [emotion: string]: number };
  network_distribution: { [network: string]: number };
}

/**
 * Respuesta exitosa de historial
 */
export interface HistorySuccessResponse {
  success: true;
  data: HistoryItem[];
  metadata: PaginationMetadata;
  statistics?: AnalysisStatistics;
}

/**
 * Respuesta de historial (exitosa o error)
 */
export type HistoryResponse = HistorySuccessResponse | ErrorResponse;

// ============================================
// HEALTH CHECK TYPES
// ============================================

/**
 * Estado de servicios
 */
export interface ServiceStatus {
  database: 'connected' | 'unavailable' | 'unknown';
  gemini: 'available' | 'unavailable' | 'unknown';
  edge_functions: 'operational' | 'degraded' | 'down';
}

/**
 * Métricas del sistema
 */
export interface SystemMetrics {
  total_analyses: number;
  last_analysis: string | null;
  uptime: string;
}

/**
 * Respuesta de health check
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  services: ServiceStatus;
  metrics?: SystemMetrics;
  error?: string;
}

// ============================================
// DATABASE TYPES
// ============================================

/**
 * Entrada en la tabla analysis_history
 */
export interface AnalysisHistoryRecord {
  id: string;
  created_at: string;
  analysis_id: string;
  social_network: SocialNetwork;
  sentiment_score: number;
  primary_emotion: string;
  keywords: string[];
  emotion_category: EmotionCategory;
  content_preview: string;
}

/**
 * Entrada en la tabla analysis_stats
 */
export interface AnalysisStatsRecord {
  id: string;
  date: string;
  social_network: SocialNetwork;
  total_analyses: number;
  avg_sentiment_score: number;
  avg_processing_time: number;
  emotion_distribution: { [emotion: string]: number };
  successful_analyses: number;
  failed_analyses: number;
  created_at: string;
  updated_at: string;
}

/**
 * Entrada en la tabla api_logs
 */
export interface ApiLogRecord {
  id: string;
  created_at: string;
  endpoint: string;
  method: string;
  status_code: number;
  request_body: any;
  response_body: any;
  error_message?: string;
  client_ip?: string;
  user_agent?: string;
  processing_time: number;
  request_id: string;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Resultado de validación
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Configuración de CORS
 */
export interface CorsHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Allow-Headers': string;
  'Content-Type': string;
}

/**
 * Constantes de la aplicación
 */
export interface AppConstants {
  MAX_CONTENT_LENGTH: number;
  MAX_KEYWORDS: number;
  REQUEST_TIMEOUT: number;
  DEFAULT_LIMIT: number;
  MAX_LIMIT: number;
  API_VERSION: string;
}

/**
 * Mapeo de emociones a emojis
 */
export type EmotionEmojiMap = {
  [K in PrimaryEmotion | SecondaryEmotion]: string;
};

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Verifica si una string es una red social válida
 */
export function isSocialNetwork(value: string): value is SocialNetwork {
  return [
    'email',
    'whatsapp',
    'twitter',
    'facebook',
    'instagram',
    'linkedin',
    'telegram',
    'sms'
  ].includes(value);
}

/**
 * Verifica si una string es una emoción primaria válida
 */
export function isPrimaryEmotion(value: string): value is PrimaryEmotion {
  return [
    'feliz',
    'triste',
    'enojado',
    'neutral',
    'asustado',
    'sorprendido'
  ].includes(value);
}

/**
 * Verifica si una string es una emoción secundaria válida
 */
export function isSecondaryEmotion(value: string): value is SecondaryEmotion {
  return [
    'optimista',
    'pesimista',
    'confiado',
    'confundido',
    'impaciente',
    'agradecido'
  ].includes(value);
}

/**
 * Verifica si una respuesta es exitosa
 */
export function isSuccessResponse<T>(
  response: T | ErrorResponse
): response is Exclude<T, ErrorResponse> {
  return (response as any).success === true;
}

/**
 * Verifica si una respuesta es de error
 */
export function isErrorResponse(
  response: any
): response is ErrorResponse {
  return response.success === false && 'error' in response;
}