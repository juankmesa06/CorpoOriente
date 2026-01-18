import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * ENDPOINT PÚBLICO: Maneja respuestas de recordatorios
 * 
 * Permite a pacientes confirmar o cancelar citas mediante un token único.
 * No requiere autenticación (acceso por token).
 * 
 * Query params:
 * - token: Token único del recordatorio
 * - action: 'confirm' | 'cancel'
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    const action = url.searchParams.get('action')

    // Validar parámetros
    if (!token) {
      return generateHtmlResponse('error', 'Token no proporcionado')
    }

    if (!action || !['confirm', 'cancel'].includes(action)) {
      return generateHtmlResponse('error', 'Acción no válida. Use: confirm o cancel')
    }

    console.log(`Procesando respuesta: token=${token.substring(0, 8)}..., action=${action}`)

    // Procesar respuesta usando la función de base de datos
    const { data: result, error } = await supabase
      .rpc('process_reminder_response', {
        _token: token,
        _action: action
      })

    if (error) {
      console.error('Error procesando respuesta:', error)
      return generateHtmlResponse('error', 'Error al procesar la solicitud')
    }

    console.log('Resultado:', result)

    if (result.success) {
      return generateHtmlResponse('success', result.message, action)
    } else {
      return generateHtmlResponse('error', result.error)
    }

  } catch (error) {
    console.error('Error:', error)
    return generateHtmlResponse('error', 'Error interno del servidor')
  }
})

/**
 * Genera una respuesta HTML amigable para el usuario
 */
function generateHtmlResponse(type: 'success' | 'error', message: string, action?: string): Response {
  const isSuccess = type === 'success'
  const icon = isSuccess 
    ? (action === 'confirm' ? '✅' : '❌')
    : '⚠️'
  const title = isSuccess
    ? (action === 'confirm' ? 'Cita Confirmada' : 'Cita Cancelada')
    : 'Error'
  const bgColor = isSuccess
    ? (action === 'confirm' ? '#10B981' : '#F59E0B')
    : '#EF4444'

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Sistema de Citas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 12px;
      color: ${bgColor};
    }
    .message {
      font-size: 16px;
      color: #666;
      line-height: 1.5;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1 class="title">${title}</h1>
    <p class="message">${message}</p>
    <p class="footer">Puede cerrar esta ventana</p>
  </div>
</body>
</html>
  `.trim()

  return new Response(html, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8'
    }
  })
}
