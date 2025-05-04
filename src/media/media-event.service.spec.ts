import { Test, TestingModule } from '@nestjs/testing';
import { MediaEventService } from './media-event.service';

describe('MediaService', () => {
  let service: MediaEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaEventService],
    }).compile();

    service = module.get<MediaEventService>(MediaEventService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
