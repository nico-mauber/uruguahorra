// Script para cargar contenido educativo en la base de datos
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ebkzqfmppdntmynfjehh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVia3pxZm1wcGRudG15bmZqZWhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTQ3NDI0NSwiZXhwIjoyMDQxMDUwMjQ1fQ.q5oWzEJlxsJSEgKY1aOA4kf0Z0i3wLZQHhz0FPzQb8g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(filePath) {
  console.log(`Ejecutando ${filePath}...`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Dividir por sentencias (básicamente por los commits)
    const statements = sql.split('COMMIT;').filter(stmt => stmt.trim());
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + (i < statements.length - 1 ? '' : '');
      if (statement) {
        console.log(`Ejecutando bloque ${i + 1}/${statements.length}...`);
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          console.error(`Error en bloque ${i + 1}:`, error);
        } else {
          console.log(`Bloque ${i + 1} ejecutado exitosamente`);
        }
      }
    }
    
    console.log(`✓ ${filePath} ejecutado completamente`);
  } catch (error) {
    console.error(`Error ejecutando ${filePath}:`, error);
  }
}

async function loadEducationContent() {
  console.log('🚀 Iniciando carga de contenido educativo...');
  
  try {
    // 1. Primero ejecutar el schema de cards
    await executeSQL('./education-cards-schema.sql');
    
    // 2. Luego cargar el contenido
    await executeSQL('./education-content-data.sql');
    await executeSQL('./education-content-data-part2.sql');
    await executeSQL('./education-content-data-part3.sql');
    
    console.log('✅ ¡Contenido educativo cargado exitosamente!');
    
    // Verificar que se cargó correctamente
    const { data: modules, error: modulesError } = await supabase
      .from('education_modules')
      .select('*');
    
    if (modulesError) {
      console.error('Error verificando módulos:', modulesError);
    } else {
      console.log(`📚 ${modules.length} módulos cargados`);
    }
    
    const { data: cards, error: cardsError } = await supabase
      .from('education_cards')
      .select('*');
    
    if (cardsError) {
      console.error('Error verificando cards:', cardsError);
    } else {
      console.log(`📖 ${cards.length} cards cargadas`);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
loadEducationContent();