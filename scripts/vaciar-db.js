const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'facturas.db');

// Verificar si la base de datos existe
if (!fs.existsSync(dbPath)) {
  console.log('❌ La base de datos no existe en:', dbPath);
  process.exit(1);
}

try {
  console.log('🔌 Conectando a la base de datos...');
  const db = new Database(dbPath);

  // Verificar cuántas facturas hay antes de eliminar
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM facturas');
  const count = countStmt.get();
  console.log(`📊 Facturas encontradas: ${count.count}`);

  if (count.count === 0) {
    console.log('✅ La base de datos ya está vacía.');
    db.close();
    process.exit(0);
  }

  // Vaciar la tabla facturas
  console.log('🗑️  Eliminando todas las facturas...');
  const deleteStmt = db.prepare('DELETE FROM facturas');
  const result = deleteStmt.run();
  console.log(`✅ ${result.changes} factura(s) eliminada(s).`);

  // Optimizar la base de datos (VACUUM)
  console.log('🔧 Optimizando la base de datos...');
  db.exec('VACUUM');
  console.log('✅ Base de datos optimizada.');

  // Verificar que está vacía
  const finalCount = countStmt.get();
  console.log(`📊 Facturas restantes: ${finalCount.count}`);

  db.close();
  console.log('✅ ¡Base de datos vaciada exitosamente!');
} catch (error) {
  console.error('❌ Error al vaciar la base de datos:', error.message);
  process.exit(1);
}


