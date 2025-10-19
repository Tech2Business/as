// ============================================
// T2B Tech2Business - Sentiment Analysis API
// Edge Function: get-analysis-history
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// ============================================
// TIPOS Y INTERFACES
// ============================================

interface HistoryItem {
  id: string;
  created_at: string;
  social_network: string;
  sentiment_score: number;
  primary_emotion: string;
  keywords: string[];
  emotion_category?: string;
  content_preview?: string;
}

interface HistoryResponse {
  success: boolean;
  data?: HistoryItem[];
  metadata?: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

interface QueryParams {
  limit?: number;
  offset?: number;
  social_network?: string;
  min_score?: number;
  max_score?: number;
  start_date?: string;
  end_date?: string;
  emotion?: string;
}

// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const VALID_NETWORKS = [
  'email', 'whatsapp', 'twitter', 'facebook',
  'instagram', 'linkedin', 'telegram', 'sms'
];

// ============================================
// FUNCIONES DE VALIDACIÓN Y PARSING
// ============================================

function parseQueryParams(url: URL): QueryParams {
  const params: QueryParams = {};

  // Limit
  const limitParam = url.searchParams.get('limit');
  if (limitParam) {
    const limit = parseInt(limitParam, 10);
    params.limit = isNaN(limit) ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
  } else {
    params.limit = DEFAULT_LIMIT;
  }

  // Offset
  const offsetParam = url.searchParams.get('offset');
  if (offsetParam) {
    const offset = parseInt(offsetParam, 10);
    params.offset = isNaN(offset) ? 0 : Math.max(0, offset);
  }

  // Page (alternativa a offset)
  const pageParam = url.searchParams.get('page');
  if (pageParam && !offsetParam) {
    const page = parseInt(pageParam, 10);
    if (!isNaN(page) && page > 0) {
      params.offset = (page - 1) * (params.limit || DEFAULT_LIMIT);
    }
  }

  // Filtros
  const network = url.searchParams.get('social_network');
  if (network && VALID_NETWORKS.includes(network)) {
    params.social_network = network;
  }

  const minScore = url.searchParams.get('min_score');
  if (minScore) {
    const score = parseFloat(minScore);
    if (!isNaN(score) && score >= 0 && score <= 100) {
      params.min_score = score;
    }
  }

  const maxScore = url.searchParams.get('max_score');
  if (maxScore) {
    const score = parseFloat(maxScore);
    if (!isNaN(score) && score >= 0 && score <= 100) {
      params.max_score = score;
    }
  }

  const startDate = url.searchParams.get('start_date');
  if (startDate) {
    params.start_date = startDate;
  }

  const endDate = url.searchParams.get('end_date');
  if (endDate) {
    params.end_date = endDate;
  }

  const emotion = url.searchParams.get('emotion');
  if (emotion) {
    params.emotion = emotion;
  }

  return params;
}

// ============================================
// FUNCIÓN PARA CONSTRUIR QUERY
// ============================================

function buildQuery(supabase: any, params: QueryParams) {
  let query = supabase
    .from('analysis_history')
    .select('*', { count: 'exact' });

  // Aplicar filtros
  if (params.social_network) {
    query = query.eq('social_network', params.social_network);
  }

  if (params.min_score !== undefined) {
    query = query.gte('sentiment_score', params.min_score);
  }

  if (params.max_score !== undefined) {
    query = query.lte('sentiment_score', params.max_score);
  }

  if (params.start_date) {
    query = query.gte('created_at', params.start_date);
  }

  if (params.end_date) {
    query = query.lte('created_at', params.end_date);
  }

  if (params.emotion) {
    query = query.eq('primary_emotion', params.emotion);
  }

  // Ordenar por fecha (más recientes primero)
  query = query.order('created_at', { ascending: false });

  // Paginación
  if (params.limit !== undefined) {
    query = query.limit(params.limit);
  }

  if (params.offset !== undefined) {
    query = query.range(params.offset, params.offset + (params.limit || DEFAULT_LIMIT) - 1);
  }

  return query;
}

// ============================================
// FUNCIÓN PARA OBTENER ESTADÍSTICAS
// ============================================

async function getStatistics(supabase: any, params: QueryParams) {
  let query = supabase
    .from('analysis_history')
    .select('sentiment_score, primary_emotion, social_network');

  // Aplicar los mismos filtros que en la consulta principal
  if (params.social_network) {
    query = query.eq('social_network', params.social_network);
  }

  if (params.start_date) {
    query = query.gte('created_at', params.start_date);
  }

  if (params.end_date) {
    query = query.lte('created_at', params.end_date);
  }

  const { data, error } = await query;

  if (error || !data) {
    return null;
  }

  // Calcular estadísticas
  const total = data.length;
  const avgScore = total > 0
    ? data.reduce((sum, item) => sum + item.sentiment_score, 0) / total
    : 0;

  const emotionCounts: { [key: string]: number } = {};
  const networkCounts: { [key: string]: number } = {};

  data.forEach(item => {
    emotionCounts[item.primary_emotion] = (emotionCounts[item.primary_emotion] || 0) + 1;
    networkCounts[item.social_network] = (networkCounts[item.social_network] || 0) + 1;
  });

  return {
    total_analyses: total,
    average_sentiment_score: Math.round(avgScore * 100) / 100,
    emotion_distribution: emotionCounts,
    network_distribution: networkCounts
  };
}

// ============================================
// FUNCIÓN PARA LOGGING
// ============================================

function logRequest(
  supabase: any,
  endpoint: string,
  method: string,
  statusCode: number,
  queryParams: any,
  responseData: any,
  error: string | null,
  processingTime: number,
  clientIp: string | null,
  userAgent: string | null
) {
  supabase
    .from('api_logs')
    .insert({
      endpoint,
      method,
      status_code: statusCode,
      request_body: { query_params: queryParams },
      response_body: responseData,
      error_message: error,
      processing_time: processingTime,
      client_ip: clientIp,
      user_agent: userAgent
    })
    .then(() => console.log('Log guardado exitosamente'))
    .catch((err: Error) => console.error('Error guardando log:', err.message));
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

serve(async (req: Request) => {
  const startTime = Date.now();
  const clientIp = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Solo permitir GET
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        }
      }),
      { status: 405, headers: CORS_HEADERS }
    );
  }

  try {
    // Obtener variables de entorno
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Parsear parámetros de query
    const url = new URL(req.url);
    const params = parseQueryParams(url);

    // Verificar si se solicitan estadísticas
    const includeStats = url.searchParams.get('include_stats') === 'true';

    // Construir y ejecutar query principal
    const query = buildQuery(supabase, params);
    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Preparar metadata de paginación
    const total = count || 0;
    const limit = params.limit || DEFAULT_LIMIT;
    const offset = params.offset || 0;
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    // Construir respuesta
    const response: HistoryResponse = {
      success: true,
      data: data || [],
      metadata: {
        total,
        page: currentPage,
        per_page: limit,
        total_pages: totalPages
      }
    };

    // Agregar estadísticas si se solicitaron
    if (includeStats) {
      const stats = await getStatistics(supabase, params);
      if (stats) {
        (response as any).statistics = stats;
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;

    // Log exitoso
    logRequest(
      supabase,
      '/get-analysis-history',
      'GET',
      200,
      params,
      { result_count: data?.length || 0 },
      null,
      totalTime,
      clientIp,
      userAgent
    );

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: CORS_HEADERS }
    );

  } catch (error) {
    const totalTime = (Date.now() - startTime) / 1000;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('Error in get-analysis-history:', errorMessage);

    const errorResponse: HistoryResponse = {
      success: false,
      error: {
        message: 'Internal server error while fetching history',
        code: 'INTERNAL_ERROR',
        details: Deno.env.get('ENVIRONMENT') === 'development' ? errorMessage : undefined
      }
    };

    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});