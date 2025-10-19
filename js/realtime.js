// ============================================
// T2B Tech2Business - Realtime Updates
// Sistema de actualización en tiempo real
// ============================================

class RealtimeManager {
  constructor() {
    this.pollingInterval = null;
    this.pollingDelay = 5000; // 5 segundos
    this.lastUpdateTime = null;
    this.isPolling = false;
  }

  /**
   * Inicia el polling para actualizaciones automáticas
   */
  startPolling() {
    if (this.isPolling) {
      console.log('⚠️ Polling ya está activo');
      return;
    }

    this.isPolling = true;
    this.lastUpdateTime = new Date();
    
    console.log('🔄 Iniciando polling cada ' + (this.pollingDelay / 1000) + ' segundos');

    // Polling para actualizar estadísticas y historial
    this.pollingInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.pollingDelay);
  }

  /**
   * Detiene el polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPolling = false;
      console.log('⏸️ Polling detenido');
    }
  }

  /**
   * Verifica si hay nuevos análisis
   */
  async checkForUpdates() {
    try {
      // Obtener la sección activa buscando el elemento con clase 'active'
      let currentSection = 'analyze';
      const activeSectionElement = document.querySelector('.section.active');
      if (activeSectionElement) {
        const sectionId = activeSectionElement.id;
        if (sectionId === 'history-section') {
          currentSection = 'history';
        } else if (sectionId === 'stats-section') {
          currentSection = 'stats';
        }
      }
      
      console.log('🔍 Verificando actualizaciones en sección:', currentSection);
      
      // Solo actualizar si estamos en la sección de historial o estadísticas
      if (currentSection === 'history') {
        await this.updateHistory();
      } else if (currentSection === 'stats') {
        await this.updateStatistics();
      }
    } catch (error) {
      console.error('❌ Error en checkForUpdates:', error);
    }
  }

  /**
   * Actualiza el historial silenciosamente
   */
  async updateHistory() {
    try {
      if (typeof window.AppFunctions === 'undefined' || 
          typeof window.AppFunctions.loadHistory !== 'function') {
        return;
      }

      const currentPage = window.AppState ? window.AppState.currentPage : 1;
      console.log('🔄 Actualizando historial (página ' + currentPage + ')...');
      
      await window.AppFunctions.loadHistory(currentPage);
      
      this.lastUpdateTime = new Date();
      console.log('✅ Historial actualizado a las ' + this.lastUpdateTime.toLocaleTimeString());
    } catch (error) {
      console.error('❌ Error actualizando historial:', error);
    }
  }

  /**
   * Actualiza las estadísticas silenciosamente
   */
  async updateStatistics() {
    try {
      if (typeof window.dashboard === 'undefined' || 
          typeof window.dashboard.loadStatistics !== 'function') {
        return;
      }

      console.log('📊 Actualizando estadísticas...');
      
      await window.dashboard.loadStatistics();
      
      this.lastUpdateTime = new Date();
      console.log('✅ Estadísticas actualizadas a las ' + this.lastUpdateTime.toLocaleTimeString());
    } catch (error) {
      console.error('❌ Error actualizando estadísticas:', error);
    }
  }

  /**
   * Fuerza una actualización inmediata
   */
  async forceUpdate() {
    console.log('⚡ Forzando actualización inmediata...');
    await this.checkForUpdates();
  }

  /**
   * Cambia la frecuencia de polling
   */
  setPollingDelay(milliseconds) {
    if (milliseconds < 1000) {
      console.warn('⚠️ Delay mínimo es 1000ms');
      milliseconds = 1000;
    }

    this.pollingDelay = milliseconds;
    
    if (this.isPolling) {
      this.stopPolling();
      this.startPolling();
      console.log('✅ Frecuencia de polling actualizada a ' + (milliseconds / 1000) + ' segundos');
    }
  }

  /**
   * Obtiene el estado del polling
   */
  getStatus() {
    return {
      isPolling: this.isPolling,
      pollingDelay: this.pollingDelay,
      lastUpdateTime: this.lastUpdateTime,
      nextUpdateIn: this.isPolling 
        ? Math.max(0, this.pollingDelay - (Date.now() - (this.lastUpdateTime ? this.lastUpdateTime.getTime() : Date.now())))
        : null
    };
  }
}

// ============================================
// Inicialización y exportación global
// ============================================

window.realtimeManager = new RealtimeManager();

// Iniciar polling automáticamente cuando la página carga
window.addEventListener('load', function() {
  setTimeout(function() {
    window.realtimeManager.startPolling();
    console.log('✅ Sistema de actualización en tiempo real activado');
  }, 2000);
});

// Detener polling cuando se cierra/recarga la página
window.addEventListener('beforeunload', function() {
  if (window.realtimeManager) {
    window.realtimeManager.stopPolling();
  }
});

// Pausar polling cuando la pestaña está inactiva (opcional - ahorra recursos)
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    console.log('👁️ Pestaña oculta - pausando polling');
    if (window.realtimeManager) {
      window.realtimeManager.stopPolling();
    }
  } else {
    console.log('👁️ Pestaña visible - reanudando polling');
    if (window.realtimeManager) {
      window.realtimeManager.startPolling();
    }
  }
});

console.log('✅ Realtime Manager inicializado');
console.log('📡 Comandos disponibles:');
console.log('   - window.realtimeManager.startPolling() - Iniciar actualizaciones');
console.log('   - window.realtimeManager.stopPolling() - Detener actualizaciones');
console.log('   - window.realtimeManager.forceUpdate() - Forzar actualización');
console.log('   - window.realtimeManager.setPollingDelay(ms) - Cambiar frecuencia');
console.log('   - window.realtimeManager.getStatus() - Ver estado');