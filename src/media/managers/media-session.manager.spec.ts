import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MediaSessionManager } from '../managers/media-session.manager';
import { UserMediaSessionRepository } from '../repositories/user-media-session.repository';
import { UserMediaSession } from '../entities/user-media-session.entity';

describe('MediaSessionManager', () => {
  let manager: MediaSessionManager;
  let userMediaSessionRepository: jest.Mocked<UserMediaSessionRepository>;

  beforeEach(async () => {
    const userMediaSessionRepositoryMock = {
      findAllActive: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaSessionManager,
        {
          provide: UserMediaSessionRepository,
          useValue: userMediaSessionRepositoryMock,
        },
      ],
    }).compile();

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    manager = module.get<MediaSessionManager>(MediaSessionManager);
    userMediaSessionRepository = module.get(
      UserMediaSessionRepository,
    ) as jest.Mocked<UserMediaSessionRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(manager).toBeDefined();
  });

  describe('initialize', () => {
    it('should load active sessions from the repository', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          mediaType: 'track',
          mediaId: 'track-1',
          state: 'playing',
          startTime: new Date(),
          track: { id: 'track-1', title: 'Test Track' },
        },
        {
          id: 'session-2',
          userId: 'user-2',
          mediaType: 'movie',
          mediaId: 'movie-1',
          state: 'playing',
          startTime: new Date(),
          movie: { id: 'movie-1', title: 'Test Movie' },
        },
      ];

      userMediaSessionRepository.findAllActive.mockResolvedValue(
        mockSessions as unknown as UserMediaSession[],
      );

      await manager.initialize();

      expect(userMediaSessionRepository.findAllActive).toHaveBeenCalled();

      const activeUsers = manager.getActiveUsers();
      expect(activeUsers).toContain('user-1');
      expect(activeUsers).toContain('user-2');

      const trackSessions = manager.getCurrentMedia('track');
      expect(trackSessions).toHaveLength(1);
      expect(trackSessions[0].title).toBe('Test Track');

      const movieSessions = manager.getCurrentMedia('movie');
      expect(movieSessions).toHaveLength(1);
      expect(movieSessions[0].title).toBe('Test Movie');
    });
  });

  describe('addSession', () => {
    it('should add a track session', () => {
      const trackSession = {
        id: 'session-1',
        userId: 'user-1',
        mediaType: 'track',
        mediaId: 'track-1',
        state: 'playing',
        startTime: new Date(),
        track: { id: 'track-1', title: 'Test Track', artist: 'Test Artist' },
      };

      manager.addSession(trackSession);

      const trackSessions = manager.getCurrentMedia('track');
      expect(trackSessions).toHaveLength(1);
      expect(trackSessions[0].title).toBe('Test Track');
      expect(trackSessions[0].artist).toBe('Test Artist');

      const activeUsers = manager.getActiveUsers();
      expect(activeUsers).toContain('user-1');
    });

    it('should add a movie session', () => {
      const movieSession = {
        id: 'session-1',
        userId: 'user-1',
        mediaType: 'movie',
        mediaId: 'movie-1',
        state: 'playing',
        startTime: new Date(),
        movie: { id: 'movie-1', title: 'Test Movie', year: 2023 },
      };

      manager.addSession(movieSession);

      const movieSessions = manager.getCurrentMedia('movie');
      expect(movieSessions).toHaveLength(1);
      expect(movieSessions[0].title).toBe('Test Movie');
      expect(movieSessions[0].year).toBe(2023);
    });

    it('should add an episode session', () => {
      const episodeSession = {
        id: 'session-1',
        userId: 'user-1',
        mediaType: 'episode',
        mediaId: 'episode-1',
        state: 'playing',
        startTime: new Date(),
        episode: {
          id: 'episode-1',
          title: 'Test Episode',
          showTitle: 'Test Show',
          season: 1,
          episode: 1,
        },
      };

      manager.addSession(episodeSession);

      const episodeSessions = manager.getCurrentMedia('episode');
      expect(episodeSessions).toHaveLength(1);
      expect(episodeSessions[0].title).toBe('Test Episode');
      expect(episodeSessions[0].showTitle).toBe('Test Show');
    });

    it('should handle missing relation data', () => {
      const trackSession = {
        id: 'session-1',
        userId: 'user-1',
        mediaType: 'track',
        mediaId: 'track-1',
        state: 'playing',
        startTime: new Date(),
      };

      manager.addSession(trackSession);

      const trackSessions = manager.getCurrentMedia('track');
      expect(trackSessions).toHaveLength(0);
    });

    it('should create a new user entry if one does not exist', () => {
      const trackSession = {
        id: 'session-1',
        userId: 'new-user',
        mediaType: 'track',
        mediaId: 'track-1',
        state: 'playing',
        startTime: new Date(),
        track: { id: 'track-1', title: 'Test Track' },
      };

      manager.addSession(trackSession);

      const activeUsers = manager.getActiveUsers();
      expect(activeUsers).toContain('new-user');
    });
  });

  describe('removeSession', () => {
    beforeEach(() => {
      manager.addSession({
        id: 'session-1',
        userId: 'user-1',
        mediaType: 'track',
        mediaId: 'track-1',
        state: 'playing',
        startTime: new Date(),
        track: { id: 'track-1', title: 'Test Track' },
      });

      manager.addSession({
        id: 'session-2',
        userId: 'user-1',
        mediaType: 'movie',
        mediaId: 'movie-1',
        state: 'playing',
        startTime: new Date(),
        movie: { id: 'movie-1', title: 'Test Movie' },
      });
    });

    it('should remove a track session', () => {
      manager.removeSession('user-1', 'track', 'session-1');

      const trackSessions = manager.getCurrentMedia('track');
      expect(trackSessions).toHaveLength(0);

      const activeUsers = manager.getActiveUsers();
      expect(activeUsers).toContain('user-1');
    });

    it('should remove a movie session', () => {
      manager.removeSession('user-1', 'movie', 'session-2');

      const movieSessions = manager.getCurrentMedia('movie');
      expect(movieSessions).toHaveLength(0);

      const activeUsers = manager.getActiveUsers();
      expect(activeUsers).toContain('user-1');
    });

    it('should handle removing non-existent sessions', () => {
      manager.removeSession('user-1', 'episode', 'session-3');

      const trackSessions = manager.getCurrentMedia('track');
      expect(trackSessions).toHaveLength(1);

      const movieSessions = manager.getCurrentMedia('movie');
      expect(movieSessions).toHaveLength(1);
    });

    it('should handle removing sessions for non-existent users', () => {
      manager.removeSession('non-existent-user', 'track', 'session-1');

      const trackSessions = manager.getCurrentMedia('track');
      expect(trackSessions).toHaveLength(1);
    });
  });

  describe('updateSession', () => {
    it('should add the session if state is not stopped', () => {
      const session = {
        id: 'session-1',
        userId: 'user-1',
        mediaType: 'track',
        mediaId: 'track-1',
        state: 'playing',
        startTime: new Date(),
        track: { id: 'track-1', title: 'Test Track' },
      };

      const addSessionSpy = jest.spyOn(manager, 'addSession');

      manager.updateSession(session);

      expect(addSessionSpy).toHaveBeenCalledWith(session);
    });

    it('should remove the session if state is stopped', () => {
      const session = {
        id: 'session-1',
        userId: 'user-1',
        mediaType: 'track',
        mediaId: 'track-1',
        state: 'stopped',
        startTime: new Date(),
        track: { id: 'track-1', title: 'Test Track' },
      };

      const removeSessionSpy = jest.spyOn(manager, 'removeSession');

      manager.updateSession(session);

      expect(removeSessionSpy).toHaveBeenCalledWith(
        'user-1',
        'track',
        'session-1',
      );
    });
  });

  describe('getCurrentMedia', () => {
    beforeEach(() => {
      manager.addSession({
        id: 'session-1',
        userId: 'user-1',
        mediaType: 'track',
        mediaId: 'track-1',
        state: 'playing',
        startTime: new Date(),
        track: { id: 'track-1', title: 'Track 1', artist: 'Artist 1' },
      });

      manager.addSession({
        id: 'session-2',
        userId: 'user-1',
        mediaType: 'movie',
        mediaId: 'movie-1',
        state: 'playing',
        startTime: new Date(),
        movie: { id: 'movie-1', title: 'Movie 1', year: 2021 },
      });

      manager.addSession({
        id: 'session-3',
        userId: 'user-2',
        mediaType: 'track',
        mediaId: 'track-2',
        state: 'playing',
        startTime: new Date(),
        track: { id: 'track-2', title: 'Track 2', artist: 'Artist 2' },
      });

      manager.addSession({
        id: 'session-4',
        userId: 'user-2',
        mediaType: 'episode',
        mediaId: 'episode-1',
        state: 'playing',
        startTime: new Date(),
        episode: {
          id: 'episode-1',
          title: 'Episode 1',
          showTitle: 'Show 1',
          season: 1,
          episode: 1,
        },
      });
    });

    it('should return all tracks for a specific user', () => {
      const tracks = manager.getCurrentMedia('track', 'user-1');
      expect(tracks).toHaveLength(1);
      expect(tracks[0].title).toBe('Track 1');
      expect(tracks[0].sessionId).toBe('session-1');
    });

    it('should return all movies for a specific user', () => {
      const movies = manager.getCurrentMedia('movie', 'user-1');
      expect(movies).toHaveLength(1);
      expect(movies[0].title).toBe('Movie 1');
      expect(movies[0].sessionId).toBe('session-2');
    });

    it('should return all episodes for a specific user', () => {
      const episodes = manager.getCurrentMedia('episode', 'user-2');
      expect(episodes).toHaveLength(1);
      expect(episodes[0].title).toBe('Episode 1');
      expect(episodes[0].sessionId).toBe('session-4');
    });

    it('should return all media for a specific user', () => {
      const allMedia = manager.getCurrentMedia('all', 'user-1');
      expect(allMedia.tracks).toHaveLength(1);
      expect(allMedia.movies).toHaveLength(1);
      expect(allMedia.episodes).toHaveLength(0);
      expect(allMedia.tracks[0].title).toBe('Track 1');
      expect(allMedia.movies[0].title).toBe('Movie 1');
    });

    it('should return all tracks across users', () => {
      const tracks = manager.getCurrentMedia('track');
      expect(tracks).toHaveLength(2);
      expect(tracks.some((t) => t.title === 'Track 1')).toBe(true);
      expect(tracks.some((t) => t.title === 'Track 2')).toBe(true);
    });

    it('should return all movies across users', () => {
      const movies = manager.getCurrentMedia('movie');
      expect(movies).toHaveLength(1);
      expect(movies[0].title).toBe('Movie 1');
    });

    it('should return all episodes across users', () => {
      const episodes = manager.getCurrentMedia('episode');
      expect(episodes).toHaveLength(1);
      expect(episodes[0].title).toBe('Episode 1');
    });

    it('should return all media across users', () => {
      const allMedia = manager.getCurrentMedia('all');
      expect(allMedia.tracks).toHaveLength(2);
      expect(allMedia.movies).toHaveLength(1);
      expect(allMedia.episodes).toHaveLength(1);
    });

    it('should include user information when not filtering by user', () => {
      const tracks = manager.getCurrentMedia('track');
      const track1 = tracks.find((t) => t.title === 'Track 1');
      const track2 = tracks.find((t) => t.title === 'Track 2');

      expect(track1?.userId).toBe('user-1');
      expect(track2?.userId).toBe('user-2');
    });

    it('should return empty results for a non-existent user', () => {
      const allMedia = manager.getCurrentMedia('all', 'non-existent-user');
      expect(allMedia.tracks).toHaveLength(0);
      expect(allMedia.movies).toHaveLength(0);
      expect(allMedia.episodes).toHaveLength(0);
    });
  });

  describe('getActiveUsers', () => {
    it('should return all users with active sessions', () => {
      manager.addSession({
        id: 'session-1',
        userId: 'user-1',
        mediaType: 'track',
        mediaId: 'track-1',
        state: 'playing',
        startTime: new Date(),
        track: { id: 'track-1', title: 'Track 1' },
      });

      manager.addSession({
        id: 'session-2',
        userId: 'user-2',
        mediaType: 'movie',
        mediaId: 'movie-1',
        state: 'playing',
        startTime: new Date(),
        movie: { id: 'movie-1', title: 'Movie 1' },
      });

      const activeUsers = manager.getActiveUsers();
      expect(activeUsers).toHaveLength(2);
      expect(activeUsers).toContain('user-1');
      expect(activeUsers).toContain('user-2');
    });

    it('should return empty array when no active users', () => {
      const activeUsers = manager.getActiveUsers();
      expect(activeUsers).toHaveLength(0);
    });
  });

  describe('getSessionCount', () => {
    it('should return count of all active sessions', () => {
      manager.addSession({
        id: 'session-1',
        userId: 'user-1',
        mediaType: 'track',
        mediaId: 'track-1',
        state: 'playing',
        startTime: new Date(),
        track: { id: 'track-1', title: 'Track 1' },
      });

      manager.addSession({
        id: 'session-2',
        userId: 'user-1',
        mediaType: 'movie',
        mediaId: 'movie-1',
        state: 'playing',
        startTime: new Date(),
        movie: { id: 'movie-1', title: 'Movie 1' },
      });

      manager.addSession({
        id: 'session-3',
        userId: 'user-2',
        mediaType: 'episode',
        mediaId: 'episode-1',
        state: 'playing',
        startTime: new Date(),
        episode: { id: 'episode-1', title: 'Episode 1' },
      });

      const sessionCount = manager.getSessionCount();
      expect(sessionCount.total).toBe(3);
      expect(sessionCount.tracks).toBe(1);
      expect(sessionCount.movies).toBe(1);
      expect(sessionCount.episodes).toBe(1);
    });

    it('should return zeros when no active sessions', () => {
      const sessionCount = manager.getSessionCount();
      expect(sessionCount.total).toBe(0);
      expect(sessionCount.tracks).toBe(0);
      expect(sessionCount.movies).toBe(0);
      expect(sessionCount.episodes).toBe(0);
    });
  });
});
