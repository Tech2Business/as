// ============================================
// T2B Tech2Business - Dashboard v3.1
// Dashboard con Colores Corporativos T2B
// Gráfica selectiva por canal
// ============================================

class Dashboard {
  constructor() {
    this.chart = null;
    this.channelData = {};
    this.selectedChannel = null;
  }

  async init() {
    try {
      await this.initializeChart();
      await this.loadStatistics();
      console.log('✅ Dashboard T2B inicializado');
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
              color: '#f8fbff',  // T2B White
              font: { size: 12, family: 'Gotham, Inter' }
            }
          },
          tooltip: {
            backgroundColor: '#f8fbff',  // T2B White
            titleColor: '#111544',        // T2B Navy
            bodyColor: '#6d9abc',         // T2B Blue
            borderColor: '#d0d3d6',       // T2B Gray
            borderWidth: 1,
            padding: 12,
            displayColors: true
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { 
              color: 'rgba(208, 211, 214, 0.2)',  // T2B Gray transparent
              drawBorder: false
            },
            ticks: { 
              color: '#f8fbff',  // T2B White
              font: { size: 11, family: 'Gotham, Inter' }
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { 
              color: 'rgba(208, 211, 214, 0.2)',  // T2B Gray transparent
              drawBorder: false
            },
            ticks: { 
              color: '#f8fbff',  // T2B White
              font: { size: 11, family: 'Gotham, Inter' }
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
    
    // Generar datos simulados por canal
    const positiveData = channels.map(() => Math.floor(Math.random() * 40) + 40);
    const neutralData = channels.map(() => Math.floor(Math.random() * 20) + 20);
    const negativeData = channels.map(() => Math.floor(Math.random() * 20) + 10);

    // Función para determinar colores según selección
    const getColors = (baseColor, index) => {
      const channelName = channels[index];
      
      // Si se selecciona "Todos los canales" o no hay selección
      if (!selectedChannel || selectedChannel === 'all') {
        return {
          backgroundColor: baseColor,
          borderColor: baseColor
        };
      }
      
      // Si el canal actual es el seleccionado
      if (channelName === selectedChannel) {
        return {
          backgroundColor: baseColor,
          borderColor: baseColor
        };
      }
      
      // Si el canal NO es el seleccionado (transparente con borde)
      return {
        backgroundColor: 'transparent',
        borderColor: '#d0d3d6'  // T2B Gray para contorno
      };
    };

    // Colores para positivo, neutral, negativo
    const positiveColor = '#10b981';
    const neutralColor = '#f59e0b';
    const negativeColor = '#ef4444';

    // Aplicar colores dinámicamente
    this.chart.data.labels = labels;
    
    // Dataset Positivo
    this.chart.data.datasets[0].data = positiveData;
    this.chart.data.datasets[0].backgroundColor = channels.map((_, i) => 
      getColors(positiveColor, i).backgroundColor
    );
    this.chart.data.datasets[0].borderColor = channels.map((_, i) => 
      getColors(positiveColor, i).borderColor
    );
    
    // Dataset Neutral
    this.chart.data.datasets[1].data = neutralData;
    this.chart.data.datasets[1].backgroundColor = channels.map((_, i) => 
      getColors(neutralColor, i).backgroundColor
    );
    this.chart.data.datasets[1].borderColor = channels.map((_, i) => 
      getColors(neutralColor, i).borderColor
    );
    
    // Dataset Negativo
    this.chart.data.datasets[2].data = negativeData;
    this.chart.data.datasets[2].backgroundColor = channels.map((_, i) => 
      getColors(negativeColor, i).backgroundColor
    );
    this.chart.data.datasets[2].borderColor = channels.map((_, i) => 
      getColors(negativeColor, i).borderColor
    );

    this.chart.update({
      duration: 800,
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

    // Actualizar emociones
    this.updateEmotions();
  }

  updateEmotions() {
    const primaryEmotions = [
      { emoji: '😊', name: 'Feliz', value: Math.floor(Math.random() * 35) + 30, color: '#fbbf24' },
      { emoji: '😐', name: 'Neutral', value: Math.floor(Math.random() * 25) + 20, color: '#9ca3af' },
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

    // Animar barras después de renderizar
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
      
      // Easing suave
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
      impaciente: '😤', agradecido: '🙏', orgulloso: '😏', frustrado: '😣',
      satisfecho: '😌', decepcionado: '😞', esperanzado: '🤞', cinico: '🙄',
      sarcastico: '😏', arrogante: '😤', humilde: '🙇', despreciativo: '😒'
    };
    return emojis[emotion] || '❓';
  }

  getEmotionColor(emotion) {
    const colors = {
      feliz: '#fbbf24', triste: '#3b82f6', enojado: '#ef4444', neutral: '#9ca3af',
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

  // Método para actualizar la gráfica según el canal seleccionado
  setSelectedChannel(channel) {
    this.selectedChannel = channel;
    const activeChannels = window.channelManager ? window.channelManager.getActiveChannels() : [];
    if (activeChannels.length > 0) {
      this.updateNetworksChartByChannels(activeChannels, channel);
    }
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

console.log('✅ Dashboard v3.1 T2B inicializado con colores corporativos');