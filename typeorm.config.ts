import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { Track } from 'src/media/entities/track.entity';
import { Episode } from 'src/media/entities/episode.entity';
import { Movie } from 'src/media/entities/movie.entity';

dotenv.config();

export const getDataSourceOptions = (): DataSourceOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'plex',
  entities: [Track, Episode, Movie],
  migrations: ['dist/migrations/*.js'],
});

const dataSource = new DataSource(getDataSourceOptions());
export default dataSource;
