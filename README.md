# Sistema de Gestión de Facturas

Sistema completo para gestionar facturas con integración de API para consultar RUC en Paraguay y generación de documentos Word.

## Características

- ✅ Carga de facturas con todos los datos requeridos
- ✅ Consulta automática de RUC para obtener nombre/razón social
- ✅ Almacenamiento en base de datos SQLite
- ✅ Generación de documentos Word con todas las facturas en formato tabla
- ✅ Interfaz moderna y responsive
- ✅ Next.js 14 con TypeScript

## Tecnologías

- **Next.js 14** - Framework React con API Routes
- **TypeScript** - Tipado estático
- **SQLite** - Base de datos local (better-sqlite3)
- **docx** - Generación de documentos Word
- **CSS Modules** - Estilos personalizados

## Instalación

1. Instalar dependencias:

```bash
npm install
```

**Nota para Windows:** Si encuentras problemas al instalar `better-sqlite3` (dependencias nativas), asegúrate de tener:
- Python 3.x instalado
- Build tools de Visual Studio (Visual Studio Build Tools o Visual Studio con C++ workload)
- O instala usando: `npm install --build-from-source better-sqlite3`

2. Ejecutar en desarrollo:

```bash
npm run dev
```

3. Abrir en el navegador:

```
http://localhost:3000
```

## Uso

### Cargar una Factura

1. Completa el formulario con los datos de la factura
2. Ingresa el RUC y haz clic en "Consultar RUC" para obtener automáticamente el nombre
3. Si la consulta no funciona, puedes ingresar el nombre manualmente
4. Haz clic en "Guardar Factura"

### Generar Documento Word

1. Haz clic en el botón "Generar Word" en la sección de facturas registradas
2. Se descargará un documento Word con todas las facturas en formato tabla

## API para Consultar RUC

El sistema utiliza la **API pública de TuRUC** (https://turuc.com.py/api) que:

- ✅ No requiere autenticación ni API key
- ✅ Funciona inmediatamente sin configuración
- ✅ Consulta datos oficiales de la DNIT de Paraguay

**Documentación completa:** https://docs.turuc.com.py

**Formato de RUC aceptado:** 1-8 dígitos, opcionalmente seguidos de guión y dígito verificador (ej: `80012345-5`)

Si la API no está disponible o hay algún problema, siempre puedes ingresar el nombre del cliente manualmente.

## Estructura del Proyecto

```
├── app/
│   ├── api/
│   │   ├── facturas/
│   │   │   ├── route.ts          # CRUD de facturas
│   │   │   └── word/
│   │   │       └── route.ts      # Generación de Word
│   │   └── ruc/
│   │       └── route.ts          # Consulta de RUC
│   ├── globals.css               # Estilos globales
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Página principal
├── lib/
│   ├── db.ts                     # Configuración SQLite
│   └── ruc-api.ts                # Lógica de consulta RUC
├── types/
│   └── factura.ts                # Tipos TypeScript
└── facturas.db                   # Base de datos SQLite (se crea automáticamente)
```

## Base de Datos

La base de datos SQLite se crea automáticamente al iniciar la aplicación. El esquema incluye:

- **facturas**: Tabla principal con todos los datos de las facturas
  - id (PK)
  - numero_factura (único)
  - fecha_emision
  - nombre_cliente
  - ruc
  - cantidad
  - descripcion
  - costo_final
  - created_at

## Producción

### Aplicación Web

Para generar una versión de producción web:

```bash
npm run build
npm start
```

### Aplicación de Escritorio (Tauri)

Para generar un instalador de escritorio, consulta [INSTALADOR.md](./INSTALADOR.md)

```bash
npm run tauri:build
```

**Nota importante**: Las API routes de Next.js no funcionan con export estático. Para producción con Tauri, necesitarás migrar las API routes a comandos de Tauri. Ver [NOTA_TAURI_API.md](./NOTA_TAURI_API.md) para más detalles.

## Notas

- La base de datos SQLite se crea en la raíz del proyecto como `facturas.db`
- El archivo `.gitignore` está configurado para excluir la base de datos
- Los documentos Word se generan con formato profesional incluyendo tabla completa y totales

