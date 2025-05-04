import { Entity, Column } from 'typeorm';
import { BaseMediaEntity } from '../../common/entities/base-media.entity';

@Entity('movies')
export class Movie extends BaseMediaEntity {
  @Column({ nullable: true })
  year: number;

  @Column({ nullable: true })
  director: string;

  @Column({ nullable: true })
  studio: string;

  @Column({ nullable: true })
  duration: number;

  @Column({ nullable: true, type: 'text' })
  summary: string;

  @Column({ nullable: true, type: 'int' })
  watchedMs: number;

  @Column({ nullable: true, type: 'float' })
  percentComplete: number;
}
