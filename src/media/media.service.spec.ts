// Mock BaseStatsRepository since it's imported from a path that might not resolve in tests
jest.mock(
  'src/common/repositories/base-stats.repository',
  () => {
    class MockBaseStatsRepository {
      protected getTimeframeCondition() {
        return '';
      }
      protected getUserCondition() {
        return '';
      }
      async getMediaSessionById() {
        return null;
      }
      async findRecentSessions() {
        return [];
      }
      async query() {
        return [];
      }
    }

    return {
      BaseStatsRepository: MockBaseStatsRepository,
    };
  },
  { virtual: true },
);

// Also mock BaseMediaRepository which is likely imported by other repositories
jest.mock(
  './repositories/base-media.repository',
  () => {
    class MockBaseMediaRepository {
      constructor(protected repository: any) {}
      async findById() {
        return null;
      }
      async findAll() {
        return [];
      }
      async query() {
        return [];
      }
    }

    return {
      BaseMediaRepository: MockBaseMediaRepository,
    };
  },
  { virtual: true },
);

import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { MockProxy, mockDeep } from 'jest-mock-extended';
import { TrackRepository } from './repositories/track.repository';
import { MovieRepository } from './repositories/movie.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { TrackStatsRepository } from './repositories/track-stats.repository';
import { MovieStatsRepository } from './repositories/movie-stats.repository';
import { EpisodeStatsRepository } from './repositories/episode-stats.repository';
import { CombinedStatsRepository } from './repositories/combined-stats.repository';
import { UserMediaSessionRepository } from './repositories/user-media-session.repository';
import { UserRepository } from './repositories/user.repository';
import { MediaSessionManager } from './managers/media-session.manager';
import { Track } from './entities/track.entity';
import { Movie } from './entities/movie.entity';
import { Episode } from './entities/episode.entity';
import { UserMediaSession } from './entities/user-media-session.entity';

// Mock data for testing
const mockTrack = {
  id: '1',
  title: 'Test Track',
  artist: 'Test Artist',
  album: 'Test Album',
};
const mockMovie = {
  id: '1',
  title: 'Test Movie',
  director: 'Test Director',
  year: 2023,
};
const mockEpisode = {
  id: '1',
  title: 'Test Episode',
  showTitle: 'Test Show',
  season: 1,
  episode: 1,
};
const mockSession = {
  id: '1',
  mediaId: '1',
  mediaType: 'track',
  userId: 'user1',
  startTime: new Date(),
  endTime: new Date(),
  state: 'playing',
  timeWatchedMs: 1000,
  track: mockTrack,
  movie: null,
  episode: null,
};
const mockStats = {
  sessions: 10,
  uniqueTracks: 5,
  uniqueArtists: 3,
  uniqueAlbums: 2,
  totalListeningTimeMs: 5000,
};

describe('MediaService', () => {
  let service: MediaService;
  let trackRepository: MockProxy<TrackRepository>;
  let movieRepository: MockProxy<MovieRepository>;
  let episodeRepository: MockProxy<EpisodeRepository>;
  let trackStatsRepository: MockProxy<TrackStatsRepository>;
  let movieStatsRepository: MockProxy<MovieStatsRepository>;
  let episodeStatsRepository: MockProxy<EpisodeStatsRepository>;
  let combinedStatsRepository: MockProxy<CombinedStatsRepository>;
  let userMediaSessionRepository: MockProxy<UserMediaSessionRepository>;
  let userRepository: MockProxy<UserRepository>;
  let mediaSessionManager: MockProxy<MediaSessionManager>;

  beforeEach(async () => {
    // Create mocks for all repositories and services
    trackRepository = mockDeep<TrackRepository>();
    movieRepository = mockDeep<MovieRepository>();
    episodeRepository = mockDeep<EpisodeRepository>();
    trackStatsRepository = mockDeep<TrackStatsRepository>();
    movieStatsRepository = mockDeep<MovieStatsRepository>();
    episodeStatsRepository = mockDeep<EpisodeStatsRepository>();
    combinedStatsRepository = mockDeep<CombinedStatsRepository>();
    userMediaSessionRepository = mockDeep<UserMediaSessionRepository>();
    userRepository = mockDeep<UserRepository>();
    mediaSessionManager = mockDeep<MediaSessionManager>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: TrackRepository, useValue: trackRepository },
        { provide: MovieRepository, useValue: movieRepository },
        { provide: EpisodeRepository, useValue: episodeRepository },
        { provide: TrackStatsRepository, useValue: trackStatsRepository },
        { provide: MovieStatsRepository, useValue: movieStatsRepository },
        { provide: EpisodeStatsRepository, useValue: episodeStatsRepository },
        { provide: CombinedStatsRepository, useValue: combinedStatsRepository },
        {
          provide: UserMediaSessionRepository,
          useValue: userMediaSessionRepository,
        },
        { provide: UserRepository, useValue: userRepository },
        { provide: MediaSessionManager, useValue: mediaSessionManager },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentMedia', () => {
    it('should return current media of the specified type', async () => {
      const expected = { tracks: [mockTrack] };
      mediaSessionManager.getCurrentMedia.mockResolvedValue(expected);

      expect(await service.getCurrentMedia('track', 'user1')).toBe(expected);
      expect(mediaSessionManager.getCurrentMedia).toHaveBeenCalledWith(
        'track',
        'user1',
      );
    });
  });

  describe('getMediaById', () => {
    it('should get track by id', async () => {
      trackRepository.findById.mockResolvedValue(mockTrack as Track);

      expect(await service.getMediaById('track', '1')).toBe(mockTrack);
      expect(trackRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should get movie by id', async () => {
      movieRepository.findById.mockResolvedValue(mockMovie as Movie);

      expect(await service.getMediaById('movie', '1')).toBe(mockMovie);
      expect(movieRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should get episode by id', async () => {
      episodeRepository.findById.mockResolvedValue(mockEpisode as Episode);

      expect(await service.getMediaById('episode', '1')).toBe(mockEpisode);
      expect(episodeRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should return null for unknown media type', async () => {
      expect(await service.getMediaById('unknown', '1')).toBeNull();
    });
  });

  describe('getRecentTracks', () => {
    it('should return recent tracks for a specific user', async () => {
      const sessionWithTrack = { ...mockSession, track: mockTrack };
      userMediaSessionRepository.findRecentSessions.mockResolvedValue([
        sessionWithTrack as unknown as UserMediaSession,
      ]);

      const result = await service.getRecentTracks(10, 'user1');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(mockTrack.id);
      expect(result[0].title).toBe(mockTrack.title);
      expect(result[0].sessionId).toBe(sessionWithTrack.id);
      expect(
        userMediaSessionRepository.findRecentSessions,
      ).toHaveBeenCalledWith('track', 10, 'user1');
    });

    it('should return recent tracks for all users', async () => {
      const sessionWithTrack = { ...mockSession, track: mockTrack };
      userMediaSessionRepository.findRecentSessions.mockResolvedValue([
        sessionWithTrack as unknown as UserMediaSession,
      ]);

      const result = await service.getRecentTracks(10);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(mockTrack.id);
      expect(result[0].title).toBe(mockTrack.title);
      expect(result[0].userId).toBe(sessionWithTrack.userId);
      expect(
        userMediaSessionRepository.findRecentSessions,
      ).toHaveBeenCalledWith('track', 10);
    });
  });

  describe('getTracksByArtist', () => {
    it('should return tracks by artist for a specific user', async () => {
      trackStatsRepository.findByArtistAndUser.mockResolvedValue([mockTrack]);

      const result = await service.getTracksByArtist(
        'Test Artist',
        10,
        'user1',
      );

      expect(result).toEqual([mockTrack]);
      expect(trackStatsRepository.findByArtistAndUser).toHaveBeenCalledWith(
        'Test Artist',
        'user1',
        10,
      );
    });

    it('should return tracks by artist for all users', async () => {
      trackStatsRepository.findByArtist.mockResolvedValue([mockTrack]);

      const result = await service.getTracksByArtist('Test Artist', 10);

      expect(result).toEqual([mockTrack]);
      expect(trackStatsRepository.findByArtist).toHaveBeenCalledWith(
        'Test Artist',
        10,
      );
    });
  });

  describe('getListeningStats', () => {
    it('should return listening stats for a specific user', async () => {
      trackStatsRepository.getUserListeningStats.mockResolvedValue(mockStats);

      const result = await service.getListeningStats('week', 'user1');

      expect(result).toBe(mockStats);
      expect(trackStatsRepository.getUserListeningStats).toHaveBeenCalledWith(
        'user1',
        'week',
      );
    });

    it('should return listening stats for all users', async () => {
      trackStatsRepository.getListeningStats.mockResolvedValue(mockStats);

      const result = await service.getListeningStats('week');

      expect(result).toBe(mockStats);
      expect(trackStatsRepository.getListeningStats).toHaveBeenCalledWith(
        'week',
      );
    });

    it('should use default timeframe if not provided', async () => {
      trackStatsRepository.getListeningStats.mockResolvedValue(mockStats);

      const result = await service.getListeningStats();

      expect(result).toBe(mockStats);
      expect(trackStatsRepository.getListeningStats).toHaveBeenCalledWith(
        'all',
      );
    });
  });

  describe('getStats', () => {
    it('should return combined stats for a specific user', async () => {
      const allStats = {
        music: mockStats,
        movies: mockStats,
        tv: mockStats,
        total: { totalTime: 15000, count: 30 },
      };
      combinedStatsRepository.getUserStats.mockResolvedValue(allStats);

      const result = await service.getStats('week', 'user1');

      expect(result).toBe(allStats);
      expect(combinedStatsRepository.getUserStats).toHaveBeenCalledWith(
        'user1',
        'week',
      );
    });

    it('should return combined stats for all users', async () => {
      const allStats = {
        music: mockStats,
        movies: mockStats,
        tv: mockStats,
        total: { totalTime: 15000, count: 30 },
      };
      combinedStatsRepository.getOverallStats.mockResolvedValue(allStats);

      const result = await service.getStats('week');

      expect(result).toBe(allStats);
      expect(combinedStatsRepository.getOverallStats).toHaveBeenCalledWith(
        'week',
      );
    });
  });

  describe('getMoviesByDirector', () => {
    it('should return movies by director for a specific user', async () => {
      movieStatsRepository.findByDirectorAndUser.mockResolvedValue([mockMovie]);

      const result = await service.getMoviesByDirector(
        'Test Director',
        10,
        'user1',
      );

      expect(result).toEqual([mockMovie]);
      expect(movieStatsRepository.findByDirectorAndUser).toHaveBeenCalledWith(
        'Test Director',
        'user1',
        10,
      );
    });

    it('should return movies by director for all users', async () => {
      movieStatsRepository.findByDirector.mockResolvedValue([mockMovie]);

      const result = await service.getMoviesByDirector('Test Director', 10);

      expect(result).toEqual([mockMovie]);
      expect(movieStatsRepository.findByDirector).toHaveBeenCalledWith(
        'Test Director',
        10,
      );
    });
  });

  describe('getEpisodesByShow', () => {
    it('should return episodes by show for a specific user', async () => {
      episodeStatsRepository.findByShowAndUser.mockResolvedValue([mockEpisode]);

      const result = await service.getEpisodesByShow('Test Show', 10, 'user1');

      expect(result).toEqual([mockEpisode]);
      expect(episodeStatsRepository.findByShowAndUser).toHaveBeenCalledWith(
        'Test Show',
        'user1',
        10,
      );
    });

    it('should return episodes by show for all users', async () => {
      episodeStatsRepository.findByShow.mockResolvedValue([mockEpisode]);

      const result = await service.getEpisodesByShow('Test Show', 10);

      expect(result).toEqual([mockEpisode]);
      expect(episodeStatsRepository.findByShow).toHaveBeenCalledWith(
        'Test Show',
        10,
      );
    });
  });

  describe('getShowsInProgress', () => {
    it('should return shows in progress for a specific user', async () => {
      const expected = [
        { show: 'Test Show', episodesWatched: 5, totalEpisodes: 10 },
      ];
      episodeStatsRepository.getUserShowsInProgress.mockResolvedValue(expected);

      const result = await service.getShowsInProgress('user1');

      expect(result).toBe(expected);
      expect(
        episodeStatsRepository.getUserShowsInProgress,
      ).toHaveBeenCalledWith('user1');
    });

    it('should return shows in progress for all users', async () => {
      const expected = [
        { show: 'Test Show', episodesWatched: 5, totalEpisodes: 10 },
      ];
      episodeStatsRepository.getShowsInProgress.mockResolvedValue(expected);

      const result = await service.getShowsInProgress();

      expect(result).toBe(expected);
      expect(episodeStatsRepository.getShowsInProgress).toHaveBeenCalled();
    });
  });
});
