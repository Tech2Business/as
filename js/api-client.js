// ============================================
// T2B Tech2Business - API Client
// Cliente para consumir la API de Sentiment Analysis
// ============================================

class SentimentAPI {
  constructor() {
    // Configuración de la API
    // IMPORTANTE: Reemplaza estos valores con tus credenciales reales
    this.SUPABASE_URL = 'https://lztfdemrqebqfjxjyksw.supabase.co';
    this.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dGZkZW1ycWVicWZqeGp5a3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTc4OTAsImV4cCI6MjA3NjM3Mzg5MH0.Hoy-G8-ob2a70lBtGbo0f-MBLYi0iOS2ltohqgh8PpU';
    this.API_BASE_URL = `${this.SUPABASE_URL}/functions/v1`;
    
    // Headers por defecto
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`
    };
  }

  /**
   * Inicializa la API con configuración personalizada
   * @param {string} supabaseUrl - URL del proyecto Supabase
   * @param {string} supabaseKey - Anon key de Supabase
   */
  init(supabaseUrl, supabaseKey) {
    this.SUPABASE_URL = supabaseUrl;
    this.SUPABASE_ANON_KEY = supabaseKey;
    this.API_BASE_URL = `${supabaseUrl}/functions/v1`;
    this.headers.Authorization = `Bearer ${supabaseKey}`;
  }

  /**
   * Maneja los errores de las peticiones
   * @param {Response} response - Respuesta del fetch
   */
  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error en la petición');
    }
    
    return data;
  }

  /**
   * Analiza el sentimiento de un texto
   * @param {string} socialNetwork - Red social (email, whatsapp, etc)
   * @param {string} content - Contenido a analizar
   * @param {string[]} keywords - Array de palabras clave (opcional)
   * @returns {Promise<Object>} Resultado del análisis
   */
  async analyzeSentiment(socialNetwork, content, keywords = []) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/analyze-sentiment`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          social_network: socialNetwork,
          content: content,
          keywords: keywords
        })
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en analyzeSentiment:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de análisis
   * @param {Object} params - Parámetros de consulta
   * @param {number} params.limit - Número de resultados
   * @param {number} params.page - Número de página
   * @param {string} params.social_network - Filtrar por red social
   * @param {number} params.min_score - Score mínimo
   * @param {number} params.max_score - Score máximo
   * @param {boolean} params.include_stats - Incluir estadísticas
   * @returns {Promise<Object>} Historial de análisis
   */
  async getHistory(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Agregar parámetros no vacíos
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `${this.API_BASE_URL}/get-analysis-history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getHistory:', error);
      throw error;
    }
  }

  /**
   * Verifica el estado del sistema
   * @param {boolean} includeMetrics - Incluir métricas detalladas
   * @returns {Promise<Object>} Estado del sistema
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
      console.error('Error en healthCheck:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas generales
   * @returns {Promise<Object>} Estadísticas del sistema
   */
  async getStatistics() {
    try {
      const response = await this.getHistory({
        limit: 1000,
        include_stats: true
      });

      return response.statistics || null;
    } catch (error) {
      console.error('Error en getStatistics:', error);
      throw error;
    }
  }
}

// ============================================
// Utilidades del Cliente API
// ============================================

/**
 * Formatea un score de sentimiento a categoría
 * @param {number} score - Score (0-100)
 * @returns {Object} Categoría y color
 */
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

/**
 * Formatea una fecha a formato legible
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  // Menos de 1 minuto
  if (diff < 60000) {
    return 'Hace un momento';
  }
  
  // Menos de 1 hora
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
  
  // Menos de 24 horas
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  }
  
  // Formato normal
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Trunca un texto a una longitud máxima
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto truncado
 */
function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} True si es válido
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Parsea keywords desde un string
 * @param {string} keywordsString - String de keywords separadas por comas
 * @returns {string[]} Array de keywords
 */
function parseKeywords(keywordsString) {
  if (!keywordsString || keywordsString.trim() === '') return [];
  
  return keywordsString
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0)
    .slice(0, 20); // Máximo 20 keywords
}

/**
 * Valida el contenido antes de enviarlo
 * @param {string} content - Contenido a validar
 * @returns {Object} Resultado de validación
 */
function validateContent(content) {
  if (!content || content.trim() === '') {
    return { valid: false, error: 'El contenido no puede estar vacío' };
  }
  
  if (content.length > 10000) {
    return { valid: false, error: 'El contenido excede los 10,000 caracteres' };
  }
  
  return { valid: true };
}

/**
 * Obtiene el emoji de una red social
 * @param {string} network - Nombre de la red social
 * @returns {string} Emoji correspondiente
 */
function getNetworkEmoji(network) {
  const emojis = {
    email: '📧',
    whatsapp: '💬',
    twitter: '🐦',
    facebook: '👥',
    instagram: '📸',
    linkedin: '💼',
    telegram: '✈️',
    sms: '📱'
  };
  
  return emojis[network] || '🌐';
}

/**
 * Obtiene el emoji de una emoción
 * @param {string} emotion - Nombre de la emoción
 * @returns {string} Emoji correspondiente
 */
function getEmotionEmoji(emotion) {
  const emojis = {
    feliz: '😊',
    triste: '😢',
    enojado: '😠',
    neutral: '😐',
    asustado: '😨',
    sorprendido: '😲',
    optimista: '😄',
    pesimista: '😔',
    confiado: '😌',
    confundido: '😕',
    impaciente: '😤',
    agradecido: '🙏'
  };
  
  return emojis[emotion] || '❓';
}

/**
 * Calcula el color de una emoción para gráficos
 * @param {string} emotion - Nombre de la emoción
 * @returns {string} Color hexadecimal
 */
function getEmotionColor(emotion) {
  const colors = {
    feliz: '#fbbf24',
    triste: '#3b82f6',
    enojado: '#ef4444',
    neutral: '#9ca3af',
    asustado: '#a78bfa',
    sorprendido: '#ec4899',
    optimista: '#10b981',
