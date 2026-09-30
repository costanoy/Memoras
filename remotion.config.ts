import { Config } from '@remotion/cli/config';

// Vídeo de apresentação do Memoras (pasta video/).
Config.setPublicDir('video/public');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
