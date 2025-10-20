// ============================================
// T2B Tech2Business - Supabase Diagnostic Tool
// Verificar conexión y credenciales de Supabase
// ============================================

class SupabaseDiagnostic {
  constructor() {
    this.results = {};
  }

  async runFullTest() {
    console.log('🔍 Iniciando diagnóstico de Supabase...\n');
    
    await this.testCredentials();
    await this.testConnection();
    await this.testTableAccess();
    await this.testInsert();
    await this.testUpdate();
    await this.testDelete();
    
    this.printSummary();
  }

  async testCredentials() {
    console.log('🔑 1. Verificando credenciales...');
    
    if (!window.sentimentAPI) {
      console.log('   ❌ sentimentAPI no está disponible');
      this.results.credentials = false;
      return;
    }

    const url = window.sentimentAPI.SUPABASE_URL;
    const key = window.sentimentAPI.SUPABASE_ANON_KEY;

    console.log(`   URL: ${url ? '✅ Configurada' : '❌ NO configurada'}`);
    console.log(`   Key: ${key && key.length > 0 ? '✅ Configurada (' + key.length + ' caracteres)' : '❌ NO configurada'}`);

    if (!url || !key || key.length === 0) {
      console.log('   ❌ Credenciales incompletas');
      this.results.credentials = false;
      return;
    }

    // Verificar formato de URL
    const urlPattern = /^https:\/\/.+\.supabase\.co$/;
    if (!urlPattern.test(url)) {
      console.log('   ⚠️ URL no tiene el formato esperado de Supabase');
    }

    // Verificar formato de Key (JWT)
    const jwtPattern = /^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
    if (!jwtPattern.test(key)) {
      console.log('   ⚠️ Key no tiene el formato esperado de JWT');
    }

    console.log('   ✅ Credenciales configuradas correctamente');
    this.results.credentials = true;
  }

  async testConnection() {
    console.log('\n🌐 2. Probando conexión a Supabase...');

    if (!this.results.credentials) {
      console.log('   ⏭️ Saltando (credenciales no configuradas)');
      this.results.connection = false;
      return;
    }

    try {
      const url = window.sentimentAPI.SUPABASE_URL;
      const key = window.sentimentAPI.SUPABASE_ANON_KEY;

      const response = await fetch(`${url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });

      if (response.status === 200) {
        console.log('   ✅ Conexión exitosa');
        this.results.connection = true;
      } else if (response.status === 401) {
        console.log('   ❌ Error 401: Credenciales inválidas o expiradas');
        console.log('   💡 Solución: Verifica tu Supabase API Key en api-client.js');
        this.results.connection = false;
        this.results.error401 = true;
      } else {
        console.log(`   ⚠️ Respuesta inesperada: ${response.status}`);
        this.results.connection = false;
      }

    } catch (error) {
      console.log(`   ❌ Error de red: ${error.message}`);
      this.results.connection = false;
    }
  }

  async testTableAccess() {
    console.log('\n📊 3. Verificando acceso a tabla channel_configs...');

    if (!this.results.connection) {
      console.log('   ⏭️ Saltando (sin conexión)');
      this.results.tableAccess = false;
      return;
    }

    try {
      const url = window.sentimentAPI.SUPABASE_URL;
      const key = window.sentimentAPI.SUPABASE_ANON_KEY;

      const response = await fetch(`${url}/rest/v1/channel_configs?select=count`, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const data = await response.json();
        console.log(`   ✅ Tabla accesible`);
        console.log(`   📊 Registros en tabla: ${data.length || 'desconocido'}`);
        this.results.tableAccess = true;
      } else if (response.status === 404) {
        console.log('   ❌ Error 404: Tabla channel_configs no existe');
        console.log('   💡 Solución: Crea la tabla en Supabase Dashboard');
        this.results.tableAccess = false;
      } else if (response.status === 403) {
        console.log('   ❌ Error 403: Sin permisos para acceder a la tabla');
        console.log('   💡 Solución: Configura Row Level Security en Supabase');
        this.results.tableAccess = false;
      } else {
        console.log(`   ⚠️ Respuesta inesperada: ${response.status}`);
        this.results.tableAccess = false;
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.results.tableAccess = false;
    }
  }

  async testInsert() {
    console.log('\n💾 4. Probando INSERT (crear registro)...');

    if (!this.results.tableAccess) {
      console.log('   ⏭️ Saltando (tabla no accesible)');
      this.results.insert = false;
      return;
    }

    try {
      const url = window.sentimentAPI.SUPABASE_URL;
      const key = window.sentimentAPI.SUPABASE_ANON_KEY;

      const testData = {
        channel_type: 'email',
        channel_name: 'Test Diagnóstico',
        config_data: {
          name: 'Test Diagnóstico',
          email: 'test@diagnostic.com',
          department: 'QA'
        },
        is_active: true
      };

      const response = await fetch(`${url}/rest/v1/channel_configs`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(testData)
      });

      if (response.status === 201) {
        const created = await response.json();
        this.testRecordId = created[0]?.id;
        console.log(`   ✅ INSERT exitoso (ID: ${this.testRecordId})`);
        this.results.insert = true;
      } else if (response.status === 403) {
        console.log('   ❌ Error 403: Sin permisos para INSERT');
        console.log('   💡 Solución: Habilita INSERT en RLS policies');
        this.results.insert = false;
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error ${response.status}: ${errorText}`);
        this.results.insert = false;
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.results.insert = false;
    }
  }

  async testUpdate() {
    console.log('\n✏️ 5. Probando UPDATE (actualizar registro)...');

    if (!this.results.insert || !this.testRecordId) {
      console.log('   ⏭️ Saltando (no hay registro de prueba)');
      this.results.update = false;
      return;
    }

    try {
      const url = window.sentimentAPI.SUPABASE_URL;
      const key = window.sentimentAPI.SUPABASE_ANON_KEY;

      const updateData = {
        channel_name: 'Test Diagnóstico (Actualizado)'
      };

      const response = await fetch(`${url}/rest/v1/channel_configs?id=eq.${this.testRecordId}`, {
        method: 'PATCH',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      });

      if (response.status === 200) {
        console.log(`   ✅ UPDATE exitoso`);
        this.results.update = true;
      } else if (response.status === 403) {
        console.log('   ❌ Error 403: Sin permisos para UPDATE');
        console.log('   💡 Solución: Habilita UPDATE en RLS policies');
        this.results.update = false;
      } else {
        console.log(`   ❌ Error ${response.status}`);
        this.results.update = false;
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.results.update = false;
    }
  }

  async testDelete() {
    console.log('\n🗑️ 6. Probando DELETE (eliminar registro de prueba)...');

    if (!this.testRecordId) {
      console.log('   ⏭️ Saltando (no hay registro de prueba)');
      this.results.delete = false;
      return;
    }

    try {
      const url = window.sentimentAPI.SUPABASE_URL;
      const key = window.sentimentAPI.SUPABASE_ANON_KEY;

      const response = await fetch(`${url}/rest/v1/channel_configs?id=eq.${this.testRecordId}`, {
        method: 'DELETE',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 204 || response.status === 200) {
        console.log(`   ✅ DELETE exitoso (registro de prueba eliminado)`);
        this.results.delete = true;
      } else if (response.status === 403) {
        console.log('   ❌ Error 403: Sin permisos para DELETE');
        console.log('   💡 Solución: Habilita DELETE en RLS policies');
        this.results.delete = false;
      } else {
        console.log(`   ❌ Error ${response.status}`);
        this.results.delete = false;
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.results.delete = false;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN DEL DIAGNÓSTICO DE SUPABASE');
    console.log('='.repeat(60));

    const tests = [
      { name: 'Credenciales', result: this.results.credentials },
      { name: 'Conexión', result: this.results.connection },
      { name: 'Acceso a Tabla', result: this.results.tableAccess },
      { name: 'INSERT', result: this.results.insert },
      { name: 'UPDATE', result: this.results.update },
      { name: 'DELETE', result: this.results.delete }
    ];

    let passed = 0;
    let total = tests.length;

    tests.forEach(test => {
      const status = test.result === true ? '✅' : test.result === false ? '❌' : '⏭️';
      console.log(`${status} ${test.name}`);
      if (test.result === true) passed++;
    });

    console.log('\n' + '='.repeat(60));
    
    if (passed === total) {
      console.log('🎉 PERFECTO: Base de datos completamente funcional');
      console.log('✅ Los datos se guardarán correctamente en Supabase');
    } else if (passed >= 3) {
      console.log('⚠️ PARCIAL: Algunas funciones no están disponibles');
      console.log('💡 Revisa los errores arriba para más detalles');
    } else {
      console.log('❌ CRÍTICO: Base de datos no funcional');
      console.log('⚠️ Los datos solo se guardarán en localStorage');
      
      if (this.results.error401) {
        console.log('\n🔑 PROBLEMA: Credenciales inválidas');
        console.log('📝 SOLUCIÓN:');
        console.log('   1. Ve a https://supabase.com/dashboard');
        console.log('   2. Selecciona tu proyecto');
        console.log('   3. Ve a Settings > API');
        console.log('   4. Copia la "URL" y "anon public" key');
        console.log('   5. Actualiza api-client.js con las nuevas credenciales');
      }
    }

    console.log('='.repeat(60) + '\n');
  }

  // Método para obtener las credenciales actuales
  showCredentials() {
    console.log('\n🔑 Credenciales actuales:');
    console.log('─'.repeat(60));
    
    if (!window.sentimentAPI) {
      console.log('❌ sentimentAPI no disponible');
      return;
    }

    const url = window.sentimentAPI.SUPABASE_URL;
    const key = window.sentimentAPI.SUPABASE_ANON_KEY;

    console.log('URL:');
    console.log(`  ${url || 'NO CONFIGURADA'}`);
    console.log('\nAPI Key (primeros 30 caracteres):');
    console.log(`  ${key ? key.substring(0, 30) + '...' : 'NO CONFIGURADA'}`);
    console.log('─'.repeat(60));
    
    console.log('\n💡 Para actualizar las credenciales:');
    console.log('   window.sentimentAPI.init(nuevaURL, nuevaKey)');
    console.log('\nEjemplo:');
    console.log('   window.sentimentAPI.init(');
    console.log('     "https://tuproyecto.supabase.co",');
    console.log('     "eyJhbGciOi..."');
    console.log('   )');
  }

  // Método para actualizar credenciales temporalmente
  updateCredentials(newUrl, newKey) {
    if (!window.sentimentAPI) {
      console.log('❌ sentimentAPI no disponible');
      return;
    }

    window.sentimentAPI.init(newUrl, newKey);
    console.log('✅ Credenciales actualizadas temporalmente');
    console.log('⚠️ Esto solo afecta la sesión actual');
    console.log('💡 Para hacerlo permanente, actualiza api-client.js');
  }

  // Método para verificar RLS (Row Level Security)
  async checkRLS() {
    console.log('\n🔒 Verificando Row Level Security (RLS)...');

    if (!this.results.connection) {
      console.log('❌ No hay conexión a Supabase');
      return;
    }

    console.log('\n💡 Para que la app funcione, necesitas:');
    console.log('   1. RLS habilitado en la tabla channel_configs');
    console.log('   2. Política que permita SELECT para usuarios anónimos');
    console.log('   3. Política que permita INSERT para usuarios anónimos');
    console.log('   4. Política que permita UPDATE para usuarios anónimos');
    console.log('   5. Política que permita DELETE para usuarios anónimos');

    console.log('\n📝 SQL para crear las políticas:');
    console.log('─'.repeat(60));
    console.log(`
-- Habilitar RLS
ALTER TABLE channel_configs ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (lectura)
CREATE POLICY "Enable read access for all users" ON channel_configs
  FOR SELECT USING (true);

-- Política para INSERT (crear)
CREATE POLICY "Enable insert access for all users" ON channel_configs
  FOR INSERT WITH CHECK (true);

-- Política para UPDATE (actualizar)
CREATE POLICY "Enable update access for all users" ON channel_configs
  FOR UPDATE USING (true);

-- Política para DELETE (eliminar)
CREATE POLICY "Enable delete access for all users" ON channel_configs
  FOR DELETE USING (true);
    `);
    console.log('─'.repeat(60));
    console.log('\n⚠️ NOTA: Estas políticas permiten acceso completo.');
    console.log('   En producción, deberías usar políticas más restrictivas.');
  }
}

// Exportar globalmente
window.SupabaseDiagnostic = new SupabaseDiagnostic();

// Funciones de acceso rápido
window.testSupabase = () => window.SupabaseDiagnostic.runFullTest();
window.showSupabaseCredentials = () => window.SupabaseDiagnostic.showCredentials();
window.updateSupabaseCredentials = (url, key) => window.SupabaseDiagnostic.updateCredentials(url, key);
window.checkSupabaseRLS = () => window.SupabaseDiagnostic.checkRLS();

console.log('\n🔧 Supabase Diagnostic Tool cargado');
console.log('📝 Comandos disponibles:');
console.log('   testSupabase()                    - Ejecutar diagnóstico completo');
console.log('   showSupabaseCredentials()         - Ver credenciales actuales');
console.log('   updateSupabaseCredentials(url, key) - Actualizar credenciales');
console.log('   checkSupabaseRLS()                - Ver políticas RLS necesarias');
console.log('');