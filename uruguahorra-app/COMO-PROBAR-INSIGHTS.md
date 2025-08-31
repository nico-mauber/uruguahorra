# 🧪 Cómo Probar los Insights Psicológicos - Guía Paso a Paso

## 🎯 Los 3 Insights que Puedes Generar

### 1. **Mental Accounting** 🎯
- **Trigger**: >40% del gasto en una sola categoría
- **Mensaje**: "El X% de tus gastos van a [Categoría]. Tendemos a crear 'cuentas mentales' separadas..."

### 2. **Present Bias** 🔄  
- **Trigger**: ≥5 transacciones en 30 días
- **Mensaje**: "Realizaste X transacciones este mes. Los gastos pequeños y frecuentes pueden sumar..."

### 3. **Loss Aversion** 💸
- **Trigger**: >10% aumento en gasto mensual
- **Mensaje**: "Tus gastos aumentaron X% este mes. Es natural resistirse a 'perder' dinero..."

---

## 🚀 Método 1: Creación Manual Desde la App

### Paso 1: Mental Accounting (Más Fácil)
1. **Abre la app** y ve a la pantalla de transacciones
2. **Agrega 5-8 transacciones** de la misma categoría (ej: "Comida y Bebidas"):
   ```
   - Supermercado: $2000
   - Restaurante: $1500  
   - Delivery: $1200
   - Café: $800
   - Snacks: $600
   ```
3. **Agrega 1-2 transacciones** de otras categorías:
   ```
   - Transporte: $500
   - Entretenimiento: $400
   ```
4. **Ve a Analytics** → Deberías ver el insight "Mental Accounting"
5. **Cálculo**: $6100 en comida / $7000 total = 87% → Trigger activo ✅

### Paso 2: Present Bias (Automático)
- Si agregaste 5+ transacciones arriba, **automáticamente** tendrás el insight "Present Bias" ✅

### Paso 3: Loss Aversion (Más Complejo)
1. **Agrega transacciones del mes pasado** (cambiar fecha):
   ```
   - Fecha: hace 35 días
   - Monto total: $2000-3000
   ```
2. **Asegúrate que este mes** tenga mucho más gasto ($7000+ del paso 1)
3. **Ve a Analytics** → Deberías ver "Loss Aversion" ✅

---

## 🎮 Método 2: Usar Usuario de Prueba Específico  

### Preparación:
```sql
-- Ejecuta esto en Supabase SQL Editor para verificar el usuario:
SELECT * FROM auth.users WHERE email LIKE '%test%' OR id = '3f44afc7-3016-4c00-9fc0-b1f20e0ad35c';
```

### Si Existe el Usuario de Prueba:
1. **Login** con ese usuario en la app
2. **Ve directo a Analytics** → Deberías ver los 3 insights ya configurados
3. **Si no aparecen**, ejecuta:
   ```sql
   SELECT cleanup_today_transactions('3f44afc7-3016-4c00-9fc0-b1f20e0ad35c');
   ```

### Si NO Existe:
Sigue el **Método 1** con tu usuario normal.

---

## 🔧 Método 3: SQL Manual (Avanzado)

### Crear Datos de Prueba Directamente:
```sql
-- 1. Obtener tu user_id
SELECT id, email FROM auth.users WHERE email = 'tu-email@ejemplo.com';

-- 2. Limpiar datos existentes (opcional)
DELETE FROM public.transactions WHERE user_id = 'TU-USER-ID-AQUI';

-- 3. Obtener IDs de categorías
SELECT id, name FROM public.transaction_categories;

-- 4. Insertar datos calibrados (reemplaza los IDs):
INSERT INTO public.transactions (user_id, amount, description, transaction_date, category_id, category_name, category_emoji, type) VALUES
('TU-USER-ID-AQUI', 2000.00, 'Supermercado', CURRENT_DATE - 1, 'COMIDA-CATEGORY-ID', 'Comida y Bebidas', '🍔', 'expense'),
('TU-USER-ID-AQUI', 1500.00, 'Restaurante', CURRENT_DATE - 2, 'COMIDA-CATEGORY-ID', 'Comida y Bebidas', '🍔', 'expense'),
('TU-USER-ID-AQUI', 1200.00, 'Delivery', CURRENT_DATE - 3, 'COMIDA-CATEGORY-ID', 'Comida y Bebidas', '🍔', 'expense'),
('TU-USER-ID-AQUI', 800.00, 'Transporte', CURRENT_DATE - 4, 'TRANSPORTE-CATEGORY-ID', 'Transporte', '🚗', 'expense'),
('TU-USER-ID-AQUI', 600.00, 'Cine', CURRENT_DATE - 5, 'ENTRETENIMIENTO-CATEGORY-ID', 'Entretenimiento', '🎮', 'expense');

-- 5. Verificar que funcionó:
SELECT * FROM get_analytics_stats('TU-USER-ID-AQUI');
```

---

## 📱 Método 4: Testing en la App 

### Flujo Completo:
1. **Abre la app**
2. **Asegúrate que estás logueado**
3. **Agrega las transacciones** (Método 1)
4. **Ve a Analytics tab**
5. **Haz pull-to-refresh** (arrastra hacia abajo) para forzar actualización
6. **Revisa la sección "Insights Psicológicos"**

### Si NO Aparecen Insights:
1. **Verifica los datos**:
   ```sql
   SELECT * FROM get_analytics_stats('tu-user-id');
   ```
2. **Fuerza refresh** en analytics (pull-to-refresh)
3. **Revisa logs** en Expo/Metro bundler:
   ```
   Analytics data fetched successfully
   Personalized psychological insights generated
   ```

---

## 🐛 Troubleshooting

### "No aparecen insights"
```sql
-- Verifica que tienes suficientes transacciones:
SELECT 
    COUNT(*) as total_transactions,
    SUM(amount) as total_amount,
    COUNT(DISTINCT category_name) as categories_used
FROM public.transactions 
WHERE user_id = 'TU-USER-ID' 
AND transaction_date >= CURRENT_DATE - INTERVAL '30 days';

-- Debe devolver: total_transactions >= 5
```

### "Mental Accounting no aparece"
```sql
-- Verifica concentración por categoría:
SELECT 
    category_name,
    SUM(amount) as category_total,
    ROUND((SUM(amount) * 100.0 / (
        SELECT SUM(amount) FROM public.transactions 
        WHERE user_id = 'TU-USER-ID' 
        AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
    )), 2) as percentage
FROM public.transactions 
WHERE user_id = 'TU-USER-ID' 
AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY category_name 
ORDER BY percentage DESC;

-- Una categoría debe tener >40% para trigger
```

### "Datos corruptos"
```sql
-- Limpia todo y empezar fresh:
DELETE FROM public.transactions WHERE user_id = 'TU-USER-ID';
-- Luego sigue Método 1 o 3
```

---

## 🎉 Resultado Esperado

Cuando funcione correctamente, deberías ver en Analytics:

```
🧠 Insights Psicológicos

🎯 Concentración de Gasto Detectada
El 67% de tus gastos van a Comida y Bebidas. Tendemos a crear "cuentas mentales" separadas, pero es importante ver el panorama completo.
💡 Diversifica tus gastos: destina máximo 50% a Comida y Bebidas...

🔄 Patrón de Gastos Frecuentes  
Realizaste 7 transacciones este mes (promedio $857). Los gastos pequeños y frecuentes pueden sumar más de lo que esperamos.
💡 Implementa la regla del "día de espera": antes de compras menores a $50...

💸 Aumento en Gastos Detectado
Tus gastos aumentaron 150% este mes ($3000). Es natural resistirse a "perder" dinero, pero pequeños ajustes pueden revertir esta tendencia.  
💡 Revisa tu categoría principal (Comida y Bebidas) y establece un límite diario...
```

**¡Sigue cualquiera de estos métodos y tendrás insights funcionando!** 🚀