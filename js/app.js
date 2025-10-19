// ============================================
// T2B Tech2Business - Main Application
// Lógica principal de la aplicación
// ============================================

// ============================================
// Estado de la Aplicación
// ============================================

const AppState = {
  currentSection: 'analyze',
  isAnalyzing: false,
  currentPage: 1,
  historyFilters: {},
  lastAnalysisId: null
};

// ============================================
// Inicialización
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inicializando T2B Sentiment Analysis...');
  
  initializeApp();
});

async function initializeApp() {
  try {
    // Esperar a que los objetos globales estén disponibles
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

// ============================================
// Navegación entre Secciones
// ============================================

function initializeNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      navigateToSection(section);
    });
  });
}

function navigateToSection(sectionName) {
  // Actualizar botones
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.section === sectionName) {
      btn.classList.add('active');
    }
  });
  
  // Actualizar secciones
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  
  const targetSection = document.getElementById(`${sectionName}-section`);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  // Actualizar estado
  AppState.currentSection = sectionName;
  
  // Cargar datos si es necesario
  if (sectionName === 'history') {
    loadHistory();
  } else if (sectionName === 'stats') {
    window.dashboard.loadStatistics();
  }
}

// ============================================
// Formulario de Análisis
// ============================================

function initializeAnalysisForm() {
  const form = document.getElementById('analysis-form');
  const contentTextarea = document.getElementById('content');
  const charCount = document.getElementById('char-count');
  const clearBtn = document.getElementById('clear-btn');
  
  // Contador de caracteres
  if (contentTextarea && charCount) {
    contentTextarea.addEventListener('input', () => {
      const length = contentTextarea.value.length;
      charCount.textContent = length;
      
      // Cambiar color si se acerca al límite
      if (length > 9000) {
        charCount.style.color = 'var(--error)';
      } else if (length > 7500) {
        charCount.style.color = 'var(--warning)';
      } else {
        charCount.style.color = 'var(--text-secondary)';
      }
    });
  }
  
  // Submit del formulario
  if (form) {
    form.addEventListener('submit', handleAnalysisSubmit);
  }
  
  // Botón de limpiar
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
    // Obtener valores del formulario
    const socialNetwork = document.getElementById('social-network').value;
    const keywordsInput = document.getElementById('keywords').value;
    const content = document.getElementById('content').value;
    
    // Validar
    if (!socialNetwork) {
      showToast('Por favor selecciona una red social', 'warning');
      return;
    }
    
    const validation = window.SentimentUtils.validateContent(content);
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }
    
    // Parsear keywords
    const keywords = window.SentimentUtils.parseKeywords(keywordsInput);
    
    // Mostrar loading
    setAnalyzeButtonLoading(true);
    AppState.isAnalyzing = true;
    
    // Realizar análisis
    const response = await window.sentimentAPI.analyzeSentiment(
      socialNetwork,
      content,
      keywords
    );
    
    if (response.success) {
      // Guardar ID del análisis
      AppState.lastAnalysisId = response.data.analysis_id;
      
      // Mostrar resultados
      window.displayAnalysisResults(response.data);
      
      // Mostrar toast de éxito
      showToast('✨ Análisis completado exitosamente', 'success');
      
      // Guardar en historial local (cache)
      saveToLocalHistory(response.data, socialNetwork, content, keywords);
    } else {
      throw new Error(response.error?.message || 'Error en el análisis');
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
  const historyItem = {
    ...data,
    social_network: socialNetwork,
    content_preview: window.SentimentUtils.truncateText(content, 100),
    keywords: keywords,
    analyzed_at: new Date().toISOString()
  };
  
  // Guardar en localStorage (últimos 10 análisis)
  let localHistory = window.storageHelper.getItem('recent_analyses') || [];
  localHistory.unshift(historyItem);
  localHistory = localHistory.slice(0, 10);
  window.storageHelper.setItem('recent_analyses', localHistory, 86400); // 24 horas
}

// ============================================
// Historial de Análisis
// ============================================

function initializeHistory() {
  const refreshBtn = document.getElementById('refresh-history-btn');
  const applyFiltersBtn = document.getElementById('apply-filters-btn');
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadHistory());
  }
  
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', applyHistoryFilters);
  }
}

async function loadHistory(page = 1) {
  try {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;
    
    // Mostrar loading
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="loading-cell">
          <div class="loader"></div>
          Cargando historial...
        </td>
      </tr>
    `;
    
    // Preparar parámetros
    const params = {
      limit: 20,
      page: page,
      ...AppState.historyFilters
    };
    
    // Obtener historial
    const response = await window.sentimentAPI.getHistory(params);
    
    if (response.success && response.data.length > 0) {
      displayHistoryTable(response.data);
      displayPagination(response.metadata);
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="loading-cell">
            No hay análisis en el historial
          </td>
        </tr>
      `;
    }
    
  } catch (error) {
    console.error('Error cargando historial:', error);
    const tbody = document.getElementById('history-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="loading-cell" style="color: var(--error)">
            Error al cargar el historial
          </td>
        </tr>
      `;
    }
    showToast('Error al cargar el historial', 'error');
  }
}

function displayHistoryTable(data) {
  const tbody = document.getElementById('history-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  data.forEach(item => {
    const tr = document.createElement('tr');
    
    const category = window.SentimentUtils.getSentimentCategory(item.sentiment_score);
    const networkEmoji = window.SentimentUtils.getNetworkEmoji(item.social_network);
    const emotionEmoji = window.SentimentUtils.getEmotionEmoji(item.primary_emotion);
    
    tr.innerHTML = `
      <td>${window.SentimentUtils.formatDate(item.created_at)}</td>
      <td>
        <span class="emotion-badge">
          ${networkEmoji} ${window.dashboard.getNetworkName(item.social_network)}
        </span>
      </td>
      <td>
        <span class="score-badge" style="background: ${category.color}20; color: ${category.color}">
          ${Math.round(item.sentiment_score)}
        </span>
      </td>
      <td>
        <span class="emotion-badge">
          ${emotionEmoji} ${window.dashboard.capitalizeFirst(item.primary_emotion)}
        </span>
      </td>
      <td>
        <div class="content-preview" title="${item.content_preview || ''}">
          ${item.content_preview || 'Sin preview'}
        </div>
      </td>
      <td>
        <button class="action-btn" onclick="viewAnalysisDetails('${item.id}')">
          👁️ Ver
        </button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

function displayPagination(metadata) {
  const paginationContainer = document.getElementById('pagination');
  if (!paginationContainer) return;
  
  paginationContainer.innerHTML = '';
  
  const { page, total_pages } = metadata;
  
  // Botón anterior
  const prevBtn = document.createElement('button');
  prevBtn.className = 'pagination-btn';
  prevBtn.textContent = '← Anterior';
  prevBtn.disabled = page <= 1;
  prevBtn.addEventListener('click', () => loadHistory(page - 1));
  paginationContainer.appendChild(prevBtn);
  
  // Números de página
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(total_pages, page + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = 'pagination-btn';
    if (i === page) pageBtn.classList.add('active');
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => loadHistory(i));
    paginationContainer.appendChild(pageBtn);
  }
  
  // Botón siguiente
  const nextBtn = document.createElement('button');
  nextBtn.className = 'pagination-btn';
  nextBtn.textContent = 'Siguiente →';
  nextBtn.disabled = page >= total_pages;
  nextBtn.addEventListener('click', () => loadHistory(page + 1));
  paginationContainer.appendChild(nextBtn);
  
  // Info de página
  const pageInfo = document.createElement('span');
  pageInfo.style.marginLeft = 'var(--spacing-md)';
  pageInfo.style.color = 'var(--text-secondary)';
  pageInfo.textContent = `Página ${page} de ${total_pages}`;
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
  // TODO: Implementar modal con detalles completos
}

// ============================================
// Sistema de Notificaciones Toast
// ============================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
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
  
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-content">
      <div class="toast-title">${titles[type]}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(toast);
  
  // Auto-eliminar después de 5 segundos
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Hacer showToast global
window.showToast = showToast;

// ============================================
// Health Check del Sistema
// ============================================

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

// ============================================
// Manejo de Errores Global
// ============================================

window.addEventListener('error', (event) => {
  console.error('Error global capturado:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rechazada sin manejar:', event.reason);
});

// ============================================
// Keyboard Shortcuts
// ============================================

document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K para limpiar formulario
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    clearForm();
  }
  
  // Ctrl/Cmd + Enter para enviar análisis
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const form = document.getElementById('analysis-form');
    if (form && AppState.currentSection === 'analyze' && !AppState.isAnalyzing) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  }
  
  // Alt + 1/2/3 para navegar entre secciones
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

// ============================================
// Performance Monitoring
// ============================================

if ('performance' in window) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      console.log('⚡ Performance:', {
        loadTime: Math.round(perfData.loadEventEnd - perfData.fetchStart) + 'ms',
        domReady: Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart) + 'ms'
      });
    }, 0);
  });
}

// ============================================
// PWA Support (Opcional)
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Descomentar si quieres añadir PWA support
    // navigator.serviceWorker.register('/sw.js')
    //   .then(reg => console.log('✅ Service Worker registrado'))
    //   .catch(err => console.error('❌ Error en Service Worker:', err));
  });
}

// ============================================
// Exportar funciones útiles
// ============================================

window.AppFunctions = {
  navigateToSection,
  loadHistory,
  clearForm,
  checkSystemHealth,
  viewAnalysisDetails,
  applyHistoryFilters
};

// ============================================
// Log de Inicio
// ============================================

console.log(`
╔═══════════════════════════════════════╗
║   T2B SENTIMENT ANALYSIS SYSTEM      ║
║   Powered by Gemini AI               ║
║   Version 1.0.0                      ║
╚═══════════════════════════════════════╝

✨ Comandos disponibles:
   - Ctrl/Cmd + K: Limpiar formulario
   - Ctrl/Cmd + Enter: Enviar análisis
   - Alt + 1/2/3: Navegar secciones

📚 API Global: window.sentimentAPI
📊 Dashboard: window.dashboard
🛠️  Utilidades: window.SentimentUtils
💾 Storage: window.storageHelper
`);

// ============================================
// Configuración de Ejemplo
// ============================================

console.log(`
⚠️  IMPORTANTE: Configura tus credenciales

En api-client.js, actualiza:
- SUPABASE_URL
- SUPABASE_ANON_KEY

O usa:
window.sentimentAPI.init('tu-url', 'tu-key');
`);