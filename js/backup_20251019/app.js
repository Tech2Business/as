// ============================================
// T2B Tech2Business - Main Application v3.2 CORREGIDO
// Sistema Multicanal con Análisis en Tiempo Real
// CORREGIDO: Inicialización secuencial y manejo de errores
// ============================================

const AppState = {
  isAnalyzing: false,
  lastAnalysisId: null,
  initialized: false
};

// Inicialización principal
window.addEventListener('load', function() {
  console.log('🚀 Inicializando T2B Sentiment Analysis v3.2...');
  console.log('📊 Sistema Multicanal Activo');
  setTimeout(initializeApp, 200);
});

async function initializeApp() {
  try {
    // Verificar dependencias
    if (typeof window.sentimentAPI === 'undefined') {
      console.error('❌ Error: sentimentAPI no está disponible');
      showNotification('Error al cargar la API', 'error');
      return;
    }

    if (typeof window.channelManager === 'undefined') {
      console.error('❌ Error: channelManager no está disponible');
      showNotification('Error al cargar el gestor de canales', 'error');
      return;
    }

    if (typeof window.dashboard === 'undefined') {
      console.error('❌ Error: dashboard no está disponible');
      showNotification('Error al cargar el dashboard', 'error');
      return;
    }

    console.log('✅ Módulos base cargados');
    
    // CORRECCIÓN: Inicializar en secuencia correcta
    console.log('🔄 Paso 1: Inicializando Dashboard...');
    await window.dashboard.init();
    
    console.log('🔄 Paso 2: Inicializando Channel Manager...');
    await window.channelManager.init();
    
    // Esperar a que cargue los datos
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('🔄 Paso 3: Verificando conexión API...');
    await checkAPIConnection();
    
    // CORRECCIÓN: Si hay canales activos, actualizar dashboard
    const activeChannels = window.channelManager.getActiveChannels();
    if (activeChannels.length > 0) {
      console.log('✅ Canales activos encontrados:', activeChannels);
      
      // CORRECCIÓN: Usar el método correcto que SÍ existe
      const currentChannel = window.channelManager.currentChannel;
      if (currentChannel) {
        await window.channelManager.loadRealDataForChannel(currentChannel);
      } else {
        // Si no hay canal seleccionado, cargar datos para "all"
        await window.channelManager.loadRealDataForChannel('all');
      }
      
      // Actualizar la gráfica con todos los canales
      if (window.dashboard && typeof window.dashboard.setSelectedChannel === 'function') {
        window.dashboard.setSelectedChannel(currentChannel || 'all');
      }
    } else {
      console.log('ℹ️ No hay canales configurados aún');
    }
    
    AppState.initialized = true;
    console.log('✅ Aplicación inicializada correctamente');
    console.log('📡 Sistema de tiempo real activo');
    
  } catch (error) {
    console.error('❌ Error inicializando aplicación:', error);
    showNotification('Error al inicializar la aplicación', 'error');
  }
}

async function checkAPIConnection() {
  try {
    const health = await window.sentimentAPI.healthCheck();
    if (health.success) {
      console.log('✅ Conexión con API exitosa');
    }
  } catch (error) {
    console.log('⚠️ No se pudo conectar con la API, usando modo demo');
  }
}

// ==================== NOTIFICACIONES ====================

function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Crear notificación visual
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
    color: white;
    border-radius: 10px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    z-index: 9999;
    animation: slideInRight 0.3s ease;
    font-size: 0.875rem;
    font-weight: 500;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ==================== ANÁLISIS MANUAL (Opcional) ====================

async function analyzeManualText(channel, content, keywords = []) {
  if (AppState.isAnalyzing) {
    showNotification('Ya hay un análisis en proceso', 'warning');
    return;
  }
  
  try {
    const validation = window.SentimentUtils.validateContent(content);
    if (!validation.valid) {
      showNotification(validation.error, 'error');
      return;
    }
    
    AppState.isAnalyzing = true;
    showNotification('Analizando...', 'info');
    
    const response = await window.sentimentAPI.analyzeSentiment(
      channel,
      content,
      keywords
    );
    
    if (response.success) {
      AppState.lastAnalysisId = response.data.analysis_id;
      window.displayAnalysisResults(response.data);
      showNotification('Análisis completado', 'success');
      
      // Actualizar dashboard
      setTimeout(async () => {
        try {
          await window.dashboard.loadStatistics();
          if (window.realtimeManager) {
            window.realtimeManager.lastUpdateTime = new Date();
          }
        } catch (error) {
          console.error('Error actualizando dashboard:', error);
        }
      }, 800);
      
    } else {
      throw new Error(response.error ? response.error.message : 'Error en el análisis');
    }
    
  } catch (error) {
    console.error('Error en análisis:', error);
    showNotification(error.message || 'Error al analizar el sentimiento', 'error');
  } finally {
    AppState.isAnalyzing = false;
  }
}

// ==================== INTEGRACIÓN CON CANALES ====================

async function processChannelMessages(channel, messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return;
  }

  console.log(`📨 Procesando ${messages.length} mensajes de ${channel}`);

  for (const message of messages) {
    try {
      const messageId = message.id || message.message_id;
      const alreadyProcessed = await checkIfProcessed(messageId);
      
      if (alreadyProcessed) {
        console.log(`⏭️ Mensaje ${messageId} ya procesado, saltando...`);
        continue;
      }

      const content = message.content || message.text || message.body;
      const keywords = message.keywords || [];

      const response = await window.sentimentAPI.analyzeSentiment(
        channel,
        content,
        keywords
      );

      if (response.success) {
        await markAsProcessed(messageId, response.data.analysis_id);
        console.log(`✅ Mensaje ${messageId} procesado`);
      }

    } catch (error) {
      console.error(`Error procesando mensaje:`, error);
    }
  }

  await window.dashboard.loadStatistics();
}

async function checkIfProcessed(messageId) {
  try {
    const processed = localStorage.getItem(`t2b_processed_${messageId}`);
    return processed !== null;
  } catch (error) {
    return false;
  }
}

async function markAsProcessed(messageId, analysisId) {
  try {
    localStorage.setItem(`t2b_processed_${messageId}`, JSON.stringify({
      analysisId,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error marcando mensaje como procesado:', error);
  }
}

// ==================== UTILIDADES ====================

function formatChannelName(channel) {
  const names = {
    email: 'Correo Electrónico',
    whatsapp: 'WhatsApp Business',
    x: 'X (Twitter)',
    facebook: 'Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn'
  };
  return names[channel] || channel;
}

function getChannelIcon(channel) {
  const icons = {
    email: '📧',
    whatsapp: '💬',
    x: '𝕏',
    facebook: '👥',
    instagram: '📸',
    linkedin: '💼'
  };
  return icons[channel] || '🌐';
}

// ==================== MANEJO DE ERRORES GLOBAL ====================

window.addEventListener('error', function(event) {
  console.error('Error global:', event.error);
  if (AppState.initialized) {
    showNotification('Ha ocurrido un error inesperado', 'error');
  }
});

window.addEventListener('unhandledrejection', function(event) {
  console.error('Promise rechazada:', event.reason);
  if (AppState.initialized) {
    showNotification('Error en operación asíncrona', 'error');
  }
});

// ==================== EXPORTAR FUNCIONES GLOBALES ====================

window.analyzeManualText = analyzeManualText;
window.processChannelMessages = processChannelMessages;
window.showNotification = showNotification;
window.formatChannelName = formatChannelName;
window.getChannelIcon = getChannelIcon;

// ==================== ESTILOS PARA ANIMACIONES ====================

const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);

console.log('\n✅ T2B Sentiment Analysis v3.2 - CORREGIDO');
console.log('📊 Sistema Multicanal Activo');
console.log('🎨 Animaciones suaves tipo Power BI');
console.log('⚡ Actualización en tiempo real');
console.log('💾 Persistencia en Supabase\n');