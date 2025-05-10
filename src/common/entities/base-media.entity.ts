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

  @Column({ nullable: true })
  thumbnailFileId?: string;

  @Column({ type: 'jsonb', nullable: true })
  raw: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
