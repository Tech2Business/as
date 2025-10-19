# 🆘 Guía de Ayuda Rápida

## 📋 Orden de Implementación Recomendado

### 1. Configuración Inicial
```bash
# Copiar archivos de configuración
.env.example → .env (y completar valores)
package.json
vercel.json
.gitignore
supabase/config.toml
```

### 2. Backend (Base de Datos)
```bash
# Migración de base de datos
supabase/migrations/001_initial_sentiment_analysis.sql
```

### 3. Backend (Shared)
```bash
# Código compartido
supabase/functions/_shared/types.ts
supabase/functions/_shared/utils.ts
supabase/functions/_shared/constants.ts
```

### 4. Backend (Edge Functions)
```bash
# Funciones serverless
supabase/functions/analyze-sentiment/index.ts
supabase/functions/get-analysis-history/index.ts
supabase/functions/health-check/index.ts
```

### 5. Frontend (CSS)
```bash
# Estilos
css/brand-colors.css
css/style.css
```

### 6. Frontend (JavaScript)
```bash
# Lógica
js/api-client.js
js/dashboard.js
js/app.js
```

### 7. Frontend (HTML)
```bash
# Interfaz
index.html
```

### 8. Documentación
```bash
# Docs
README.md
DEPLOYMENT_GUIDE.md
QUICK_START.md
FRONTEND_SETUP.md
docs/*.md
```

### 9. Scripts
```bash
# Automatización
setup.sh
scripts/*.sh
```

## 🔧 Comandos Útiles

### Verificar estructura
```bash
tree -L 3
ls -la
```

### Contar archivos
```bash
find . -type f | wc -l
find . -type d | wc -l
```

### Buscar archivo
```bash
find . -name "api-client.js"
```

### Ver contenido de archivo
```bash
cat README.md
less README.md
```

### Editar archivo
```bash
nano js/api-client.js
vim js/api-client.js
code js/api-client.js  # VS Code
```

## 📝 Copiar Contenido de Artifacts

### Método 1: Copiar y Pegar
1. Abrir archivo vacío: `nano nombre-archivo.js`
2. Copiar contenido del artifact
3. Pegar en el editor
4. Guardar: Ctrl+O, Enter, Ctrl+X

### Método 2: Usando echo (para archivos pequeños)
```bash
echo "contenido" > archivo.txt
```

### Método 3: Usando cat con heredoc
```bash
cat > archivo.txt << 'EOF'
contenido aquí
