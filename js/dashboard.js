// ============================================
// T2B Tech2Business - Dashboard
// Visualizaciones y gráficos
// ============================================

class Dashboard {
  constructor() {
    this.charts = {
      emotions: null,
      networks: null
    };
  }

  /**
   * Inicializa el dashboard
   */
  async init() {
    try {
      await this.loadStatistics();
      console.log('✅ Dashboard inicializado');
    } catch (error) {
      console.error('Error inicializando dashboard:', error);
      this.showError('Error al cargar estadísticas');
    }
  }

  /**
   * Carga las estadísticas generales
   */
  async loadStatistics() {
    try {
      // Mostrar loading
      this.showStatsLoading();

      // Obtener estadísticas
      const response = await window.sentimentAPI.getHistory({
        limit: 1000,
        include_stats: true
      });

      if (response.success && response.statistics) {
        this.updateStatCards(response.statistics);
        this.updateEmotionsChart(response.statistics.emotion_distribution);
        this.updateNetworksChart(response.statistics.network_distribution);
      } else {
        this.showStatsEmpty();
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      this.showStatsError();
    }
  }

  /**
   * Actualiza las tarjetas de estadísticas
   */
  updateStatCards(stats) {
    // Total de análisis
    const totalEl = document.getElementById('total-analyses');
    if (totalEl) {
      this.animateNumber(totalEl, 0, stats.total_analyses, 1000);
    }

    // Score promedio
    const avgScoreEl = document.getElementById('avg-score');
    if (avgScoreEl) {
      const avgScore = Math.round(stats.average_sentiment_score);
      this.animateNumber(avgScoreEl, 0, avgScore, 1000, '%');
    }

    // Emoción más común
    const topEmotionEl = document.getElementById('top-emotion');
    if (topEmotionEl && stats.emotion_distribution) {
      const topEmotion = this.getTopEmotion(stats.emotion_distribution);
      const emoji = window.SentimentUtils.getEmotionEmoji(topEmotion);
      topEmotionEl.textContent = `${emoji} ${this.capitalizeFirst(topEmotion)}`;
    }

    // Canal más usado
    const topNetworkEl = document.getElementById('top-network');
    if (topNetworkEl && stats.network_distribution) {
      const topNetwork = this.getTopNetwork(stats.network_distribution);
      const emoji = window.SentimentUtils.getNetworkEmoji(topNetwork);
      topNetworkEl.textContent = `${emoji} ${this.getNetworkName(topNetwork)}`;
    }
  }

  /**
   * Actualiza el gráfico de emociones
   */
  updateEmotionsChart(emotionDistribution) {
    const ctx = document.getElementById('emotions-chart');
    if (!ctx) return;

    // Destruir gráfico anterior si existe
    if (this.charts.emotions) {
      this.charts.emotions.destroy();
    }

    // Preparar datos
    const emotions = Object.keys(emotionDistribution);
    const values = Object.values(emotionDistribution);
    const colors = emotions.map(e => window.SentimentUtils.getEmotionColor(e));

    // Crear gráfico
    this.charts.emotions = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: emotions.map(e => this.capitalizeFirst(e)),
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 12,
                family: 'Inter'
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Actualiza el gráfico de redes sociales
   */
  updateNetworksChart(networkDistribution) {
    const ctx = document.getElementById('networks-chart');
    if (!ctx) return;

    // Destruir gráfico anterior si existe
    if (this.charts.networks) {
      this.charts.networks.destroy();
    }

    // Preparar datos
    const networks = Object.keys(networkDistribution);
    const values = Object.values(networkDistribution);

    // Crear gráfico
    this.charts.networks = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: networks.map(n => this.getNetworkName(n)),
        datasets: [{
          label: 'Análisis por Canal',
          data: values,
          backgroundColor: 'rgba(37, 99, 235, 0.7)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Análisis: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  /**
   * Anima un número desde start hasta end
   */
  animateNumber(element, start, end, duration, suffix = '') {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        current = end;
        clearInterval(timer);
      }
      element.textContent = Math.round(current) + suffix;
    }, 16);
  }

  /**
   * Obtiene la emoción más frecuente
   */
  getTopEmotion(distribution) {
    return Object.entries(distribution).reduce((a, b) => 
      distribution[a] > distribution[b[0]] ? a : b[0]
    );
  }

  /**
   * Obtiene la red social más usada
   */
  getTopNetwork(distribution) {
    return Object.entries(distribution).reduce((a, b) => 
      distribution[a] > distribution[b[0]] ? a : b[0]
    );
  }

  /**
   * Capitaliza la primera letra
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Obtiene el nombre de la red social
   */
  getNetworkName(network) {
    const names = {
      email: 'Email',
      whatsapp: 'WhatsApp',
      twitter: 'Twitter',
      facebook: 'Facebook',
      instagram: 'Instagram',
      linkedin: 'LinkedIn',
      telegram: 'Telegram',
      sms: 'SMS'
    };
    return names[network] || network;
  }

  /**
   * Muestra estado de carga en estadísticas
   */
  showStatsLoading() {
    const stats = ['total-analyses', 'avg-score', 'top-emotion', 'top-network'];
    stats.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '...';
    });
  }

  /**
   * Muestra estado vacío en estadísticas
   */
  showStatsEmpty() {
    const stats = ['total-analyses', 'avg-score', 'top-emotion', 'top-network'];
    stats.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
  }

  /**
   * Muestra error en estadísticas
   */
  showStatsError() {
    const stats = ['total-analyses', 'avg-score', 'top-emotion', 'top-network'];
    stats.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = 'Error';
    });
  }

  /**
   * Muestra un mensaje de error
   */
  showError(message) {
    window.showToast(message, 'error');
  }
}

// ============================================
// Funciones para Visualización de Resultados
// ============================================

/**
 * Muestra los resultados del análisis en la UI
 */
function displayAnalysisResults(data) {
  const container = document.getElementById('results-container');
  if (!container) return;

  // Mostrar contenedor
  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Actualizar score
  updateSentimentScore(data.sentiment_score);

  // Actualizar emociones primarias
  displayEmotions('primary-emotions', data.primary_emotions);

  // Actualizar emociones secundarias
  displayEmotions('secondary-emotions', data.secondary_emotions);

  // Actualizar resumen
  const summaryEl = document.getElementById('summary-text');
  if (summaryEl) {
    summaryEl.textContent = data.analysis_summary;
  }

  // Actualizar metadata
  const processingTimeEl = document.getElementById('processing-time');
  if (processingTimeEl) {
    processingTimeEl.textContent = window.SentimentUtils.formatProcessingTime(data.processing_time);
  }

  const analysisIdEl = document.getElementById('analysis-id');
  if (analysisIdEl) {
    analysisIdEl.textContent = data.analysis_id.substring(0, 8) + '...';
    analysisIdEl.title = data.analysis_id;
  }

  // Animación de entrada
  container.classList.add('fade-in');
}

/**
 * Actualiza el círculo de score
 */
function updateSentimentScore(score) {
  // Actualizar número
  const scoreNumber = document.getElementById('score-number');
  if (scoreNumber) {
    window.dashboard.animateNumber(scoreNumber, 0, Math.round(score), 800);
  }

  // Actualizar círculo SVG
  const circle = document.getElementById('score-circle');
  if (circle) {
    const circumference = 283; // 2 * PI * 45
    const offset = circumference - (score / 100) * circumference;
    circle.style.strokeDashoffset = offset;

    // Color basado en score
    const category = window.SentimentUtils.getSentimentCategory(score);
    circle.style.stroke = category.color;
  }

  // Actualizar etiqueta
  const scoreLabel = document.getElementById('score-label');
  if (scoreLabel) {
    const category = window.SentimentUtils.getSentimentCategory(score);
    scoreLabel.textContent = `${category.emoji} ${category.label}`;
    scoreLabel.style.background = category.color + '20';
    scoreLabel.style.color = category.color;
  }
}

/**
 * Muestra las emociones en la UI
 */
function displayEmotions(containerId, emotions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  // Ordenar emociones por valor
  const sortedEmotions = Object.entries(emotions)
    .sort((a, b) => b[1] - a[1]);

  sortedEmotions.forEach(([emotion, value]) => {
    const emotionItem = document.createElement('div');
    emotionItem.className = 'emotion-item';

    const emoji = window.SentimentUtils.getEmotionEmoji(emotion);
    const color = window.SentimentUtils.getEmotionColor(emotion);

    emotionItem.innerHTML = `
      <div class="emotion-emoji">${emoji}</div>
      <div class="emotion-info">
        <div class="emotion-name">
          <span>${window.dashboard.capitalizeFirst(emotion)}</span>
          <span class="emotion-value">${Math.round(value)}%</span>
        </div>
        <div class="emotion-bar">
          <div class="emotion-bar-fill" style="width: ${value}%; background: ${color}"></div>
        </div>
      </div>
    `;

    container.appendChild(emotionItem);
  });
}

/**
 * Limpia los resultados del análisis
 */
function clearAnalysisResults() {
  const container = document.getElementById('results-container');
  if (container) {
    container.style.display = 'none';
  }
}

// ============================================
// Exportar instancia global
// ============================================

window.dashboard = new Dashboard();
window.displayAnalysisResults = displayAnalysisResults;
window.clearAnalysisResults = clearAnalysisResults;

console.log('✅ Dashboard inicializado');