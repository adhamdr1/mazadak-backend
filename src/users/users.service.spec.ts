import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { CreateUserInput } from './dto/create-user.input';

const mockUserRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByEmailWithPassword: jest.fn(),
  findByPhoneNumber: jest.fn(),
  findByGoogleId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
  softDelete: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    // 2. إعداد بيئة الاختبار المعزولة
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository, // حقن الـ Mock
        },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    // 3. تنظيف الـ Mocks بعد كل اختبار لضمان عدم تداخل الاختبارات
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 4. اختبارات دالة findById
  describe('findById', () => {
    it('should return a user if found', async () => {
      // Arrange (التجهيز)
      const fakeId = new Types.ObjectId().toString();
      const mockUser = { _id: fakeId, firstName: 'Test' };

      // نبرمج الـ Mock ليرجع هذا المستخدم
      mockUserRepository.findById.mockResolvedValue(mockUser);
      // Act (التنفيذ)
      const result = await service.findById(fakeId);
      // Assert (التحقق)
      expect(result).toEqual(mockUser); // هل النتيجة مطابقة للمستخدم الوهمي؟
      expect(mockUserRepository.findById).toHaveBeenCalledWith(fakeId); // هل تم استدعاء الـ DB بنفس الـ ID؟
      expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); // هل تم الاستدعاء مرة واحدة فقط؟
    });

    it('should throw NotFoundException if user is not found', async () => {
      // Arrange
      const fakeId = new Types.ObjectId().toString();
      // نبرمج الـ Mock ليرجع null (محاكاة عدم وجوده في قاعدة البيانات)
      mockUserRepository.findById.mockResolvedValue(null);
      // Act & Assert
      // نتوقع أن رمي الخطأ يحدث عند استدعاء الدالة
      await expect(service.findById(fakeId)).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(fakeId);
    });
  });

  // دالة findAll
  describe('findAll', () => {
    it('should return all users', async () => {
      // Arrange
      const mockUsers = [
        { _id: new Types.ObjectId().toString(), firstName: 'Test1' },
        { _id: new Types.ObjectId().toString(), firstName: 'Test2' },
      ];
      mockUserRepository.findAll.mockResolvedValue(mockUsers);
      // Act
      const result = await service.findAll({ page: 1, limit: 10 });
      // Assert
      expect(result).toEqual(mockUsers);
      expect(mockUserRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array if no users are found', async () => {
      // Arrange
      mockUserRepository.findAll.mockResolvedValue([]);
      // Act
      const result = await service.findAll({ page: 1, limit: 10 });
      // Assert
      expect(result).toEqual([]);
      expect(mockUserRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // دالة create
  describe('create', () => {
    // بيانات تجريبية سنستخدمها في الاختبارات
    const createUserInput: CreateUserInput = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'hashedpassword',
      phoneNumber: '01000000000',
      dateOfBirth: new Date(),
      address: { city: 'Cairo', street: 'Street 1' },
    };

    it('should create a new user successfully', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null); // الإيميل متاح
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null); // الهاتف متاح

      const savedUser = { _id: new Types.ObjectId(), ...createUserInput };
      mockUserRepository.create.mockResolvedValue(savedUser); // الـ DB تنشئ المستخدم

      // Act
      const result = await service.create(createUserInput);

      // Assert
      expect(result).toEqual(savedUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        createUserInput.email,
      );
      expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(
        createUserInput.phoneNumber,
      );
      // تأكد أنه تم تمرير نفس البيانات للـ DB
      expect(mockUserRepository.create).toHaveBeenCalledWith(createUserInput);
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      // محاكاة أن الإيميل موجود بالفعل في قاعدة البيانات
      mockUserRepository.findByEmail.mockResolvedValue({
        _id: new Types.ObjectId(),
      });

      // Act & Assert
      await expect(service.create(createUserInput)).rejects.toThrow(
        ConflictException,
      );

      // تأكد أنه فحص الإيميل، ولكنه لم يكمل لفحص الهاتف أو الإنشاء
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        createUserInput.email,
      );
      expect(mockUserRepository.findByPhoneNumber).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if phone number already exists', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null); // الإيميل متاح
      // محاكاة أن الهاتف موجود بالفعل
      mockUserRepository.findByPhoneNumber.mockResolvedValue({
        _id: new Types.ObjectId(),
      });

      // Act & Assert
      await expect(service.create(createUserInput)).rejects.toThrow(
        ConflictException,
      );

      // تأكد أنه فحص الإيميل، ثم الهاتف، ولكنه لم يكمل الإنشاء
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        createUserInput.email,
      );
      expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith(
        createUserInput.phoneNumber,
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  // دالة updateProfile
  describe('updateProfile', () => {
    const currentUserId = new Types.ObjectId().toString();
    const otherUserId = new Types.ObjectId().toString();

    // محاكاة لبيانات المستخدم الذي يقوم بالطلب
    const normalUserPayload = {
      sub: currentUserId,
      role: UserRole.USER,
      email: 'user@test.com',
    };
    const adminUserPayload = {
      sub: currentUserId,
      role: UserRole.ADMIN,
      email: 'admin@test.com',
    };

    it('should throw ForbiddenException if normal user tries to update another user', async () => {
      // Act & Assert
      // المستخدم العادي يحاول تعديل otherUserId
      await expect(
        service.updateProfile(normalUserPayload, otherUserId, {
          firstName: 'Hacked',
        }),
      ).rejects.toThrow(ForbiddenException);

      // نتأكد أنه لم يصل لقاعدة البيانات أبداً
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if new email belongs to another user', async () => {
      // Arrange
      // محاكاة أن الإيميل موجود، ويعود لمستخدم آخر (ID مختلف)
      mockUserRepository.findByEmail.mockResolvedValue({
        _id: new Types.ObjectId(),
      });

      // Act & Assert
      await expect(
        service.updateProfile(normalUserPayload, currentUserId, {
          email: 'taken@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should NOT throw ConflictException if user sends their own email', async () => {
      // Arrange
      // محاكاة أن الإيميل موجود، ولكنه يعود لنفس المستخدم الذي نعدله
      mockUserRepository.findByEmail.mockResolvedValue({ _id: currentUserId });
      const updatedUser = { _id: currentUserId, email: 'same@example.com' };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateProfile(
        normalUserPayload,
        currentUserId,
        { email: 'same@example.com' },
      );

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('should throw ConflictException if new phone belongs to another user', async () => {
      // Arrange
      // لا توجد مشكلة في الإيميل
      mockUserRepository.findByEmail.mockResolvedValue(null);
      // لكن رقم الهاتف محجوز لمستخدم آخر
      mockUserRepository.findByPhoneNumber.mockResolvedValue({
        _id: new Types.ObjectId(),
      });

      // Act & Assert
      await expect(
        service.updateProfile(normalUserPayload, currentUserId, {
          phoneNumber: '01234567890',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow ADMIN to update any user', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      const updatedUser = { _id: otherUserId, firstName: 'Updated By Admin' };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      // الأدمن يعدل مستخدم آخر
      const result = await service.updateProfile(
        adminUserPayload,
        otherUserId,
        { firstName: 'Updated By Admin' },
      );

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith(otherUserId, {
        firstName: 'Updated By Admin',
      });
    });

    it('should throw NotFoundException if user is not found in DB', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      // قاعدة البيانات فشلت في التحديث وأرجعت null
      mockUserRepository.update.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateProfile(normalUserPayload, currentUserId, {
          firstName: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // دالة softDelete
  describe('softDelete', () => {
    const currentUserId = new Types.ObjectId().toString();
    const otherUserId = new Types.ObjectId().toString();

    const normalUserPayload = {
      sub: currentUserId,
      role: UserRole.USER,
      email: 'user@test.com',
    };
    const adminUserPayload = {
      sub: currentUserId,
      role: UserRole.ADMIN,
      email: 'admin@test.com',
    };

    it('should throw ForbiddenException if normal user tries to delete another user', async () => {
      // Act & Assert
      await expect(
        service.softDelete(normalUserPayload, otherUserId),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUserRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user is not found', async () => {
      // Arrange
      // سنراقب دالة findById الموجودة داخل نفس الـ Service ونجعلها ترمي خطأ
      jest
        .spyOn(service, 'findById')
        .mockRejectedValueOnce(new NotFoundException());

      // Act & Assert
      await expect(
        service.softDelete(normalUserPayload, currentUserId),
      ).rejects.toThrow(NotFoundException);

      expect(mockUserRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should allow user to delete themselves', async () => {
      // Arrange
      // 1. نقوم بتخزين الـ Spy في متغير لكي يرضى عنه TypeScript في النهاية
      // 2. نستخدم as User بدلاً من as any
      const findByIdSpy = jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce({ _id: currentUserId } as unknown as User);

      mockUserRepository.softDelete.mockResolvedValue(undefined); // ترجع void

      // Act
      await service.softDelete(normalUserPayload, currentUserId);

      // Assert
      // نفحص المتغير الذي خزنّاه بدلاً من الدالة الأصلية
      expect(findByIdSpy).toHaveBeenCalledWith(currentUserId);
      expect(mockUserRepository.softDelete).toHaveBeenCalledWith(currentUserId);
    });

    it('should allow ADMIN to delete any user', async () => {
      // Arrange
      const findByIdSpy = jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce({ _id: otherUserId } as unknown as User);

      mockUserRepository.softDelete.mockResolvedValue(undefined);

      // Act
      await service.softDelete(adminUserPayload, otherUserId);

      // Assert
      expect(findByIdSpy).toHaveBeenCalledWith(otherUserId);
      expect(mockUserRepository.softDelete).toHaveBeenCalledWith(otherUserId);
    });
  });

  describe('Finders', () => {
    it('should return a user by email', async () => {
      const email = 'test@example.com';
      const mockUser = { _id: new Types.ObjectId().toString(), email };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      const result = await service.findByEmail(email);
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
    });

    it('should return a user with password by email', async () => {
      const email = 'test@example.com';
      const mockUser = {
        _id: new Types.ObjectId().toString(),
        email,
        password: 'hashed',
      };
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      const result = await service.findByEmailWithPassword(email);
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmailWithPassword).toHaveBeenCalledWith(
        email,
      );
    });

    it('should return a user by googleId', async () => {
      const googleId = 'google123';
      const mockUser = { _id: new Types.ObjectId().toString(), googleId };
      mockUserRepository.findByGoogleId.mockResolvedValue(mockUser);
      const result = await service.findByGoogleId(googleId);
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByGoogleId).toHaveBeenCalledWith(googleId);
    });
  });

  // دالة verifyEmail
  describe('verifyEmail', () => {
    it('should successfully verify email', async () => {
      // Arrange
      const id = new Types.ObjectId().toString();
      const mockUser = { _id: id, isEmailVerified: false } as unknown as User;

      // نراقب دالة findById ونجعلها ترجع المستخدم الوهمي
      const findByIdSpy = jest
        .spyOn(service, 'findById')
        .mockResolvedValueOnce(mockUser);

      mockUserRepository.update.mockResolvedValueOnce(mockUser);

      // Act
      await service.verifyEmail(id);

      // Assert
      expect(findByIdSpy).toHaveBeenCalledWith(id); // تأكدنا أنه استدعى findById
      expect(mockUser.isEmailVerified).toBe(true); // تأكدنا أنه غيّر القيمة إلى true
      expect(mockUserRepository.update).toHaveBeenCalledWith(id, mockUser); // تأكدنا أنه استدعى الـ DB بالحالة الجديدة
    });

    it('should throw NotFoundException if user is not found', async () => {
      // Arrange
      const id = new Types.ObjectId().toString();

      // بما أن findById هي التي ستفشل وترمي الخطأ، سنحاكي هذا الفشل هنا
      const findByIdSpy = jest
        .spyOn(service, 'findById')
        .mockRejectedValueOnce(new NotFoundException('User not found'));

      // Act & Assert
      await expect(service.verifyEmail(id)).rejects.toThrow(NotFoundException);

      expect(findByIdSpy).toHaveBeenCalledWith(id);
      expect(mockUserRepository.update).not.toHaveBeenCalled(); // تأكدنا أنه لم يكمل للحفظ
    });
  });
});
