// ============================================
// T2B Tech2Business - API Client v1.2
// Cliente para consumir la API de Sentiment Analysis
// VERSIÓN SEGURA - Sin logs de datos sensibles
// ============================================

class SentimentAPI {
  constructor() {
    // Configuración de la API
    this.SUPABASE_URL = 'https://lztfdemrqebqfjxjyksw.supabase.co';
    this.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dGZkZW1ycWVicWZqeGp5a3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0ODQ2MjMsImV4cCI6MjA0NTA2MDYyM30.IdhVWbJXSQbCUFHZgLlQpR0TcmOI5FqDMiZWVoCr2E8';
    this.API_BASE_URL = `${this.SUPABASE_URL}/functions/v1`;
    
    // Headers por defecto
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`
    };
    
    // Modo debug (cambiar a false en producción)
    this.DEBUG_MODE = false;
  }

  /**
   * Inicializa la API con configuración personalizada
   */
  init(supabaseUrl, supabaseKey) {
    this.SUPABASE_URL = supabaseUrl;
    this.SUPABASE_ANON_KEY = supabaseKey;
    this.API_BASE_URL = `${supabaseUrl}/functions/v1`;
    this.headers.Authorization = `Bearer ${supabaseKey}`;
  }

  /**
   * Maneja los errores de las peticiones - SEGURO
   */
  async handleResponse(response) {
    // Intentar parsear la respuesta
    let data;
    try {
      const text = await response.text();
      
      // SEGURIDAD: Solo mostrar logs en modo debug
      if (this.DEBUG_MODE) {
        console.log('📄 Response status:', response.status);
        console.log('📄 Response size:', text.length, 'chars');
      }
      
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      console.error('❌ Error parseando respuesta');
      throw new Error('Invalid JSON response from server');
    }
    
    if (!response.ok) {
      // SEGURIDAD: No mostrar data completa, solo el mensaje de error
      console.error('❌ HTTP Error:', response.status, response.statusText);
      
      const errorMessage = data.error?.message || data.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    return data;
  }

  /**
   * Analiza el sentimiento de un texto
   */
  async analyzeSentiment(socialNetwork, content, keywords) {
    if (typeof keywords === 'undefined') {
      keywords = [];
    }
    try {
      const url = `${this.API_BASE_URL}/analyze-sentiment`;
      const payload = {
        social_network: socialNetwork,
        content: content,
        keywords: keywords
      };

      if (this.DEBUG_MODE) {
        console.log('📤 Enviando petición a:', url);
        console.log('📦 Payload:', { 
          social_network: socialNetwork, 
          content_length: content.length,
          keywords_count: keywords.length 
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (this.DEBUG_MODE) {
        console.log('📡 Response status:', response.status);
      }

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error en analyzeSentiment');
      throw error;
    }
  }

  /**
   * Obtiene el historial de análisis
   */
  async getHistory(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `${this.API_BASE_URL}/get-analysis-history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      if (this.DEBUG_MODE) {
        console.log('📤 Obteniendo historial:', url);
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await this.handleResponse(response);
      
      if (this.DEBUG_MODE && result.metadata) {
        console.log('📊 Historial obtenido:', result.metadata.total, 'registros');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error en getHistory');
      throw error;
    }
  }

  /**
   * Verifica el estado del sistema
   */
  async healthCheck(includeMetrics = false) {
    try {
      const url = `${this.API_BASE_URL}/health-check${includeMetrics ? '?metrics=true' : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      return await this.handleResponse(response);
    } catch (error) {
      if (this.DEBUG_MODE) {
        console.error('❌ Error en healthCheck');
      }
      throw error;
    }
  }

  /**
   * Obtiene estadísticas generales
   */
  async getStatistics() {
    try {
      const response = await this.getHistory({
        limit: 1000,
        include_stats: true
      });

      return response.statistics || null;
    } catch (error) {
      console.error('❌ Error en getStatistics');
      throw error;
    }
  }

  /**
   * Activa/desactiva modo debug
   */
  setDebugMode(enabled) {
    this.DEBUG_MODE = enabled;
    console.log(`🔧 Modo debug: ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
  }
}

// ============================================
// Utilidades del Cliente API
// ============================================

function getSentimentCategory(score) {
  if (score >= 80) {
    return { label: 'Muy Positivo', color: '#10b981', emoji: '🤩' };
  } else if (score >= 60) {
    return { label: 'Positivo', color: '#84cc16', emoji: '😊' };
  } else if (score >= 40) {
    return { label: 'Neutral', color: '#f59e0b', emoji: '😐' };
  } else if (score >= 20) {
    return { label: 'Negativo', color: '#f97316', emoji: '😕' };
  } else {
    return { label: 'Muy Negativo', color: '#ef4444', emoji: '😢' };
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) {
    return 'Hace un momento';
  }
  
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
  
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  }
  
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function parseKeywords(keywordsString) {
  if (!keywordsString || keywordsString.trim() === '') return [];
  
  return keywordsString
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0)
    .slice(0, 20);
}

function validateContent(content) {
  if (!content || content.trim() === '') {
    return { valid: false, error: 'El contenido no puede estar vacío' };
  }
  
  if (content.length > 10000) {
    return { valid: false, error: 'El contenido excede los 10,000 caracteres' };
  }
  
  return { valid: true };
}

function getNetworkEmoji(network) {
  const emojis = {
    email: '📧',
    whatsapp: '💬',
    twitter: '𝕏',
    x: '𝕏',
    facebook: '👥',
    instagram: '📸',
    linkedin: '💼',
    telegram: '✈️',
    sms: '📱'
  };
  
  return emojis[network] || '🌐';
}

function getEmotionEmoji(emotion) {
  const emojis = {
    // Primarias
    feliz: '😊',
    triste: '😢',
    enojado: '😠',
    neutral: '😐',
    asustado: '😨',
    sorprendido: '😲',
    disgustado: '🤢',
    ansioso: '😰',
    // Secundarias
    optimista: '😄',
    pesimista: '😔',
    confiado: '😌',
    confundido: '😕',
    impaciente: '😤',
    agradecido: '🙏',
    orgulloso: '😎',
    frustrado: '😣',
    satisfecho: '😌',
    decepcionado: '😞',
    esperanzado: '🤞',
    cinico: '🙄',
    sarcastico: '😏',
    arrogante: '😤',
    humilde: '🙇',
    despreciativo: '😒'
  };
  
  return emojis[emotion] || '❓';
}

function getEmotionColor(emotion) {
  const colors = {
    // Primarias
    feliz: '#fbbf24',
    triste: '#3b82f6',
    enojado: '#ef4444',
    neutral: '#9ca3af',
    asustado: '#a78bfa',
    sorprendido: '#ec4899',
    disgustado: '#84cc16',
    ansioso: '#f59e0b',
    // Secundarias
    optimista: '#10b981',
    pesimista: '#64748b',
    confiado: '#06b6d4',
    confundido: '#f59e0b',
    impaciente: '#f97316',
    agradecido: '#ec4899',
    orgulloso: '#8b5cf6',
    frustrado: '#ef4444',
    satisfecho: '#10b981',
    decepcionado: '#64748b',
    esperanzado: '#22c55e',
    cinico: '#6b7280',
    sarcastico: '#a855f7',
    arrogante: '#f59e0b',
    humilde: '#06b6d4',
    despreciativo: '#dc2626'
  };
  
  return colors[emotion] || '#6b7280';
}

function formatProcessingTime(seconds) {
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`;
  }
  return `${seconds.toFixed(2)}s`;
}

class LocalStorageHelper {
  constructor(prefix = 't2b_sentiment_') {
    this.prefix = prefix;
  }

  setItem(key, value, ttl = null) {
    try {
      const item = {
        value: value,
        timestamp: Date.now(),
        ttl: ttl
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.error('Error guardando en localStorage');
    }
  }

  getItem(key) {
    try {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      
      if (item.ttl) {
        const now = Date.now();
        const elapsed = (now - item.timestamp) / 1000;
        if (elapsed > item.ttl) {
          this.removeItem(key);
          return null;
        }
      }

      return item.value;
    } catch (error) {
      console.error('Error leyendo de localStorage');
      return null;
    }
  }

  removeItem(key) {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Error removiendo de localStorage');
    }
  }

  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error limpiando localStorage');
    }
  }
}

// ============================================
// Exportar instancias globales
// ============================================

window.sentimentAPI = new SentimentAPI();
window.storageHelper = new LocalStorageHelper();
window.SentimentUtils = {
  getSentimentCategory,
  formatDate,
  truncateText,
  parseKeywords,
  validateContent,
  getNetworkEmoji,
  getEmotionEmoji,
  getEmotionColor,
  formatProcessingTime
};

console.log('✅ T2B Sentiment API Client v1.2 SEGURO inicializado');
console.log('🔒 Logs de datos sensibles: DESACTIVADOS');
console.log('💡 Para activar debug: window.sentimentAPI.setDebugMode(true)');