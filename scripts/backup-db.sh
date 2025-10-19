#!/bin/bash

# ============================================
# T2B Tech2Business - Database Backup Script
# Realiza backup de la base de datos
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

print_header "T2B Sentiment Analysis - Database Backup"

# Verificar que supabase CLI esté instalado
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI no está instalado"
    print_info "Instala con: npm install -g supabase"
    exit 1
fi

# Crear directorio de backups si no existe
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"
print_info "Directorio de backups: $BACKUP_DIR"

# Generar nombre de archivo con timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

print_info "Realizando backup de la base de datos..."

# Realizar backup
if supabase db dump -f "$BACKUP_FILE"; then
    print_success "Backup completado exitosamente"
    
    # Información del archivo
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_info "Archivo: $BACKUP_FILE"
    print_info "Tamaño: $FILE_SIZE"
    
    # Comprimir backup (opcional)
    print_info "Comprimiendo backup..."
    gzip "$BACKUP_FILE"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    
    print_success "Backup comprimido: $COMPRESSED_FILE"
    print_info "Tamaño comprimido: $COMPRESSED_SIZE"
    
    # Listar backups recientes
    echo ""
    print_info "Backups recientes:"
    ls -lh "$BACKUP_DIR" | tail -n 5
    
else
    print_error "Error al realizar el backup"
    exit 1
fi

# Limpiar backups antiguos (mantener últimos 7 días)
print_info "Limpiando backups antiguos (>7 días)..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete
print_success "Limpieza completada"

echo ""
print_success "Proceso completado! 🎉"