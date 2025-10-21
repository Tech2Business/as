// ============================================
// T2B Tech2Business - Dashboard v5.1 CORREGIDO
// ✅ FIX: Mostrar TODAS las barras siempre (activas e inactivas)
// ✅ Transiciones suaves tipo Power BI (1200ms)
// ============================================

class Dashboard {
  constructor() {
    this.chart = null;
    this.channelData = {};
    this.selectedChannel = null;
    
    // COLORES FINALES
    this.COLORS = {
      positive: '#10b981',
      neutral: '#9ca3af',
      negative: '#ef4444',
      transparent: 'rgba(255, 255, 255, 0.05)',
      borderInactive: '#60a5fa',
      gridColor: 'rgba(208, 211, 214, 0.1)'
    };
  }

  async init() {
    try {
      await this.initializeChart();
      await this.loadStatistics();
      console.log('✅ Dashboard T2B v5.1 inicializado');
    } catch (error) {
      console.error('Error inicializando dashboard:', error);
    }
  }

  initializeChart() {
    const ctx = document.getElementById('networks-chart');
    if (!ctx) {
      console.error('❌ Canvas networks-chart no encontrado');
      return;
    }

    ctx.style.maxHeight = '250px';

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Positivo',
            data: [],
            backgroundColor: [],
            borderColor: [],
            borderWidth: 2,
            borderRadius: 8,
            stack: 'Stack 0'
          },
          {
            label: 'Neutral',
            data: [],
            backgroundColor: [],
            borderColor: [],
            borderWidth: 2,
            borderRadius: 8,
            stack: 'Stack 0'
          },
          {
            label: 'Negativo',
            data: [],
            backgroundColor: [],
            borderColor: [],
            borderWidth: 2,
            borderRadius: 8,
            stack: 'Stack 0'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1200,
          easing: 'easeInOutQuart',
          delay: (context) => {
            let delay = 0;
            if (context.type === 'data' && context.mode === 'default') {
              delay = context.dataIndex * 120;
            }
            return delay;
          }
        },
        transitions: {
          active: {
            animation: {
              duration: 1200,
              easing: 'easeInOutQuart'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#f8fbff',
              font: { size: 12, family: 'Gotham, Inter' }
            }
          },
          tooltip: {
            backgroundColor: '#f8fbff',
            titleColor: '#111544',
            bodyColor: '#6d9abc',
            borderColor: '#d0d3d6',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += context.parsed.y + '%';
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { 
              color: this.COLORS.gridColor,
              drawBorder: false,
              lineWidth: 0.5
            },
            ticks: { 
              color: '#f8fbff',
              font: { size: 10, family: 'Gotham, Inter' }
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            max: 100,
            grid: { 
              color: this.COLORS.gridColor,
              drawBorder: false,
              lineWidth: 0.5
            },
            ticks: { 
              color: '#f8fbff',
              font: { size: 10, family: 'Gotham, Inter' },
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });

    console.log('✅ Chart.js inicializado');
  }

  async loadStatistics() {
    try {
      const response = await window.sentimentAPI.getHistory({
        limit: 100,
        include_stats: true
      });

      if (response.success && response.statistics) {
        this.updateNetworksChart(response.statistics.network_distribution);
      }
    } catch (error) {
      console.log('ℹ️ Usando datos simulados');
    }
  }

  updateNetworksChart(networkDistribution) {
    if (!this.chart) return;

    const networks = Object.keys(networkDistribution);
    const values = Object.values(networkDistribution);

    this.chart.data.labels = networks.map(n => this.getNetworkName(n));
    this.chart.data.datasets[0].data = values;
    
    this.chart.update({
      duration: 1200,
      easing: 'easeInOutQuart'
    });
  }

  // ✅ MÉTODO PRINCIPAL CORREGIDO
  updateNetworksChartWithData(channels, positiveData, neutralData, negativeData, selectedChannel = null) {
    if (!this.chart) {
      console.warn('⚠️ Chart no inicializado');
      return;
    }

    console.log('📊 ACTUALIZANDO GRÁFICO:', {
      channels,
      selectedChannel,
      totalChannels: channels.length
    });

    this.selectedChannel = selectedChannel;

    // ✅ TODOS LOS CANALES POSIBLES (no solo activos)
    const ALL_CHANNELS = ['email', 'whatsapp', 'x', 'facebook', 'instagram', 'linkedin'];
    
    // ✅ Asegurar que SIEMPRE se muestren todos los canales
    const displayChannels = ALL_CHANNELS;
    const labels = displayChannels.map(ch => this.getNetworkName(ch));
    
    // ✅ Mapear datos: si el canal está activo usar sus datos, sino 0
    const mapData = (dataArray) => {
      return displayChannels.map(ch => {
        const index = channels.indexOf(ch);
        return index !== -1 ? dataArray[index] : 0;
      });
    };

    const mappedPositive = mapData(positiveData);
    const mappedNeutral = mapData(neutralData);
    const mappedNegative = mapData(negativeData);

    this.chart.data.labels = labels;

    const isAllMode = (selectedChannel === 'all' || selectedChannel === null);

    // DATASET POSITIVO
    this.chart.data.datasets[0].data = mappedPositive;
    this.chart.data.datasets[0].backgroundColor = displayChannels.map(ch => {
      const hasData = channels.includes(ch);
      if (!hasData) return this.COLORS.transparent;
      return isAllMode ? this.COLORS.positive : (ch === selectedChannel ? this.COLORS.positive : this.COLORS.transparent);
    });
    this.chart.data.datasets[0].borderColor = displayChannels.map(ch => {
      const hasData = channels.includes(ch);
      if (!hasData) return this.COLORS.borderInactive;
      return isAllMode ? this.COLORS.positive : (ch === selectedChannel ? this.COLORS.positive : this.COLORS.borderInactive);
    });

    // DATASET NEUTRAL
    this.chart.data.datasets[1].data = mappedNeutral;
    this.chart.data.datasets[1].backgroundColor = displayChannels.map(ch => {
      const hasData = channels.includes(ch);
      if (!hasData) return this.COLORS.transparent;
      return isAllMode ? this.COLORS.neutral : (ch === selectedChannel ? this.COLORS.neutral : this.COLORS.transparent);
    });
    this.chart.data.datasets[1].borderColor = displayChannels.map(ch => {
      const hasData = channels.includes(ch);
      if (!hasData) return this.COLORS.borderInactive;
      return isAllMode ? this.COLORS.neutral : (ch === selectedChannel ? this.COLORS.neutral : this.COLORS.borderInactive);
    });

    // DATASET NEGATIVO
    this.chart.data.datasets[2].data = mappedNegative;
    this.chart.data.datasets[2].backgroundColor = displayChannels.map(ch => {
      const hasData = channels.includes(ch);
      if (!hasData) return this.COLORS.transparent;
      return isAllMode ? this.COLORS.negative : (ch === selectedChannel ? this.COLORS.negative : this.COLORS.transparent);
    });
    this.chart.data.datasets[2].borderColor = displayChannels.map(ch => {
      const hasData = channels.includes(ch);
      if (!hasData) return this.COLORS.borderInactive;
      return isAllMode ? this.COLORS.negative : (ch === selectedChannel ? this.COLORS.negative : this.COLORS.borderInactive);
    });

    this.chart.update({
      duration: 1200,
      easing: 'easeInOutQuart'
    });

    console.log('✅ Gráfico actualizado - Mostrando', displayChannels.length, 'barras');
  }

  setSelectedChannel(channel) {
    console.log('🎯 Seleccionando canal:', channel);
    
    this.selectedChannel = channel;
    
    if (!window.channelManager) {
      console.warn('⚠️ Channel Manager no disponible');
      return;
    }
    
    const activeChannels = window.channelManager.getActiveChannels();
    
    if (activeChannels.length === 0) {
      console.log('⚠️ No hay canales activos');
      return;
    }
    
    const channelDataArray = activeChannels.map(ch => {
      const cached = window.channelManager.realDataCache[ch];
      
      if (cached && cached.sentimentData) {
        return {
          channel: ch,
          positive: cached.sentimentData.positive || 0,
          neutral: cached.sentimentData.neutral || 0,
          negative: cached.sentimentData.negative || 0
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

    this.updateNetworksChartWithData(
      channels,
      positiveData,
      neutralData,
      negativeData,
      channel
    );
  }

  updateKPIs(sentimentData) {
    this.animateNumber(document.getElementById('kpi-positive'), sentimentData.positive || 0);
    this.animateNumber(document.getElementById('kpi-neutral'), sentimentData.neutral || 0);
    this.animateNumber(document.getElementById('kpi-negative'), sentimentData.negative || 0);
    this.animateNumber(document.getElementById('kpi-score'), sentimentData.score || 0);
    
    const neutralKPI = document.getElementById('kpi-neutral');
    if (neutralKPI) {
      neutralKPI.style.color = '#9ca3af';
    }
  }

  renderEmotions(containerId, emotions) {
    const container = document.getElementById(containerId);
    if (!container || !emotions || emotions.length === 0) return;

    container.innerHTML = '';

    emotions.forEach((emotion, index) => {
      setTimeout(() => {
        const emotionItem = document.createElement('div');
        emotionItem.className = 'emotion-item';
        emotionItem.style.opacity = '0';
        emotionItem.style.transform = 'translateY(10px)';
        emotionItem.style.transition = 'all 800ms cubic-bezier(0.165, 0.84, 0.44, 1)';

        emotionItem.innerHTML = `
          <div class="emotion-emoji">${emotion.emoji}</div>
          <div class="emotion-info">
            <div class="emotion-name">
              <span>${emotion.name}</span>
              <span class="emotion-value">${emotion.value}%</span>
            </div>
            <div class="emotion-bar">
              <div class="emotion-bar-fill" 
                   style="width: 0%; background: ${emotion.color}; transition: width 1200ms cubic-bezier(0.165, 0.84, 0.44, 1);" 
                   data-width="${emotion.value}">
              </div>
            </div>
          </div>
        `;

        container.appendChild(emotionItem);

        setTimeout(() => {
          emotionItem.style.opacity = '1';
          emotionItem.style.transform = 'translateY(0)';
        }, 50);

        setTimeout(() => {
          const bar = emotionItem.querySelector('.emotion-bar-fill');
          if (bar) {
            bar.style.width = emotion.value + '%';
          }
        }, 100);

      }, index * 150);
    });
  }

  animateNumber(element, endValue) {
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress);
      element.textContent = currentValue;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  getNetworkName(network) {
    const names = {
      email: '📧 Email',
      whatsapp: '💬 WhatsApp',
      x: '𝕏 X',
      twitter: '𝕏 Twitter',
      facebook: '👥 Facebook',
      instagram: '📸 Instagram',
      linkedin: '💼 LinkedIn'
    };
    return names[network] || network;
  }

  getEmotionEmoji(emotion) {
    const emojis = {
      feliz: '😊', triste: '😢', enojado: '😠', neutral: '😐',
      asustado: '😨', sorprendido: '😲', disgustado: '🤢', ansioso: '😰',
      optimista: '😄', pesimista: '😔', confiado: '😌', confundido: '😕',
      impaciente: '😤', agradecido: '🙏', orgulloso: '😎', frustrado: '😣',
      satisfecho: '😌', decepcionado: '😞', esperanzado: '🤞', cinico: '🙄',
      sarcastico: '😏', arrogante: '😤', humilde: '🙇', despreciativo: '😒'
    };
    return emojis[emotion] || '❓';
  }

  getEmotionColor(emotion) {
    const colors = {
      feliz: '#fbbf24', triste: '#3b82f6', enojado: '#ef4444', neutral: this.COLORS.neutral,
      asustado: '#a78bfa', sorprendido: '#ec4899', disgustado: '#84cc16', ansioso: '#f59e0b',
      optimista: '#10b981', pesimista: '#64748b', confiado: '#06b6d4', confundido: '#f59e0b',
      impaciente: '#f97316', agradecido: '#ec4899', orgulloso: '#8b5cf6', frustrado: '#ef4444',
      satisfecho: '#10b981', decepcionado: '#64748b', esperanzado: '#22c55e', cinico: '#6b7280',
      sarcastico: '#a855f7', arrogante: '#f59e0b', humilde: '#06b6d4', despreciativo: '#dc2626'
    };
    return colors[emotion] || '#6b7280';
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

function displayAnalysisResults(data) {
  const emptyState = document.getElementById('empty-state');
  const resultsContainer = document.getElementById('results-container');
  
  if (emptyState) emptyState.style.display = 'none';
  if (resultsContainer) resultsContainer.classList.add('active');
  
  updatePolarityKPIs(data.sentiment_score);
  displayEmotions('primary-emotions', data.primary_emotions);
  displayEmotions('secondary-emotions', data.secondary_emotions);
}

function updatePolarityKPIs(score) {
  let positive = 0, neutral = 0, negative = 0;
  
  if (score >= 60) {
    positive = score;
    neutral = 100 - score;
  } else if (score >= 40) {
    neutral = score;
    positive = Math.floor(score / 2);
    negative = 100 - positive - neutral;
  } else {
    negative = 100 - score;
    neutral = score / 2;
    positive = 100 - negative - neutral;
  }
  
  if (window.dashboard) {
    window.dashboard.animateNumber(document.getElementById('kpi-positive'), Math.round(positive));
    window.dashboard.animateNumber(document.getElementById('kpi-neutral'), Math.round(neutral));
    window.dashboard.animateNumber(document.getElementById('kpi-negative'), Math.round(negative));
    window.dashboard.animateNumber(document.getElementById('kpi-score'), Math.round(score));
    
    const neutralKPI = document.getElementById('kpi-neutral');
    if (neutralKPI) {
      neutralKPI.style.color = '#9ca3af';
    }
  }
}

function displayEmotions(containerId, emotions) {
  const container = document.getElementById(containerId);
  if (!container || !emotions) return;
  
  const sortedEmotions = Object.entries(emotions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion, value]) => ({
      emoji: window.dashboard.getEmotionEmoji(emotion),
      name: window.dashboard.capitalizeFirst(emotion),
      value: Math.round(value),
      color: window.dashboard.getEmotionColor(emotion)
    }));
  
  window.dashboard.renderEmotions(containerId, sortedEmotions);
}

function clearAnalysisResults() {
  const emptyState = document.getElementById('empty-state');
  const resultsContainer = document.getElementById('results-container');
  
  if (emptyState) emptyState.style.display = 'flex';
  if (resultsContainer) resultsContainer.classList.remove('active');
  
  ['kpi-positive', 'kpi-neutral', 'kpi-negative', 'kpi-score'].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.textContent = '0';
  });
  
  ['primary-emotions', 'secondary-emotions'].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.innerHTML = '';
  });
}

window.dashboard = new Dashboard();
window.displayAnalysisResults = displayAnalysisResults;
window.clearAnalysisResults = clearAnalysisResults;

console.log('✅ Dashboard v5.1 - TODAS LAS BARRAS VISIBLES');