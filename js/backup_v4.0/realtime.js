// ============================================
// T2B Tech2Business - Realtime Updates v2.1 OPTIMIZADO
// ✅ Actualizaciones suaves sin interferir con animaciones
// ✅ Solo actualiza si hay cambios reales
// ============================================

class RealtimeManager {
  constructor() {
    this.pollingInterval = null;
    this.pollingDelay = 30000; // 30 segundos (óptimo para no saturar)
    this.lastUpdateTime = null;
    this.isPolling = false;
    this.lastDataHash = null; // Para detectar cambios reales
  }

  startPolling() {
    if (this.isPolling) {
      console.log('⚠️ Polling ya está activo');
      return;
    }

    this.isPolling = true;
    this.lastUpdateTime = new Date();
    
    console.log('🔄 Sistema de actualización suave activado (cada 30s)');
    console.log('⏰ Primera actualización en 30 segundos...');

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
      // Solo actualizar si hay un canal seleccionado
      if (!window.channelManager || !window.channelManager.currentChannel) {
        return;
      }

      const currentChannel = window.channelManager.currentChannel;
      
      // No actualizar durante animaciones activas
      if (this.isAnimating()) {
        console.log('⏭️ Saltando actualización (animación activa)');
        return;
      }

      // Actualización silenciosa
      await this.updateStatisticsSilently(currentChannel);
      
    } catch (error) {
      // Silencioso - solo log en modo debug
      if (window.sentimentAPI && window.sentimentAPI.DEBUG_MODE) {
        console.error('Error en actualización:', error);
      }
    }
  }

  async updateStatisticsSilently(channel) {
    try {
      if (!window.channelManager || !window.dashboard) {
        return;
      }

      // Obtener datos actuales
      const response = await window.sentimentAPI.getHistory({
        social_network: channel === 'all' ? undefined : channel,
        limit: 100,
        include_stats: true
      });

      if (!response.success) return;

      // Calcular hash de los datos para detectar cambios
      const dataHash = this.calculateDataHash(response.data);
      
      if (dataHash === this.lastDataHash) {
        // No hay cambios, no actualizar
        return;
      }

      this.lastDataHash = dataHash;
      this.lastUpdateTime = new Date();

      // Actualizar solo si hay cambios reales
      if (channel === 'all') {
        await window.channelManager.loadAllChannelsData();
      } else {
        await window.channelManager.loadRealDataForChannel(channel);
      }

      // Pequeña notificación visual (opcional)
      this.showUpdateIndicator();

    } catch (error) {
      // Silencioso
    }
  }

  calculateDataHash(data) {
    if (!data || data.length === 0) return 'empty';
    
    // Hash simple basado en cantidad y timestamps
    const hash = data.reduce((acc, item) => {
      return acc + (item.sentiment_score || 0) + (item.id || '').length;
    }, 0);
    
    return `${data.length}_${hash}`;
  }

  isAnimating() {
    // Verificar si Chart.js está animando
    if (window.dashboard && window.dashboard.chart) {
      return window.dashboard.chart.isAnimating && window.dashboard.chart.isAnimating();
    }
    return false;
  }

  showUpdateIndicator() {
    // Indicador sutil de actualización
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      background: rgba(16, 185, 129, 0.9);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.75rem;
      z-index: 9998;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    indicator.textContent = '🔄 Actualizado';
    
    document.body.appendChild(indicator);
    
    // Fade in
    setTimeout(() => indicator.style.opacity = '1', 10);
    
    // Fade out y remover
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }, 2000);
  }

  async forceUpdate() {
    console.log('⚡ Forzando actualización...');
    this.lastDataHash = null; // Forzar actualización ignorando cache
    await this.checkForUpdates();
    console.log('✅ Actualización forzada completada');
  }

  setPollingDelay(milliseconds) {
    if (milliseconds < 10000) {
      console.warn('⚠️ Delay mínimo: 10 segundos');
      milliseconds = 10000;
    }

    this.pollingDelay = milliseconds;
    console.log(`⏱️ Delay actualizado a ${milliseconds / 1000}s`);
    
    if (this.isPolling) {
      this.stopPolling();
      this.startPolling();
    }
  }

  getStatus() {
    return {
      isPolling: this.isPolling,
      pollingDelay: this.pollingDelay,
      lastUpdateTime: this.lastUpdateTime,
      nextUpdateIn: this.isPolling 
        ? this.pollingDelay - (Date.now() - this.lastUpdateTime.getTime())
        : null
    };
  }

  printStatus() {
    const status = this.getStatus();
    console.log('\n📊 ESTADO DEL SISTEMA DE ACTUALIZACIÓN');
    console.log('━'.repeat(50));
    console.log(`Estado: ${status.isPolling ? '🟢 Activo' : '🔴 Inactivo'}`);
    console.log(`Intervalo: ${status.pollingDelay / 1000} segundos`);
    
    if (status.lastUpdateTime) {
      const elapsed = Math.floor((Date.now() - status.lastUpdateTime.getTime()) / 1000);
      console.log(`Última actualización: hace ${elapsed}s`);
    }
    
    if (status.nextUpdateIn && status.nextUpdateIn > 0) {
      const nextIn = Math.floor(status.nextUpdateIn / 1000);
      console.log(`Próxima actualización: en ${nextIn}s`);
    }
    
    console.log('━'.repeat(50));
  }
}

// Inicialización
window.realtimeManager = new RealtimeManager();

// Iniciar polling después de cargar (dar tiempo a que todo se inicialice)
window.addEventListener('load', function() {
  setTimeout(function() {
    if (window.realtimeManager) {
      window.realtimeManager.startPolling();
    }
  }, 5000); // 5 segundos después de cargar
});

// Detener al salir
window.addEventListener('beforeunload', function() {
  if (window.realtimeManager) {
    window.realtimeManager.stopPolling();
  }
});

// Pausar cuando la pestaña está oculta (optimización de recursos)
document.addEventListener('visibilitychange', function() {
  if (!window.realtimeManager) return;
  
  if (document.hidden) {
    console.log('👁️ Pestaña oculta - pausando actualizaciones');
    window.realtimeManager.stopPolling();
  } else {
    console.log('👁️ Pestaña visible - reanudando actualizaciones');
    window.realtimeManager.startPolling();
  }
});

// Comandos útiles
window.realtimeStatus = () => window.realtimeManager.printStatus();
window.realtimeForceUpdate = () => window.realtimeManager.forceUpdate();
window.realtimeSetDelay = (seconds) => window.realtimeManager.setPollingDelay(seconds * 1000);

console.log('✅ Sistema de actualización suave v2.1 cargado');
console.log('💡 Comandos: realtimeStatus(), realtimeForceUpdate(), realtimeSetDelay(30)');