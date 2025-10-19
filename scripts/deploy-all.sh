#!/bin/bash

# ============================================
# T2B Tech2Business - Deploy All Script
# Despliega el proyecto completo
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

# Verificar que supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI no está instalado"
    print_info "Instala con: npm install -g supabase"
    exit 1
fi

# Verificar que vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI no está instalado"
    print_info "Instala con: npm install -g vercel"
    exit 1
fi

print_header "T2B Sentiment Analysis - Deploy All"
echo ""

# Preguntar confirmación
read -p "¿Estás seguro de desplegar a PRODUCCIÓN? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Despliegue cancelado"
    exit 0
fi

echo ""
print_header "Paso 1: Verificando configuración"

# Verificar .env
if [ ! -f ".env" ]; then
    print_error "Archivo .env no encontrado"
    print_info "Copia .env.example a .env y completa las variables"
    exit 1
fi

source .env

# Verificar variables requeridas
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "GEMINI_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Variable $var no está configurada en .env"
        exit 1
    fi
done

print_success "Configuración verificada"
echo ""

# ============================================
# PASO 2: DESPLEGAR MIGRACIONES
# ============================================

print_header "Paso 2: Desplegando migraciones de base de datos"

if supabase db push; then
    print_success "Migraciones desplegadas correctamente"
else
    print_error "Error al desplegar migraciones"
    exit 1
fi

echo ""

# ============================================
# PASO 3: CONFIGURAR SECRETS
# ============================================

print_header "Paso 3: Configurando secrets de Supabase"

print_info "Configurando GEMINI_API_KEY..."
echo "$GEMINI_API_KEY" | supabase secrets set GEMINI_API_KEY

print_info "Configurando SUPABASE_URL..."
echo "$SUPABASE_URL" | supabase secrets set SUPABASE_URL

print_info "Configurando SUPABASE_ANON_KEY..."
echo "$SUPABASE_ANON_KEY" | supabase secrets set SUPABASE_ANON_KEY

print_success "Secrets configurados"
echo ""

# ============================================
# PASO 4: DESPLEGAR EDGE FUNCTIONS
# ============================================

print_header "Paso 4: Desplegando Edge Functions"

FUNCTIONS=("analyze-sentiment" "get-analysis-history" "health-check")

for func in "${FUNCTIONS[@]}"; do
    print_info "Desplegando $func..."
    if supabase functions deploy "$func" --no-verify-jwt; then
        print_success "$func desplegado"
    else
        print_error "Error al desplegar $func"
        exit 1
    fi
done

echo ""

# ============================================
# PASO 5: VERIFICAR FUNCIONES
# ============================================

print_header "Paso 5: Verificando Edge Functions"

# Esperar un momento para que las funciones estén listas
sleep 3

FUNCTIONS_URL="${SUPABASE_URL}/functions/v1"

# Probar health-check
print_info "Probando health-check..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${FUNCTIONS_URL}/health-check")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    print_success "Health check OK (HTTP 200)"
else
    print_error "Health check falló (HTTP $HEALTH_RESPONSE)"
fi

echo ""

# ============================================
# PASO 6: DESPLEGAR FRONTEND
# ============================================

print_header "Paso 6: Desplegando Frontend en Vercel"

print_info "Desplegando a Vercel..."

if vercel --prod --yes; then
    print_success "Frontend desplegado en Vercel"
else
    print_error "Error al desplegar en Vercel"
    exit 1
fi

echo ""

# ============================================
# PASO 7: VERIFICACIÓN FINAL
# ============================================

print_header "Paso 7: Verificación Final"

print_success "Despliegue completado exitosamente!"
echo ""
echo "URLs importantes:"
echo ""
echo "📡 API Base URL:"
echo "   ${SUPABASE_URL}/functions/v1"
echo ""
echo "🌐 Frontend URL:"
echo "   (Ver output de Vercel arriba)"
echo ""
echo "📊 Supabase Dashboard:"
echo "   https://app.supabase.com"
echo ""
echo "⚡ Vercel Dashboard:"
echo "   https://vercel.com"
echo ""
echo "Próximos pasos:"
echo "1. Verifica que el frontend cargue correctamente"
echo "2. Realiza una prueba de análisis de sentimiento"
echo "3. Revisa los logs: supabase functions logs"
echo ""
print_success "¡Todo listo! 🎉"