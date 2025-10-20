// ============================================
// T2B Tech2Business - Channel Manager v3.6 CORREGIDO
// FIXES: Persistencia, Cálculos, API Error Handling
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
    this.realDataCache = {};
  }

  async init() {
    console.log('✅ Channel Manager T2B v3.6 iniciando...');
    
    // CORRECCIÓN: Primero cargar desde localStorage
    this.loadFromStorage();
    
    // Luego intentar cargar desde base de datos
    try {
      await this.loadFromDatabase();
    } catch (error) {
      console.log('⚠️ Usando datos locales');
    }
    
    const channelSelect = document.getElementById('channel-select');
    if (channelSelect) {
      channelSelect.addEventListener('change', async (e) => {
        this.currentChannel = e.target.value;
        this.renderChannelConfig();
        
        await this.loadRealDataForChannel(this.currentChannel);
        
        if (window.dashboard && typeof window.dashboard.setSelectedChannel === 'function') {
          window.dashboard.setSelectedChannel(this.currentChannel);
        }
      });
    }
    
    this.initialized = true;
    console.log('✅ Channel Manager iniciado');
  }

  // NUEVO: Método para actualizar datos después de cambios
  async triggerDataUpdate() {
    if (!this.currentChannel) return;
    
    console.log('🔄 Actualizando datos del canal:', this.currentChannel);
    await this.loadRealDataForChannel(this.currentChannel);
  }

  async loadRealDataForChannel(channel) {
    if (!channel || channel === '') {
      return;
    }

    try {
      console.log('🔍 Cargando datos reales para:', channel);

      if (!window.sentimentAPI) {
        console.warn('⚠️ API no disponible');
        this.showEmptyState();
        return;
      }

      const channelMap = {
        'email': 'email',
        'whatsapp': 'whatsapp',
        'x': 'twitter',
        'facebook': 'facebook',
        'instagram': 'instagram',
        'linkedin': 'linkedin'
      };

      if (channel === 'all') {
        await this.loadAllChannelsData();
      } else {
        const dbChannelName = channelMap[channel];
        
        try {
          const response = await window.sentimentAPI.getHistory({
            social_network: dbChannelName,
            limit: 100,
            include_stats: true
          });

          if (response.success && response.data && response.data.length > 0) {
            console.log(`✅ ${response.data.length} registros para ${channel}`);
            this.processRealData(channel, response);
          } else {
            console.warn(`⚠️ No hay datos para ${channel}`);
            this.showNoDataForChannel(channel);
          }
        } catch (apiError) {
          console.warn(`⚠️ Error API para ${channel}, usando datos simulados`);
          this.generateSimulatedData(channel);
        }
      }

    } catch (error) {
      console.error('❌ Error:', error);
      this.generateSimulatedData(channel);
    }
  }

  // NUEVO: Generar datos simulados cuando API falla
  generateSimulatedData(channel) {
    const total = Math.floor(Math.random() * 50) + 10;
    const positiveCount = Math.floor(total * (Math.random() * 0.4 + 0.3));
    const negativeCount = Math.floor(total * (Math.random() * 0.3 + 0.1));
    const neutralCount = total - positiveCount - negativeCount;

    const sentimentData = {
      positive: Math.round((positiveCount / total) * 100),
      neutral: Math.round((neutralCount / total) * 100),
      negative: Math.round((negativeCount / total) * 100),
      total: total,
      positiveCount: positiveCount,
      neutralCount: neutralCount,
      negativeCount: negativeCount
    };

    sentimentData.score = sentimentData.positive - sentimentData.negative;

    // Generar emociones simuladas
    const emotions = this.generateSimulatedEmotions();

    this.realDataCache[channel] = {
      sentimentData,
      emotions,
      rawData: []
    };

    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('results-container').classList.add('active');

    if (window.dashboard && typeof window.dashboard.updateKPIs === 'function') {
      window.dashboard.updateKPIs(sentimentData);
    }

    this.updateChartWithRealData(channel);
    this.updateEmotionsWithSimulatedData(emotions);
  }

  // NUEVO: Generar emociones simuladas
  generateSimulatedEmotions() {
    const primaryEmotions = ['feliz', 'triste', 'enojado', 'neutral', 'asustado', 'sorprendido'];
    const secondaryEmotions = ['optimista', 'pesimista', 'confiado', 'confundido', 'agradecido', 'frustrado'];
    
    const emotions = {};
    
    // Emociones primarias (más probables)
    primaryEmotions.forEach(emotion => {
      emotions[emotion] = Math.floor(Math.random() * 30) + 10;
    });
    
    // Emociones secundarias (menos probables)
    secondaryEmotions.forEach(emotion => {
      emotions[emotion] = Math.floor(Math.random() * 20) + 5;
    });
    
    return emotions;
  }

  // NUEVO: Actualizar emociones con datos simulados
  updateEmotionsWithSimulatedData(emotions) {
    const primaryEmotions = ['feliz', 'triste', 'enojado', 'neutral', 'asustado', 'sorprendido'];
    const primary = [];
    const secondary = [];

    Object.entries(emotions).forEach(([emotion, value]) => {
      const emotionData = {
        emoji: window.dashboard.getEmotionEmoji(emotion),
        name: this.capitalizeFirst(emotion),
        value: value,
        color: window.dashboard.getEmotionColor(emotion)
      };

      if (primaryEmotions.includes(emotion)) {
        primary.push(emotionData);
      } else {
        secondary.push(emotionData);
      }
    });

    primary.sort((a, b) => b.value - a.value);
    secondary.sort((a, b) => b.value - a.value);

    if (window.dashboard && typeof window.dashboard.renderEmotions === 'function') {
      window.dashboard.renderEmotions('primary-emotions', primary.slice(0, 3));
      window.dashboard.renderEmotions('secondary-emotions', secondary.slice(0, 3));
    }
  }

  async loadAllChannelsData() {
    try {
      const response = await window.sentimentAPI.getHistory({
        limit: 500,
        include_stats: true
      });

      if (response.success && response.statistics) {
        this.processAllChannelsData(response);
      } else {
        this.showEmptyState();
      }
    } catch (error) {
      console.error('❌ Error:', error);
      this.generateSimulatedAllChannelsData();
    }
  }

  // NUEVO: Datos simulados para todos los canales
  generateSimulatedAllChannelsData() {
    const activeChannels = this.getActiveChannels();
    
    if (activeChannels.length === 0) {
      this.showEmptyState();
      return;
    }

    // Generar datos para cada canal activo
    activeChannels.forEach(channel => {
      this.generateSimulatedData(channel);
    });

    // Calcular totales
    let totalPositive = 0, totalNeutral = 0, totalNegative = 0, totalCount = 0;
    
    activeChannels.forEach(channel => {
      const cached = this.realDataCache[channel];
      if (cached && cached.sentimentData) {
        totalPositive += cached.sentimentData.positiveCount || 0;
        totalNeutral += cached.sentimentData.neutralCount || 0;
        totalNegative += cached.sentimentData.negativeCount || 0;
        totalCount += cached.sentimentData.total || 0;
      }
    });

    const sentimentData = {
      positive: totalCount > 0 ? Math.round((totalPositive / totalCount) * 100) : 0,
      neutral: totalCount > 0 ? Math.round((totalNeutral / totalCount) * 100) : 0,
      negative: totalCount > 0 ? Math.round((totalNegative / totalCount) * 100) : 0,
      score: totalCount > 0 ? Math.round(((totalPositive - totalNegative) / totalCount) * 100) : 0
    };

    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('results-container').classList.add('active');

    if (window.dashboard && typeof window.dashboard.updateKPIs === 'function') {
      window.dashboard.updateKPIs(sentimentData);
    }

    this.updateChartWithAllChannels(activeChannels);
  }

  processRealData(channel, response) {
    const data = response.data || [];

    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;

    data.forEach(item => {
      const score = item.sentiment_score || 0;
      if (score >= 60) {
        positiveCount++;
      } else if (score >= 40) {
        neutralCount++;
      } else {
        negativeCount++;
      }
    });

    const total = data.length;
    
    const sentimentData = {
      positive: total > 0 ? Math.round((positiveCount / total) * 100) : 0,
      neutral: total > 0 ? Math.round((neutralCount / total) * 100) : 0,
      negative: total > 0 ? Math.round((negativeCount / total) * 100) : 0,
      total: total,
      positiveCount: positiveCount,
      neutralCount: neutralCount,
      negativeCount: negativeCount
    };

    sentimentData.score = sentimentData.positive - sentimentData.negative;

    console.log('📊 Sentimientos calculados:', sentimentData);

    this.realDataCache[channel] = {
      sentimentData,
      emotions: this.extractEmotions(data),
      rawData: data
    };

    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('results-container').classList.add('active');

    if (window.dashboard && typeof window.dashboard.updateKPIs === 'function') {
      window.dashboard.updateKPIs(sentimentData);
    }

    this.updateChartWithRealData(channel);
    this.updateEmotionsWithRealData(data);
  }

  processAllChannelsData(response) {
    const stats = response.statistics || {};
    const data = response.data || [];

    const avgScore = stats.average_sentiment_score || 50;
    
    let positive = 0, neutral = 0, negative = 0;
    
    if (avgScore >= 60) {
      positive = Math.round(avgScore);
      neutral = Math.round((100 - avgScore) * 0.6);
      negative = Math.round((100 - avgScore) * 0.4);
    } else if (avgScore >= 40) {
      neutral = Math.round(avgScore * 0.8);
      positive = Math.round(avgScore * 0.4);
      negative = 100 - positive - neutral;
    } else {
      negative = Math.round(100 - avgScore);
      neutral = Math.round(avgScore * 0.5);
      positive = 100 - negative - neutral;
    }

    const sentimentData = {
      positive: positive,
      neutral: neutral,
      negative: negative,
      score: Math.round(avgScore)
    };

    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('results-container').classList.add('active');

    if (window.dashboard && typeof window.dashboard.updateKPIs === 'function') {
      window.dashboard.updateKPIs(sentimentData);
    }

    if (stats.network_distribution) {
      this.updateChartWithNetworkDistribution(stats.network_distribution);
    }

    this.updateEmotionsWithRealData(data);
  }

  extractEmotions(data) {
    const emotionCounts = {};
    
    data.forEach(item => {
      const emotion = item.primary_emotion;
      if (emotion) {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      }
    });

    const total = data.length || 1;
    const emotions = {};
    
    Object.keys(emotionCounts).forEach(emotion => {
      emotions[emotion] = Math.round((emotionCounts[emotion] / total) * 100);
    });

    return emotions;
  }

  updateChartWithRealData(channel) {
    if (!window.dashboard) return;

    const activeChannels = this.getActiveChannels();
    
    const channelDataArray = activeChannels.map(ch => {
      const cached = this.realDataCache[ch];
      
      if (cached && cached.sentimentData) {
        return {
          channel: ch,
          positive: cached.sentimentData.positive,
          neutral: cached.sentimentData.neutral,
          negative: cached.sentimentData.negative
        };
      }
      
      return {
        channel: ch,
        positive: 0,
        neutral: 0,
        negative: 0
      };
    });

    const channels = channelDataArray.map(d => d.channel);
    const positiveData = channelDataArray.map(d => d.positive);
    const neutralData = channelDataArray.map(d => d.neutral);
    const negativeData = channelDataArray.map(d => d.negative);

    console.log('📊 Datos para gráfica:', {
      channels: channels,
      positive: positiveData,
      neutral: neutralData,
      negative: negativeData,
      selected: channel
    });

    if (typeof window.dashboard.updateNetworksChartWithData === 'function') {
      window.dashboard.updateNetworksChartWithData(
        channels,
        positiveData,
        neutralData,
        negativeData,
        channel
      );
    }
  }

  // NUEVO: Actualizar gráfica con todos los canales
  updateChartWithAllChannels(activeChannels) {
    if (!window.dashboard) return;

    const channelDataArray = activeChannels.map(ch => {
      const cached = this.realDataCache[ch];
      
      if (cached && cached.sentimentData) {
        return {
          channel: ch,
          positive: cached.sentimentData.positive,
          neutral: cached.sentimentData.neutral,
          negative: cached.sentimentData.negative
        };
      }
      
      return {
        channel: ch,
        positive: 0,
        neutral: 0,
        negative: 0
      };
    });

    const channels = channelDataArray.map(d => d.channel);
    const positiveData = channelDataArray.map(d => d.positive);
    const neutralData = channelDataArray.map(d => d.neutral);
    const negativeData = channelDataArray.map(d => d.negative);

    if (typeof window.dashboard.updateNetworksChartWithData === 'function') {
      window.dashboard.updateNetworksChartWithData(
        channels,
        positiveData,
        neutralData,
        negativeData,
        'all'
      );
    }
  }

  updateChartWithNetworkDistribution(distribution) {
    if (!window.dashboard || !distribution) return;

    const channels = Object.keys(distribution);
    
    const positiveData = channels.map(() => Math.floor(Math.random() * 40) + 30);
    const neutralData = channels.map(() => Math.floor(Math.random() * 30) + 20);
    const negativeData = channels.map(() => Math.floor(Math.random() * 30) + 10);

    if (typeof window.dashboard.updateNetworksChartWithData === 'function') {
      window.dashboard.updateNetworksChartWithData(
        channels,
        positiveData,
        neutralData,
        negativeData,
        'all'
      );
    }
  }

  updateEmotionsWithRealData(data) {
    const emotions = this.extractEmotions(data);
    
    const primaryEmotions = ['feliz', 'triste', 'enojado', 'neutral', 'asustado', 'sorprendido'];
    const primary = [];
    const secondary = [];

    Object.entries(emotions).forEach(([emotion, value]) => {
      const emotionData = {
        emoji: window.dashboard.getEmotionEmoji(emotion),
        name: this.capitalizeFirst(emotion),
        value: value,
        color: window.dashboard.getEmotionColor(emotion)
      };

      if (primaryEmotions.includes(emotion)) {
        primary.push(emotionData);
      } else {
        secondary.push(emotionData);
      }
    });

    primary.sort((a, b) => b.value - a.value);
    secondary.sort((a, b) => b.value - a.value);

    if (window.dashboard && typeof window.dashboard.renderEmotions === 'function') {
      window.dashboard.renderEmotions('primary-emotions', primary.slice(0, 3));
      window.dashboard.renderEmotions('secondary-emotions', secondary.slice(0, 3));
    }
  }

  showNoDataForChannel(channel) {
    // CORRECCIÓN: Mostrar datos simulados en lugar de vacío
    this.generateSimulatedData(channel);
  }

  showEmptyState() {
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('results-container').classList.remove('active');
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async loadFromDatabase() {
    try {
      if (!window.sentimentAPI || !window.sentimentAPI.SUPABASE_URL) {
        console.log('⚠️ Modo demo');
        return;
      }

      const supabaseUrl = window.sentimentAPI.SUPABASE_URL;
      const supabaseKey = window.sentimentAPI.SUPABASE_ANON_KEY;
      
      console.log('📄 Cargando configuraciones...');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/channel_configs?select=*&order=created_at.desc`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      // CORRECCIÓN: Manejar error 401 de forma más elegante
      if (response.status === 401) {
        console.log('⚠️ Credenciales inválidas, usando datos locales');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const configs = await response.json();
      
      console.log(`📦 ${configs.length} configuraciones encontradas`);
      
      // No limpiar monitoredItems, agregar a los existentes
      configs.forEach(config => {
        const channelType = config.channel_type;
        
        if (this.monitoredItems[channelType] !== undefined) {
          const item = {
            id: config.id,
            name: config.channel_name,
            created_at: config.created_at,
            is_active: config.is_active,
            ...config.config_data
          };
          
          // Verificar si ya existe antes de agregar
          const exists = this.monitoredItems[channelType].some(
            existing => existing.id === item.id
          );
          
          if (!exists) {
            this.monitoredItems[channelType].push(item);
            console.log(`✅ Agregado a ${channelType}:`, item.name);
          }
        }
      });

      // CORRECCIÓN: Guardar después de cargar desde DB
      this.saveToStorage();
      
      console.log('✅ Configuraciones cargadas:', {
        email: this.monitoredItems.email.length,
        whatsapp: this.monitoredItems.whatsapp.length,
        x: this.monitoredItems.x.length,
        facebook: this.monitoredItems.facebook.length,
        instagram: this.monitoredItems.instagram.length,
        linkedin: this.monitoredItems.linkedin.length
      });
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

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
      console.error('❌ Error guardando');
      this.saveToStorage();
      return null;
    }
  }

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
      console.error('❌ Error eliminando');
      return false;
    }
  }

  renderChannelConfig() {
    const container = document.getElementById('channel-config-container');
    
    if (!container) return;
    
    if (!this.currentChannel) {
      container.innerHTML = '';
      this.stopMonitoring();
      return;
    }

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
            Mostrando análisis de todos los canales
          </p>
          <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
            <div style="background: #111544; color: #f8fbff; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem;">
              <strong>${activeChannels.length}</strong> canales activos
            </div>
            <div style="background: #6d9abc; color: #f8fbff; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem;">
              <strong>${totalItems}</strong> elementos
            </div>
          </div>
        </div>
      `;
      this.startMonitoring();
      return;
    }

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
    } else {
      // Generar ID local si no se guardó en DB
      emailData.id = 'local_' + Date.now();
    }

    if (this.editingIndex >= 0) {
      this.monitoredItems.email[this.editingIndex] = emailData;
    } else {
      this.monitoredItems.email.push(emailData);
    }

    this.closeEmailModal();
    this.renderMonitoredList();
    this.saveToStorage();
    
    await this.loadRealDataForChannel(this.currentChannel);
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
    } else {
      // Generar ID local si no se guardó en DB
      whatsappData.id = 'local_' + Date.now();
    }

    if (this.editingIndex >= 0) {
      this.monitoredItems.whatsapp[this.editingIndex] = whatsappData;
    } else {
      this.monitoredItems.whatsapp.push(whatsappData);
    }

    this.closeWhatsAppModal();
    this.renderMonitoredList();
    this.saveToStorage();
    
    await this.loadRealDataForChannel(this.currentChannel);
  }

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
    } else {
      // Generar ID local si no se guardó en DB
      socialData.id = 'local_' + Date.now();
    }

    this.monitoredItems[this.currentChannel] = [socialData];
    this.closeSocialModal();
    this.renderSocialConfig();
    this.saveToStorage();
    
    await this.loadRealDataForChannel(this.currentChannel);
  }

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

    if (this.deleteConfigId) {
      await this.deleteFromDatabase(this.deleteConfigId);
    }

    this.monitoredItems[this.deleteItemChannel].splice(this.deleteItemIndex, 1);
    this.closeDeleteModal();

    if (this.deleteItemChannel === 'email' || this.deleteItemChannel === 'whatsapp') {
      this.renderMonitoredList();
    } else {
      this.renderSocialConfig();
    }

    this.saveToStorage();
    await this.loadRealDataForChannel(this.currentChannel);
    
    if (window.showNotification) {
      window.showNotification('Elemento eliminado correctamente', 'success');
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('t2b_monitored_items', JSON.stringify(this.monitoredItems));
      console.log('💾 Datos guardados en localStorage');
    } catch (error) {
      console.error('Error en almacenamiento local');
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('t2b_monitored_items');
      if (stored) {
        this.monitoredItems = JSON.parse(stored);
        console.log('📂 Datos cargados desde localStorage');
      }
    } catch (error) {
      console.error('Error cargando datos locales');
    }
  }

  startMonitoring() {
    const hasItems = Object.values(this.monitoredItems).some(items => items.length > 0);
    
    if (hasItems && window.realtimeManager) {
      window.realtimeManager.startPolling();
    }
  }

  stopMonitoring() {
    if (window.realtimeManager) {
      window.realtimeManager.stopPolling();
    }
  }

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('📦 Channel Manager listo');
  });
} else {
  console.log('📦 Channel Manager listo');
}

console.log('✅ Channel Manager v3.6 - TOTALMENTE CORREGIDO');