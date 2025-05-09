import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Track } from './track.entity';
import { Movie } from './movie.entity';
import { Episode } from './episode.entity';
import { User } from './user.entity';

@Entity('user_media_sessions')
export class UserMediaSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.mediaSessions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ['track', 'movie', 'episode'] })
  mediaType: string;

  @Column()
  mediaId: string;

  @ManyToOne(() => Track, { nullable: true })
  @JoinColumn({ name: 'track_id' })
  track: Track;

  @ManyToOne(() => Movie, { nullable: true })
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @ManyToOne(() => Episode, { nullable: true })
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  @Column({ type: 'enum', enum: ['playing', 'paused', 'stopped'] })
  state: string;

  @Column({ nullable: true })
  player: string;

  @Column({ nullable: true, type: 'timestamp' })
  startTime: Date;

  @Column({ nullable: true, type: 'timestamp' })
  endTime: Date;

  @Column({ default: 0 })
  timeWatchedMs: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
