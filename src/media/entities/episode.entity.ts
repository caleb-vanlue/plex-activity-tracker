import { Entity, Column } from 'typeorm';
import { BaseMediaEntity } from '../../common/entities/base-media.entity';

@Entity('episodes')
export class Episode extends BaseMediaEntity {
  @Column()
  showTitle: string;

  @Column()
  season: number;

  @Column()
  episode: number;

  @Column({ nullable: true })
  duration: number;

  @Column({ nullable: true, type: 'text' })
  summary: string;

  @Column({ nullable: true, type: 'int' })
  watchedMs: number;

  @Column({ nullable: true, type: 'float' })
  percentComplete: number;
}
