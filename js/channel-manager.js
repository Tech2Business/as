// ============================================
// T2B Tech2Business - Channel Manager v5.2
// ✅ NO genera datos simulados
// ✅ Solo muestra datos REALES de la base de datos
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
    
    this.flowDirection = {
      email: 'both',
      whatsapp: 'both'
    };
    
    this.editingIndex = -1;
    this.editingConfigId = null;
    this.deleteItemIndex = -1;
    this.deleteItemChannel = '';
    this.deleteConfigId = null;
    this.initialized = false;
    this.realDataCache = {};
    this.dbConnected = false;
  }

  async init() {
    console.log('✅ Channel Manager T2B v5.2 iniciando...');
    
    const dbLoaded = await this.loadFromDatabase();
    
    if (!dbLoaded) {
      console.log('⚠️ Base de datos no disponible, usando cache local');
      this.loadFromStorage();
    } else {
      console.log('✅ Datos cargados desde base de datos');
      this.dbConnected = true;
    }
    
    const channelSelect = document.getElementById('channel-select');
    if (channelSelect) {
      channelSelect.addEventListener('change', async (e) => {
        this.currentChannel = e.target.value;
        await this.renderChannelConfig();
        
        if (window.dashboard && typeof window.dashboard.setSelectedChannel === 'function') {
          window.dashboard.setSelectedChannel(this.currentChannel);
        }
      });
    }
    
    this.initialized = true;
    console.log('✅ Channel Manager v5.2 iniciado');
  }

  async triggerDataUpdate() {
    if (!this.currentChannel) return;
    console.log('🔄 Actualizando datos del canal:', this.currentChannel);
    await this.loadRealDataForChannel(this.currentChannel);
  }

  async loadRealDataForChannel(channel) {
    if (!channel || channel === '') return;

    try {
      console.log('🔍 Buscando datos REALES para:', channel);

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
            console.log(`✅ ${response.data.length} registros REALES para ${channel}`);
            this.processRealData(channel, response);
          } else {
            console.warn(`⚠️ NO hay datos en la base de datos para ${channel}`);
            this.showEmptyState();
          }
        } catch (apiError) {
          console.warn(`⚠️ Error API para ${channel}:`, apiError.message);
          this.showEmptyState();
        }
      }

    } catch (error) {
      console.error('❌ Error:', error);
      this.showEmptyState();
    }
  }

  async loadAllChannelsData() {
    try {
      console.log('🔍 Buscando datos REALES de todos los canales...');
      
      const response = await window.sentimentAPI.getHistory({
        limit: 500,
        include_stats: true
      });

      if (response.success && response.data && response.data.length > 0) {
        console.log(`✅ ${response.data.length} registros REALES encontrados`);
        this.processAllChannelsData(response);
      } else {
        console.warn('⚠️ NO hay datos en la base de datos');
        this.showEmptyState();
      }
    } catch (error) {
      console.error('❌ Error:', error);
      this.showEmptyState();
    }
  }

  processRealData(channel, response) {
    try {
      const data = response.data || [];

      if (data.length === 0) {
        console.warn(`⚠️ Array de datos vacío para ${channel}`);
        this.showEmptyState();
        return;
      }

      let positiveCount = 0, neutralCount = 0, negativeCount = 0;
      const primaryEmotionsMap = {};
      const secondaryEmotionsMap = {};

      // Procesar cada registro
      data.forEach(item => {
        const score = item.sentiment_score || 50;
        
        // Clasificar sentimiento
        if (score >= 60) {
          positiveCount++;
        } else if (score >= 40) {
          neutralCount++;
        } else {
          negativeCount++;
        }

        // Extraer emociones primarias
        if (item.primary_emotions && typeof item.primary_emotions === 'object') {
          Object.entries(item.primary_emotions).forEach(([emotion, value]) => {
            if (!primaryEmotionsMap[emotion]) {
              primaryEmotionsMap[emotion] = 0;
            }
            primaryEmotionsMap[emotion] += value;
          });
        }

        // Extraer emociones secundarias
        if (item.secondary_emotions && typeof item.secondary_emotions === 'object') {
          Object.entries(item.secondary_emotions).forEach(([emotion, value]) => {
            if (!secondaryEmotionsMap[emotion]) {
              secondaryEmotionsMap[emotion] = 0;
            }
            secondaryEmotionsMap[emotion] += value;
          });
        }
      });

      const total = data.length;
      
      // Calcular porcentajes de sentimientos
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

      // Calcular promedio de emociones
      const primaryEmotions = {};
      Object.keys(primaryEmotionsMap).forEach(emotion => {
        primaryEmotions[emotion] = Math.round((primaryEmotionsMap[emotion] / total) * 100);
      });

      const secondaryEmotions = {};
      Object.keys(secondaryEmotionsMap).forEach(emotion => {
        secondaryEmotions[emotion] = Math.round((secondaryEmotionsMap[emotion] / total) * 100);
      });

      const allEmotions = { ...primaryEmotions, ...secondaryEmotions };

      console.log(`📊 Datos procesados para ${channel}:`, {
        sentimentData,
        emociones: Object.keys(allEmotions).length
      });

      // Guardar en cache
      this.realDataCache[channel] = {
        sentimentData,
        emotions: allEmotions,
        rawData: data,
        timestamp: Date.now()
      };

      // Mostrar en UI
      document.getElementById('empty-state').style.display = 'none';
      document.getElementById('results-container').classList.add('active');

      if (window.dashboard && typeof window.dashboard.updateKPIs === 'function') {
        window.dashboard.updateKPIs(sentimentData);
      }

      this.updateChartWithRealData(channel);
      this.updateEmotionsWithRealData(allEmotions);

    } catch (error) {
      console.error('❌ Error procesando datos REALES:', error);
      this.showEmptyState();
    }
  }

  processAllChannelsData(response) {
    try {
      const data = response.data || [];
      const stats = response.statistics || {};

      if (data.length === 0) {
        console.warn('⚠️ No hay datos para procesar');
        this.showEmptyState();
        return;
      }

      // Agrupar por canal
      const channelGroups = {};
      
      data.forEach(item => {
        const network = item.social_network || 'unknown';
        if (!channelGroups[network]) {
          channelGroups[network] = [];
        }
        channelGroups[network].push(item);
      });

      console.log('📊 Datos agrupados por canal:', Object.keys(channelGroups));

      // Procesar cada canal
      Object.entries(channelGroups).forEach(([network, items]) => {
        const channelName = this.mapNetworkToChannel(network);
        if (channelName && items.length > 0) {
          this.processRealData(channelName, { 
            success: true, 
            data: items 
          });
        }
      });

      // Calcular sentimiento agregado
      let totalPositive = 0, totalNeutral = 0, totalNegative = 0, totalCount = 0;
      
      Object.values(this.realDataCache).forEach(cached => {
        if (cached && cached.sentimentData) {
          totalPositive += cached.sentimentData.positiveCount || 0;
          totalNeutral += cached.sentimentData.neutralCount || 0;
          totalNegative += cached.sentimentData.negativeCount || 0;
          totalCount += cached.sentimentData.total || 0;
        }
      });

      if (totalCount === 0) {
        this.showEmptyState();
        return;
      }

      const aggregatedSentiment = {
        positive: Math.round((totalPositive / totalCount) * 100),
        neutral: Math.round((totalNeutral / totalCount) * 100),
        negative: Math.round((totalNegative / totalCount) * 100),
        score: Math.round(((totalPositive - totalNegative) / totalCount) * 100)
      };

      // Agregar emociones
      const primaryEmotionsList = ['feliz', 'triste', 'enojado', 'neutral', 'asustado', 'sorprendido'];
      const aggregatedEmotions = {
        primary: {},
        secondary: {}
      };

      let channelCount = 0;
      Object.values(this.realDataCache).forEach(cached => {
        if (cached && cached.emotions) {
          channelCount++;
          Object.entries(cached.emotions).forEach(([emotion, value]) => {
            if (primaryEmotionsList.includes(emotion)) {
              if (!aggregatedEmotions.primary[emotion]) {
                aggregatedEmotions.primary[emotion] = 0;
              }
              aggregatedEmotions.primary[emotion] += value;
            } else {
              if (!aggregatedEmotions.secondary[emotion]) {
                aggregatedEmotions.secondary[emotion] = 0;
              }
              aggregatedEmotions.secondary[emotion] += value;
            }
          });
        }
      });

      // Calcular promedio
      if (channelCount > 0) {
        Object.keys(aggregatedEmotions.primary).forEach(emotion => {
          aggregatedEmotions.primary[emotion] = Math.round(aggregatedEmotions.primary[emotion] / channelCount);
        });
        Object.keys(aggregatedEmotions.secondary).forEach(emotion => {
          aggregatedEmotions.secondary[emotion] = Math.round(aggregatedEmotions.secondary[emotion] / channelCount);
        });
      }

      // Mostrar en UI
      document.getElementById('empty-state').style.display = 'none';
      document.getElementById('results-container').classList.add('active');

      if (window.dashboard && typeof window.dashboard.updateKPIs === 'function') {
        window.dashboard.updateKPIs(aggregatedSentiment);
      }

      this.updateChartWithAllChannels(Object.keys(channelGroups).map(n => this.mapNetworkToChannel(n)).filter(Boolean));
      this.updateAggregatedEmotions(aggregatedEmotions);

    } catch (error) {
      console.error('❌ Error procesando todos los canales:', error);
      this.showEmptyState();
    }
  }

  mapNetworkToChannel(network) {
    const map = {
      'email': 'email',
      'whatsapp': 'whatsapp',
      'twitter': 'x',
      'x': 'x',
      'facebook': 'facebook',
      'instagram': 'instagram',
      'linkedin': 'linkedin'
    };
    return map[network] || null;
  }

  updateEmotionsWithRealData(emotions) {
    if (!emotions || Object.keys(emotions).length === 0) {
      console.warn('⚠️ No hay emociones para mostrar');
      return;
    }

    const primaryEmotionsList = ['feliz', 'triste', 'enojado', 'neutral', 'asustado', 'sorprendido'];
    const primary = [];
    const secondary = [];

    Object.entries(emotions).forEach(([emotion, value]) => {
      const emotionData = {
        emoji: window.dashboard.getEmotionEmoji(emotion),
        name: this.capitalizeFirst(emotion),
        value: value,
        color: window.dashboard.getEmotionColor(emotion)
      };

      if (primaryEmotionsList.includes(emotion)) {
        primary.push(emotionData);
      } else {
        secondary.push(emotionData);
      }
    });

    primary.sort((a, b) => b.value - a.value);
    secondary.sort((a, b) => b.value - a.value);

    console.log('📊 Emociones a renderizar:', {
      primarias: primary.slice(0, 3).length,
      secundarias: secondary.slice(0, 3).length
    });

    if (window.dashboard && typeof window.dashboard.renderEmotions === 'function') {
      if (primary.length > 0) {
        window.dashboard.renderEmotions('primary-emotions', primary.slice(0, 3));
      }
      if (secondary.length > 0) {
        window.dashboard.renderEmotions('secondary-emotions', secondary.slice(0, 3));
      }
    }
  }

  updateAggregatedEmotions(aggregatedEmotions) {
    const primary = [];
    const secondary = [];

    Object.entries(aggregatedEmotions.primary || {}).forEach(([emotion, value]) => {
      primary.push({
        emoji: window.dashboard.getEmotionEmoji(emotion),
        name: this.capitalizeFirst(emotion),
        value: value,
        color: window.dashboard.getEmotionColor(emotion)
      });
    });

    Object.entries(aggregatedEmotions.secondary || {}).forEach(([emotion, value]) => {
      secondary.push({
        emoji: window.dashboard.getEmotionEmoji(emotion),
        name: this.capitalizeFirst(emotion),
        value: value,
        color: window.dashboard.getEmotionColor(emotion)
      });
    });

    primary.sort((a, b) => b.value - a.value);
    secondary.sort((a, b) => b.value - a.value);

    console.log('📊 Emociones agregadas:', {
      primarias: primary.slice(0, 3),
      secundarias: secondary.slice(0, 3)
    });

    if (window.dashboard && typeof window.dashboard.renderEmotions === 'function') {
      if (primary.length > 0) {
        window.dashboard.renderEmotions('primary-emotions', primary.slice(0, 3));
      }
      if (secondary.length > 0) {
        window.dashboard.renderEmotions('secondary-emotions', secondary.slice(0, 3));
      }
    }
  }

  updateChartWithRealData(channel) {
    if (!window.dashboard) return;

    const channelsWithData = Object.keys(this.realDataCache);
    
    if (channelsWithData.length === 0) {
      console.warn('⚠️ No hay datos en cache para mostrar en gráfico');
      return;
    }

    const channelDataArray = channelsWithData.map(ch => {
      const cached = this.realDataCache[ch];
      return {
        channel: ch,
        positive: cached.sentimentData.positive || 0,
        neutral: cached.sentimentData.neutral || 0,
        negative: cached.sentimentData.negative || 0
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
        channel
      );
    }
  }

  updateChartWithAllChannels(activeChannels) {
    if (!window.dashboard || !activeChannels || activeChannels.length === 0) return;

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
      
      return null;
    }).filter(Boolean);

    if (channelDataArray.length === 0) {
      console.warn('⚠️ No hay datos para mostrar en gráfico');
      return;
    }

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

  showEmptyState() {
    console.log('📭 Mostrando estado vacío (sin datos)');
    
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('results-container').classList.remove('active');
    
    // Limpiar KPIs
    ['kpi-positive', 'kpi-neutral', 'kpi-negative', 'kpi-score'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
    
    // Limpiar emociones
    ['primary-emotions', 'secondary-emotions'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
    
    // Limpiar gráfico
    if (window.dashboard && window.dashboard.chart) {
      window.dashboard.chart.data.labels = [];
      window.dashboard.chart.data.datasets.forEach(dataset => {
        dataset.data = [];
        dataset.backgroundColor = [];
        dataset.borderColor = [];
      });
      window.dashboard.chart.update();
    }
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async loadFromDatabase() {
    try {
      if (!window.sentimentAPI || !window.sentimentAPI.SUPABASE_URL) {
        return false;
      }

      const supabaseUrl = window.sentimentAPI.SUPABASE_URL;
      const supabaseKey = window.sentimentAPI.SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/channel_configs?select=*&order=created_at.desc`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        return false;
      }

      if (!response.ok) {
        return false;
      }

      const configs = await response.json();
      
      this.monitoredItems = {
        email: [],
        whatsapp: [],
        x: [],
        facebook: [],
        instagram: [],
        linkedin: []
      };

      configs.forEach(config => {
        const channelType = config.channel_type;
        
        if (this.monitoredItems[channelType] !== undefined) {
          const item = {
            id: config.id,
            name: config.channel_name,
            created_at: config.created_at,
            is_active: config.is_active,
            flow_direction: config.flow_direction,
            ...config.config_data
          };
          
          this.monitoredItems[channelType].push(item);
        }
      });

      this.saveToStorage();
      return true;
      
    } catch (error) {
      return false;
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
        flow_direction: this.flowDirection[channelType] || 'both',
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
      }

      this.saveToStorage();
      return savedConfig;

    } catch (error) {
      if (window.showNotification) {
        window.showNotification('No se pudo guardar en la base de datos', 'error');
      }
      
      this.saveToStorage();
      return null;
    }
  }

  async deleteFromDatabase(configId) {
    try {
      if (!window.sentimentAPI || !window.sentimentAPI.SUPABASE_URL) {
        return false;
      }

      if (configId && configId.toString().startsWith('local_')) {
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
      
      return true;

    } catch (error) {
      return false;
    }
  }

  async renderChannelConfig() {
    const container = document.getElementById('channel-config-container');
    
    if (!container) return;
    
    if (!this.currentChannel) {
      container.innerHTML = '';
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
            <div style="background: ${this.dbConnected ? '#10b981' : '#f59e0b'}; color: #f8fbff; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem;">
              ${this.dbConnected ? '🔗 DB' : '💾 Local'}
            </div>
          </div>
        </div>
      `;
      
      await this.loadRealDataForChannel('all');
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
          
          <div style="margin-top: 1.5rem; padding: 1rem; background: #f8fbff; border-radius: 10px; border: 1px solid #d0d3d6;">
            <h4 style="font-size: 0.875rem; font-weight: 600; color: #111544; margin-bottom: 0.75rem;">Flujo evaluado:</h4>
            <div style="display: flex; gap: 1rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="radio" name="flow-${this.currentChannel}" value="in" ${this.flowDirection[this.currentChannel] === 'in' ? 'checked' : ''} onchange="window.channelManager.setFlowDirection('${this.currentChannel}', 'in')">
                <span style="font-size: 0.875rem; color: #111544;">Entrada</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="radio" name="flow-${this.currentChannel}" value="out" ${this.flowDirection[this.currentChannel] === 'out' ? 'checked' : ''} onchange="window.channelManager.setFlowDirection('${this.currentChannel}', 'out')">
                <span style="font-size: 0.875rem; color: #111544;">Salida</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="radio" name="flow-${this.currentChannel}" value="both" ${this.flowDirection[this.currentChannel] === 'both' ? 'checked' : ''} onchange="window.channelManager.setFlowDirection('${this.currentChannel}', 'both')">
                <span style="font-size: 0.875rem; color: #111544;">Ambas vías</span>
              </label>
            </div>
          </div>
        </div>
      `;
      
      this.renderMonitoredList();
      await this.loadRealDataForChannel(this.currentChannel);
      
    } else {
      container.innerHTML = `
        <button class="add-btn" onclick="window.channelManager.openSocialModal()">
          <span>⚙️</span>
          <span>Configurar Monitoreo</span>
        </button>
        <div id="social-config-display" style="margin-top: 1rem;"></div>
      `;
      
      this.renderSocialConfig();
      await this.loadRealDataForChannel(this.currentChannel);
    }
  }

  setFlowDirection(channel, direction) {
    this.flowDirection[channel] = direction;
    console.log(`🔄 Flujo de ${channel} cambiado a: ${direction}`);
    this.loadRealDataForChannel(channel);
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
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-details">${this.currentChannel === 'email' ? item.email : item.phone}</div>
          <div class="item-department">${item.department}</div>
        </div>
        <div class="item-actions">
          <button onclick="window.channelManager.editMonitoredItem(${index})" class="btn-icon" title="Editar">
            ✏️
          </button>
          <button onclick="window.channelManager.openDeleteModal(${index})" class="btn-icon" title="Eliminar">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  }

  renderSocialConfig() {
    const container = document.getElementById('social-config-display');
    if (!container) return;

    const config = this.monitoredItems[this.currentChannel][0];
    
    if (!config) {
      container.innerHTML = '<div class="empty-config">No hay configuración establecida</div>';
      return;
    }

    container.innerHTML = `
      <div class="social-config-card">
        <div class="config-row">
          <span class="config-label">Términos de búsqueda:</span>
          <span class="config-value">${config.searchTerms}</span>
        </div>
        ${config.keywords ? `
        <div class="config-row">
          <span class="config-label">Palabras clave:</span>
          <span class="config-value">${config.keywords}</span>
        </div>
        ` : ''}
        <div class="config-row">
          <span class="config-label">Período:</span>
          <span class="config-value">${config.dateFrom} al ${config.dateTo}</span>
        </div>
        ${config.limit ? `
        <div class="config-row">
          <span class="config-label">Límite de resultados:</span>
          <span class="config-value">${config.limit}</span>
        </div>
        ` : ''}
      </div>
    `;
  }

  openAddModal() {
    if (this.currentChannel === 'email') {
      this.openEmailModal();
    } else if (this.currentChannel === 'whatsapp') {
      this.openWhatsAppModal();
    }
  }

  openEmailModal() {
    this.editingIndex = -1;
    this.editingConfigId = null;
    
    document.getElementById('email-modal-title').textContent = 'Agregar Correo Electrónico';
    document.getElementById('email-name').value = '';
    document.getElementById('email-address').value = '';
    document.getElementById('email-department').value = '';
    
    document.getElementById('email-modal').classList.add('active');
  }

  closeEmailModal() {
    document.getElementById('email-modal').classList.remove('active');
    this.editingIndex = -1;
    this.editingConfigId = null;
  }

  editMonitoredItem(index) {
    this.editingIndex = index;
    const item = this.monitoredItems[this.currentChannel][index];
    this.editingConfigId = item ? item.id : null;

    if (this.currentChannel === 'email') {
      document.getElementById('email-modal-title').textContent = 'Editar Correo Electrónico';
      document.getElementById('email-name').value = item.name;
      document.getElementById('email-address').value = item.email;
      document.getElementById('email-department').value = item.department;
      document.getElementById('email-modal').classList.add('active');
    } else if (this.currentChannel === 'whatsapp') {
      document.getElementById('whatsapp-modal-title').textContent = 'Editar WhatsApp';
      document.getElementById('whatsapp-name').value = item.name;
      
      const phoneParts = item.phone.split(' ');
      document.getElementById('whatsapp-code').value = phoneParts[0];
      document.getElementById('whatsapp-number').value = phoneParts.slice(1).join(' ');
      document.getElementById('whatsapp-department').value = item.department;
      document.getElementById('whatsapp-modal').classList.add('active');
    }
  }

  openWhatsAppModal() {
    this.editingIndex = -1;
    this.editingConfigId = null;
    
    document.getElementById('whatsapp-modal-title').textContent = 'Agregar WhatsApp';
    document.getElementById('whatsapp-name').value = '';
    document.getElementById('whatsapp-code').value = '+504';
    document.getElementById('whatsapp-number').value = '';
    document.getElementById('whatsapp-department').value = '';
    
    document.getElementById('whatsapp-modal').classList.add('active');
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

    if (savedConfig && savedConfig.id) {
      emailData.id = savedConfig.id;
    } else {
      emailData.id = 'local_' + Date.now();
    }

    if (this.editingIndex >= 0) {
      this.monitoredItems.email[this.editingIndex] = emailData;
    } else {
      this.monitoredItems.email.push(emailData);
    }

    this.closeEmailModal();
    this.renderMonitoredList();
    
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

    if (savedConfig && savedConfig.id) {
      whatsappData.id = savedConfig.id;
    } else {
      whatsappData.id = 'local_' + Date.now();
    }

    if (this.editingIndex >= 0) {
      this.monitoredItems.whatsapp[this.editingIndex] = whatsappData;
    } else {
      this.monitoredItems.whatsapp.push(whatsappData);
    }

    this.closeWhatsAppModal();
    this.renderMonitoredList();
    
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

    if (savedConfig && savedConfig.id) {
      socialData.id = savedConfig.id;
    } else {
      socialData.id = 'local_' + Date.now();
    }

    this.monitoredItems[this.currentChannel] = [socialData];
    this.closeSocialModal();
    this.renderSocialConfig();
    
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

    if (this.deleteConfigId && !this.deleteConfigId.toString().startsWith('local_')) {
      await this.deleteFromDatabase(this.deleteConfigId);
    }

    this.monitoredItems[this.deleteItemChannel].splice(this.deleteItemIndex, 1);
    
    if (this.deleteItemChannel in this.realDataCache) {
      delete this.realDataCache[this.deleteItemChannel];
    }
    
    this.saveToStorage();
    this.closeDeleteModal();

    if (this.deleteItemChannel === 'email' || this.deleteItemChannel === 'whatsapp') {
      this.renderMonitoredList();
    } else {
      this.renderSocialConfig();
    }
    
    await this.loadRealDataForChannel(this.currentChannel);
    
    if (window.dashboard && typeof window.dashboard.setSelectedChannel === 'function') {
      window.dashboard.setSelectedChannel(this.currentChannel);
    }
    
    if (window.showNotification) {
      window.showNotification('Elemento eliminado correctamente', 'success');
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('t2b_monitored_items', JSON.stringify(this.monitoredItems));
      localStorage.setItem('t2b_flow_direction', JSON.stringify(this.flowDirection));
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
      
      const flowStored = localStorage.getItem('t2b_flow_direction');
      if (flowStored) {
        this.flowDirection = JSON.parse(flowStored);
      }
    } catch (error) {
      console.error('Error cargando datos locales');
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

window.channelManager = new ChannelManager();

console.log('✅ Channel Manager v5.2 - SOLO DATOS REALES (sin simulación)');