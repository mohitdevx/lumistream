import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

interface TranscodeOptions {
  videoPath: string;
  outputDir: string;
  videoId: string;
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

export function transcodeToHLS({ videoPath, outputDir, videoId }: TranscodeOptions): Promise<TranscodeResult> {
  return new Promise(async (resolve, reject) => {
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(`[Transcoder] Starting transcoding for video: ${videoId}`);
      const duration = await getDuration(videoPath);
      const thumbnailPath = await extractThumbnail(videoPath, outputDir);

      // We will transcode into 3 qualities: 480p (low), 720p (medium), 1080p (high)
      // To run it efficiently, we'll do them sequentially or in a combined command.
      // Let's implement HLS generation for three resolutions using fluent-ffmpeg.
      
      const qualities = [
        { name: '480p', resolution: '854x480', videoBitrate: '1000k', audioBitrate: '96k' },
        { name: '720p', resolution: '1280x720', videoBitrate: '2500k', audioBitrate: '128k' },
        { name: '1080p', resolution: '1920x1080', videoBitrate: '5000k', audioBitrate: '192k' }
      ];

      // Array to keep track of successful streams to write in master playlist
      const playlistTracks: string[] = [];

      for (const q of qualities) {
        console.log(`[Transcoder] Transcoding ${q.name} representation...`);
        const playlistName = `${q.name}.m3u8`;
        const segmentPattern = `${q.name}_%03d.ts`;

        await new Promise<void>((resTrans, rejTrans) => {
          ffmpeg(videoPath)
            .size(q.resolution)
            .videoCodec('libx264')
            .videoBitrate(q.videoBitrate)
            .audioCodec('aac')
            .audioBitrate(q.audioBitrate)
            .outputOptions([
              '-hls_time 6',                   // 6 second segment duration
              '-hls_playlist_type vod',         // VOD playlist
              `-hls_segment_filename ${path.join(outputDir, segmentPattern)}`,
              '-g 48',                         // Keyframe interval (GOP size)
              '-sc_threshold 0'                // Disable scene change detection to force keyframes
            ])
            .output(path.join(outputDir, playlistName))
            .on('end', () => {
              console.log(`[Transcoder] Finished ${q.name} stream`);
              playlistTracks.push(q.name);
              resTrans();
            })
            .on('error', (err) => {
              console.error(`[Transcoder] Error during ${q.name} transcoding:`, err);
              // We'll skip this quality but try others (or propagate error if all fail)
              resTrans();
            })
            .run();
        });
      }

      if (playlistTracks.length === 0) {
        return reject(new Error('Failed to transcode any video representations.'));
      }

      // Generate the master playlist file (master.m3u8)
      const masterPlaylistContent = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        ...qualities
          .filter(q => playlistTracks.includes(q.name))
          .map(q => {
            let bandwidth = 1200000; // default for 480p
            let resolution = q.resolution;
            if (q.name === '720p') bandwidth = 2800000;
            if (q.name === '1080p') bandwidth = 5400000;
            return `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}\n${q.name}.m3u8`;
          })
      ].join('\n');

      const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
      fs.writeFileSync(masterPlaylistPath, masterPlaylistContent);
      console.log(`[Transcoder] Generated master playlist at ${masterPlaylistPath}`);

      // Delete the original uploaded file to save disk space
      try {
        fs.unlinkSync(videoPath);
        console.log(`[Transcoder] Cleaned up original upload: ${videoPath}`);
      } catch (err) {
        console.error(`[Transcoder] Error cleaning up original file ${videoPath}:`, err);
      }

      resolve({
        hlsPath: `/uploads/${videoId}/master.m3u8`,
        thumbnailPath,
        duration
      });
    } catch (error) {
      reject(error);
    }
  });
}
