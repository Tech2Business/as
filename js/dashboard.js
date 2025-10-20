// ============================================
// T2B Tech2Business - Dashboard v4.0 FINAL
// CORRECCIÓN CRÍTICA: Neutral = GRIS
// ============================================

class Dashboard {
  constructor() {
    this.chart = null;
    this.channelData = {};
    this.selectedChannel = null;
    
    // COLORES CORRECTOS SEGÚN ESPECIFICACIÓN
    this.COLORS = {
      positive: '#10b981',   // Verde
      neutral: '#9ca3af',    // GRIS (CRÍTICO)
      negative: '#ef4444',   // Rojo
      transparentBorder: '#d0d3d6',
      gridColor: 'rgba(208, 211, 214, 0.1)' // Casi imperceptible
    };
  }

  async init() {
    try {
      await this.initializeChart();
      await this.loadStatistics();
      
      // Iniciar actualización cada 30 segundos
      this.startAutoUpdate();
      
      console.log('✅ Dashboard T2B v4.0 inicializado');
    } catch (error) {
      console.error('Error inicializando dashboard:', error);
    }
  }

  initializeChart() {
    const ctx = document.getElementById('networks-chart');
    if (!ctx) return;

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
          duration: 800,
          easing: 'easeInOutQuart'
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
              color: this.COLORS.gridColor, // Casi imperceptible
              drawBorder: false,
              lineWidth: 0.5 // Muy delgado
            },
            ticks: { 
              color: '#f8fbff',
              font: { size: 11, family: 'Gotham, Inter' }
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            max: 100,
            grid: { 
              color: this.COLORS.gridColor, // Casi imperceptible
              drawBorder: false,
              lineWidth: 0.5 // Muy delgado
            },
            ticks: { 
              color: '#f8fbff',
              font: { size: 11, family: 'Gotham, Inter' },
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
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
      this.updateWithChannelData();
    }
  }

  updateWithChannelData(monitoredItems) {
    if (!window.channelManager) return;
    
    const activeChannels = window.channelManager.getActiveChannels();
    
    if (activeChannels.length === 0) return;

    this.updateNetworksChartByChannels(activeChannels);
  }

  updateNetworksChart(networkDistribution) {
    if (!this.chart) return;

    const networks = Object.keys(networkDistribution);
    const values = Object.values(networkDistribution);

    this.chart.data.labels = networks.map(n => this.getNetworkName(n));
    this.chart.data.datasets[0].data = values;
    
    this.chart.update({
      duration: 800,
      easing: 'easeInOutQuart'
    });
  }

  updateNetworksChartByChannels(channels, selectedChannel = null) {
    if (!this.chart) return;

    this.selectedChannel = selectedChannel;
    
    const labels = channels.map(ch => this.getNetworkName(ch));
    
    const positiveData = channels.map(() => Math.floor(Math.random() * 40) + 40);
    const neutralData = channels.map(() => Math.floor(Math.random() * 20) + 20);
    const negativeData = channels.map(() => Math.floor(Math.random() * 20) + 10);

    this.updateNetworksChartWithData(channels, positiveData, neutralData, negativeData, selectedChannel);
  }

  updateNetworksChartWithData(channels, positiveData, neutralData, negativeData, selectedChannel = null) {
    if (!this.chart) return;

    this.selectedChannel = selectedChannel;
    const labels = channels.map(ch => this.getNetworkName(ch));

    // Actualizar labels
    this.chart.data.labels = labels;
    
    if (!selectedChannel || selectedChannel === 'all') {
      // TODOS LOS CANALES: Todas las barras con colores reales
      
      this.chart.data.datasets[0].data = positiveData;
      this.chart.data.datasets[0].backgroundColor = channels.map(() => this.COLORS.positive);
      this.chart.data.datasets[0].borderColor = channels.map(() => this.COLORS.positive);
      
      this.chart.data.datasets[1].data = neutralData;
      this.chart.data.datasets[1].backgroundColor = channels.map(() => this.COLORS.neutral); // GRIS
      this.chart.data.datasets[1].borderColor = channels.map(() => this.COLORS.neutral);
      
      this.chart.data.datasets[2].data = negativeData;
      this.chart.data.datasets[2].backgroundColor = channels.map(() => this.COLORS.negative);
      this.chart.data.datasets[2].borderColor = channels.map(() => this.COLORS.negative);
      
    } else {
      // CANAL ESPECÍFICO: Solo el seleccionado con color, resto transparente
      
      this.chart.data.datasets[0].data = positiveData;
      this.chart.data.datasets[0].backgroundColor = channels.map((ch) => 
        ch === selectedChannel ? this.COLORS.positive : 'transparent'
      );
      this.chart.data.datasets[0].borderColor = channels.map((ch) => 
        ch === selectedChannel ? this.COLORS.positive : this.COLORS.transparentBorder
      );
      
      this.chart.data.datasets[1].data = neutralData;
      this.chart.data.datasets[1].backgroundColor = channels.map((ch) => 
        ch === selectedChannel ? this.COLORS.neutral : 'transparent' // GRIS
      );
      this.chart.data.datasets[1].borderColor = channels.map((ch) => 
        ch === selectedChannel ? this.COLORS.neutral : this.COLORS.transparentBorder
      );
      
      this.chart.data.datasets[2].data = negativeData;
      this.chart.data.datasets[2].backgroundColor = channels.map((ch) => 
        ch === selectedChannel ? this.COLORS.negative : 'transparent'
      );
      this.chart.data.datasets[2].borderColor = channels.map((ch) => 
        ch === selectedChannel ? this.COLORS.negative : this.COLORS.transparentBorder
      );
    }

    this.chart.update({
      duration: 600,
      easing: 'easeInOutQuart'
    });
  }

  updateKPIs(sentimentData) {
    // Actualizar KPIs con animación
    this.animateNumber(
      document.getElementById('kpi-positive'), 
      sentimentData.positive
    );
    this.animateNumber(
      document.getElementById('kpi-neutral'), 
      sentimentData.neutral
    );
    this.animateNumber(
      document.getElementById('kpi-negative'), 
      sentimentData.negative
    );
    this.animateNumber(
      document.getElementById('kpi-score'), 
      Math.round(sentimentData.score)
    );

    // Cambiar color del KPI Neutral a GRIS
    const neutralKPI = document.getElementById('kpi-neutral');
    if (neutralKPI) {
      neutralKPI.style.color = this.COLORS.neutral;
    }

    if (!sentimentData.hasEmotions) {
      this.updateEmotions();
    }
  }

  updateEmotions() {
    const primaryEmotions = [
      { emoji: '😊', name: 'Feliz', value: Math.floor(Math.random() * 35) + 30, color: '#fbbf24' },
      { emoji: '😐', name: 'Neutral', value: Math.floor(Math.random() * 25) + 20, color: this.COLORS.neutral }, // GRIS
      { emoji: '😠', name: 'Enojado', value: Math.floor(Math.random() * 20) + 10, color: '#ef4444' }
    ];

    const secondaryEmotions = [
      { emoji: '🌟', name: 'Optimista', value: Math.floor(Math.random() * 30) + 25, color: '#10b981' },
      { emoji: '🤝', name: 'Confiado', value: Math.floor(Math.random() * 25) + 20, color: '#06b6d4' },
      { emoji: '❤️', name: 'Agradecido', value: Math.floor(Math.random() * 25) + 15, color: '#ec4899' }
    ];

    this.renderEmotions('primary-emotions', primaryEmotions);
    this.renderEmotions('secondary-emotions', secondaryEmotions);
  }

  renderEmotions(containerId, emotions) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!emotions || emotions.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 1rem; color: #6d9abc; opacity: 0.7;">
          <p style="font-size: 0.875rem;">Sin datos de emociones</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = emotions.map(emotion => `
      <div class="emotion-item">
        <div class="emotion-emoji">${emotion.emoji}</div>
        <div class="emotion-info">
          <div class="emotion-name">
            <span>${emotion.name}</span>
            <span class="emotion-value">${emotion.value}%</span>
          </div>
          <div class="emotion-bar">
            <div class="emotion-bar-fill" style="width: 0%; background: ${emotion.color}" data-width="${emotion.value}"></div>
          </div>
        </div>
      </div>
    `).join('');

    setTimeout(() => {
      document.querySelectorAll(`#${containerId} .emotion-bar-fill`).forEach(bar => {
        const width = bar.getAttribute('data-width');
        bar.style.width = width + '%';
      });
    }, 50);
  }

  animateNumber(element, endValue) {
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 600;
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
      feliz: '#fbbf24', triste: '#3b82f6', enojado: '#ef4444', neutral: this.COLORS.neutral, // GRIS
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

  setSelectedChannel(channel) {
    this.selectedChannel = channel;
    
    if (!window.channelManager) return;
    
    const activeChannels = window.channelManager.getActiveChannels();
    
    if (activeChannels.length === 0) return;
    
    const channelDataArray = activeChannels.map(ch => {
      const cached = window.channelManager.realDataCache[ch];
      
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
        positive: Math.floor(Math.random() * 40) + 40,
        neutral: Math.floor(Math.random() * 20) + 20,
        negative: Math.floor(Math.random() * 20) + 10
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

  // NUEVO: Actualización automática cada 30 segundos
  startAutoUpdate() {
    setInterval(() => {
      if (this.selectedChannel && window.channelManager) {
        window.channelManager.loadRealDataForChannel(this.selectedChannel);
      }
    }, 30000); // 30 segundos
  }
}

// ==================== FUNCIONES GLOBALES ====================

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
    
    // CRÍTICO: Color gris para neutral
    const neutralKPI = document.getElementById('kpi-neutral');
    if (neutralKPI) {
      neutralKPI.style.color = '#9ca3af';
    }
  }
}

function displayEmotions(containerId, emotions) {
  const container = document.getElementById(containerId);
  if (!container || !emotions) return;
  
  container.innerHTML = '';
  
  const sortedEmotions = Object.entries(emotions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  sortedEmotions.forEach(([emotion, value], index) => {
    const emotionItem = document.createElement('div');
    emotionItem.className = 'emotion-item';
    emotionItem.style.animationDelay = (index * 0.1) + 's';
    
    const emoji = window.dashboard.getEmotionEmoji(emotion);
    const color = window.dashboard.getEmotionColor(emotion);
    
    emotionItem.innerHTML = `
      <div class="emotion-emoji">${emoji}</div>
      <div class="emotion-info">
        <div class="emotion-name">
          <span>${window.dashboard.capitalizeFirst(emotion)}</span>
          <span class="emotion-value">${Math.round(value)}%</span>
        </div>
        <div class="emotion-bar">
          <div class="emotion-bar-fill" style="width: 0%; background: ${color}" data-width="${value}"></div>
        </div>
      </div>
    `;
    
    container.appendChild(emotionItem);
  });
  
  setTimeout(() => {
    document.querySelectorAll(`#${containerId} .emotion-bar-fill`).forEach(bar => {
      const width = bar.getAttribute('data-width');
      bar.style.width = width + '%';
    });
  }, 50);
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

// Exportar globalmente
window.dashboard = new Dashboard();
window.displayAnalysisResults = displayAnalysisResults;
window.clearAnalysisResults = clearAnalysisResults;

console.log('✅ Dashboard v4.0 T2B - COLOR GRIS NEUTRAL');