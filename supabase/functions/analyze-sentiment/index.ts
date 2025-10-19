// ============================================
// T2B Tech2Business - Sentiment Analysis API
// Edge Function: analyze-sentiment
// Version 1.1.0 - Limitado a 3+3 emociones
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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
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

  // 🔥 PROMPT MEJORADO: Análisis profundo con más emociones
  const prompt = `Eres un experto en análisis de sentimientos y psicología emocional. Analiza el siguiente texto considerando:
- Tono explícito e implícito
- Sarcasmo, ironía y contradicciones
- Emociones subyacentes
- Contexto social y emocional

Responde EXCLUSIVAMENTE con un JSON válido (sin markdown, sin bloques de código):

{
  "primary_emotions": {
    "emocion1": 0-100,
    "emocion2": 0-100,
    "emocion3": 0-100
  },
  "secondary_emotions": {
    "emocion1": 0-100,
    "emocion2": 0-100,
    "emocion3": 0-100
  },
  "sentiment_score": 0-100,
  "analysis_summary": "Resumen del análisis emocional en español (máximo 200 caracteres)"
}

REGLAS:
1. Retorna EXACTAMENTE 3 emociones primarias y 3 secundarias
2. Los 3 scores de cada categoría deben sumar aproximadamente 100
3. sentiment_score: 0=muy negativo, 50=neutral, 100=muy positivo
4. Detecta SARCASMO e IRONÍA - no tomes las palabras literalmente
5. Considera emociones CONTRADICTORIAS que puedan coexistir

Emociones PRIMARIAS disponibles (elige las 3 más relevantes):
- feliz, triste, enojado, neutral, asustado, sorprendido, disgustado, ansioso

Emociones SECUNDARIAS disponibles (elige las 3 más relevantes):
- optimista, pesimista, confiado, confundido, impaciente, agradecido, 
- orgulloso, frustrado, satisfecho, decepcionado, esperanzado, 
- cinico, sarcastico, arrogante, humilde, despreciativo

ANÁLISIS PROFUNDO REQUERIDO:
- Si detectas sarcasmo: prioriza la emoción REAL sobre las palabras literales
- Si hay contradicciones: identifica la tensión emocional subyacente
- Si hay autoafirmación excesiva: considera orgullo, arrogancia o frustración
- Si menosprecia a otros: considera cinismo, desprecio o superioridad

Texto a analizar: "${content}"

Palabras clave contextuales: ${keywordsText}

Responde SOLO con el JSON, sin explicaciones adicionales.`;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.4,
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

    // 🔥 VALIDACIÓN ESTRICTA: Exactamente 3 emociones de cada tipo
    const primaryCount = Object.keys(analysis.primary_emotions).length;
    const secondaryCount = Object.keys(analysis.secondary_emotions).length;

    if (primaryCount !== 3) {
      throw new Error(`Invalid primary emotions count: expected 3, got ${primaryCount}`);
    }

    if (secondaryCount !== 3) {
      throw new Error(`Invalid secondary emotions count: expected 3, got ${secondaryCount}`);
    }

    // Validar estructura básica de la respuesta
    if (!analysis.primary_emotions || !analysis.secondary_emotions || 
        typeof analysis.sentiment_score !== 'number' || !analysis.analysis_summary) {
      throw new Error('Invalid analysis structure from Gemini');
    }

    // Validar que el sentiment_score esté en el rango válido
    if (analysis.sentiment_score < 0 || analysis.sentiment_score > 100) {
      throw new Error('sentiment_score must be between 0 and 100');
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
    .sort(([_, a], [__, b]) => b - a) // Ordenar por score descendente
    .map(([emotion, _]) => EMOTION_EMOJIS[emotion] || '❓')
    .slice(0, 3); // Exactamente 3 emojis
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
    .then(() => console.log('✅ Log guardado exitosamente'))
    .catch((err: Error) => console.error('❌ Error guardando log:', err.message));
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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Inicializar cliente Supabase con Service Role Key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    console.log('🤖 Iniciando análisis con Gemini...');
    const analysisStartTime = Date.now();
    const geminiResponse = await analyzeWithGemini(
      body.content,
      body.keywords || [],
      GEMINI_API_KEY
    );
    const processingTime = (Date.now() - analysisStartTime) / 1000;
    console.log(`✅ Análisis completado en ${processingTime.toFixed(2)}s`);

    // Determinar emociones dominantes
    const dominantPrimary = getDominantEmotion(geminiResponse.primary_emotions);
    const dominantSecondary = getDominantEmotion(geminiResponse.secondary_emotions);

    console.log('💾 Guardando en base de datos...');
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
        api_version: '1.1.0',
        client_ip: clientIp,
        user_agent: userAgent
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('✅ Análisis guardado con ID:', dbData.id);

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

    console.error('❌ Error in analyze-sentiment:', errorMessage);

    const errorResponse: AnalysisResponse = {
      success: false,
      error: {
        message: 'Internal server error during sentiment analysis',
        code: 'INTERNAL_ERROR',
        details: Deno.env.get('DENO_ENV') === 'development' ? errorMessage : undefined
      }
    };

    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});