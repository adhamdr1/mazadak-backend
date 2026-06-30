import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import type { IUserRepository } from './interfaces/user.repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async create(createUserInput: CreateUserInput) {
    const existingUser = await this.userRepository.findByEmail(
      createUserInput.email,
    );

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const existingPhone = await this.userRepository.findByPhoneNumber(
      createUserInput.phoneNumber,
    );

    if (existingPhone) {
      throw new ConflictException('Phone number already exists');
    }

    // TODO: Create wallet after user creation (WalletModule).
    // This should be done inside a MongoDB transaction when WalletModule is implemented.

    return await this.userRepository.create({
      firstName: createUserInput.firstName,
      lastName: createUserInput.lastName,
      email: createUserInput.email,
      password: createUserInput.password, // Password is already hashed by AuthService.
      phoneNumber: createUserInput.phoneNumber,
      dateOfBirth: createUserInput.dateOfBirth,
      address: createUserInput.address,
    });
  }
}

// أولاً: دوال الحسابات (Auth & Profile)

// [ ] createUser: بتستلم الـ DTO وتكريت اليوزر (الباسورد بيتشفر في الـ Auth قبل ما يجيلها).

// [ ] findByEmail: بترجع اليوزر (ومعاها الباسورد المخفي) عشان الـ AuthModule يقارنه وقت الـ Login.

// [ ] findById: دي اللي هنستخدمها في الـ FindMe (لليوزر يشوف بروفايله) وبرضه للـ Admin عشان يجيب بيانات يوزر معين.

// [ ] updateProfile: عشان اليوزر يغير بياناته (ما عدا الإيميل والباسورد لأن ليهم نظام تاني).

// [ ] verifyEmail: دالة بسيطة بتغير حالة الإيميل لـ Verified.

// ثانياً: دوال الإدارة (Admin Operations)

// [ ] findAllUsers: بترجع كل اليوزرات (بندعم فيها الـ Pagination زي Page 1, Page 2 عشان لو عددهم كبير).

// [ ] softDeleteUser: بتحول isDeleted لـ true بدل ما تمسح الريكورد تماماً.

// ثالثاً: دوال الفلوس والمزايدة (هتتكتب دلوقتي وتتساب جاهزة للـ Transactions و الـ Bids)

// [ ] addBalance: بتزود الـ totalBalance (هيناديها الـ Transactions لما الدفع ينجح).

// [ ] withdrawBalance: بتشيك إن الرصيد المتاح (totalBalance - heldBalance) يكفي، وتخصم الفلوس (هيناديها الـ Transactions لما الأدمن يوافق).

// [ ] holdBalance: بتنقص من الـ total وتزود في الـ held (هيناديها الـ Bids لما يوزر يدخل مزاد).

// [ ] releaseBalance: بترجع الفلوس من الـ held للـ total (هيناديها الـ Bids لما اليوزر يخسر المزاد).

// [ ] deductHeldBalance: بتخصم الفلوس من الـ held نهائياً (هيناديها الـ Auctions لما المزاد يخلص واليوزر ده يكون هو الكسبان).
