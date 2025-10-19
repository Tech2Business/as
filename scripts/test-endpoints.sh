#!/bin/bash

# ============================================
# T2B Tech2Business - Test Endpoints Script
# Prueba todos los endpoints del API
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

# Cargar variables de entorno
if [ -f ".env" ]; then
    source .env
else
    print_error "Archivo .env no encontrado"
    exit 1
fi

# Verificar variables requeridas
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    print_error "SUPABASE_URL y SUPABASE_ANON_KEY deben estar configurados en .env"
    exit 1
fi

BASE_URL="${SUPABASE_URL}/functions/v1"
AUTH_HEADER="Authorization: Bearer ${SUPABASE_ANON_KEY}"

print_header "T2B Sentiment Analysis - Test Endpoints"
echo ""
echo "Base URL: $BASE_URL"
echo ""

# ============================================
# TEST 1: HEALTH CHECK
# ============================================

print_header "Test 1: Health Check"

print_info "GET /health-check"

RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health-check")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Health check passed"
else
    print_error "Health check failed"
fi

echo ""
sleep 1

# ============================================
# TEST 2: ANALYZE SENTIMENT - POSITIVE
# ============================================

print_header "Test 2: Analyze Sentiment (Positive)"

print_info "POST /analyze-sentiment"

PAYLOAD='{
  "social_network": "email",
  "keywords": ["feliz", "contento", "satisfecho"],
  "content": "Estoy muy feliz y satisfecho con el servicio. Todo ha sido excelente y el equipo es muy amable. Definitivamente lo recomendaré."
}'

echo "Request Payload:"
echo "$PAYLOAD" | jq '.'

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}/analyze-sentiment" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo "Response Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Positive sentiment analysis passed"
    SENTIMENT_SCORE=$(echo "$BODY" | jq -r '.data.sentiment_score' 2>/dev/null)
    if [ ! -z "$SENTIMENT_SCORE" ]; then
        echo "Sentiment Score: $SENTIMENT_SCORE"
    fi
else
    print_error "Positive sentiment analysis failed"
fi

echo ""
sleep 2

# ============================================
# TEST 3: ANALYZE SENTIMENT - NEGATIVE
# ============================================

print_header "Test 3: Analyze Sentiment (Negative)"

print_info "POST /analyze-sentiment"

PAYLOAD='{
  "social_network": "whatsapp",
  "keywords": ["malo", "insatisfecho", "problema"],
  "content": "Estoy muy molesto con el servicio. Nada funciona correctamente y nadie responde mis consultas. Es terrible y muy frustrante."
}'

echo "Request Payload:"
echo "$PAYLOAD" | jq '.'

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}/analyze-sentiment" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo "Response Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Negative sentiment analysis passed"
    SENTIMENT_SCORE=$(echo "$BODY" | jq -r '.data.sentiment_score' 2>/dev/null)
    if [ ! -z "$SENTIMENT_SCORE" ]; then
        echo "Sentiment Score: $SENTIMENT_SCORE"
    fi
else
    print_error "Negative sentiment analysis failed"
fi

echo ""
sleep 2

# ============================================
# TEST 4: ANALYZE SENTIMENT - VALIDATION ERROR
# ============================================

print_header "Test 4: Validation Error (Empty Content)"

print_info "POST /analyze-sentiment"

PAYLOAD='{
  "social_network": "email",
  "keywords": [],
  "content": ""
}'

echo "Request Payload:"
echo "$PAYLOAD" | jq '.'

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}/analyze-sentiment" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo "Response Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "400" ]; then
    print_success "Validation error correctly returned"
else
    print_error "Expected 400 error but got $HTTP_CODE"
fi

echo ""
sleep 1

# ============================================
# TEST 5: GET HISTORY - NO FILTERS
# ============================================

print_header "Test 5: Get Analysis History (No Filters)"

print_info "GET /get-analysis-history?limit=5"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${BASE_URL}/get-analysis-history?limit=5")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Get history passed"
    TOTAL=$(echo "$BODY" | jq -r '.metadata.total' 2>/dev/null)
    if [ ! -z "$TOTAL" ]; then
        echo "Total analyses: $TOTAL"
    fi
else
    print_error "Get history failed"
fi

echo ""
sleep 1

# ============================================
# TEST 6: GET HISTORY - WITH FILTERS
# ============================================

print_header "Test 6: Get Analysis History (With Filters)"

print_info "GET /get-analysis-history?social_network=email&min_score=50&limit=10"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${BASE_URL}/get-analysis-history?social_network=email&min_score=50&limit=10")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Get history with filters passed"
else
    print_error "Get history with filters failed"
fi

echo ""
sleep 1

# ============================================
# TEST 7: GET HISTORY - WITH STATISTICS
# ============================================

print_header "Test 7: Get Analysis History (With Statistics)"

print_info "GET /get-analysis-history?include_stats=true&limit=5"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${BASE_URL}/get-analysis-history?include_stats=true&limit=5")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Get history with statistics passed"
    HAS_STATS=$(echo "$BODY" | jq 'has("statistics")' 2>/dev/null)
    if [ "$HAS_STATS" = "true" ]; then
        echo "Statistics included: ✓"
    fi
else
    print_error "Get history with statistics failed"
fi

echo ""
sleep 1

# ============================================
# TEST 8: METHOD NOT ALLOWED
# ============================================

print_header "Test 8: Method Not Allowed"

print_info "PUT /analyze-sentiment (should fail)"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PUT "${BASE_URL}/analyze-sentiment" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "405" ]; then
    print_success "Method not allowed correctly returned"
else
    print_error "Expected 405 error but got $HTTP_CODE"
fi

echo ""

# ============================================
# RESUMEN
# ============================================

print_header "Test Summary"
echo ""
echo "Todos los tests completados."
echo ""
echo "Verifica los resultados arriba para asegurarte de que:"
echo "1. ✓ Health check responde 200"
echo "2. ✓ Análisis de sentimiento positivo funciona"
echo "3. ✓ Análisis de sentimiento negativo funciona"
echo "4. ✓ Validación de errores funciona"
echo "5. ✓ Historial sin filtros funciona"
echo "6. ✓ Historial con filtros funciona"
echo "7. ✓ Historial con estadísticas funciona"
echo "8. ✓ Métodos no permitidos retornan 405"
echo ""
print_success "Testing completado! 🎉"