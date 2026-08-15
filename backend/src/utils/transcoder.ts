import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

interface TranscodeOptions {
  videoPath: string;
  outputDir: string;
  videoId: string;
  onProgress?: (progress: number) => void;
}

export interface TranscodeResult {
  hlsPath: string;
  thumbnailPath: string;
  duration: number;
}

export function getDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

export function extractThumbnail(videoPath: string, outputDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const thumbnailName = 'thumbnail.jpg';
    const outputPath = path.join(outputDir, thumbnailName);

    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['5%'],
        filename: thumbnailName,
        folder: outputDir,
        size: '640x360'
      })
      .on('end', () => {
        resolve(`/uploads/${path.basename(outputDir)}/${thumbnailName}`);
      })
      .on('error', (err) => {
        console.error('Thumbnail extraction failed:', err);
        reject(err);
      });
  });
}

export function transcodeToHLS({ videoPath, outputDir, videoId, onProgress }: TranscodeOptions): Promise<TranscodeResult> {
  return new Promise(async (resolve, reject) => {
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(`[Transcoder] Starting optimized single-pass transcoding for video: ${videoId}`);
      const duration = await getDuration(videoPath);
      const thumbnailPath = await extractThumbnail(videoPath, outputDir);

      // Initialize complex filter graph to split and scale the video stream only once
      const command = ffmpeg(videoPath)
        .complexFilter([
          '[0:v]split=3[v1][v2][v3]',
          '[v1]scale=854:480[v1out]',
          '[v2]scale=1280:720[v2out]',
          '[v3]scale=1920:1080[v3out]'
        ]);

      // 1. 480p representation
      command.output(path.join(outputDir, '480p.m3u8'))
        .map('[v1out]')
        .videoCodec('libx264')
        .videoBitrate('1000k')
        .audioCodec('aac')
        .audioBitrate('96k')
        .outputOptions([
          '-map 0:a?',
          '-hls_time 6',
          '-hls_playlist_type vod',
          '-hls_segment_filename', path.join(outputDir, '480p_%03d.ts'),
          '-g 48',
          '-sc_threshold 0',
          '-preset superfast',
          '-threads 0'
        ]);

      // 2. 720p representation
      command.output(path.join(outputDir, '720p.m3u8'))
        .map('[v2out]')
        .videoCodec('libx264')
        .videoBitrate('2500k')
        .audioCodec('aac')
        .audioBitrate('128k')
        .outputOptions([
          '-map 0:a?',
          '-hls_time 6',
          '-hls_playlist_type vod',
          '-hls_segment_filename', path.join(outputDir, '720p_%03d.ts'),
          '-g 48',
          '-sc_threshold 0',
          '-preset superfast',
          '-threads 0'
        ]);

      // 3. 1080p representation
      command.output(path.join(outputDir, '1080p.m3u8'))
        .map('[v3out]')
        .videoCodec('libx264')
        .videoBitrate('5000k')
        .audioCodec('aac')
        .audioBitrate('192k')
        .outputOptions([
          '-map 0:a?',
          '-hls_time 6',
          '-hls_playlist_type vod',
          '-hls_segment_filename', path.join(outputDir, '1080p_%03d.ts'),
          '-g 48',
          '-sc_threshold 0',
          '-preset superfast',
          '-threads 0'
        ]);

      // Handle real-time progress callbacks
      command.on('progress', (progressInfo) => {
        if (onProgress && progressInfo.percent) {
          onProgress(Math.min(Math.round(progressInfo.percent), 99));
        }
      });

      command.on('end', () => {
        console.log(`[Transcoder] Finished optimized multi-representation stream generation.`);

        // Generate master playlist index
        const masterPlaylistContent = [
          '#EXTM3U',
          '#EXT-X-VERSION:3',
          '#EXT-X-STREAM-INF:BANDWIDTH=1200000,RESOLUTION=854x480\n480p.m3u8',
          '#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720\n720p.m3u8',
          '#EXT-X-STREAM-INF:BANDWIDTH=5400000,RESOLUTION=1920x1080\n1080p.m3u8'
        ].join('\n');

        const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
        fs.writeFileSync(masterPlaylistPath, masterPlaylistContent);
        console.log(`[Transcoder] Generated master playlist at ${masterPlaylistPath}`);

        // Cleanup original file to free disk space
        try {
          fs.unlinkSync(videoPath);
          console.log(`[Transcoder] Cleaned up original uploaded file: ${videoPath}`);
        } catch (err) {
          console.error(`[Transcoder] Error cleaning up original file ${videoPath}:`, err);
        }

        resolve({
          hlsPath: `/uploads/${videoId}/master.m3u8`,
          thumbnailPath,
          duration
        });
      });

      command.on('error', (err) => {
        console.error(`[Transcoder] Error during single-pass transcoding:`, err);
        reject(err);
      });

      // Launch the optimized command
      command.run();
    } catch (error) {
      reject(error);
    }
  });
}
