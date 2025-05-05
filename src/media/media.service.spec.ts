import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { TrackRepository } from './repositories/track.repository';
import { MovieRepository } from './repositories/movie.repository';
import { EpisodeRepository } from './repositories/episode.repository';
import { MediaEventService } from './media-event.service';
import { Episode } from './entities/episode.entity';
import { Movie } from './entities/movie.entity';
import { Track } from './entities/track.entity';

describe('MediaService', () => {
  let service: MediaService;
  let trackRepository: jest.Mocked<TrackRepository>;
  let movieRepository: jest.Mocked<MovieRepository>;
  let episodeRepository: jest.Mocked<EpisodeRepository>;
  let mediaEventService: jest.Mocked<MediaEventService>;

  const mockTrack = {
    id: '1',
    title: 'Test Track',
    artist: 'Test Artist',
    album: 'Test Album',
  };

  const mockMovie = {
    id: '1',
    title: 'Test Movie',
    year: 2025,
    director: 'Test Director',
  };

  const mockEpisode = {
    id: '1',
    title: 'Test Episode',
    showTitle: 'Test Show',
    season: 1,
    episode: 1,
  };

  const mockCurrentMedia = {
    track: mockTrack,
    movie: null,
    episode: null,
  };

  const mockStats = {
    totalListeningTimeMs: 3600000,
    topArtists: [{ name: 'Test Artist', count: 10 }],
  };

  beforeEach(async () => {
    const mockTrackRepo = {
      findById: jest.fn(),
      findRecent: jest.fn(),
      findByArtist: jest.fn(),
      findByAlbum: jest.fn(),
      findByState: jest.fn(),
      getListeningStats: jest.fn(),
      getTopAlbums: jest.fn(),
    };

    const mockMovieRepo = {
      findById: jest.fn(),
      findRecent: jest.fn(),
      findByDirector: jest.fn(),
      findByStudio: jest.fn(),
      findByState: jest.fn(),
      getWatchingStats: jest.fn(),
      getTopDirectors: jest.fn(),
    };

    const mockEpisodeRepo = {
      findById: jest.fn(),
      findRecent: jest.fn(),
      findByShow: jest.fn(),
      findBySeason: jest.fn(),
      findByState: jest.fn(),
      getWatchingStats: jest.fn(),
      getShowsInProgress: jest.fn(),
    };

    const mockMediaEventService = {
      getCurrentMedia: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: TrackRepository,
          useValue: mockTrackRepo,
        },
        {
          provide: MovieRepository,
          useValue: mockMovieRepo,
        },
        {
          provide: EpisodeRepository,
          useValue: mockEpisodeRepo,
        },
        {
          provide: MediaEventService,
          useValue: mockMediaEventService,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    trackRepository = module.get(
      TrackRepository,
    ) as jest.Mocked<TrackRepository>;
    movieRepository = module.get(
      MovieRepository,
    ) as jest.Mocked<MovieRepository>;
    episodeRepository = module.get(
      EpisodeRepository,
    ) as jest.Mocked<EpisodeRepository>;
    mediaEventService = module.get(
      MediaEventService,
    ) as jest.Mocked<MediaEventService>;
  });

  describe('getCurrentMedia', () => {
    it('should return media for a specific type', async () => {
      mediaEventService.getCurrentMedia.mockReturnValue(mockTrack);

      const result = await service.getCurrentMedia('track');

      expect(mediaEventService.getCurrentMedia).toHaveBeenCalledWith('track');
      expect(result).toEqual(mockTrack);
    });

    it('should return all media types when type is "all"', async () => {
      mediaEventService.getCurrentMedia
        .mockReturnValueOnce(mockTrack)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null);

      const result = await service.getCurrentMedia('all');

      expect(mediaEventService.getCurrentMedia).toHaveBeenCalledWith('track');
      expect(mediaEventService.getCurrentMedia).toHaveBeenCalledWith('movie');
      expect(mediaEventService.getCurrentMedia).toHaveBeenCalledWith('episode');
      expect(result).toEqual({
        track: mockTrack,
        movie: null,
        episode: null,
      });
    });
  });

  describe('getMediaById', () => {
    it('should find track by id', async () => {
      trackRepository.findById.mockResolvedValue(mockTrack as Track);

      const result = await service.getMediaById('track', '1');

      expect(trackRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockTrack);
    });

    it('should find movie by id', async () => {
      movieRepository.findById.mockResolvedValue(mockMovie as Movie);

      const result = await service.getMediaById('movie', '1');

      expect(movieRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockMovie);
    });

    it('should find episode by id', async () => {
      episodeRepository.findById.mockResolvedValue(mockEpisode as Episode);

      const result = await service.getMediaById('episode', '1');

      expect(episodeRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockEpisode);
    });

    it('should return null for invalid media type', async () => {
      const result = await service.getMediaById('invalid', '1');

      expect(result).toBeNull();
    });
  });

  describe('track-related methods', () => {
    it('should get recent tracks', async () => {
      trackRepository.findRecent.mockResolvedValue([mockTrack as Track]);

      const result = await service.getRecentTracks(10);

      expect(trackRepository.findRecent).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by artist', async () => {
      trackRepository.findByArtist.mockResolvedValue([mockTrack as Track]);

      const result = await service.getTracksByArtist('Test Artist', 10);

      expect(trackRepository.findByArtist).toHaveBeenCalledWith(
        'Test Artist',
        10,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by album', async () => {
      trackRepository.findByAlbum.mockResolvedValue([mockTrack as Track]);

      const result = await service.getTracksByAlbum('Test Album', 10);

      expect(trackRepository.findByAlbum).toHaveBeenCalledWith(
        'Test Album',
        10,
      );
      expect(result).toEqual([mockTrack]);
    });

    it('should get tracks by state', async () => {
      trackRepository.findByState.mockResolvedValue([mockTrack as Track]);

      const result = await service.getTracksByState('playing', 10);

      expect(trackRepository.findByState).toHaveBeenCalledWith('playing', 10);
      expect(result).toEqual([mockTrack]);
    });

    it('should get listening stats', async () => {
      trackRepository.getListeningStats.mockResolvedValue(mockStats);

      const result = await service.getListeningStats('week');

      expect(trackRepository.getListeningStats).toHaveBeenCalledWith('week');
      expect(result).toEqual(mockStats);
    });
  });

  describe('movie-related methods', () => {
    it('should get recent movies', async () => {
      movieRepository.findRecent.mockResolvedValue([mockMovie as Movie]);

      const result = await service.getRecentMovies(10);

      expect(movieRepository.findRecent).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockMovie]);
    });

    it('should get movies by director', async () => {
      movieRepository.findByDirector.mockResolvedValue([mockMovie as Movie]);

      const result = await service.getMoviesByDirector('Test Director', 10);

      expect(movieRepository.findByDirector).toHaveBeenCalledWith(
        'Test Director',
        10,
      );
      expect(result).toEqual([mockMovie]);
    });

    it('should get movies by studio', async () => {
      movieRepository.findByStudio.mockResolvedValue([mockMovie as Movie]);

      const result = await service.getMoviesByStudio('Test Studio', 10);

      expect(movieRepository.findByStudio).toHaveBeenCalledWith(
        'Test Studio',
        10,
      );
      expect(result).toEqual([mockMovie]);
    });

    it('should get movies by state', async () => {
      movieRepository.findByState.mockResolvedValue([mockMovie as Movie]);

      const result = await service.getMoviesByState('playing', 10);

      expect(movieRepository.findByState).toHaveBeenCalledWith('playing', 10);
      expect(result).toEqual([mockMovie]);
    });

    it('should get movie watching stats', async () => {
      const movieStats = { totalWatchTimeMs: 7200000 };
      movieRepository.getWatchingStats.mockResolvedValue(movieStats);

      const result = await service.getMovieWatchingStats('week');

      expect(movieRepository.getWatchingStats).toHaveBeenCalledWith('week');
      expect(result).toEqual(movieStats);
    });
  });

  describe('episode-related methods', () => {
    it('should get recent episodes', async () => {
      episodeRepository.findRecent.mockResolvedValue([mockEpisode as Episode]);

      const result = await service.getRecentEpisodes(10);

      expect(episodeRepository.findRecent).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockEpisode]);
    });

    it('should get episodes by show', async () => {
      episodeRepository.findByShow.mockResolvedValue([mockEpisode as Episode]);

      const result = await service.getEpisodesByShow('Test Show', 10);

      expect(episodeRepository.findByShow).toHaveBeenCalledWith(
        'Test Show',
        10,
      );
      expect(result).toEqual([mockEpisode]);
    });

    it('should get episodes by season', async () => {
      episodeRepository.findBySeason.mockResolvedValue([
        mockEpisode as Episode,
      ]);

      const result = await service.getEpisodesBySeason('Test Show', 1, 10);

      expect(episodeRepository.findBySeason).toHaveBeenCalledWith(
        'Test Show',
        1,
        10,
      );
      expect(result).toEqual([mockEpisode]);
    });

    it('should get episodes by state', async () => {
      episodeRepository.findByState.mockResolvedValue([mockEpisode as Episode]);

      const result = await service.getEpisodesByState('playing', 10);

      expect(episodeRepository.findByState).toHaveBeenCalledWith('playing', 10);
      expect(result).toEqual([mockEpisode]);
    });

    it('should get tv watching stats', async () => {
      const tvStats = { totalWatchTimeMs: 10800000 };
      episodeRepository.getWatchingStats.mockResolvedValue(tvStats);

      const result = await service.getTVWatchingStats('week');

      expect(episodeRepository.getWatchingStats).toHaveBeenCalledWith('week');
      expect(result).toEqual(tvStats);
    });

    it('should get shows in progress', async () => {
      const shows = [{ title: 'Test Show', episodesWatched: 5 }];
      episodeRepository.getShowsInProgress.mockResolvedValue(shows);

      const result = await service.getShowsInProgress();

      expect(episodeRepository.getShowsInProgress).toHaveBeenCalled();
      expect(result).toEqual(shows);
    });
  });

  describe('getStats', () => {
    it('should get combined stats for all media types', async () => {
      const musicStats = { totalListeningTimeMs: 3600000 };
      const movieStats = { totalWatchTimeMs: 7200000 };
      const tvStats = { totalWatchTimeMs: 10800000 };

      trackRepository.getListeningStats.mockResolvedValue(musicStats);
      movieRepository.getWatchingStats.mockResolvedValue(movieStats);
      episodeRepository.getWatchingStats.mockResolvedValue(tvStats);

      const result = await service.getStats('week');

      expect(trackRepository.getListeningStats).toHaveBeenCalledWith('week');
      expect(movieRepository.getWatchingStats).toHaveBeenCalledWith('week');
      expect(episodeRepository.getWatchingStats).toHaveBeenCalledWith('week');

      expect(result).toEqual({
        music: musicStats,
        movies: movieStats,
        tv: tvStats,
      });
    });
  });
});
