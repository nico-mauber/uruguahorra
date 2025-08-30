# 🔧 GUÍA DE MANTENIMIENTO - URUGUAHORRA APP

## 📅 Rutinas de Mantenimiento

### 🔄 Rutinas Diarias
- [ ] Revisar logs de errores en producción
- [ ] Verificar métricas de performance en PostHog
- [ ] Monitorear uso de API y rate limits

### 📆 Rutinas Semanales

#### Lunes - Security Check
```bash
# Verificar vulnerabilidades
npm audit

# Revisar dependencias desactualizadas
npm outdated

# Verificar secretos expuestos
git secrets --scan
```

#### Miércoles - Code Quality
```bash
# Ejecutar linter
npm run lint

# Verificar tipos TypeScript
npx tsc --noEmit

# Buscar código muerto
npx ts-prune
```

#### Viernes - Performance Check
```bash
# Analizar bundle size
npm run build:web
du -sh web-build/

# Limpiar cache
expo start -c

# Ejecutar script de limpieza
./scripts/cleanup.sh --dry-run
```

### 📅 Rutinas Mensuales

#### Primera semana del mes
```bash
# Actualizar dependencias menores
npm update

# Limpiar y optimizar node_modules
npm prune
npm dedupe

# Backup de base de datos
# (configurar según tu setup de Supabase)
```

#### Tercera semana del mes
```bash
# Análisis profundo de código muerto
./scripts/cleanup.sh --verbose

# Performance audit con Lighthouse
# (ejecutar en el sitio web desplegado)

# Revisar y actualizar documentación
```

### 📅 Rutinas Trimestrales

#### Cada 3 meses
1. **Evaluación de actualizaciones major**
   ```bash
   npm outdated
   # Evaluar cambios breaking de cada paquete
   ```

2. **Security audit completo**
   ```bash
   npm audit fix --dry-run
   # Revisar cambios antes de aplicar
   ```

3. **Refactoring de deuda técnica**
   - Revisar TODO comments
   - Mejorar test coverage
   - Optimizar componentes pesados

4. **Backup completo**
   - Base de datos
   - Configuraciones
   - Variables de entorno

## 🎯 Métricas Objetivo (SLAs)

| Métrica | Objetivo | Actual | Estado |
|---------|----------|--------|--------|
| Build time | < 30s | ~30s | ✅ |
| Bundle size | < 1.5MB | ~1.4MB | ✅ |
| Vulnerabilidades | 0 | 0 | ✅ |
| Test coverage | > 70% | 0% | ❌ |
| Error rate | < 0.1% | N/A | ⏸️ |
| Cold start móvil | < 2s | N/A | ⏸️ |
| Cold start web | < 1s | N/A | ⏸️ |
| Cache hit ratio | > 80% | N/A | ⏸️ |
| Lighthouse score | > 90 | N/A | ⏸️ |

## 🛠️ Comandos Útiles

### Desarrollo
```bash
# Iniciar en modo desarrollo
npm start

# Limpiar cache y reiniciar
expo start -c

# Ejecutar linter con fix
npm run lint:fix

# Formatear código
npm run format
```

### Análisis
```bash
# Verificar dependencias no utilizadas
npx depcheck

# Buscar código muerto
npx ts-prune

# Analizar bundle
ANALYZE=true npm run build:web

# Contar líneas de código
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l
```

### Limpieza
```bash
# Ejecutar limpieza completa
./scripts/cleanup.sh

# Limpieza en modo dry-run
./scripts/cleanup.sh --dry-run --verbose

# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Seguridad
```bash
# Audit de seguridad
npm audit

# Fix automático (cuidado con breaking changes)
npm audit fix

# Ver detalles de vulnerabilidades
npm audit --json
```

## 📊 Monitoreo

### Herramientas Configuradas
- **PostHog**: Analytics y eventos
- **GitHub Actions**: CI/CD pipeline
- **npm audit**: Vulnerabilidades

### Herramientas Recomendadas (por configurar)
- **Sentry**: Error tracking en producción
- **Datadog/New Relic**: APM y métricas
- **LogRocket**: Session replay
- **Rollbar**: Error aggregation

## 🚨 Procedimientos de Emergencia

### Si el build falla
1. Verificar logs: `npm run build:web 2>&1 | tee build.log`
2. Limpiar cache: `expo start -c`
3. Reinstalar dependencias: `rm -rf node_modules && npm install`
4. Revertir último cambio: `git revert HEAD`

### Si hay vulnerabilidades críticas
1. Ejecutar: `npm audit`
2. Intentar fix automático: `npm audit fix`
3. Si persiste, actualizar manualmente el paquete afectado
4. Verificar compatibilidad con: `npm test`

### Si el performance degrada
1. Analizar bundle: `ANALYZE=true npm run build:web`
2. Revisar imports dinámicos
3. Implementar lazy loading
4. Optimizar imágenes y assets

## 📝 Checklist Pre-Deploy

- [ ] Todas las pruebas pasan (`npm test`)
- [ ] No hay vulnerabilidades críticas (`npm audit`)
- [ ] Linter sin errores (`npm run lint`)
- [ ] Build exitoso (`npm run build:web`)
- [ ] Bundle size < 1.5MB
- [ ] Variables de entorno configuradas
- [ ] Backup de base de datos realizado
- [ ] Changelog actualizado
- [ ] Version bumpeada en package.json

## 📚 Documentación Adicional

- [AUDIT-REPORT.md](./AUDIT-REPORT.md) - Reporte de auditoría completo
- [README.md](./README.md) - Documentación principal
- [.env.example](./.env.example) - Variables de entorno necesarias
- [scripts/cleanup.sh](./scripts/cleanup.sh) - Script de limpieza automatizado

## 🔄 Historial de Mantenimiento

### 2025-08-25
- ✅ Auditoría técnica completa
- ✅ Eliminación de 2000+ líneas de código muerto
- ✅ Fix de 8 vulnerabilidades de seguridad
- ✅ Optimización de configuración Metro
- ✅ Setup de CI/CD con GitHub Actions
- ✅ Creación de scripts de mantenimiento

---

**Última actualización:** 2025-08-25  
**Mantenido por:** Equipo de Desarrollo Uruguahorra