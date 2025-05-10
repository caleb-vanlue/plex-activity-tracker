import { Injectable } from '@nestjs/common';
import { TrackProcessor } from './track.processor';
import { MovieProcessor } from './movie.processor';
import { EpisodeProcessor } from './episode.processor';

@Injectable()
export class MediaProcessorFactory {
  constructor(
    private trackProcessor: TrackProcessor,
    private movieProcessor: MovieProcessor,
    private episodeProcessor: EpisodeProcessor,
  ) {}

  getProcessor(mediaType: string) {
    switch (mediaType) {
      case 'track':
        return this.trackProcessor;
      case 'movie':
        return this.movieProcessor;
      case 'episode':
        return this.episodeProcessor;
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }
  }

  getProcessorForPayload(payload: any) {
    if (!payload.Metadata?.type) {
      throw new Error('Missing media type in webhook payload');
    }

    return this.getProcessor(payload.Metadata.type);
  }
}
