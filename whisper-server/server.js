// server.js - Servidor Node.js para Whisper
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'audio-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  let audioPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo de audio' });
    }

    audioPath = req.file.path;
    const outputDir = path.join(__dirname, 'outputs');
    await fs.mkdir(outputDir, { recursive: true });

    const songTitle = req.body.title || 'Cancion_Desconocida';
    const songArtist = req.body.artist || 'Artista_Desconocido';
    
    const sanitizeName = (name) => {
      return name
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
    };

    const cleanTitle = sanitizeName(songTitle);
    const cleanArtist = sanitizeName(songArtist);
    const finalSrtName = `${cleanArtist}-${cleanTitle}.srt`;

    console.log('📁 Archivo:', req.file.originalname);
    console.log('🎵 Canción:', songTitle);
    console.log('🎤 Artista:', songArtist);

    try {
      await fs.access(audioPath);
      const stats = await fs.stat(audioPath);
      console.log('📊 Tamaño:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    } catch (err) {
      throw new Error('El archivo de audio no se guardó correctamente');
    }

    const env = { 
      ...process.env,
      PATH: `C:\\ffmpeg-8.0-essentials_build\\bin;${process.env.PATH}`,
      SYSTEMROOT: process.env.SYSTEMROOT
    };

    const whisperCommand = `python -m whisper "${audioPath}" --model small --output_format srt --output_dir "${outputDir}"`;

    console.log('🎵 Procesando con Whisper...');
    
    const { stdout, stderr } = await execAsync(whisperCommand, {
      maxBuffer: 1024 * 1024 * 10,
      windowsHide: true,
      env: env
    });

    if (stdout) console.log('✅ Whisper completado');

    const files = await fs.readdir(outputDir);
    const tempSrtFile = files.find(f => f.endsWith('.srt') && f.startsWith('audio-'));
    
    if (!tempSrtFile) {
      throw new Error('No se generó el archivo SRT');
    }

    const tempSrtPath = path.join(outputDir, tempSrtFile);
    const srtContent = await fs.readFile(tempSrtPath, 'utf-8');

    const finalSrtPath = path.join(outputDir, finalSrtName);
    await fs.rename(tempSrtPath, finalSrtPath);
    
    console.log('📝 Guardado:', finalSrtName);

    await fs.unlink(audioPath);
    audioPath = null;

    res.json({
      success: true,
      srt: srtContent,
      filename: finalSrtName,
      path: finalSrtPath,
      message: 'Transcripción completada'
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (audioPath) {
      try {
        await fs.unlink(audioPath);
      } catch (e) {}
    }

    res.status(500).json({ 
      error: 'Error procesando audio',
      details: error.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor Whisper funcionando',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('🎵 ═══════════════════════════════════════════════════════════');
  console.log('🎵 Servidor Whisper ejecutándose');
  console.log('🎵 ═══════════════════════════════════════════════════════════');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📝 Endpoint: POST http://localhost:${PORT}/api/transcribe`);
  console.log(`💚 Health: GET http://localhost:${PORT}/api/health`);
  console.log('🎵 ═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('💡 Los archivos SRT se guardan en: outputs/');
  console.log('📝 Formato: Artista-Titulo.srt');
  console.log('');
  console.log('✅ Servidor listo. Esperando peticiones...');
});

// Al final del archivo server.js, después de app.listen()

process.on('exit', (code) => {
  console.log(`⚠️ Proceso terminando con código: ${code}`);
});

process.on('SIGINT', () => {
  console.log('\n⚠️ SIGINT recibido');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ SIGTERM recibido');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Excepción no capturada:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rechazada no manejada:', reason);
});

// Mantener el proceso vivo
setInterval(() => {
  // Hacer nada, solo mantener el event loop activo
}, 1000);

console.log('🔄 Event loop activo');