// ============================================
// T2B Tech2Business - Channel Manager v3.2
// Gestión de Canales Multimodal - CORREGIDO
// Fix: Refresco después de eliminar
// ============================================

class ChannelManager {
  constructor() {
    this.currentChannel = '';
    this.monitoredItems = {
      email: [],
      whatsapp: [],
      x: [],
      facebook: [],
      instagram: [],
      linkedin: []
    };
    this.editingIndex = -1;
    this.editingConfigId = null;
    this.deleteItemIndex = -1;
    this.deleteItemChannel = '';
    this.deleteConfigId = null;
    this.initialized = false;
  }

  async init() {
    console.log('✅ Channel Manager T2B iniciando...');
    
    // CORRECCIÓN: Cargar datos ANTES de configurar eventos
    await this.loadFromDatabase();
    
    const channelSelect = document.getElementById('channel-select');
    if (channelSelect) {
      channelSelect.addEventListener('change', (e) => {
        this.currentChannel = e.target.value;
        this.renderChannelConfig();
        
        // Notificar al dashboard sobre el cambio de canal
        if (window.dashboard && typeof window.dashboard.setSelectedChannel === 'function') {
          window.dashboard.setSelectedChannel(this.currentChannel);
        }
      });
    }
    
    this.initialized = true;
    console.log('✅ Channel Manager T2B iniciado - Datos cargados');
  }

  // ==================== SUPABASE - CARGA DE DATOS ====================
  
  async loadFromDatabase() {
    try {
      if (!window.sentimentAPI || !window.sentimentAPI.SUPABASE_URL) {
        console.log('⚠️ Modo demo: usando datos locales');
        this.loadFromStorage();
        return;
      }

      const supabaseUrl = window.sentimentAPI.SUPABASE_URL;
      const supabaseKey = window.sentimentAPI.SUPABASE_ANON_KEY;
      
      console.log('🔄 Cargando configuraciones desde Supabase...');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/channel_configs?select=*&order=created_at.desc`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const configs = await response.json();
      
      console.log(`📦 ${configs.length} configuraciones encontradas en Supabase`);
      
      // Limpiar arrays
      this.monitoredItems = {
        email: [],
        whatsapp: [],
        x: [],
        facebook: [],
        instagram: [],
        linkedin: []
      };

      // Organizar por canal
      configs.forEach(config => {
        if (this.monitoredItems[config.channel_type]) {
          this.monitoredItems[config.channel_type].push({
            id: config.id,
            name: config.channel_name,
            ...config.config_data,
            created_at: config.created_at,
            is_active: config.is_active
          });
        }
      });

      // Guardar backup en localStorage
      this.saveToStorage();
      
      console.log('✅ Datos cargados desde Supabase:', {
        email: this.monitoredItems.email.length,
        whatsapp: this.monitoredItems.whatsapp.length,
        x: this.monitoredItems.x.length,
        facebook: this.monitoredItems.facebook.length,
        instagram: this.monitoredItems.instagram.length,
        linkedin: this.monitoredItems.linkedin.length
      });
      
    } catch (error) {
      console.error('❌ Error cargando desde Supabase:', error);
      console.log('⚠️ Usando datos locales como fallback');
      this.loadFromStorage();
    }
  }

  // ==================== SUPABASE - GUARDAR CONFIGURACIÓN ====================
  
  async saveToDatabase(channelType, configData, configId = null) {
    try {
      if (!window.sentimentAPI || !window.sentimentAPI.SUPABASE_URL) {
        this.saveToStorage();
        return null;
      }

      const supabaseUrl = window.sentimentAPI.SUPABASE_URL;
      const supabaseKey = window.sentimentAPI.SUPABASE_ANON_KEY;

      const payload = {
        channel_type: channelType,
        channel_name: configData.name || configData.searchTerms || 'Sin nombre',
        config_data: configData,
        is_active: true
      };

      let response;
      let savedConfig;

      if (configId) {
        response = await fetch(`${supabaseUrl}/rest/v1/channel_configs?id=eq.${configId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const updated = await response.json();
        savedConfig = updated[0];
        console.log('✅ Actualizado');

      } else {
        response = await fetch(`${supabaseUrl}/rest/v1/channel_configs`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const created = await response.json();
        savedConfig = created[0];
        console.log('✅ Guardado');
      }

      return savedConfig;

    } catch (error) {
      this.saveToStorage();
      return null;
    }
  }

  // ==================== SUPABASE - ELIMINAR CONFIGURACIÓN ====================
  
  async deleteFromDatabase(configId) {
    try {
      if (!window.sentimentAPI || !window.sentimentAPI.SUPABASE_URL) {
        return false;
      }

      const supabaseUrl = window.sentimentAPI.SUPABASE_URL;
      const supabaseKey = window.sentimentAPI.SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/rest/v1/channel_configs?id=eq.${configId}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      console.log('✅ Eliminado');
      return true;

    } catch (error) {
      return false;
    }
  }

  // ==================== RENDERIZADO ====================
  
  renderChannelConfig() {
    const container = document.getElementById('channel-config-container');
    
    if (!container) return;
    
    if (!this.currentChannel) {
      container.innerHTML = '';
      this.stopMonitoring();
      return;
    }

    // Si se selecciona "Todos los Canales"
    if (this.currentChannel === 'all') {
      const activeChannels = this.getActiveChannels();
      const totalItems = activeChannels.reduce((sum, channel) => {
        return sum + this.monitoredItems[channel].length;
      }, 0);

      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #111544; background: #f8fbff; border-radius: 10px; border: 1px solid #d0d3d6;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
          <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem; color: #111544;">Vista Consolidada</h3>
          <p style="font-size: 0.875rem; color: #6d9abc; margin-bottom: 1rem;">
            Mostrando análisis de todos los canales configurados
          </p>
          <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
            <div style="background: #111544; color: #f8fbff; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem;">
              <strong>${activeChannels.length}</strong> canales activos
            </div>
            <div style="background: #6d9abc; color: #f8fbff; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem;">
              <strong>${totalItems}</strong> elementos monitoreados
            </div>
          </div>
        </div>
      `;
      this.startMonitoring();
      this.triggerDataUpdate();
      return;
    }

    // Email y WhatsApp: Lista con CRUD
    if (this.currentChannel === 'email' || this.currentChannel === 'whatsapp') {
      container.innerHTML = `
        <div class="monitored-list">
          <div id="monitored-items-list"></div>
          <button class="add-btn" onclick="window.channelManager.openAddModal()">
            <span>➕</span>
            <span>Agregar ${this.currentChannel === 'email' ? 'Correo' : 'Número'}</span>
          </button>
        </div>
      `;
      this.renderMonitoredList();
    } else {
      // Redes sociales: Configuración directa
      container.innerHTML = `
        <button class="add-btn" onclick="window.channelManager.openSocialModal()">
          <span>⚙️</span>
          <span>Configurar Monitoreo</span>
        </button>
        <div id="social-config-display" style="margin-top: 1rem;"></div>
      `;
      this.renderSocialConfig();
    }

    this.startMonitoring();
  }

  renderMonitoredList() {
    const listContainer = document.getElementById('monitored-items-list');
    if (!listContainer) return;
    
    const items = this.monitoredItems[this.currentChannel] || [];

    if (items.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #6d9abc; background: #f8fbff; border-radius: 10px; border: 1px solid #d0d3d6;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;">🔭</div>
          <p style="font-size: 0.875rem;">No hay elementos configurados</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = items.map((item, index) => `
      <div class="monitored-item">
        <div class="monitored-info">
          <div class="monitored-name">${item.name}</div>
          <div class="monitored-detail">
            ${this.currentChannel === 'email' ? item.email : item.phone} • ${item.department}
          </div>
        </div>
        <div class="monitored-actions">
          <button class="icon-btn edit" onclick="window.channelManager.editItem(${index})" title="Editar">✏️</button>
          <button class="icon-btn delete" onclick="window.channelManager.openDeleteModal(${index})" title="Eliminar">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  renderSocialConfig() {
    const display = document.getElementById('social-config-display');
    if (!display) return;
    
    const config = this.monitoredItems[this.currentChannel][0];

    if (!config) {
      display.innerHTML = '';
      return;
    }

    display.innerHTML = `
      <div class="monitored-item">
        <div class="monitored-info">
          <div class="monitored-name">Configuración Activa</div>
          <div class="monitored-detail">
            ${config.searchTerms} • ${config.dateFrom} a ${config.dateTo}
            ${config.limit ? ` • Límite: ${config.limit}` : ' • Sin límite'}
          </div>
        </div>
        <div class="monitored-actions">
          <button class="icon-btn edit" onclick="window.channelManager.editSocialConfig()" title="Editar">✏️</button>
          <button class="icon-btn delete" onclick="window.channelManager.openDeleteModal(0)" title="Eliminar">🗑️</button>
        </div>
      </div>
    `;
  }

  // ==================== MODAL EMAIL ====================
  
  openAddModal() {
    if (this.currentChannel === 'email') {
      document.getElementById('email-modal-title').textContent = 'Agregar Correo Electrónico';
      document.getElementById('email-name').value = '';
      document.getElementById('email-address').value = '';
      document.getElementById('email-department').value = '';
      this.editingIndex = -1;
      this.editingConfigId = null;
      document.getElementById('email-modal').classList.add('active');
    } else if (this.currentChannel === 'whatsapp') {
      document.getElementById('whatsapp-modal-title').textContent = 'Agregar WhatsApp Business';
      document.getElementById('whatsapp-name').value = '';
      document.getElementById('whatsapp-code').value = '+504';
      document.getElementById('whatsapp-number').value = '';
      document.getElementById('whatsapp-department').value = '';
      this.editingIndex = -1;
      this.editingConfigId = null;
      document.getElementById('whatsapp-modal').classList.add('active');
    }
  }

  editItem(index) {
    this.editingIndex = index;
    const item = this.monitoredItems[this.currentChannel][index];
    this.editingConfigId = item.id;

    if (this.currentChannel === 'email') {
      document.getElementById('email-modal-title').textContent = 'Editar Correo Electrónico';
      document.getElementById('email-name').value = item.name;
      document.getElementById('email-address').value = item.email;
      document.getElementById('email-department').value = item.department;
      document.getElementById('email-modal').classList.add('active');
    } else if (this.currentChannel === 'whatsapp') {
      document.getElementById('whatsapp-modal-title').textContent = 'Editar WhatsApp Business';
      document.getElementById('whatsapp-name').value = item.name;
      const phoneParts = item.phone.split(' ');
      document.getElementById('whatsapp-code').value = phoneParts[0];
      document.getElementById('whatsapp-number').value = phoneParts[1] || '';
      document.getElementById('whatsapp-department').value = item.department;
      document.getElementById('whatsapp-modal').classList.add('active');
    }
  }

  closeEmailModal() {
    document.getElementById('email-modal').classList.remove('active');
    this.editingIndex = -1;
    this.editingConfigId = null;
  }

  closeWhatsAppModal() {
    document.getElementById('whatsapp-modal').classList.remove('active');
    this.editingIndex = -1;
    this.editingConfigId = null;
  }

  async saveEmail() {
    const name = document.getElementById('email-name').value.trim();
    const email = document.getElementById('email-address').value.trim();
    const department = document.getElementById('email-department').value.trim();

    if (!name || !email || !department) {
      alert('Por favor completa todos los campos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Por favor ingresa un correo electrónico válido');
      return;
    }

    const emailData = { 
      name, 
      email, 
      department,
      created_at: new Date().toISOString()
    };

    const savedConfig = await this.saveToDatabase('email', emailData, this.editingConfigId);

    if (savedConfig) {
      emailData.id = savedConfig.id;
    }

    if (this.editingIndex >= 0) {
      this.monitoredItems.email[this.editingIndex] = emailData;
    } else {
      this.monitoredItems.email.push(emailData);
    }

    this.closeEmailModal();
    this.renderMonitoredList();
    this.saveToStorage();
    this.triggerDataUpdate();
  }

  async saveWhatsApp() {
    const name = document.getElementById('whatsapp-name').value.trim();
    const code = document.getElementById('whatsapp-code').value.trim();
    const number = document.getElementById('whatsapp-number').value.trim();
    const department = document.getElementById('whatsapp-department').value.trim();

    if (!name || !code || !number || !department) {
      alert('Por favor completa todos los campos');
      return;
    }

    const whatsappData = {
      name,
      phone: `${code} ${number}`,
      department,
      created_at: new Date().toISOString()
    };

    const savedConfig = await this.saveToDatabase('whatsapp', whatsappData, this.editingConfigId);

    if (savedConfig) {
      whatsappData.id = savedConfig.id;
    }

    if (this.editingIndex >= 0) {
      this.monitoredItems.whatsapp[this.editingIndex] = whatsappData;
    } else {
      this.monitoredItems.whatsapp.push(whatsappData);
    }

    this.closeWhatsAppModal();
    this.renderMonitoredList();
    this.saveToStorage();
    this.triggerDataUpdate();
  }

  // ==================== MODAL REDES SOCIALES ====================
  
  openSocialModal() {
    const config = this.monitoredItems[this.currentChannel][0];
    
    if (config) {
      document.getElementById('social-search-terms').value = config.searchTerms;
      document.getElementById('social-keywords').value = config.keywords || '';
      document.getElementById('social-date-from').value = config.dateFrom;
      document.getElementById('social-date-to').value = config.dateTo;
      document.getElementById('social-limit').value = config.limit || '';
      this.editingConfigId = config.id;
    } else {
      document.getElementById('social-search-terms').value = '';
      document.getElementById('social-keywords').value = '';
      
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      document.getElementById('social-date-from').value = weekAgo.toISOString().split('T')[0];
      document.getElementById('social-date-to').value = today.toISOString().split('T')[0];
      document.getElementById('social-limit').value = '';
      this.editingConfigId = null;
    }

    const channelNames = {
      x: 'X (Twitter)',
      facebook: 'Facebook',
      instagram: 'Instagram',
      linkedin: 'LinkedIn'
    };

    document.getElementById('social-modal-title').textContent = `Configurar ${channelNames[this.currentChannel]}`;
    document.getElementById('social-modal').classList.add('active');
  }

  editSocialConfig() {
    this.openSocialModal();
  }

  closeSocialModal() {
    document.getElementById('social-modal').classList.remove('active');
    this.editingConfigId = null;
  }

  async saveSocialConfig() {
    const searchTerms = document.getElementById('social-search-terms').value.trim();
    const keywords = document.getElementById('social-keywords').value.trim();
    const dateFrom = document.getElementById('social-date-from').value;
    const dateTo = document.getElementById('social-date-to').value;
    const limit = document.getElementById('social-limit').value;

    if (!searchTerms || !dateFrom || !dateTo) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      alert('La fecha de inicio debe ser anterior o igual a la fecha de fin');
      return;
    }

    const socialData = {
      searchTerms,
      keywords,
      dateFrom,
      dateTo,
      limit: limit ? parseInt(limit) : null,
      created_at: new Date().toISOString()
    };

    const savedConfig = await this.saveToDatabase(this.currentChannel, socialData, this.editingConfigId);

    if (savedConfig) {
      socialData.id = savedConfig.id;
    }

    this.monitoredItems[this.currentChannel] = [socialData];
    this.closeSocialModal();
    this.renderSocialConfig();
    this.saveToStorage();
    this.triggerDataUpdate();
  }

  // ==================== MODAL ELIMINACIÓN ====================
  
  openDeleteModal(index) {
    this.deleteItemIndex = index;
    this.deleteItemChannel = this.currentChannel;
    
    const item = this.monitoredItems[this.deleteItemChannel][index];
    this.deleteConfigId = item ? item.id : null;
    
    document.getElementById('delete-reason').value = '';
    document.getElementById('delete-modal').classList.add('active');
  }

  closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
    this.deleteItemIndex = -1;
    this.deleteItemChannel = '';
    this.deleteConfigId = null;
  }

  async confirmDelete() {
    const reason = document.getElementById('delete-reason').value.trim();

    if (!reason) {
      alert('Por favor indica el motivo de la eliminación');
      return;
    }

    // Eliminar de Supabase
    if (this.deleteConfigId) {
      await this.deleteFromDatabase(this.deleteConfigId);
    }

    // Eliminar del array local
    this.monitoredItems[this.deleteItemChannel].splice(this.deleteItemIndex, 1);
    
    // CORRECCIÓN: Cerrar modal primero
    this.closeDeleteModal();

    // CORRECCIÓN: Refrescar la vista según el tipo de canal
    if (this.deleteItemChannel === 'email' || this.deleteItemChannel === 'whatsapp') {
      this.renderMonitoredList();
    } else {
      this.renderSocialConfig();
    }

    this.saveToStorage();
    this.triggerDataUpdate();
    
    // CORRECCIÓN: Mostrar notificación de éxito
    if (window.showNotification) {
      window.showNotification('Elemento eliminado correctamente', 'success');
    }
  }

  // ==================== ALMACENAMIENTO LOCAL (FALLBACK) ====================
  
  saveToStorage() {
    try {
      localStorage.setItem('t2b_monitored_items', JSON.stringify(this.monitoredItems));
    } catch (error) {
      console.error('Error en almacenamiento local');
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('t2b_monitored_items');
      if (stored) {
        this.monitoredItems = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error cargando datos locales');
    }
  }

  // ==================== MONITOREO ====================
  
  startMonitoring() {
    const hasItems = Object.values(this.monitoredItems).some(items => items.length > 0);
    
    if (hasItems && window.realtimeManager) {
      window.realtimeManager.startPolling();
      this.triggerDataUpdate();
    }
  }

  stopMonitoring() {
    if (window.realtimeManager) {
      window.realtimeManager.stopPolling();
    }
  }

  triggerDataUpdate() {
    if (window.dashboard && typeof window.dashboard.updateWithChannelData === 'function') {
      window.dashboard.updateWithChannelData(this.monitoredItems);
    }
    
    this.simulateChannelData();
  }

  simulateChannelData() {
    const hasItems = Object.values(this.monitoredItems).some(items => items.length > 0);
    const isAllChannels = this.currentChannel === 'all';

    if (!hasItems && !isAllChannels) {
      document.getElementById('empty-state').style.display = 'flex';
      document.getElementById('results-container').classList.remove('active');
      return;
    }

    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('results-container').classList.add('active');

    const sentimentData = {
      positive: Math.floor(Math.random() * 40) + 40,
      neutral: Math.floor(Math.random() * 20) + 20,
      negative: Math.floor(Math.random() * 20) + 10
    };
    
    sentimentData.score = sentimentData.positive - sentimentData.negative;

    if (window.dashboard && typeof window.dashboard.updateKPIs === 'function') {
      window.dashboard.updateKPIs(sentimentData);
    }
    
    // CORRECCIÓN: Lógica de actualización de gráfica
    if (window.dashboard && typeof window.dashboard.updateNetworksChartByChannels === 'function') {
      const activeChannels = this.getActiveChannels();
      
      if (isAllChannels) {
        // Modo "Todos": mostrar TODOS los canales disponibles
        const allChannels = ['email', 'whatsapp', 'x', 'facebook', 'instagram', 'linkedin'];
        console.log('📊 Actualizando gráfica: TODOS los canales');
        window.dashboard.updateNetworksChartByChannels(allChannels, 'all');
      } else if (this.currentChannel && activeChannels.length > 0) {
        // Modo individual: mostrar todos los activos pero resaltar solo el seleccionado
        console.log('📊 Actualizando gráfica: Canal', this.currentChannel);
        window.dashboard.updateNetworksChartByChannels(activeChannels, this.currentChannel);
      }
    }d.updateKPIs(sentimentData);
    }
    
    // CORRECCIÓN: Lógica de actualización de gráfica
    if (window.dashboard && typeof window.dashboard.updateNetworksChartByChannels === 'function') {
      const activeChannels = this.getActiveChannels();
      
      if (isAllChannels) {
        // Modo "Todos": mostrar TODOS los canales disponibles
        const allChannels = ['email', 'whatsapp', 'x', 'facebook', 'instagram', 'linkedin'];
        console.log('📊 Actualizando gráfica: TODOS los canales');
        window.dashboard.updateNetworksChartByChannels(allChannels, 'all');
      } else if (this.currentChannel && activeChannels.length > 0) {
        // Modo individual: mostrar todos los activos pero resaltar solo el seleccionado
        console.log('📊 Actualizando gráfica: Canal', this.currentChannel);
        window.dashboard.updateNetworksChartByChannels(activeChannels, this.currentChannel);
      }
    }
  }d.updateKPIs(sentimentData);
    }
    
    const activeChannels = this.getActiveChannels();
    
    if ((activeChannels.length > 0 || isAllChannels) && window.dashboard) {
      if (typeof window.dashboard.updateNetworksChartByChannels === 'function') {
        const channelsToShow = isAllChannels ? 
          ['email', 'whatsapp', 'x', 'facebook', 'instagram', 'linkedin'] : 
          activeChannels;
        
        window.dashboard.updateNetworksChartByChannels(channelsToShow, this.currentChannel);
      }
    }
  }

  // ==================== UTILIDADES ====================
  
  getActiveChannels() {
    return Object.keys(this.monitoredItems).filter(
      channel => this.monitoredItems[channel].length > 0
    );
  }

  getChannelData(channel) {
    return this.monitoredItems[channel] || [];
  }

  hasActiveMonitoring() {
    return this.getActiveChannels().length > 0;
  }
}

// Inicializar y exportar globalmente
window.channelManager = new ChannelManager();

// CORRECCIÓN: Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    // No llamar init aquí, se llamará desde app.js
    console.log('📦 Channel Manager listo para inicializar');
  });
} else {
  console.log('📦 Channel Manager listo para inicializar');
}

console.log('✅ Channel Manager v3.2 cargado - CORREGIDO');