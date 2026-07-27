import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotificationsService } from './in-app-notifications.service';
import { InAppNotificationType } from './enums/in-app-notification-type.enum';
import { NotificationReferenceType } from './enums/notification-reference-type.enum';
import { InAppNotificationNotFoundException } from '../exceptions/in-app-notification-not-found.exception';
import { Types } from 'mongoose';

const mockNotificationRepository = {
  create: jest.fn(),
  findByUserId: jest.fn(),
  countByUserId: jest.fn(),
  countUnread: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
};

describe('InAppNotificationsService', () => {
  let service: InAppNotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationsService,
        {
          provide: 'IInAppNotificationRepository',
          useValue: mockNotificationRepository,
        },
      ],
    }).compile();

    service = module.get<InAppNotificationsService>(InAppNotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const userId = new Types.ObjectId().toString();
  const notificationId = new Types.ObjectId().toString();
  const mockNotification = {
    _id: notificationId,
    userId,
    type: InAppNotificationType.OUTBID,
    title: 'Outbid',
    body: 'You have been outbid',
    isRead: false,
    referenceId: '123',
    referenceType: NotificationReferenceType.AUCTION,
    createdAt: new Date(),
  };

  describe('create', () => {
    it('should create notification successfully', async () => {
      mockNotificationRepository.create.mockResolvedValue(mockNotification);

      const dto = {
        userId,
        type: InAppNotificationType.OUTBID,
        title: 'Outbid',
        body: 'You have been outbid',
        referenceId: '123',
        referenceType: NotificationReferenceType.AUCTION,
      };

      const result = await service.create(dto);
      expect(result).toEqual(mockNotification);
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        dto,
        undefined,
      );
    });
  });

  describe('getMyNotifications', () => {
    it('should return paginated notifications', async () => {
      mockNotificationRepository.findByUserId.mockResolvedValue([
        mockNotification,
      ]);
      mockNotificationRepository.countByUserId.mockResolvedValue(1);

      const result = await service.getMyNotifications(userId, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        items: [mockNotification],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      });
      expect(mockNotificationRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        1,
        10,
      );
      expect(mockNotificationRepository.countByUserId).toHaveBeenCalledWith(
        userId,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockNotificationRepository.countUnread.mockResolvedValue(5);
      const result = await service.getUnreadCount(userId);
      expect(result).toBe(5);
      expect(mockNotificationRepository.countUnread).toHaveBeenCalledWith(
        userId,
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      mockNotificationRepository.markAsRead.mockResolvedValue(mockNotification);
      const result = await service.markAsRead(notificationId, userId);
      expect(result).toEqual(mockNotification);
      expect(mockNotificationRepository.markAsRead).toHaveBeenCalledWith(
        notificationId,
        userId,
        undefined,
      );
    });

    it('should throw InAppNotificationNotFoundException if notification does not exist', async () => {
      mockNotificationRepository.markAsRead.mockResolvedValue(null);
      await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(
        InAppNotificationNotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      mockNotificationRepository.markAllAsRead.mockResolvedValue(undefined);
      await service.markAllAsRead(userId);
      expect(mockNotificationRepository.markAllAsRead).toHaveBeenCalledWith(
        userId,
        undefined,
      );
    });
  });
});
