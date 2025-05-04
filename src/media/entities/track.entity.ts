import { Entity, Column } from 'typeorm';
import { BaseMediaEntity } from '../../common/entities/base-media.entity';

@Entity('tracks')
export class Track extends BaseMediaEntity {
  @Column()
  artist: string;

  @Column()
  album: string;

  @Column({ nullable: true, type: 'int' })
  listenedMs: number;
}
