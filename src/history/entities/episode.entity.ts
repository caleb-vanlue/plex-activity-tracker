import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'episodes' })
export class Episode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  ratingKey: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  showTitle: string;

  @Column({ nullable: true })
  season: number;

  @Column({ nullable: true })
  episode: number;

  @Column({ nullable: true })
  summary: string;

  @Column({ nullable: true })
  duration: number;

  @Column({ default: 'unknown' })
  state: string;

  @Column({ nullable: true })
  user: string;

  @Column({ nullable: true })
  player: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'timestamptz', nullable: true })
  startTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endTime: Date;

  @Column({ type: 'int', nullable: true })
  watchedMs: number;

  @Column({ type: 'float', nullable: true })
  percentComplete: number;

  @Column({ type: 'jsonb', nullable: true })
  raw: any;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
