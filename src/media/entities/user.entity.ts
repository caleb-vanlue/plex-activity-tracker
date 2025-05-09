import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserMediaSession } from '../../media/entities/user-media-session.entity';

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  thumbUrl: string;

  @OneToMany(() => UserMediaSession, (session) => session.user)
  mediaSessions: UserMediaSession[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
