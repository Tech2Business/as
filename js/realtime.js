// T2B Tech2Business - Realtime Updates v2.0
// Actualizaciones suaves e imperceptibles tipo Power BI

class RealtimeManager {
  constructor() {
    this.pollingInterval = null;
    this.pollingDelay = 10000; // 10 segundos para que sea más suave
    this.lastUpdateTime = null;
    this.isPolling = false;
  }

  startPolling() {
    if (this.isPolling) {
      console.log('⚠️ Polling ya está activo');
      return;
    }

    this.isPolling = true;
    this.lastUpdateTime = new Date();
    
    console.log('🔄 Sistema de actualización suave activado (cada 10s)');

    this.pollingInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.pollingDelay);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPolling = false;
      console.log('⏸️ Polling detenido');
    }
  }

  async checkForUpdates() {
    try {
      // Solo actualizar la gráfica de canales de forma suave
      await this.updateStatisticsSilently();
    } catch (error) {
      console.error('Error en actualización:', error);
    }
  }

  async updateStatisticsSilently() {
    try {
      if (typeof window.dashboard === 'undefined' || 
          typeof window.dashboard.loadStatistics !== 'function') {
        return;
      }

      // Actualización silenciosa - sin logs molestos
      await window.dashboard.loadStatistics();
      this.lastUpdateTime = new Date();
    } catch (error) {
      // Silencioso - no mostrar errores en consola
    }
  }

  async forceUpdate() {
    console.log('⚡ Actualizando...');
    await this.checkForUpdates();
  }

  setPollingDelay(milliseconds) {
    if (milliseconds < 5000) {
      milliseconds = 5000;
    }

    this.pollingDelay = milliseconds;
    
    if (this.isPolling) {
      this.stopPolling();
      this.startPolling();
    }
  }

  getStatus() {
    return {
      isPolling: this.isPolling,
      pollingDelay: this.pollingDelay,
      lastUpdateTime: this.lastUpdateTime
    };
  }
}

// Inicialización
window.realtimeManager = new RealtimeManager();

// Iniciar polling después de cargar
window.addEventListener('load', function() {
  setTimeout(function() {
    window.realtimeManager.startPolling();
  }, 3000);
});

// Detener al salir
window.addEventListener('beforeunload', function() {
  if (window.realtimeManager) {
    window.realtimeManager.stopPolling();
  }
});

// Pausar cuando la pestaña está oculta
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    if (window.realtimeManager) {
      window.realtimeManager.stopPolling();
    }
  } else {
    if (window.realtimeManager) {
      window.realtimeManager.startPolling();
    }
  }
});

console.log('✅ Sistema de actualización suave activado');