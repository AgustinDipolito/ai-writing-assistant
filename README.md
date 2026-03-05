# AI Writing Assistant ✨

Extensión de Chrome para mejorar textos seleccionados en cualquier página web usando **Google Gemini** y **OpenAI**.

Permite:
- Corregir **gramática**
- Mejorar **estilo**
- Sugerir **sinónimos**
- Crear **acciones personalizadas** con prompts propios

---

## 🚀 Características

- Menú flotante sobre texto seleccionado (inyectado con Shadow DOM).
- Menú contextual (clic derecho) con submenú por acción.
- Panel de resultados con **streaming en tiempo real** y renderizado Markdown mejorado.
- Configuración avanzada desde opciones:
  - Provider activo (Gemini / OpenAI)
  - Modelo por provider
  - Temperatura
  - Máximo de tokens
  - Idioma de respuesta
  - Prompt personalizado por acción
  - Instrucción global (`systemInstruction`)
- Acciones personalizadas dinámicas (nombre, ícono y prompt).
- Soporte de tablas, bloques de código y listas ordenadas en resultados.
- Soporte de tema claro/oscuro según `prefers-color-scheme`.
- Almacenamiento local de configuración con `chrome.storage.local`.

---

## 🧱 Stack técnico

- **Manifest V3**
- **Content Script** (`content.js`)
- **Background Service Worker** (`background.js`)
- **Options Page** (`options.html` + `options.js`)
- **Google Gemini API** (`generateContent` + `streamGenerateContent`)
- **OpenAI Chat Completions API** (modo normal + stream)

---

## 📦 Instalación (modo desarrollador)

1. Clona este repositorio:

```bash
git clone https://github.com/AgustinDipolito/ai-writing-assistant.git
cd ai-writing-assistant
```

2. Abre Chrome y ve a `chrome://extensions/`
3. Activa **Developer mode** (arriba a la derecha)
4. Haz clic en **Load unpacked**
5. Selecciona la carpeta del proyecto

---

## 🔑 Configuración inicial

1. Abre las opciones de la extensión.
2. Elige el provider (Gemini u OpenAI).
3. Pega tu API key del provider seleccionado.
4. Guarda y prueba conexión.

Puedes obtener tu key en:
- https://aistudio.google.com/app/apikey
- https://platform.openai.com/api-keys

---

## 🧠 Cómo usarla

1. Selecciona texto en cualquier web.
2. Aparece un menú flotante con acciones:
   - Grammar
   - Style
   - Synonyms
   - Tus acciones personalizadas
3. Haz clic en una acción (o usa clic derecho → **AI Writing Assistant**).
4. El panel muestra el resultado en streaming y permite copiarlo.

---

## ⚙️ Personalización avanzada

Desde la página de opciones puedes:

- Elegir provider y modelo (`gemini-2.0-flash`, `gemini-1.5-pro`, `gpt-4o-mini`, `gpt-4o`, etc.)
- Ajustar creatividad con `temperature`
- Limitar longitud de respuesta con `maxTokens`
- Forzar idioma de salida o auto-detectarlo
- Reemplazar prompts por defecto usando `{{TEXT}}`
- Definir una instrucción global para todas las acciones

### Acciones personalizadas

Cada acción personalizada incluye:
- `name`: nombre del botón
- `icon`: emoji/icono del botón
- `prompt`: plantilla del prompt
- `id`: generado automáticamente con prefijo `custom_`

> Si el prompt no contiene `{{TEXT}}`, el texto seleccionado se agrega al final automáticamente.

---

## 🗂️ Estructura del proyecto

```text
ai-writing-assistant/
├─ background.js      # Router de providers, streaming y context menu
├─ content.js         # UI flotante, streaming y render Markdown
├─ manifest.json      # Configuración de la extensión (MV3)
├─ options.html       # Interfaz de configuración
├─ options.js         # Lógica de la página de opciones
└─ icons/             # Íconos de la extensión
```

---

## 🔒 Privacidad y seguridad

- La API key se guarda en `chrome.storage.local`.
- El texto seleccionado se envía al provider activo solo al ejecutar una acción.
- No se usa backend propio: las llamadas van directo a los endpoints oficiales.

Permisos usados en `manifest.json`:
- `activeTab`
- `storage`
- `contextMenus`
- `host_permissions`:
  - `https://generativelanguage.googleapis.com/*`
  - `https://api.openai.com/*`

---

## 🛠️ Desarrollo

No requiere build step ni dependencias externas para correr.

Para iterar rápido:
1. Edita archivos.
2. Ve a `chrome://extensions/`.
3. Haz clic en **Reload** en la extensión.
4. Prueba en una página real.

---

## 🧪 Troubleshooting

**Error: “API key not configured”**
- Configura la key en Options y guarda.

**Error: “Repository not found / API error”**
- Verifica modelo, key y permisos de red.

**No aparece el menú contextual**
- Asegúrate de tener texto seleccionado antes de hacer clic derecho.
- Recarga la extensión y la pestaña si acabas de actualizar.

**No aparece el menú al seleccionar texto**
- Asegúrate de que la extensión esté habilitada.
- Recarga la pestaña después de instalar o actualizar.

---

## �️ Roadmap de Features

Tareas pendientes y mejoras de alto impacto para la experiencia de usuario:

### 🚀 Tier 1 — Core (Impacto Crítico)
- **Multi-Provider AI Router**: Abstraer la lógica para elegir entre Gemini, OpenAI, Claude u OpenRouter.
- **Streaming de respuestas**: Mostrar resultados en tiempo real (token by token) en lugar de esperar la carga completa.
- **Aplicación directa ("Apply")**: Botón para reemplazar automáticamente el texto seleccionado en inputs, textareas o editores web.

### ⚡ Tier 2 — Power User (Productividad)
- **Historial de sesión**: Panel rápido para recuperar los últimos resultados generados y no perder el trabajo.
- **Atajos de teclado**: `Alt+G` (Grammar), `Alt+S` (Style), etc., configurables desde las opciones.
- **Configuración por Acción**: Overrides de temperatura, modelo y tokens específicos para cada prompt o acción personalizada.
- **Test de Prompts**: Botón "Probar" en la página de opciones para validar prompts nuevos sin salir de la configuración.

### 🎨 Tier 3 — Extensibilidad y UX
- **Drag-to-reorder**: Reordenar acciones personalizadas arrastrándolas en el panel de opciones.
- **Export/Import**: Respaldar y restaurar toda la configuración (prompts, keys, preferencias) en un archivo JSON.
- **Mejoras de Markdown**: Soporte para tablas, bloques de código resaltados y corrección de listas ordenadas.
- **Menú contextual**: Integración con el clic derecho de Chrome para usuarios que no desean el menú flotante.

---

## 👤 Autor

Desarrollado por **AgustinDipolito**.

Si te sirve, deja una ⭐ al repo:
- https://github.com/AgustinDipolito/ai-writing-assistant
