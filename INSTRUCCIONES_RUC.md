# Instrucciones para Configurar la Consulta de RUC

## API TuRUC

El sistema está configurado para usar la **API pública de TuRUC** (https://turuc.com.py/api).

### Características

- ✅ **No requiere autenticación** - La API es completamente pública
- ✅ **Sin configuración adicional** - Funciona inmediatamente
- ✅ **Documentación oficial**: https://docs.turuc.com.py

### Formato de RUC Aceptado

La API acepta RUC en los siguientes formatos:
- `80012345-5` (con guión y dígito verificador)
- `80012345` (sin dígito verificador)
- Entre 1 y 8 dígitos, opcionalmente seguidos de guión y un dígito verificador

### Uso en el Sistema

1. Ingresa el RUC en el campo correspondiente
2. Haz clic en el botón **"Consultar RUC"**
3. El sistema obtendrá automáticamente el nombre/razón social
4. Si la consulta falla, puedes ingresar el nombre manualmente

### Solución de Problemas

Si la consulta no funciona:

1. **Verifica el formato del RUC**: Debe ser válido según el formato paraguayo
2. **Revisa tu conexión a internet**: La API requiere conexión activa
3. **Verifica que el RUC exista**: Si el RUC no está registrado, aparecerá un error
4. **Usa entrada manual**: Si hay problemas con la API, siempre puedes ingresar el nombre manualmente

### Notas Importantes

- La API puede tener límites de consultas (rate limiting)
- Si el servicio está temporalmente no disponible, usa la entrada manual
- El RUC se valida antes de realizar la consulta
- El sistema maneja errores de forma elegante y permite continuar con entrada manual

## Solución de Problemas

Si la consulta de RUC no funciona:

1. Verifica tu conexión a internet
2. Revisa la consola del navegador para ver errores específicos
3. Verifica que tengas una API key válida (si es requerida)
4. Usa la entrada manual como alternativa

