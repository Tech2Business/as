-- ============================================
-- T2B Tech2Business - Sentiment Analysis System
-- Migración Inicial de Base de Datos
-- ============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas de texto eficientes

-- ============================================
-- TABLA PRINCIPAL: sentiment_analysis
-- ============================================
CREATE TABLE sentiment_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Datos de entrada
    social_network TEXT NOT NULL CHECK (social_network IN (
        'email', 'whatsapp', 'twitter', 'facebook', 
        'instagram', 'linkedin', 'telegram', 'sms'
    )),
    keywords TEXT[] DEFAULT '{}',
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 10000),
    
    -- Resultados del análisis
    primary_emotions JSONB NOT NULL DEFAULT '{}',
    secondary_emotions JSONB NOT NULL DEFAULT '{}',
    sentiment_score FLOAT CHECK (sentiment_score >= 0 AND sentiment_score <= 100),
    analysis_summary TEXT,
    
    -- Emociones dominantes (para queries rápidas)
    dominant_primary_emotion TEXT,
    dominant_secondary_emotion TEXT,
    
    -- Metadatos técnicos
    processing_time FLOAT CHECK (processing_time >= 0),
    gemini_model TEXT DEFAULT 'gemini-2.5-flash',
    api_version TEXT DEFAULT '1.0.0',
    
    -- Metadatos adicionales
    client_ip TEXT,
    user_agent TEXT,
    request_id UUID DEFAULT gen_random_uuid()
);

-- ============================================
-- TABLA DE HISTORIAL: analysis_history
-- ============================================
CREATE TABLE analysis_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Datos del análisis
    analysis_id UUID REFERENCES sentiment_analysis(id) ON DELETE CASCADE,
    social_network TEXT NOT NULL,
    sentiment_score FLOAT NOT NULL,
    primary_emotion TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    
    -- Datos agregados para dashboard
    emotion_category TEXT CHECK (emotion_category IN ('positivo', 'negativo', 'neutral', 'mixto')),
    content_preview TEXT -- Primeros 200 caracteres
);

-- ============================================
-- TABLA DE ESTADÍSTICAS: analysis_stats
-- ============================================
CREATE TABLE analysis_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    social_network TEXT NOT NULL,
    
    -- Contadores
    total_analyses INTEGER DEFAULT 0,
    avg_sentiment_score FLOAT,
    avg_processing_time FLOAT,
    
    -- Distribución de emociones
    emotion_distribution JSONB DEFAULT '{}',
    
    -- Métricas de rendimiento
    successful_analyses INTEGER DEFAULT 0,
    failed_analyses INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(date, social_network)
);

-- ============================================
-- TABLA DE LOGS: api_logs
-- ============================================
CREATE TABLE api_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Información de la petición
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    
    -- Datos de la petición
    request_body JSONB,
    response_body JSONB,
    error_message TEXT,
    
    -- Metadatos
    client_ip TEXT,
    user_agent TEXT,
    processing_time FLOAT,
    request_id UUID
);

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índices principales
CREATE INDEX idx_sentiment_analysis_created_at ON sentiment_analysis(created_at DESC);
CREATE INDEX idx_sentiment_analysis_network ON sentiment_analysis(social_network);
CREATE INDEX idx_sentiment_analysis_score ON sentiment_analysis(sentiment_score);
CREATE INDEX idx_sentiment_analysis_request_id ON sentiment_analysis(request_id);

-- Índices para búsqueda de texto
CREATE INDEX idx_sentiment_analysis_content_trgm ON sentiment_analysis USING gin(content gin_trgm_ops);
CREATE INDEX idx_sentiment_analysis_keywords ON sentiment_analysis USING gin(keywords);

-- Índices JSONB
CREATE INDEX idx_sentiment_analysis_primary_emotions ON sentiment_analysis USING gin(primary_emotions);
CREATE INDEX idx_sentiment_analysis_secondary_emotions ON sentiment_analysis USING gin(secondary_emotions);

-- Índices de historial
CREATE INDEX idx_analysis_history_created_at ON analysis_history(created_at DESC);
CREATE INDEX idx_analysis_history_network ON analysis_history(social_network);
CREATE INDEX idx_analysis_history_emotion_category ON analysis_history(emotion_category);
CREATE INDEX idx_analysis_history_analysis_id ON analysis_history(analysis_id);

-- Índices de estadísticas
CREATE INDEX idx_analysis_stats_date ON analysis_stats(date DESC);
CREATE INDEX idx_analysis_stats_network ON analysis_stats(social_network);

-- Índices de logs
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX idx_api_logs_status_code ON api_logs(status_code);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_sentiment_analysis_updated_at 
    BEFORE UPDATE ON sentiment_analysis 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_stats_updated_at 
    BEFORE UPDATE ON analysis_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Función para categorizar emociones
CREATE OR REPLACE FUNCTION categorize_emotion(score FLOAT)
RETURNS TEXT AS $$
BEGIN
    CASE 
        WHEN score >= 70 THEN RETURN 'positivo';
        WHEN score >= 40 THEN RETURN 'neutral';
        WHEN score >= 20 THEN RETURN 'mixto';
        ELSE RETURN 'negativo';
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para crear entrada en historial automáticamente
CREATE OR REPLACE FUNCTION create_analysis_history_entry()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO analysis_history (
        analysis_id,
        social_network,
        sentiment_score,
        primary_emotion,
        keywords,
        emotion_category,
        content_preview
    ) VALUES (
        NEW.id,
        NEW.social_network,
        NEW.sentiment_score,
        NEW.dominant_primary_emotion,
        NEW.keywords,
        categorize_emotion(NEW.sentiment_score),
        LEFT(NEW.content, 200)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear historial automáticamente
CREATE TRIGGER create_history_on_analysis 
    AFTER INSERT ON sentiment_analysis 
    FOR EACH ROW 
    EXECUTE FUNCTION create_analysis_history_entry();

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- Habilitar Row Level Security
ALTER TABLE sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública (puedes ajustar según tus necesidades)
CREATE POLICY "Permitir lectura pública" ON sentiment_analysis
    FOR SELECT USING (true);

CREATE POLICY "Permitir lectura pública historial" ON analysis_history
    FOR SELECT USING (true);

CREATE POLICY "Permitir lectura pública estadísticas" ON analysis_stats
    FOR SELECT USING (true);

-- Políticas de inserción solo para funciones autenticadas
CREATE POLICY "Permitir inserción autenticada" ON sentiment_analysis
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir inserción autenticada historial" ON analysis_history
    FOR INSERT WITH CHECK (true);

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de análisis recientes con detalles
CREATE OR REPLACE VIEW v_recent_analyses AS
SELECT 
    sa.id,
    sa.created_at,
    sa.social_network,
    sa.sentiment_score,
    sa.dominant_primary_emotion,
    sa.dominant_secondary_emotion,
    sa.analysis_summary,
    LEFT(sa.content, 100) || '...' as content_preview,
    sa.processing_time,
    ah.emotion_category
FROM sentiment_analysis sa
LEFT JOIN analysis_history ah ON sa.id = ah.analysis_id
ORDER BY sa.created_at DESC
LIMIT 100;

-- Vista de estadísticas por red social
CREATE OR REPLACE VIEW v_network_statistics AS
SELECT 
    social_network,
    COUNT(*) as total_analyses,
    AVG(sentiment_score) as avg_sentiment_score,
    AVG(processing_time) as avg_processing_time,
    MIN(created_at) as first_analysis,
    MAX(created_at) as last_analysis
FROM sentiment_analysis
GROUP BY social_network;

-- Vista de emociones más frecuentes
CREATE OR REPLACE VIEW v_top_emotions AS
SELECT 
    dominant_primary_emotion as emotion,
    COUNT(*) as frequency,
    AVG(sentiment_score) as avg_score
FROM sentiment_analysis
WHERE dominant_primary_emotion IS NOT NULL
GROUP BY dominant_primary_emotion
ORDER BY frequency DESC;

-- ============================================
-- FUNCIÓN DE LIMPIEZA DE DATOS ANTIGUOS
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DATOS INICIALES (OPCIONAL)
-- ============================================

-- Insertar estadísticas iniciales para hoy
INSERT INTO analysis_stats (date, social_network, total_analyses)
SELECT CURRENT_DATE, network, 0
FROM (VALUES 
    ('email'), ('whatsapp'), ('twitter'), 
    ('facebook'), ('instagram'), ('linkedin')
) AS networks(network)
ON CONFLICT (date, social_network) DO NOTHING;

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE sentiment_analysis IS 'Tabla principal para almacenar análisis de sentimientos realizados';
COMMENT ON TABLE analysis_history IS 'Historial simplificado para dashboard y visualizaciones rápidas';
COMMENT ON TABLE analysis_stats IS 'Estadísticas agregadas por día y red social';
COMMENT ON TABLE api_logs IS 'Logs de todas las peticiones API para debugging y auditoría';

COMMENT ON COLUMN sentiment_analysis.primary_emotions IS 'JSONB con emociones primarias: {feliz, triste, enojado, neutral, asustado, sorprendido}';
COMMENT ON COLUMN sentiment_analysis.secondary_emotions IS 'JSONB con emociones secundarias: {optimista, pesimista, confiado, confundido, impaciente, agradecido}';
COMMENT ON COLUMN sentiment_analysis.sentiment_score IS 'Puntuación general de sentimiento de 0 (muy negativo) a 100 (muy positivo)';

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================