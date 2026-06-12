// @ts-ignore: Deno global is provided by Supabase at runtime
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // 1. Manejar CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 2. Verificar API Key de Groq (Alternativa Gratuita)
    // @ts-ignore: Deno global
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) {
      console.error("LOG: Falta GROQ_API_KEY");
      return new Response(JSON.stringify({ error: 'Falta GROQ_API_KEY en secretos de Supabase' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // 3. Leer cuerpo de la petición
    const body = await req.json();
    const { childName, stats } = body;
    console.log(`LOG: Generando diagnóstico para ${childName} usando Groq...`);

    // 4. Prompt optimizado para un psicopedagogo
    const prompt = `Actúa como un psicopedagogo experto. Analiza el progreso de ${childName} y genera un diagnóstico pedagógico profesional basado en estos datos de juego: ${JSON.stringify(stats)}. 
    
    Responde UNICAMENTE con un JSON puro que siga esta estructura EXACTA:
    {
      "summary": "Resumen ejecutivo del desempeño",
      "cognitiveAnalysis": "Análisis de procesos cognitivos (memoria, atención, etc.)",
      "performanceObservations": ["observación 1", "observación 2"],
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
    }
    
    Importante: No incluyas texto fuera del JSON. No uses markdown. El tono debe ser profesional y alentador.`;

    // 5. Llamada a Groq (Llama 3.1 70B - Gratuito y Rápido)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          { role: 'system', content: 'Eres un psicopedagogo experto que solo responde en formato JSON puro.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      }),
    })

    if (!response.ok) {
      const errorData = await response.text();
      console.error("LOG: Error de Groq API:", errorData);
      throw new Error(`Groq API falló con estado ${response.status}: ${errorData}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices[0].message.content;

    console.log("LOG: Diagnóstico generado exitosamente con Groq");

    return new Response(content, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("LOG: Error en la Edge Function:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: "Verifica los logs de Supabase para más información."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
