// ============================================
// T2B Tech2Business - Sentiment Analysis API
// Edge Function: analyze-sentiment
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// ============================================
// TIPOS Y INTERFACES
// ============================================

interface AnalysisRequest {
  social_network: string;
  keywords: string[];
  content: string;
}

interface EmotionScores {
  [key: string]: number;
}

interface GeminiResponse {
  primary_emotions: EmotionScores;
  secondary_emotions: EmotionScores;
  sentiment_score: number;
  analysis_summary: string;
}

interface AnalysisResponse {
  success: boolean;
  data?: {
    analysis_id: string;
    primary_emotions: EmotionScores;
    secondary_emotions: EmotionScores;
    sentiment_score: number;
    analysis_summary: string;
    processing_time: number;
    emojis: {
      primary: string[];
      secondary: string[];
    };
  };
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const VALID_NETWORKS = [
  'email', 'whatsapp', 'twitter', 'facebook',
  'instagram', 'linkedin', 'telegram', 'sms'
];

const EMOTION_EMOJIS: { [key: string]: string } = {
  // Emociones primarias
  'feliz': '😊',
  'triste': '😢',
  'enojado': '😠',
  'neutral': '😐',
  'asustado': '😨',
  'sorprendido': '😲',
  // Emociones secundarias
  'optimista': '😄',
  'pesimista': '😔',
  'confiado': '😌',
  'confundido': '😕',
  'impaciente': '😤',
  'agradecido': '🙏'
};

const MAX_CONTENT_LENGTH = 10000;
const MAX_KEYWORDS = 20;
const REQUEST_TIMEOUT = 30000; // 30 segundos

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

function validateRequest(body: any): { valid: boolean; error?: string } {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  // Validar red social
  if (!body.social_network || typeof body.social_network !== 'string') {
    return { valid: false, error: 'social_network is required and must be a string' };
  }

  if (!VALID_NETWORKS.includes(body.social_network)) {
    return { 
      valid: false, 
      error: `social_network must be one of: ${VALID_NETWORKS.join(', ')}` 
    };
  }

  // Validar contenido
  if (!body.content || typeof body.content !== 'string') {
    return { valid: false, error: 'content is required and must be a string' };
  }

  if (body.content.trim().length === 0) {
    return { valid: false, error: 'content cannot be empty' };
  }

  if (body.content.length > MAX_CONTENT_LENGTH) {
    return { 
      valid: false, 
      error: `content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters` 
    };
  }

  // Validar keywords (opcional)
  if (body.keywords) {
    if (!Array.isArray(body.keywords)) {
      return { valid: false, error: 'keywords must be an array' };
    }

    if (body.keywords.length > MAX_KEYWORDS) {
      return { valid: false, error: `keywords cannot exceed ${MAX_KEYWORDS} items` };
    }

    if (!body.keywords.every((k: any) => typeof k === 'string')) {
      return { valid: false, error: 'all keywords must be strings' };
    }
  }

  return { valid: true };
}

// ============================================
// FUNCIÓN PRINCIPAL: ANÁLISIS CON GEMINI
// ============================================

async function analyzeWithGemini(
  content: string,
  keywords: string[],
  apiKey: string
): Promise<GeminiResponse> {
  const keywordsText = keywords.length > 0 
    ? keywords.join(', ') 
    : 'ninguna palabra clave específica';

  const prompt = `Analiza el siguiente texto y determina las emociones presentes. 
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

Texto a analizar: "${content}"

Palabras clave a considerar: ${keywordsText}`;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const textContent = data.candidates[0].content.parts[0].text;
    
    // Limpiar la respuesta de posibles bloques de código markdown
    let cleanedText = textContent.trim();
    cleanedText = cleanedText.replace(/```json\n?/g, '');
    cleanedText = cleanedText.replace(/```\n?/g, '');
    cleanedText = cleanedText.trim();

    const analysis: GeminiResponse = JSON.parse(cleanedText);

    // Validar estructura de la respuesta
    if (!analysis.primary_emotions || !analysis.secondary_emotions || 
        typeof analysis.sentiment_score !== 'number' || !analysis.analysis_summary) {
      throw new Error('Invalid analysis structure from Gemini');
    }

    return analysis;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Gemini API request timeout');
      }
      throw error;
    }
    throw new Error('Unknown error during Gemini API call');
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function getDominantEmotion(emotions: EmotionScores): string {
  let maxScore = 0;
  let dominantEmotion = 'neutral';

  for (const [emotion, score] of Object.entries(emotions)) {
    if (score > maxScore) {
      maxScore = score;
      dominantEmotion = emotion;
    }
  }

  return dominantEmotion;
}

function getEmotionEmojis(emotions: EmotionScores): string[] {
  return Object.entries(emotions)
    .filter(([_, score]) => score > 10) // Solo emociones con score significativo
    .sort(([_, a], [__, b]) => b - a) // Ordenar por score descendente
    .map(([emotion, _]) => EMOTION_EMOJIS[emotion] || '❓')
    .slice(0, 4); // Máximo 4 emojis
}

function logRequest(
  supabase: any,
  endpoint: string,
  method: string,
  statusCode: number,
  requestBody: any,
  responseBody: any,
  error: string | null,
  processingTime: number,
  clientIp: string | null,
  userAgent: string | null
) {
  // Ejecutar de forma asíncrona sin bloquear
  supabase
    .from('api_logs')
    .insert({
      endpoint,
      method,
      status_code: statusCode,
      request_body: requestBody,
      response_body: responseBody,
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

  // Solo permitir POST
  if (req.method !== 'POST') {
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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !GEMINI_API_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Parsear body
    let body: AnalysisRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'Invalid JSON in request body',
            code: 'INVALID_JSON'
          }
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validar request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: validation.error,
            code: 'VALIDATION_ERROR'
          }
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Realizar análisis con Gemini
    const analysisStartTime = Date.now();
    const geminiResponse = await analyzeWithGemini(
      body.content,
      body.keywords || [],
      GEMINI_API_KEY
    );
    const processingTime = (Date.now() - analysisStartTime) / 1000;

    // Determinar emociones dominantes
    const dominantPrimary = getDominantEmotion(geminiResponse.primary_emotions);
    const dominantSecondary = getDominantEmotion(geminiResponse.secondary_emotions);

    // Guardar en base de datos
    const { data: dbData, error: dbError } = await supabase
      .from('sentiment_analysis')
      .insert({
        social_network: body.social_network,
        keywords: body.keywords || [],
        content: body.content,
        primary_emotions: geminiResponse.primary_emotions,
        secondary_emotions: geminiResponse.secondary_emotions,
        sentiment_score: geminiResponse.sentiment_score,
        analysis_summary: geminiResponse.analysis_summary,
        dominant_primary_emotion: dominantPrimary,
        dominant_secondary_emotion: dominantSecondary,
        processing_time: processingTime,
        gemini_model: 'gemini-2.0-flash-exp',
        api_version: '1.0.0',
        client_ip: clientIp,
        user_agent: userAgent
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Preparar respuesta
    const response: AnalysisResponse = {
      success: true,
      data: {
        analysis_id: dbData.id,
        primary_emotions: geminiResponse.primary_emotions,
        secondary_emotions: geminiResponse.secondary_emotions,
        sentiment_score: geminiResponse.sentiment_score,
        analysis_summary: geminiResponse.analysis_summary,
        processing_time: processingTime,
        emojis: {
          primary: getEmotionEmojis(geminiResponse.primary_emotions),
          secondary: getEmotionEmojis(geminiResponse.secondary_emotions)
        }
      }
    };

    const totalTime = (Date.now() - startTime) / 1000;

    // Log exitoso
    logRequest(
      supabase,
      '/analyze-sentiment',
      'POST',
      200,
      body,
      response,
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

    console.error('Error in analyze-sentiment:', errorMessage);

    const errorResponse: AnalysisResponse = {
      success: false,
      error: {
        message: 'Internal server error during sentiment analysis',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }
    };

    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});