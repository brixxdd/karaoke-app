# 🎵 Integración de Whisper en tu App de Karaoke

Esta guía te ayudará a configurar Whisper para generar automáticamente archivos SRT desde MP3.

## 📋 Requisitos Previos

- Node.js 18 o superior
- Python 3.8 o superior
- FFmpeg instalado

## 🔧 Instalación

### 1. Instalar FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Descarga desde [ffmpeg.org](https://ffmpeg.org/download.html)

### 2. Instalar Whisper de OpenAI

```bash
pip install -U openai-whisper
```

O si prefieres usar `pipx`:
```bash
pipx install openai-whisper
```

### 3. Verificar instalación de Whisper

```bash
whisper --help
```

### 4. Configurar el Servidor Node.js

Crea una carpeta `whisper-server` junto a tu proyecto React:

```bash
mkdir whisper-server
cd whisper-server
```

Copia los archivos `server.js` y `package.json` que te proporcioné.

Instala las dependencias:

```bash
npm install
```

### 5. Crear archivo .env en tu app React

Agrega esta variable en tu archivo `.env`:

```env
VITE_WHISPER_SERVER_URL=http://localhost:3001
```

## 🚀 Uso

### 1. Iniciar el servidor Whisper

```bash
cd whisper-server
npm start
```

Deberías ver:
```
🎵 Servidor Whisper ejecutándose en http://localhost:3001
📝 Endpoint: POST http://localhost:3001/api/transcribe
```

### 2. Iniciar tu app React

En otra terminal:

```bash
npm run dev
```

### 3. Usar en la aplicación

1. Carga un archivo MP3 en el modo Karaoke
2. Haz clic en **"Generar Letras (Whisper)"**
3. Espera mientras Whisper transcribe el audio (puede tardar 1-3 minutos)
4. Las letras se cargarán automáticamente en formato LRC sincronizado

## ⚙️ Modelos de Whisper

El servidor usa el modelo `base` por defecto. Puedes cambiar el modelo en `server.js`:

- **tiny**: Más rápido, menos preciso
- **base**: Balance entre velocidad y precisión (recomendado)
- **small**: Más preciso, más lento
- **medium**: Muy preciso, muy lento
- **large**: Máxima precisión, muy lento

Cambia esta línea en `server.js`:
```javascript
const whisperCommand = `whisper "${audioPath}" --model base ...`;
//                                                      ^^^^
//                                         Cambia aquí el modelo
```

## 🎯 Modelos Recomendados por Caso de Uso

| Modelo | Velocidad | Precisión | Uso Recomendado |
|--------|-----------|-----------|-----------------|
| tiny   | ⚡⚡⚡     | ⭐        | Pruebas rápidas |
| base   | ⚡⚡      | ⭐⭐      | Uso general |
| small  | ⚡        | ⭐⭐⭐    | Mejor precisión |
| medium | 🐌        | ⭐⭐⭐⭐  | Alta calidad |
| large  | 🐌🐌      | ⭐⭐⭐⭐⭐| Máxima calidad |

## 🔍 Troubleshooting

### Error: "whisper: command not found"

Asegúrate de que Whisper esté en tu PATH:
```bash
which whisper  # macOS/Linux
where whisper  # Windows
```

Si no lo encuentra, reinstala con:
```bash
pip install --force-reinstall openai-whisper
```

### Error: "FFmpeg not found"

Verifica que FFmpeg esté instalado:
```bash
ffmpeg -version
```

### El servidor no inicia

Verifica que el puerto 3001 esté libre:
```bash
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows
```

### La transcripción es lenta

- Usa un modelo más pequeño (tiny o base)
- Cierra otras aplicaciones pesadas
- Considera usar GPU si está disponible

## 🌟 Alternativa: Whisper.cpp (Más Rápido)

Si necesitas mejor rendimiento, puedes usar whisper.cpp:

```bash
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make

# Descargar modelo
bash ./models/download-ggml-model.sh base
```

Luego modifica el comando en `server.js`:
```javascript
const whisperCommand = `./whisper.cpp/main -m ./whisper.cpp/models/ggml-base.bin -f "${audioPath}" -osrt`;
```

## 📝 Notas

- La primera transcripción puede tardar más porque descarga el modelo
- Los modelos se guardan en `~/.cache/whisper/`
- Archivos temporales se eliminan automáticamente después de procesar
- Límite de tamaño de archivo: 50MB (configurable en `server.js`)

## 🎉 ¡Listo!

Ahora puedes cargar cualquier canción MP3 y obtener automáticamente:
1. Letras sincronizadas en formato SRT/LRC
2. Pronunciación fonética generada por IA
3. Karaoke completo listo para cantar

¡Disfruta tu app de karaoke mejorada! 🎤