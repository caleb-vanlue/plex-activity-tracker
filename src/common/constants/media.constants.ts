export enum MediaTypeEnum {
  TRACK = 'track',
  MOVIE = 'movie',
  EPISODE = 'episode',
  ALL = 'all',
}

export enum MediaEventTypeEnum {
  PLAY = 'media.play',
  PAUSE = 'media.pause',
  RESUME = 'media.resume',
  STOP = 'media.stop',
  SCROBBLE = 'media.scrobble',
  PLAYBACK_STARTED = 'playback.started',
}

export enum SessionStateEnum {
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  UNKNOWN = 'unknown',
}

export const EVENT_TO_STATE_MAP = {
  'media.play': SessionStateEnum.PLAYING,
  'media.resume': SessionStateEnum.PLAYING,
  'media.scrobble': SessionStateEnum.PLAYING,
  'playback.started': SessionStateEnum.PLAYING,
  'media.pause': SessionStateEnum.PAUSED,
  'media.stop': SessionStateEnum.STOPPED,
};

export const TIMEFRAME_CONDITIONS = {
  day: "startTime > NOW() - INTERVAL '1 day'",
  week: "startTime > NOW() - INTERVAL '7 days'",
  month: "startTime > NOW() - INTERVAL '30 days'",
  all: '1=1',
};
