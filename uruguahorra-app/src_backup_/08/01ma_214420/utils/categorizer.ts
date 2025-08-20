/**
 * Categorizer - Utilidad para categorizar automáticamente transacciones
 * basándose en palabras clave en la descripción
 */

export type TransactionCategory =
  | 'transporte'
  | 'alimentacion'
  | 'restaurantes'
  | 'entretenimiento'
  | 'servicios'
  | 'salud'
  | 'educacion'
  | 'compras'
  | 'hogar'
  | 'finanzas'
  | 'otros';

interface CategoryRule {
  category: TransactionCategory;
  keywords: string[];
  priority: number; // Mayor prioridad = se evalúa primero
}

// Reglas de categorización ordenadas por prioridad
const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'transporte',
    priority: 10,
    keywords: [
      'uber',
      'cabify',
      'taxi',
      'gas',
      'nafta',
      'shell',
      'ancap',
      'esso',
      'petrobras',
      'axion',
      'estacionamiento',
      'parking',
      'peaje',
      'cutcsa',
      'copsa',
      'omnibus',
      'bus',
      'subte',
      'metro',
      'tren',
      'avion',
      'vuelo',
      'aeropuerto',
      'rental',
      'alquiler auto',
    ],
  },
  {
    category: 'alimentacion',
    priority: 9,
    keywords: [
      'supermercado',
      'super',
      'mercado',
      'disco',
      'devoto',
      'tienda inglesa',
      'macro',
      'geant',
      'carrefour',
      'tata',
      'multi ahorro',
      'kinko',
      'frog',
      'verduleria',
      'carniceria',
      'panaderia',
      'almacen',
      'kiosko',
      'despensa',
      'feria',
      'mercado agricola',
    ],
  },
  {
    category: 'restaurantes',
    priority: 8,
    keywords: [
      'restaurant',
      'resto',
      'mcdonald',
      'mcdonalds',
      'burger king',
      'subway',
      'starbucks',
      'cafe',
      'cafeteria',
      'pizzeria',
      'pizza',
      'sushi',
      'bar',
      'cerveceria',
      'parrilla',
      'chivito',
      'empanadas',
      'delivery',
      'pedidosya',
      'rappi',
      'uber eats',
      'comida',
      'almuerzo',
      'cena',
      'desayuno',
    ],
  },
  {
    category: 'entretenimiento',
    priority: 7,
    keywords: [
      'netflix',
      'spotify',
      'youtube',
      'disney',
      'hbo',
      'amazon prime',
      'apple tv',
      'cine',
      'movie',
      'teatro',
      'concierto',
      'show',
      'entrada',
      'ticket',
      'playstation',
      'xbox',
      'steam',
      'gaming',
      'libro',
      'libreria',
      'museo',
      'turismo',
      'hotel',
      'airbnb',
      'booking',
    ],
  },
  {
    category: 'servicios',
    priority: 6,
    keywords: [
      'antel',
      'ute',
      'ose',
      'movistar',
      'claro',
      'internet',
      'cable',
      'directv',
      'montecable',
      'nuevo siglo',
      'telefono',
      'celular',
      'luz',
      'agua',
      'gas',
      'electricidad',
      'saneamiento',
      'administracion',
      'gastos comunes',
      'alquiler',
      'renta',
      'seguro',
      'alarma',
    ],
  },
  {
    category: 'salud',
    priority: 5,
    keywords: [
      'farmacia',
      'farmashop',
      'san roque',
      'doctor',
      'medico',
      'clinica',
      'hospital',
      'britanico',
      'medica uruguaya',
      'casmu',
      'cosem',
      'suat',
      'emergencia',
      'laboratorio',
      'analisis',
      'estudio',
      'odonto',
      'dentista',
      'optica',
      'lentes',
      'fisioterapia',
      'psico',
      'terapia',
      'medicamento',
      'medicina',
      'veterinaria',
    ],
  },
  {
    category: 'educacion',
    priority: 4,
    keywords: [
      'universidad',
      'facultad',
      'escuela',
      'colegio',
      'liceo',
      'curso',
      'clase',
      'academia',
      'instituto',
      'capacitacion',
      'libro',
      'libreria',
      'papeleria',
      'utiles',
      'matricula',
      'cuota',
      'mensualidad',
      'beca',
      'seminario',
      'taller',
      'workshop',
      'conferencia',
    ],
  },
  {
    category: 'compras',
    priority: 3,
    keywords: [
      'zara',
      'h&m',
      'forever',
      'renner',
      'hering',
      'ropa',
      'calzado',
      'zapato',
      'zapatilla',
      'vestimenta',
      'shopping',
      'mall',
      'tienda',
      'boutique',
      'perfume',
      'cosmetic',
      'maquillaje',
      'accesorio',
      'joya',
      'reloj',
      'electronica',
      'tecnologia',
      'celular',
      'computadora',
      'notebook',
    ],
  },
  {
    category: 'hogar',
    priority: 2,
    keywords: [
      'ferreteria',
      'barraca',
      'pintura',
      'mueble',
      'decoracion',
      'jardin',
      'plomero',
      'electricista',
      'arreglo',
      'mantenimiento',
      'limpieza',
      'lavanderia',
      'tintoreria',
      'mudanza',
      'flete',
      'herramienta',
      'obra',
      'construccion',
      'reforma',
      'pintor',
      'albanil',
    ],
  },
  {
    category: 'finanzas',
    priority: 1,
    keywords: [
      'banco',
      'brou',
      'santander',
      'itau',
      'bbva',
      'scotiabank',
      'hsbc',
      'transferencia',
      'deposito',
      'retiro',
      'cajero',
      'atm',
      'prestamo',
      'credito',
      'tarjeta',
      'visa',
      'mastercard',
      'oca',
      'prex',
      'cambio',
      'giro',
      'western union',
      'abitab',
      'redpagos',
      'interes',
      'inversion',
    ],
  },
];

/**
 * Categoriza una transacción basándose en su descripción
 * @param description - Descripción de la transacción
 * @returns Categoría asignada
 */
export function categorize(description: string): TransactionCategory {
  if (!description || description.trim() === '') {
    return 'otros';
  }

  // Convertir a minúsculas y limpiar caracteres especiales
  const normalizedDesc = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s]/g, ' ') // Reemplazar caracteres especiales con espacios
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .trim();

  // Ordenar reglas por prioridad (mayor a menor)
  const sortedRules = [...CATEGORY_RULES].sort(
    (a, b) => b.priority - a.priority
  );

  // Buscar coincidencias
  for (const rule of sortedRules) {
    for (const keyword of rule.keywords) {
      // Buscar palabra clave como palabra completa o parte de una palabra
      const keywordPattern = new RegExp(`\\b${keyword}\\b|${keyword}`, 'i');
      if (keywordPattern.test(normalizedDesc)) {
        return rule.category;
      }
    }
  }

  // Si no se encuentra ninguna coincidencia, categorizar como "otros"
  return 'otros';
}

/**
 * Obtiene el nombre legible de una categoría
 * @param category - Categoría interna
 * @returns Nombre legible para mostrar al usuario
 */
export function getCategoryDisplayName(category: TransactionCategory): string {
  const displayNames: Record<TransactionCategory, string> = {
    transporte: 'Transporte',
    alimentacion: 'Alimentación',
    restaurantes: 'Restaurantes',
    entretenimiento: 'Entretenimiento',
    servicios: 'Servicios',
    salud: 'Salud',
    educacion: 'Educación',
    compras: 'Compras',
    hogar: 'Hogar',
    finanzas: 'Finanzas',
    otros: 'Otros',
  };

  return displayNames[category] || 'Otros';
}

/**
 * Obtiene el color asociado a una categoría para visualización
 * @param category - Categoría interna
 * @returns Color en formato hex
 */
export function getCategoryColor(category: TransactionCategory): string {
  const colors: Record<TransactionCategory, string> = {
    transporte: '#3B82F6', // Azul
    alimentacion: '#10B981', // Verde
    restaurantes: '#F59E0B', // Naranja
    entretenimiento: '#8B5CF6', // Violeta
    servicios: '#6B7280', // Gris
    salud: '#EF4444', // Rojo
    educacion: '#3B82F6', // Azul claro
    compras: '#EC4899', // Rosa
    hogar: '#84CC16', // Verde lima
    finanzas: '#06B6D4', // Cyan
    otros: '#9CA3AF', // Gris claro
  };

  return colors[category] || '#9CA3AF';
}

/**
 * Obtiene el icono asociado a una categoría
 * @param category - Categoría interna
 * @returns Nombre del icono de Ionicons
 */
export function getCategoryIcon(category: TransactionCategory): string {
  const icons: Record<TransactionCategory, string> = {
    transporte: 'car',
    alimentacion: 'cart',
    restaurantes: 'restaurant',
    entretenimiento: 'game-controller',
    servicios: 'build',
    salud: 'medkit',
    educacion: 'school',
    compras: 'pricetag',
    hogar: 'home',
    finanzas: 'cash',
    otros: 'ellipsis-horizontal',
  };

  return icons[category] || 'ellipsis-horizontal';
}

/**
 * Analiza múltiples transacciones y devuelve estadísticas de categorización
 * @param descriptions - Array de descripciones
 * @returns Estadísticas de categorización
 */
export function analyzeCategories(descriptions: string[]): {
  categoryCounts: Record<TransactionCategory, number>;
  totalTransactions: number;
  topCategory: TransactionCategory | null;
} {
  const categoryCounts: Record<string, number> = {};

  descriptions.forEach((desc) => {
    const category = categorize(desc);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  const sortedCategories = Object.entries(categoryCounts).sort(
    ([, a], [, b]) => b - a
  );

  return {
    categoryCounts: categoryCounts as Record<TransactionCategory, number>,
    totalTransactions: descriptions.length,
    topCategory:
      sortedCategories.length > 0
        ? (sortedCategories[0][0] as TransactionCategory)
        : null,
  };
}

/**
 * Sugiere categorías basándose en palabras parciales
 * Útil para autocompletado o sugerencias en tiempo real
 * @param partialDescription - Descripción parcial
 * @returns Array de categorías sugeridas ordenadas por relevancia
 */
export function suggestCategories(
  partialDescription: string
): TransactionCategory[] {
  if (!partialDescription || partialDescription.trim().length < 3) {
    return [];
  }

  const normalizedDesc = partialDescription.toLowerCase().trim();
  const suggestions = new Map<TransactionCategory, number>();

  CATEGORY_RULES.forEach((rule) => {
    let matchScore = 0;

    rule.keywords.forEach((keyword) => {
      if (
        keyword.includes(normalizedDesc) ||
        normalizedDesc.includes(keyword)
      ) {
        // Mayor puntaje si la coincidencia es al inicio de la palabra
        matchScore += keyword.startsWith(normalizedDesc) ? 3 : 1;
      }
    });

    if (matchScore > 0) {
      suggestions.set(rule.category, matchScore * rule.priority);
    }
  });

  // Ordenar por puntaje descendente
  return Array.from(suggestions.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([category]) => category);
}

// Exportar tipos y constantes útiles
export const TRANSACTION_CATEGORIES = [
  'transporte',
  'alimentacion',
  'restaurantes',
  'entretenimiento',
  'servicios',
  'salud',
  'educacion',
  'compras',
  'hogar',
  'finanzas',
  'otros',
] as const;

export default {
  categorize,
  getCategoryDisplayName,
  getCategoryColor,
  getCategoryIcon,
  analyzeCategories,
  suggestCategories,
};
