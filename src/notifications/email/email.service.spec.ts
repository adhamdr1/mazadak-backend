import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationFailedException } from '../exceptions/notification-failed.exception';

const mockMailerService = {
  sendMail: jest.fn(),
};

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send email successfully', async () => {
    mockMailerService.sendMail.mockResolvedValue(undefined);

    await service.send('user@example.com', 'Subject', 'template', {
      key: 'val',
    });

    expect(mockMailerService.sendMail).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Subject',
      template: 'template',
      context: { key: 'val' },
    });
  });

  it('should throw NotificationFailedException when mailer fails', async () => {
    mockMailerService.sendMail.mockRejectedValue(
      new Error('SMTP connection error'),
    );

    await expect(
      service.send('user@example.com', 'Subject', 'template', {}),
    ).rejects.toThrow(NotificationFailedException);
  });
});
