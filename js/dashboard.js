// T2B Tech2Business - Dashboard v2.0
// Animaciones suaves tipo Power BI

class Dashboard {
  constructor() {
    this.chart = null;
  }

  async init() {
    try {
      await this.loadStatistics();
      console.log('✅ Dashboard inicializado');
    } catch (error) {
      console.error('Error inicializando dashboard:', error);
    }
  }

  async loadStatistics() {
    try {
      const response = await window.sentimentAPI.getHistory({
        limit: 1000,
        include_stats: true
      });

      if (response.success && response.statistics) {
        this.updateNetworksChart(response.statistics.network_distribution);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  updateNetworksChart(networkDistribution) {
    const ctx = document.getElementById('networks-chart');
    if (!ctx) return;

    if (this.chart) {
      // Actualización suave - solo cambiar datos
      const networks = Object.keys(networkDistribution);
      const values = Object.values(networkDistribution);
      
      this.chart.data.labels = networks.map(n => this.getNetworkName(n));
      this.chart.data.datasets[0].data = values;
      
      // Animación suave tipo Power BI
      this.chart.update({
        duration: 800,
        easing: 'easeInOutQuart'
      });
      return;
    }

    // Primera creación
    const networks = Object.keys(networkDistribution);
    const values = Object.values(networkDistribution);

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: networks.map(n => this.getNetworkName(n)),
        datasets: [{
          label: 'Análisis',
          data: values,
          backgroundColor: 'rgba(37, 99, 235, 0.8)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 0,
          borderRadius: 8,
          barThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
          duration: 800,
          easing: 'easeInOutQuart'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return 'Total: ' + context.parsed.y;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: '#94a3b8',
              font: {
                size: 11,
                family: 'Inter'
              }
            },
            grid: {
              color: 'rgba(51, 65, 85, 0.3)',
              drawBorder: false
            }
          },
          x: {
            ticks: {
              color: '#94a3b8',
              font: {
                size: 11,
                family: 'Inter'
              }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

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

  getEmotionEmoji(emotion) {
    const emojis = {
      feliz: '😊', triste: '😢', enojado: '😠', neutral: '😐',
      asustado: '😨', sorprendido: '😲', disgustado: '🤢', ansioso: '😰',
      optimista: '😄', pesimista: '😔', confiado: '😌', confundido: '😕',
      impaciente: '😤', agradecido: '🙏', orgulloso: '😏', frustrado: '😣',
      satisfecho: '😌', decepcionado: '😞', esperanzado: '🤞', cinico: '🙄',
      sarcastico: '😒', arrogante: '😤', humilde: '🙇', despreciativo: '😒'
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

  // Animación suave de números tipo Power BI
  animateNumber(element, endValue, suffix) {
    if (!element) return;
    
    suffix = suffix || '';
    const startValue = parseInt(element.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing suave tipo Power BI
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress);
      element.textContent = currentValue + suffix;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
}

// Función para mostrar resultados
function displayAnalysisResults(data) {
  const emptyState = document.getElementById('empty-state');
  const resultsContainer = document.getElementById('results-container');
  
  if (emptyState) emptyState.style.display = 'none';
  if (resultsContainer) resultsContainer.classList.add('active');
  
  // Calcular KPIs de polaridad
  updatePolarityKPIs(data.sentiment_score);
  
  // Mostrar emociones con animación suave
  displayEmotions('primary-emotions', data.primary_emotions);
  displayEmotions('secondary-emotions', data.secondary_emotions);
}

function updatePolarityKPIs(score) {
  let positive = 0, neutral = 0, negative = 0;
  
  if (score >= 60) {
    positive = score;
  } else if (score >= 40) {
    neutral = score;
  } else {
    negative = 100 - score;
  }
  
  // Animar KPIs con transición suave
  window.dashboard.animateNumber(document.getElementById('kpi-positive'), positive, '%');
  window.dashboard.animateNumber(document.getElementById('kpi-neutral'), neutral, '%');
  window.dashboard.animateNumber(document.getElementById('kpi-negative'), negative, '%');
  window.dashboard.animateNumber(document.getElementById('kpi-score'), Math.round(score));
}

function displayEmotions(containerId, emotions) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  const sortedEmotions = Object.entries(emotions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3); // Solo las 3 principales
  
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
  
  // Animar barras después de que se agreguen al DOM
  setTimeout(() => {
    document.querySelectorAll('.emotion-bar-fill').forEach(bar => {
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
}

// Exportar globalmente
window.dashboard = new Dashboard();
window.displayAnalysisResults = displayAnalysisResults;
window.clearAnalysisResults = clearAnalysisResults;

console.log('✅ Dashboard v2.0 inicializado con animaciones Power BI');