# 🚀 Guía Completa: Deploy en Vercel

## ✅ Lo que Necesitas

1. **Cuenta de Vercel** (gratis): https://vercel.com/signup
2. **Tu DATABASE_URL de Neon** (ya la tienes)
3. **Proyecto en Git** (opcional, pero recomendado)

## 📋 Paso a Paso

### Opción A: Deploy desde Git (Recomendado)

#### 1. Subir tu proyecto a GitHub/GitLab/Bitbucket

Si aún no tienes tu proyecto en Git:

```bash
# Inicializar Git (si no lo has hecho)
git init
git add .
git commit -m "Preparado para Vercel"

# Crear repositorio en GitHub y conectar
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

#### 2. Conectar con Vercel

1. Ve a https://vercel.com/login
2. Click en **"Add New Project"**
3. **Importa tu repositorio** de GitHub/GitLab/Bitbucket
4. Vercel detectará automáticamente que es Next.js

#### 3. Configurar Variables de Entorno

En la pantalla de configuración del proyecto:

1. Ve a la sección **"Environment Variables"**
2. Agrega estas variables:

```
DATABASE_URL = postgresql://neondb_owner:npg_Kt4oRPeVIE0a@ep-polished-hall-adp92fza-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
NEXT_TELEMETRY_DISABLED = 1
```

3. Selecciona **"Production", "Preview", y "Development"** para cada variable
4. Click en **"Deploy"**

#### 4. ¡Listo!

Vercel desplegará tu aplicación y te dará una URL como:
```
https://tu-proyecto.vercel.app
```

---

### Opción B: Deploy Directo (Sin Git)

#### 1. Instalar Vercel CLI

```bash
npm i -g vercel
```

#### 2. Login en Vercel

```bash
vercel login
```

Esto abrirá tu navegador para autenticarte.

#### 3. Deploy

Desde la carpeta de tu proyecto:

```bash
vercel
```

Sigue las instrucciones:
- **Set up and deploy?** → `Y`
- **Which scope?** → Selecciona tu cuenta
- **Link to existing project?** → `N` (primera vez)
- **What's your project's name?** → `gestion-imprenta` (o el que prefieras)
- **In which directory is your code located?** → `./` (Enter)
- **Want to override the settings?** → `N`

#### 4. Configurar Variables de Entorno

Después del primer deploy, configura las variables:

```bash
vercel env add DATABASE_URL
# Pega: postgresql://neondb_owner:npg_Kt4oRPeVIE0a@ep-polished-hall-adp92fza-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
# Selecciona: Production, Preview, Development

vercel env add NEXT_TELEMETRY_DISABLED
# Pega: 1
# Selecciona: Production, Preview, Development
```

#### 5. Redesplegar

```bash
vercel --prod
```

---

## 🔧 Configuración Adicional

### Dominio Personalizado (Opcional)

1. Ve a tu proyecto en Vercel
2. Settings → Domains
3. Agrega tu dominio personalizado

### Variables de Entorno desde Dashboard

También puedes configurarlas desde el dashboard:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega las variables manualmente

---

## ✅ Verificar que Funciona

Después del deploy:

1. Visita la URL que te dio Vercel
2. Verifica que la aplicación carga
3. Prueba crear una factura
4. Verifica que se guarda en Neon

---

## 🐛 Solución de Problemas

### Error: "Cannot find module"

```bash
# Asegúrate de que todas las dependencias estén en package.json
npm install
```

### Error de conexión a base de datos

1. Verifica que `DATABASE_URL` esté configurada correctamente
2. Verifica que la URL de Neon sea accesible desde internet
3. Revisa los logs en Vercel: Dashboard → Deployments → Click en el deployment → Logs

### Build falla

1. Revisa los logs del build en Vercel
2. Verifica que `next.config.js` esté correcto
3. Asegúrate de que no haya errores de TypeScript

---

## 📊 Monitoreo

Vercel te da:
- ✅ **Analytics** (con plan)
- ✅ **Logs** en tiempo real
- ✅ **Deployments** automáticos desde Git
- ✅ **Preview deployments** para cada PR

---

## 🎯 Ventajas de Vercel

- ✅ **Gratis** para proyectos personales
- ✅ **Deploy automático** desde Git
- ✅ **CDN global** (muy rápido)
- ✅ **SSL automático**
- ✅ **Perfecto para Next.js**
- ✅ **Excelente conectividad** a Neon

---

## 📝 Notas Importantes

1. **No subas `.env` o `.docker.env`** a Git (ya está en `.gitignore`)
2. **Las variables de entorno** se configuran en Vercel, no en archivos locales
3. **Cada push a Git** crea un nuevo deployment automáticamente
4. **Preview deployments** se crean para cada Pull Request

---

## 🚀 Siguiente Paso

Una vez desplegado, tu aplicación estará disponible públicamente y tu cliente podrá acceder sin problemas de firewall.

¿Necesitas ayuda con algún paso específico?

