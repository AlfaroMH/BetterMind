export interface LevelProgressRecord {
  module_name: string;
  game_id: string;
  level: number;
  high_score: number;
  total_errors: number;
  is_unlocked: number;
}

/**
 * La estructura de diagnóstico es ahora 100% dinámica.
 * La IA puede devolver cualquier campo dentro de estas categorías.
 */
export interface AIDiagnosis {
  childName: string;
  isParent: boolean;
  summary: string; // Resumen ejecutivo generado por IA
  cognitiveAnalysis: string; // Análisis profundo de procesos cognitivos
  performanceObservations: {
    text: string;
    type: 'positive' | 'negative' | 'neutral';
  }[]; // Lista de observaciones detectadas con su tipo
  conclusion: string; // Conclusión final y visión a futuro
  personalizedPlan: {
    title: string;
    steps: string[];
    focusArea: string;
    estimatedTime: string;
  };
  recommendations: {
    title: string;
    description: string;
    priority: 'alta' | 'media' | 'baja';
  }[];
}

/**
 * CONFIGURACIÓN DE IA (GROQ - Alternativa Gratuita)
 * Groq ofrece acceso gratuito a modelos potentes como Llama 3.
 * Consigue tu API Key en: https://console.groq.com/
 */
const GROQ_API_KEY = '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'; // Reemplaza con tu clave real
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Mapeo de IDs de juegos a nombres amigables para el diagnóstico.
 */
const GAME_NAME_MAP: Record<string, string> = {
  'suma': 'Suma',
  'resta': 'Resta',
  'multi': 'Multiplicación',
  'divi': 'División',
  'frac_read': 'Lectura de Fracciones',
  'frac_ops': 'Operaciones con Fracciones',
  'plano': 'Plano Cartesiano',
  'porcentajes': 'Porcentajes',
  'proporciones': 'Proporciones',
  'probabilidad': 'Probabilidad',
  'negativos': 'Números Negativos',
  'potencias': 'Potencias y Raíces',
};

function getFriendlyGameName(gameId: string): string {
  // Extraer el tipo de juego (ej: m5_suma -> suma)
  const type = gameId.replace(/^m\d_/, '');
  return GAME_NAME_MAP[type] || type;
}

/**
 * Genera un diagnóstico REAL utilizando la API de Groq (Llama 3).
 * Se ejecuta directamente en el cliente para evitar problemas de despliegue.
 */
export async function getAIDiagnosis(childName: string, progress: LevelProgressRecord[]): Promise<AIDiagnosis | string> {
  if (progress.length === 0 || progress.every(p => p.high_score === 0)) {
    return `Aún no hay suficientes datos de juego para que el Agente de IA analice a ${childName}. ¡Anímale a jugar más niveles!`;
  }

  try {
    const stats = progress.map(p => ({
      juego: getFriendlyGameName(p.game_id),
      modulo: p.module_name,
      nivel: p.level,
      puntaje: p.high_score,
      errores: p.total_errors,
      completado: p.high_score >= 100
    }));

    const prompt = `Actúa como un psicopedagogo experto. Analiza el progreso de ${childName} y genera un diagnóstico pedagógico profesional basado en estos datos de juego: ${JSON.stringify(stats)}. 
    
    IMPORTANTE PARA LA PRIORIDAD Y COLORES:
    - En "performanceObservations", clasifica cada observación con un "type":
        * "positive": Para logros, niveles completados o buenos puntajes (Se mostrará en VERDE con un chulito).
        * "negative": Para temas NO INICIADOS, NO COMPLETADOS o con muchos errores (Se mostrará en ROJO con una alerta).
        * "neutral": Para temas en progreso o observaciones generales (Se mostrará en NARANJA).
    - En "recommendations", asigna prioridad:
        * "alta": Para aspectos urgentes a trabajar (ROJO).
        * "media": Para refuerzos necesarios (NARANJA).
        * "baja": Para sugerencias de mantenimiento o felicitaciones (VERDE).
    
    IMPORTANTE PARA LOS NOMBRES:
    - Utiliza siempre los nombres completos de los juegos (ej: "División" en lugar de "divi", "Operaciones con Fracciones" en lugar de "frac_ops").
    
    Responde UNICAMENTE con un JSON puro que siga esta estructura EXACTA (sin markdown, sin texto extra):
    {
      "summary": "Resumen ejecutivo del desempeño",
      "cognitiveAnalysis": "Análisis de procesos cognitivos (memoria, atención, etc.)",
      "performanceObservations": [
        { "text": "Observación 1", "type": "positive" },
        { "text": "Observación 2", "type": "negative" }
      ],
      "personalizedPlan": {
        "title": "Título del plan",
        "steps": ["paso 1", "paso 2"],
        "focusArea": "Área principal a mejorar",
        "estimatedTime": "Tiempo estimado"
      },
      "recommendations": [
        { "title": "Recomendación 1", "description": "Descripción", "priority": "alta" }
      ],
      "conclusion": "Conclusión final"
    }`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Eres un asistente experto en pedagogía que solo responde en formato JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Groq API:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return `Error de la IA: ${errorJson.error?.message || 'Error desconocido'}`;
      } catch (e) {
        return `Error de la IA (Status ${response.status}): ${errorText.substring(0, 100)}`;
      }
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parseamos el JSON generado por la IA
    try {
      // Limpiamos posible markdown si el modelo lo incluye a pesar del prompt
      const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedContent) as AIDiagnosis;
    } catch (parseError) {
      console.error('Error parseando JSON de IA:', parseError, content);
      return "La IA generó una respuesta pero no pudo ser procesada correctamente. Por favor, intenta de nuevo.";
    }

  } catch (err) {
    console.error('Error del Agente de IA (Groq):', err);
    return "El Agente de IA gratuito está experimentando mucha carga o la API Key no es válida. Por favor, verifica tu configuración en ai-service.ts.";
  }
}
