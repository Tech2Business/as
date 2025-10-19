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
    // Configurar API (IMPORTANTE: Configura aquí tus credenciales)
    // window.sentimentAPI.init('https://tu-proyecto.supabase.co', 'tu-anon-key');
    
    // Inicializar navegación
    initializeNavigation();
    
    // Inicializar formulario de análisis
    initializeAnalysisForm();
    
    // Inicializar historial
    initializeHistory();
    
    // Inicializar dashboard
    await window.dashboard.init();
    
    // Verificar health del sistema
    await checkSystemHealth();
    
    console.log('✅ Aplicación inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando aplicación:', error);
    showToast('Error al inicializar la aplicación', 'error');
  }
}

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
    
    const category = window.SentimentUtils.getSentimentCategory(item.