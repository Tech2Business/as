// ============================================
// T2B Tech2Business - Sentiment Analysis API
// Edge Function: health-check
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// ============================================
// TIPOS Y INTERFACES
// ============================================

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  version: string;
  services: {
    database: string;
    gemini: string;
    edge_functions: string;
  };
  metrics?: {
    total_analyses: number;
    last_analysis: string | null;
    uptime: string;
  };
  error?: string;
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

const API_VERSION = '1.0.0';
const GEMINI_TIMEOUT = 5000; // 5 segundos

// ============================================
// FUNCIONES DE VERIFICACIÓN
// ============================================

async function checkDatabaseConnection(supabase: any): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('sentiment_analysis')
      .select('id')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
}

async function checkGeminiAPI(apiKey: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'test' }] }]
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);
    return response.ok || response.status === 400; // 400 es válido (bad request pero API disponible)
  } catch {
    return false;
  }
}

async function getMetrics(supabase: any): Promise<any> {
  try {
    // Obtener total de análisis
    const { count: totalAnalyses } = await supabase
      .from('sentiment_analysis')
      .select('*', { count: 'exact', head: true });

    // Obtener último análisis
    const { data: lastAnalysis } = await supabase
      .from('sentiment_analysis')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      total_analyses: totalAnalyses || 0,
      last_analysis: lastAnalysis?.created_at || null,
      uptime: 'N/A' // Se puede implementar con un timestamp de inicio
    };
  } catch {
    return null;
  }
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

serve(async (req: Request) => {
  const startTime = Date.now();

  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Solo permitir GET
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: 'Method not allowed'
      }),
      { status: 405, headers: CORS_HEADERS }
    );
  }

  try {
    // Obtener variables de entorno
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials');
    }

    // Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Verificar si se solicitan métricas detalladas
    const url = new URL(req.url);
    const includeMetrics = url.searchParams.get('metrics') === 'true';

    // Verificar servicios en paralelo
    const [dbStatus, geminiStatus] = await Promise.all([
      checkDatabaseConnection(supabase),
      GEMINI_API_KEY ? checkGeminiAPI(GEMINI_API_KEY) : Promise.resolve(false)
    ]);

    // Determinar estado general
    const allHealthy = dbStatus && geminiStatus;
    const overallStatus = allHealthy ? 'healthy' : 'degraded';

    // Construir respuesta base
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      services: {
        database: dbStatus ? 'connected' : 'unavailable',
        gemini: geminiStatus ? 'available' : 'unavailable',
        edge_functions: 'operational'
      }
    };

    // Agregar métricas si se solicitaron
    if (includeMetrics && dbStatus) {
      const metrics = await getMetrics(supabase);
      if (metrics) {
        response.metrics = metrics;
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`Health check completed in ${processingTime}ms - Status: ${overallStatus}`);

    return new Response(
      JSON.stringify(response),
      { 
        status: allHealthy ? 200 : 503,
        headers: CORS_HEADERS 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in health-check:', errorMessage);

    const errorResponse: HealthCheckResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      services: {
        database: 'unknown',
        gemini: 'unknown',
        edge_functions: 'operational'
      },
      error: errorMessage
    };

    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});