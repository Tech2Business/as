// T2B Tech2Business - Main Application v2.0
// Diseño de 3 columnas con animaciones suaves

const AppState = {
  isAnalyzing: false,
  lastAnalysisId: null
};

window.addEventListener('load', function() {
  console.log('🚀 Inicializando T2B Sentiment Analysis v2.0...');
  setTimeout(initializeApp, 100);
});

async function initializeApp() {
  try {
    if (typeof window.sentimentAPI === 'undefined') {
      console.error('❌ Error: sentimentAPI no está disponible');
      return;
    }

    console.log('✅ Todos los módulos cargados correctamente');
    
    initializeForm();
    await window.dashboard.init();
    
    console.log('✅ Aplicación inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando aplicación:', error);
  }
}

function initializeForm() {
  const form = document.getElementById('analysis-form');
  const contentTextarea = document.getElementById('content');
  const charCount = document.getElementById('char-count');
  const clearBtn = document.getElementById('clear-btn');
  
  if (contentTextarea && charCount) {
    contentTextarea.addEventListener('input', function() {
      const length = contentTextarea.value.length;
      charCount.textContent = length;
      
      if (length > 9000) {
        charCount.style.color = '#ef4444';
      } else if (length > 7500) {
        charCount.style.color = '#f59e0b';
      } else {
        charCount.style.color = '#94a3b8';
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
  
  if (AppState.isAnalyzing) return;
  
  try {
    const socialNetwork = document.getElementById('social-network').value;
    const keywordsInput = document.getElementById('keywords').value;
    const content = document.getElementById('content').value;
    
    if (!socialNetwork) {
      showToast('Por favor selecciona un canal', 'warning');
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
      
      // Actualizar dashboard con animación suave
      setTimeout(async function() {
        try {
          await window.dashboard.loadStatistics();
          if (window.realtimeManager) {
            window.realtimeManager.lastUpdateTime = new Date();
          }
        } catch (error) {
          console.error('Error actualizando dashboard:', error);
        }
      }, 800);
      
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
  const btnText = document.getElementById('btn-text');
  
  if (!btn || !btnText) return;
  
  if (isLoading) {
    btn.disabled = true;
    btnText.innerHTML = '<span class="loading-spinner"></span>';
  } else {
    btn.disabled = false;
    btnText.textContent = 'Analizar';
  }
}

function clearForm() {
  const form = document.getElementById('analysis-form');
  if (form) form.reset();
  
  const charCount = document.getElementById('char-count');
  if (charCount) {
    charCount.textContent = '0';
    charCount.style.color = '#94a3b8';
  }
  
  window.clearAnalysisResults();
}

function showToast(message, type) {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // Implementar toast notification si se necesita
}

window.showToast = showToast;

console.log('\n✅ T2B Sentiment Analysis v2.0\n📊 Diseño de 3 columnas activo\n🎨 Animaciones suaves tipo Power BI\n');