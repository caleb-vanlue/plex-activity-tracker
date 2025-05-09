import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
  ) {}

  async findOrCreate(title: string): Promise<User> {
    let user = await this.repository.findOne({
      where: { id: title },
    });

    if (!user) {
      user = this.repository.create({
        id: title,
        title,
      });
      await this.repository.save(user);
    }

    return user;
  }

  async findAll(): Promise<User[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
    });
  }
}
