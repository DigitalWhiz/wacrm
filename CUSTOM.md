# Estrategia de Desarrollo: Core Intocable

## Filosofia

Este repositorio es un fork de [ArnasDon/wacrm](https://github.com/ArnasDon/wacrm). La estrategia es mantener el **CORE intocable** para que `git merge upstream/main` sea siempre un fast-forward sin conflictos.

## Arquitectura

```
src/lib/whatsapp/
├── meta-api.ts              ← CORE (intocable)
├── ycloud-api.ts            ← CORE (intocable)
├── ycloud-adapter.ts        ← CORE (intocable)
├── webhook-signature.ts     ← CORE (intocable) - solo Meta
├── send-message.ts          ← CORE (intocable) - usa getTransport()
├── template-webhook.ts      ← CORE (intocable)
├── ...                      ← todos los demas archivos core
└── transports/              ← CUSTOM (extensible)
    ├── transport.ts         ← interfaz WhatsAppTransport
    ├── index.ts             ← factory getTransport()
    ├── meta-transport.ts    ← implementacion Meta
    ├── ycloud-transport.ts  ← implementacion YCloud
    └── inbound-adapter.ts   ← adaptadores de entrada (webhooks)
```

## Reglas

### NUNCA modificar archivos del core

Los siguientes archivos son **INTOCABLES**. Si upstream los modifica, el merge sera automatico:

- `src/lib/whatsapp/meta-api.ts`
- `src/lib/whatsapp/ycloud-api.ts`
- `src/lib/whatsapp/ycloud-adapter.ts`
- `src/lib/whatsapp/webhook-signature.ts`
- `src/lib/whatsapp/send-message.ts`
- `src/lib/whatsapp/template-webhook.ts`
- `src/app/api/whatsapp/webhook/route.ts`
- `src/app/api/whatsapp/send/route.ts`
- `src/types/index.ts`

### Siempre crear archivos nuevos en `transports/`

Para agregar un nuevo provider (Twilio, Vonage, etc.):

1. Crear `transports/twilio-transport.ts` (implementa `WhatsAppTransport`)
2. Crear adaptador de entrada en `transports/inbound-adapter.ts` (agregar clase)
3. Actualizar `transports/index.ts` (agregar deteccion)
4. **NUNCA** tocar archivos core

## Sincronizacion con Upstream

### Procedimiento (cada 1-2 meses)

```bash
# 1. Fetch upstream
git fetch upstream

# 2. Ver que hay nuevo
git log --oneline HEAD..upstream/main

# 3. Merge (deberia ser fast-forward)
git merge upstream/main

# 4. Verificar que compile
npx tsc --noEmit
npm run build

# 5. Push
git push
```

### Si hay conflictos (no deberia pasar)

Los conflictos solo pueden ocurrir si se modificaron archivos core despues de la refactorizacion. En ese caso:

1. Verificar que el conflicto es en un archivo core
2. Resolver a favor del upstream (el core upstream es la fuente de verdad)
3. Verificar que `transports/` sigue funcionando
4. Hacer build y test

## Agregar Nuevo Provider

Ejemplo: Twilio

```typescript
// src/lib/whatsapp/transports/twilio-transport.ts
import type { WhatsAppTransport, SendResult, SendTextArgs } from './transport'

export class TwilioTransport implements WhatsAppTransport {
  constructor(config: WhatsAppConfig) {
    // ...
  }

  async sendText(args: SendTextArgs): Promise<SendResult> {
    // Llamar a la API de Twilio
    return { messageId: '...' }
  }
  // ... implementar demas metodos
}
```

```typescript
// src/lib/whatsapp/transports/index.ts (agregar)
if (process.env.TWILIO_AUTH_TOKEN) {
  return new TwilioTransport(config)
}
```

```typescript
// src/lib/whatsapp/transports/inbound-adapter.ts (agregar)
class TwilioInboundAdapter implements InboundAdapter {
  detect(request: Request): boolean {
    return request.headers.get('x-twilio-signature') !== null
  }
  // ...
}
```

## Archivos Custom Actuales (YCloud)

| Archivo | Proposito |
|---------|-----------|
| `ycloud-api.ts` | Cliente API outbound para YCloud |
| `ycloud-adapter.ts` | Convierte webhooks YCloud a formato Meta |
| `transports/ycloud-transport.ts` | Implementacion del transport interface |
| `transports/inbound-adapter.ts` | Detecta y verifica webhooks YCloud |

## Variables de Entorno

| Variable | Proposito | Requerida |
|----------|-----------|-----------|
| `YCLOUD_API_KEY` | Auth para envios via YCloud | Solo si usas YCloud |
| `YCLOUD_WEBHOOK_SECRET` | Verificacion HMAC de webhooks YCloud | Solo si usas YCloud |
| `META_APP_SECRET` | Verificacion HMAC de webhooks Meta | Siempre |
