// ============================================
// T2B Tech2Business - Main Application
// Lógica principal de la aplicación
// ============================================

const AppState = {
  currentSection: 'analyze',
  isAnalyzing: false,
  currentPage: 1,
  historyFilters: {},
  lastAnalysisId: null
};

window.addEventListener('load', function() {
  console.log('🚀 Inicializando T2B Sentiment Analysis...');
  
  setTimeout(function() {
    initializeApp();
  }, 100);
});

async function initializeApp() {
  try {
    if (typeof window.sentimentAPI === 'undefined') {
      console.error('❌ Error: sentimentAPI no está disponible');
      showToast('Error: API Client no se cargó correctamente', 'error');
      return;
    }

    if (typeof window.SentimentUtils === 'undefined') {
      console.error('❌ Error: SentimentUtils no está disponible');
      showToast('Error: Utilities no se cargaron correctamente', 'error');
      return;
    }

    if (typeof window.dashboard === 'undefined') {
      console.error('❌ Error: dashboard no está disponible');
      showToast('Error: Dashboard no se cargó correctamente', 'error');
      return;
    }

    console.log('✅ Todos los módulos cargados correctamente');
    
    initializeNavigation();
    initializeAnalysisForm();
    initializeHistory();
    
    await window.dashboard.init();
    await checkSystemHealth();
    
    console.log('✅ Aplicación inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando aplicación:', error);
    showToast('Error al inicializar la aplicación', 'error');
  }
}

function initializeNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  
  navButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      const section = btn.dataset.section;
      navigateToSection(section);
    });
  });
}

function navigateToSection(sectionName) {
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.dataset.section === sectionName) {
      btn.classList.add('active');
    }
  });
  
  document.querySelectorAll('.section').forEach(function(section) {
    section.classList.remove('active');
  });
  
  const targetSection = document.getElementById(sectionName + '-section');
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  AppState.currentSection = sectionName;
  
  if (sectionName === 'history') {
    loadHistory();
  } else if (sectionName === 'stats') {
    window.dashboard.loadStatistics();
  }
}

function initializeAnalysisForm() {
  const form = document.getElementById('analysis-form');
  const contentTextarea = document.getElementById('content');
  const charCount = document.getElementById('char-count');
  const clearBtn = document.getElementById('clear-btn');
  
  if (contentTextarea && charCount) {
    contentTextarea.addEventListener('input', function() {
      const length = contentTextarea.value.length;
      charCount.textContent = length;
      
      if (length > 9000) {
        charCount.style.color = 'var(--error)';
      } else if (length > 7500) {
        charCount.style.color = 'var(--warning)';
      } else {
        charCount.style.color = 'var(--text-secondary)';
      }
    });
  }
  
  if (form) {
    form.addEventListener('submit', handleAnalysisSubmit);
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', clearForm);
  }
}

async function handleAnalysisSubmit(e) {
  e.preventDefault();
  
  if (AppState.isAnalyzing) {
    return;
  }
  
  try {
    const socialNetwork = document.getElementById('social-network').value;
    const keywordsInput = document.getElementById('keywords').value;
    const content = document.getElementById('content').value;
    
    if (!socialNetwork) {
      showToast('Por favor selecciona una red social', 'warning');
      return;
    }
    
    const validation = window.SentimentUtils.validateContent(content);
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }
    
    const keywords = window.SentimentUtils.parseKeywords(keywordsInput);
    
    setAnalyzeButtonLoading(true);
    AppState.isAnalyzing = true;
    
    const response = await window.sentimentAPI.analyzeSentiment(
      socialNetwork,
      content,
      keywords
    );
    
    if (response.success) {
      AppState.lastAnalysisId = response.data.analysis_id;
      window.displayAnalysisResults(response.data);
      showToast('✨ Análisis completado exitosamente', 'success');
      saveToLocalHistory(response.data, socialNetwork, content, keywords);
      
      // 🔥 ACTUALIZAR DASHBOARD AUTOMÁTICAMENTE
      console.log('🔄 Actualizando estadísticas del dashboard...');
      setTimeout(async function() {
        try {
          await window.dashboard.loadStatistics();
          console.log('✅ Dashboard actualizado automáticamente');
          
          // 🔥 NUEVO: Forzar actualización inmediata del realtime manager
          if (window.realtimeManager) {
            window.realtimeManager.lastUpdateTime = new Date();
          }
        } catch (error) {
          console.error('❌ Error actualizando dashboard:', error);
        }
      }, 1500);
      
    } else {
      throw new Error(response.error ? response.error.message : 'Error en el análisis');
    }
    
  } catch (error) {
    console.error('Error en análisis:', error);
    showToast(error.message || 'Error al analizar el sentimiento', 'error');
  } finally {
    setAnalyzeButtonLoading(false);
    AppState.isAnalyzing = false;
  }
}

function setAnalyzeButtonLoading(isLoading) {
  const btn = document.getElementById('analyze-btn');
  if (!btn) return;
  
  if (isLoading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function clearForm() {
  const form = document.getElementById('analysis-form');
  if (form) {
    form.reset();
  }
  
  const charCount = document.getElementById('char-count');
  if (charCount) {
    charCount.textContent = '0';
    charCount.style.color = 'var(--text-secondary)';
  }
  
  window.clearAnalysisResults();
  showToast('Formulario limpiado', 'info');
}

function saveToLocalHistory(data, socialNetwork, content, keywords) {
  const historyItem = Object.assign({}, data, {
    social_network: socialNetwork,
    content_preview: window.SentimentUtils.truncateText(content, 100),
    keywords: keywords,
    analyzed_at: new Date().toISOString()
  });
  
  let localHistory = window.storageHelper.getItem('recent_analyses') || [];
  localHistory.unshift(historyItem);
  localHistory = localHistory.slice(0, 10);
  window.storageHelper.setItem('recent_analyses', localHistory, 86400);
}

function initializeHistory() {
  const refreshBtn = document.getElementById('refresh-history-btn');
  const applyFiltersBtn = document.getElementById('apply-filters-btn');
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      loadHistory();
    });
  }
  
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', applyHistoryFilters);
  }
}

async function loadHistory(page) {
  if (typeof page === 'undefined') {
    page = 1;
  }
  try {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell"><div class="loader"></div>Cargando historial...</td></tr>';
    
    const params = Object.assign({
      limit: 20,
      page: page
    }, AppState.historyFilters);
    
    const response = await window.sentimentAPI.getHistory(params);
    
    if (response.success && response.data.length > 0) {
      displayHistoryTable(response.data);
      displayPagination(response.metadata);
    } else {
      tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No hay análisis en el historial</td></tr>';
    }
    
  } catch (error) {
    console.error('Error cargando historial:', error);
    const tbody = document.getElementById('history-tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading-cell" style="color: var(--error)">Error al cargar el historial</td></tr>';
    }
    showToast('Error al cargar el historial', 'error');
  }
}

function displayHistoryTable(data) {
  const tbody = document.getElementById('history-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  data.forEach(function(item) {
    const tr = document.createElement('tr');
    
    const category = window.SentimentUtils.getSentimentCategory(item.sentiment_score);
    const networkEmoji = window.SentimentUtils.getNetworkEmoji(item.social_network);
    const emotionEmoji = window.SentimentUtils.getEmotionEmoji(item.primary_emotion);
    
    tr.innerHTML = '<td>' + window.SentimentUtils.formatDate(item.created_at) + '</td>' +
      '<td><span class="emotion-badge">' + networkEmoji + ' ' + window.dashboard.getNetworkName(item.social_network) + '</span></td>' +
      '<td><span class="score-badge" style="background: ' + category.color + '20; color: ' + category.color + '">' + Math.round(item.sentiment_score) + '</span></td>' +
      '<td><span class="emotion-badge">' + emotionEmoji + ' ' + window.dashboard.capitalizeFirst(item.primary_emotion) + '</span></td>' +
      '<td><div class="content-preview" title="' + (item.content_preview || '') + '">' + (item.content_preview || 'Sin preview') + '</div></td>' +
      '<td><button class="action-btn" onclick="viewAnalysisDetails(\'' + item.id + '\')">👁️ Ver</button></td>';
    
    tbody.appendChild(tr);
  });
}

function displayPagination(metadata) {
  const paginationContainer = document.getElementById('pagination');
  if (!paginationContainer) return;
  
  paginationContainer.innerHTML = '';
  
  const page = metadata.page;
  const total_pages = metadata.total_pages;
  
  const prevBtn = document.createElement('button');
  prevBtn.className = 'pagination-btn';
  prevBtn.textContent = '← Anterior';
  prevBtn.disabled = page <= 1;
  prevBtn.addEventListener('click', function() {
    loadHistory(page - 1);
  });
  paginationContainer.appendChild(prevBtn);
  
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(total_pages, page + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = 'pagination-btn';
    if (i === page) pageBtn.classList.add('active');
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', function() {
      loadHistory(i);
    });
    paginationContainer.appendChild(pageBtn);
  }
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'pagination-btn';
  nextBtn.textContent = 'Siguiente →';
  nextBtn.disabled = page >= total_pages;
  nextBtn.addEventListener('click', function() {
    loadHistory(page + 1);
  });
  paginationContainer.appendChild(nextBtn);
  
  const pageInfo = document.createElement('span');
  pageInfo.style.marginLeft = 'var(--spacing-md)';
  pageInfo.style.color = 'var(--text-secondary)';
  pageInfo.textContent = 'Página ' + page + ' de ' + total_pages;
  paginationContainer.appendChild(pageInfo);
}

function applyHistoryFilters() {
  const filterNetwork = document.getElementById('filter-network').value;
  const filterMinScore = document.getElementById('filter-min-score').value;
  const filterMaxScore = document.getElementById('filter-max-score').value;
  
  AppState.historyFilters = {};
  
  if (filterNetwork) {
    AppState.historyFilters.social_network = filterNetwork;
  }
  
  if (filterMinScore) {
    AppState.historyFilters.min_score = parseFloat(filterMinScore);
  }
  
  if (filterMaxScore) {
    AppState.historyFilters.max_score = parseFloat(filterMaxScore);
  }
  
  loadHistory(1);
  showToast('Filtros aplicados', 'info');
}

function viewAnalysisDetails(analysisId) {
  showToast('Funcionalidad de detalle en desarrollo', 'info');
  console.log('Ver análisis:', analysisId);
}

function showToast(message, type) {
  if (typeof type === 'undefined') {
    type = 'info';
  }
  
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const titles = {
    success: 'Éxito',
    error: 'Error',
    warning: 'Advertencia',
    info: 'Información'
  };
  
  toast.innerHTML = '<div class="toast-icon">' + icons[type] + '</div>' +
    '<div class="toast-content">' +
    '<div class="toast-title">' + titles[type] + '</div>' +
    '<div class="toast-message">' + message + '</div>' +
    '</div>' +
    '<button class="toast-close" onclick="this.parentElement.remove()">×</button>';
  
  container.appendChild(toast);
  
  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() {
      toast.remove();
    }, 300);
  }, 5000);
}

window.showToast = showToast;

async function checkSystemHealth() {
  try {
    const response = await window.sentimentAPI.healthCheck(false);
    
    if (response.status === 'healthy') {
      console.log('✅ Sistema saludable:', response);
    } else {
      console.warn('⚠️ Sistema con problemas:', response);
      showToast('El sistema presenta algunos problemas', 'warning');
    }
  } catch (error) {
    console.error('❌ Error en health check:', error);
    showToast('No se pudo verificar el estado del sistema', 'error');
  }
}

window.addEventListener('error', function(event) {
  console.error('Error global capturado:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
  console.error('Promise rechazada sin manejar:', event.reason);
});

document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    clearForm();
  }
  
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const form = document.getElementById('analysis-form');
    if (form && AppState.currentSection === 'analyze' && !AppState.isAnalyzing) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  }
  
  if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    if (e.key === '1') {
      e.preventDefault();
      navigateToSection('analyze');
    } else if (e.key === '2') {
      e.preventDefault();
      navigateToSection('history');
    } else if (e.key === '3') {
      e.preventDefault();
      navigateToSection('stats');
    }
  }
});

if ('performance' in window) {
  window.addEventListener('load', function() {
    setTimeout(function() {
      const perfData = performance.getEntriesByType('navigation')[0];
      console.log('⚡ Performance:', {
        loadTime: Math.round(perfData.loadEventEnd - perfData.fetchStart) + 'ms',
        domReady: Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart) + 'ms'
      });
    }, 0);
  });
}

window.AppFunctions = {
  navigateToSection: navigateToSection,
  loadHistory: loadHistory,
  clearForm: clearForm,
  checkSystemHealth: checkSystemHealth,
  viewAnalysisDetails: viewAnalysisDetails,
  applyHistoryFilters: applyHistoryFilters
};

console.log('\n╔═══════════════════════════════════════╗\n║   T2B SENTIMENT ANALYSIS SYSTEM      ║\n║   Powered by Gemini AI               ║\n║   Version 1.2.0 - All Fixed          ║\n╚═══════════════════════════════════════╝\n\n✨ Comandos disponibles:\n   - Ctrl/Cmd + K: Limpiar formulario\n   - Ctrl/Cmd + Enter: Enviar análisis\n   - Alt + 1/2/3: Navegar secciones\n\n📚 API Global: window.sentimentAPI\n📊 Dashboard: window.dashboard\n🛠️ Utilidades: window.SentimentUtils\n💾 Storage: window.storageHelper\n\n🔥 Dashboard con actualización automática\n🎭 23 emociones soportadas\n');