import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseMediaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ratingKey: string;

  @Column()
  title: string;

  @Column()
  state: string;

  @Column({ nullable: true })
  user: string;

  @Column({ nullable: true })
  player: string;

  @Column({ nullable: true, type: 'timestamptz' })
  startTime: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  endTime?: Date;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  raw: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
