import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuctionsResolver } from './admin-auctions.resolver';
import { AuctionsService } from '../../auctions/auctions.service';

describe('AdminAuctionsResolver', () => {
  let resolver: AdminAuctionsResolver;

  const mockAuctionsService = {
    findAllForAdmin: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    adminCancelAuction: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuctionsResolver,
        { provide: AuctionsService, useValue: mockAuctionsService },
      ],
    }).compile();

    resolver = module.get<AdminAuctionsResolver>(AdminAuctionsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should call auctionsService.findAllForAdmin', async () => {
    await resolver.adminGetAuctions({ page: 1, limit: 10 }, {});
    expect(mockAuctionsService.findAllForAdmin).toHaveBeenCalled();
  });

  it('should call auctionsService.adminCancelAuction', async () => {
    await resolver.adminCancelAuction('1', 'reason');
    expect(mockAuctionsService.adminCancelAuction).toHaveBeenCalledWith(
      '1',
      'reason',
    );
  });
});
