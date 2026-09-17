# Backend Contract — مزادك
## (المرجع الكامل للربط بين الفرونت إند والباك إند)

> **قرأ هذا الملف قبل بناء أي Feature في الفرونت.**
> يحتوي على كل نقاط الدخول، الـ Inputs، الـ Responses، وكودات الأخطاء.

---

## نقاط الدخول (Entry Points)

```
الباك إند يعمل على: http://localhost:3000

┌─────────────────────────────────────────────────────┐
│  GraphQL API     →  POST http://localhost:3000/graphql
│  (كل شيء عدا الـ Payment)
│
│  REST API (Payment فقط):
│  POST http://localhost:3000/payments/initialize      (يحتاج Auth)
│  POST http://localhost:3000/payments/webhooks/stripe (Public - من Stripe)
│  POST http://localhost:3000/payments/webhooks/paymob (Public - من Paymob)
│
│  WebSocket       →  ws://localhost:3000
│  (Subscriptions عبر GraphQL WebSocket Protocol)
└─────────────────────────────────────────────────────┘
```

### الـ Authentication
كل الطلبات المحمية (Protected) تحتاج Header:
```
Authorization: Bearer <accessToken>
```
الـ `accessToken` صالح لـ **15 دقيقة**. يُجدد عبر mutation `refreshToken`.
الـ `refreshToken` صالح لـ **7 أيام**.

---

### ⚠️ تنبيه حاسم للفرونت إند: أنواع الحقول المالية (Decimal as String)
جميع مبالغ الفلوس والأسعار في الـ GraphQL Responses:
* في المحفظة (`Wallet`): `balance: String!`, `heldBalance: String!`, `availableBalance: String!`
* في المزادات (`Auction`): `currentPrice: String!`, `startingPrice: String!`, `minimumBidIncrement: String!`
* في المزايدات (`Bid`): `amount: String!`
* في المزايدة التلقائية (`AutoBid`): `maxAmount: String!`
* في المعاملات (`Transaction`): `amount: String!`

> **السبب وطريقة التعامل:**
> يتم إرجاع المبالغ كـ `String` لحماية دقة الحسابات المالية (Decimal Precision) ومنع أخطاء الـ Floating Points.
> **على مطور الفرونت إند:** استخدم دائماً `Number(value)` أو `parseFloat(value)` قبل إجراء أي عمليات حسابية أو استدعاء دوال الأرقام مثل `value.toFixed(2)` حتى لا ينهار التطبيق بخطأ Runtime (`toFixed is not a function`).

---

## كيف تبعت GraphQL Request

```ts
// كل الـ GraphQL Requests هي POST على نفس الـ endpoint
POST http://localhost:3000/graphql
Content-Type: application/json

// Body:
{
  "query": "mutation login($loginInput: LoginInput!) { login(loginInput: $loginInput) { accessToken refreshToken user { _id email firstName } } }",
  "variables": { "loginInput": { "email": "user@test.com", "password": "pass123" } }
}
```

---

## أشكال الأخطاء من الـ GraphQL API

```json
// شكل Response الناجح:
{
  "data": {
    "login": {
      "accessToken": "...",
      "refreshToken": "...",
      "user": { "_id": "...", "email": "..." }
    }
  }
}

// شكل Response الفاشل:
{
  "errors": [
    {
      "message": "INVALID_CREDENTIALS",
      "extensions": {
        "code": "UNAUTHORIZED",
        "status": 401
      }
    }
  ],
  "data": null
}
```

**الـ Frontend لازم يتحقق من `response.data.errors` قبل ما يستخدم البيانات.**

---

## 1. Auth Module

### 1.1 تسجيل حساب جديد (register)

**المدخلات:**
```graphql
mutation {
  register(registerInput: {
    firstName: String!
    lastName: String!
    email: String!
    password: String!
    phoneNumber: String!        # مثال: "+201012345678"
    dateOfBirth: DateTime!      # ISO 8601: "1995-06-15T00:00:00Z"
    address: {
      city: String!
      street: String!
    }
  }) {
    success    # Boolean
    message    # String
  }
}
```

**Response الناجح:**
```json
{
  "success": true,
  "message": "Verification email sent. Please check your inbox to verify your account."
}
```

**الأخطاء المحتملة:**
| كود الخطأ | HTTP | المعنى | ما يعرضه الفرونت |
|:---|:---:|:---|:---|
| `EMAIL_ALREADY_EXISTS` | 409 | الإيميل مسجل مسبقاً | "البريد الإلكتروني مستخدم بالفعل" |
| `PHONE_ALREADY_EXISTS` | 409 | رقم الهاتف مسجل مسبقاً | "رقم الهاتف مستخدم بالفعل" |
| `ACCOUNT_SOFT_DELETED` | 401 | حساب محذوف ناعم — يحتاج إعادة تفعيل | توجيه لـ `/reactivate` |

---

### 1.2 تسجيل الدخول (login)

**المدخلات:**
```graphql
mutation {
  login(loginInput: {
    email: String!
    password: String!
  }) {
    accessToken
    refreshToken
    user {
      _id  email  firstName  lastName
      role         # "USER" | "ADMIN"
      isEmailVerified
      isBanned
      authProvider # "LOCAL" | "GOOGLE"
      phoneNumber
      dateOfBirth
      address { city street }
      ratingStats { averageRating totalReviews }
      createdAt
    }
  }
}
```

**Response الناجح:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "_id": "64abc...",
    "email": "user@test.com",
    "firstName": "أحمد",
    "lastName": "محمد",
    "role": "USER",
    "isEmailVerified": true
  }
}
```

**الأخطاء المحتملة:**
| كود الخطأ | HTTP | المعنى | ما يعرضه الفرونت |
|:---|:---:|:---|:---|
| `INVALID_CREDENTIALS` | 401 | إيميل أو باسورد غلط | "البريد الإلكتروني أو كلمة المرور غير صحيحة" |
| `EMAIL_NOT_VERIFIED` | 401 | الإيميل لم يتم تفعيله بعد | "يرجى تفعيل بريدك الإلكتروني أولاً" + زر "إعادة إرسال رابط التفعيل" |
| `ACCOUNT_SOFT_DELETED` | 401 | حساب محذوف ناعماً | توجيه لـ `/reactivate` |
| `ACCOUNT_BANNED` | 401 | الحساب محظور من الإدارة | "تم تعليق حسابك. تواصل مع الدعم." |
| `GOOGLE_ACCOUNT_NO_PASSWORD` | 400 | الحساب مسجل بـ Google وليس له باسورد | "هذا الحساب مسجل بواسطة Google. استخدم تسجيل الدخول بـ Google." |

---

### 1.3 تسجيل الدخول بـ Google (googleLogin)

**المدخلات:**
```graphql
mutation {
  googleLogin(googleLoginInput: {
    token: String!   # الـ ID Token من Google SDK
  }) {
    accessToken  refreshToken  user { ... }
  }
}
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `INVALID_OR_EXPIRED_TOKEN` | الـ Google Token غير صالح |
| `USER_NOT_FOUND_REQUIRE_REGISTRATION` | الإيميل غير مسجل — وجّه لـ Google Register |
| `ACCOUNT_SOFT_DELETED` | حساب محذوف — وجّه لـ `/reactivate` |

---

### 1.4 إنشاء حساب بـ Google (googleRegister)

**المدخلات:**
```graphql
mutation {
  googleRegister(googleRegisterInput: {
    token: String!          # الـ ID Token من Google
    firstName: String!
    lastName: String!
    phoneNumber: String!
    dateOfBirth: DateTime!
    address: { city: String!  street: String! }
  }) {
    accessToken  refreshToken  user { ... }
  }
}
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `INVALID_OR_EXPIRED_TOKEN` | الـ Google Token غير صالح |
| `EMAIL_ALREADY_EXISTS` | الإيميل مسجل مسبقاً |

---

### 1.5 تأكيد البريد الإلكتروني (confirmEmail)

**المدخلات:**
```graphql
mutation {
  confirmEmail(token: String!)   # Token من الـ URL
}
# Returns: Boolean (true = نجاح)
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `INVALID_OR_EXPIRED_TOKEN` | الرابط منتهي الصلاحية أو مزور |

---

### 1.6 إعادة إرسال رابط التفعيل (resendConfirmationEmail)

```graphql
mutation { resendConfirmationEmail(email: String!) }
# Returns: Boolean (true دائماً لأسباب أمنية)
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `EMAIL_ALREADY_VERIFIED` | الإيميل مفعل مسبقاً |

---

### 1.7 نسيت كلمة المرور (forgotPassword)

```graphql
mutation {
  forgotPassword(input: { email: String! })
}
# Returns: Boolean (true دائماً لأسباب أمنية — حتى لو الإيميل غير موجود)
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `GOOGLE_ACCOUNT_NO_PASSWORD` | حساب Google فقط |

> **ملاحظة أمنية:** الـ Rate Limit 2 دقيقة بين كل طلب لنفس الحساب. لا تعرض للمستخدم أي خطأ في هذه الحالة.

---

### 1.8 تعيين كلمة المرور الجديدة (resetPassword)

```graphql
mutation {
  resetPassword(input: {
    email: String!
    token: String!     # من الـ URL
    password: String!
  })
}
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `USER_NOT_FOUND` | الإيميل غير موجود |
| `INVALID_OR_EXPIRED_TOKEN` | الرابط منتهي (15 دقيقة) أو مزور |

---

### 1.9 تجديد الـ Token (refreshToken)

```graphql
mutation {
  refreshToken(refreshToken: String!)
  # Returns: AuthResponse (accessToken + refreshToken جديدان)
}
```

> **مهم:** الـ Refresh Token يُستخدم مرة واحدة فقط (Single-Use / Token Rotation).
> بعد الاستخدام، يُولَّد refreshToken جديد. **احفظ الجديد بدل القديم فوراً.**

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `INVALID_OR_EXPIRED_TOKEN` | الـ Token منتهي أو مستخدم — وجّه لـ `/login` |
| `ACCOUNT_DISABLED` | الحساب محذوف أو محظور |

---

### 1.10 تسجيل الخروج (logout / logoutAll)

```graphql
# خروج من الجهاز الحالي:
mutation { logout(refreshToken: String!) }

# خروج من كل الأجهزة:
mutation { logoutAll }   # يحتاج Access Token
```

---

### 1.11 إعادة تفعيل الحساب المحذوف (requestReactivation / confirmReactivation)

```graphql
# طلب رابط إعادة التفعيل:
mutation { requestReactivation(email: String!) }
# Returns: Boolean (true دائماً)

# تأكيد إعادة التفعيل:
mutation { confirmReactivation(token: String!) }
# Returns: Boolean
```

---

### 1.12 تحديث كلمة المرور (updatePassword) — محمي

```graphql
mutation {
  updatePassword(input: {
    oldPassword: String!
    password: String!
  })
}
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `GOOGLE_ACCOUNT_NO_PASSWORD` | حساب Google |
| `INVALID_CREDENTIALS` | الباسورد القديم غلط |
| `SAME_PASSWORD` | الباسورد الجديد نفس القديم |

---

## 2. Users Module

### 2.1 ملفي الشخصي (me) — محمي

```graphql
query {
  me {
    _id  firstName  lastName  email  role
    phoneNumber  dateOfBirth
    address { city  street }
    authProvider  isEmailVerified  isBanned
    ratingStats {
      averageRating  totalReviews
      asSellerAverageRating  asSellerTotalReviews
      asBuyerAverageRating   asBuyerTotalReviews
      breakdown { oneStar  twoStar  threeStar  fourStar  fiveStar }
    }
    createdAt
  }
}
```

---

### 2.2 الملف العام لمستخدم (publicProfile)

```graphql
query {
  publicProfile(userId: ID!) {
    id  firstName  lastName  city
    memberSince
    ratingStats { averageRating  totalReviews ... }
    activeAuctionsCount
    completedAuctionsCount
  }
}
```

---

### 2.3 تعديل الملف الشخصي (updateProfile) — محمي

```graphql
mutation {
  updateProfile(input: {
    firstName: String
    lastName: String
    phoneNumber: String
    dateOfBirth: DateTime
    address: { city: String  street: String }
    # email: غير مسموح بتغييره هنا
  }) {
    _id  firstName  lastName  ...
  }
}
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `PHONE_ALREADY_EXISTS` | رقم الهاتف مستخدم |

---

### 2.4 حذف الحساب (deleteAccount) — محمي

```graphql
mutation { deleteAccount }
# Returns: Boolean
# ملاحظة: هذا Soft Delete — الحساب يمكن إعادة تفعيله
```

---

## 3. Auctions Module

### 3.1 قائمة المزادات (auctions) — عام

```graphql
query {
  auctions(
    input: { page: 1, limit: 10 }
    filter: {
      category: AuctionCategory   # ELECTRONICS | FASHION | JEWELRY | WATCHES | ANTIQUES | ART | COLLECTIBLES | BOOKS | FURNITURE | HOME_APPLIANCES | CARS | MOTORCYCLES | REAL_ESTATE | SPORTS | TOYS | OTHER
      status: AuctionStatus       # PENDING | ACTIVE | ENDED | CANCELLED
      search: String              # بحث جزئي غير حساس لحالة الأحرف (Partial Regex Search) في العنوان والوصف
      sort: { field: CREATED_AT | START_TIME | END_TIME | CURRENT_PRICE | TITLE, order: ASC | DESC }
    }
  ) {
    items {
      _id  title  description  images
      category  status
      startingPrice       # String! (Decimal — حوله بـ Number في الفرونت)
      currentPrice        # String! (Decimal — حوله بـ Number في الفرونت)
      minimumBidIncrement # String! (Decimal — حوله بـ Number في الفرونت)
      startTime  endTime
      sellerId  winnerId  isFinalized
      createdAt
    }
    total  totalPages  hasNextPage
  }
}
```

---

### 3.2 تفاصيل مزاد (auction) — عام

```graphql
query {
  auction(id: ID!) {
    _id  title  description  images
    category  status
    startingPrice        # String!
    currentPrice         # String!
    minimumBidIncrement  # String!
    startTime  endTime
    sellerId  winnerId  isFinalized
    adminActionReason
    createdAt  updatedAt
  }
}
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `AUCTION_NOT_FOUND` | المزاد غير موجود |

---

### 3.3 إنشاء مزاد (createAuction) — محمي

```graphql
mutation {
  createAuction(input: {
    title: String!
    description: String!
    category: AuctionCategory!
    startingPrice: Float!           # بالجنيه
    minimumBidIncrement: Float!     # أقل زيادة مسموحة
    images: [String!]!              # URLs بعد رفعها على Cloudinary
    startTime: DateTime!            # لازم بعد الحالي بشوية
    endTime: DateTime!              # لازم بعد startTime
  }) { _id  title  status  currentPrice  ... }
}
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `AUCTION_START_TIME_TOO_SOON` | وقت البدء قريب جداً |
| `AUCTION_END_TIME_MUST_BE_AFTER_START_TIME` | وقت الانتهاء قبل وقت البدء |

---

### 3.4 تعديل مزاد (updateAuction) — محمي، المزاد يكون PENDING

```graphql
mutation {
  updateAuction(id: ID!, input: {
    title: String  description: String  category: AuctionCategory
    images: [String!]  startTime: DateTime  endTime: DateTime
  }) { _id  ... }
}
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `AUCTION_NOT_FOUND` | المزاد غير موجود |
| `AUCTION_FORBIDDEN` | ليس مزادك |
| `AUCTION_NOT_PENDING` | المزاد بدأ بالفعل — لا يمكن التعديل |

---

### 3.5 إلغاء مزاد (cancelAuction) — محمي

```graphql
mutation { cancelAuction(id: ID!) }
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `AUCTION_INVALID_STATE` | المزاد في حالة لا تسمح بالإلغاء (فيه مزايدات) |
| `AUCTION_FORBIDDEN` | ليس مزادك |

---

### 3.6 مزاداتي (myAuctions) — محمي

```graphql
query {
  myAuctions(
    input: { page: 1, limit: 10 }
    filter: { status: AuctionStatus, sort: { field: CREATED_AT, order: DESC } }
  ) { items { ... }  total  totalPages  hasNextPage }
}
```

---

### 3.7 المزادات التي فزت بها (myWonAuctions) — محمي

```graphql
query {
  myWonAuctions(
    input: { page: 1, limit: 10 }
    filter: { status: ENDED }
  ) {
    items { _id  title  currentPrice  status  isFinalized  winnerId  sellerId  images  endTime }
    total  totalPages  hasNextPage
  }
}
```

---

### 3.8 مزادات مستخدم معين (userAuctions) — عام

```graphql
query {
  userAuctions(
    userId: ID!
    input: { page: 1, limit: 10 }
    filter: { status: ACTIVE }
  ) {
    items { _id  title  currentPrice  startingPrice  status  images  endTime }
    total  totalPages  hasNextPage
  }
}
```

---

### 3.9 رفع صورة (uploadImage) — محمي

```graphql
mutation {
  uploadImage(input: {
    base64Data: String!    # الصورة محولة لـ base64
    folder: String         # اختياري: "auctions" | "profile"
  }) {
    url    # الـ URL الكامل على Cloudinary
  }
}
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `INVALID_IMAGE_FORMAT` | صيغة الصورة غير مدعومة |
| `Image size exceeds 5MB limit` | الصورة أكبر من 5MB |

> **البديل الأفضل:** استخدام `generateUploadSignature` للرفع المباشر من المتصفح لـ Cloudinary:
> ```graphql
> query { generateUploadSignature(folder: "auctions") { signature  timestamp  apiKey  cloudName  folder } }
> ```

---

## 4. Bids Module

### 4.1 تقديم مزايدة (placeBid) — محمي

```graphql
mutation {
  placeBid(input: {
    auctionId: ID!
    amount: Float!     # لازم يكون > currentPrice + minimumBidIncrement
  }) {
    _id  auctionId  bidderId
    amount             # String! (Decimal)
    status             # WINNING | OUTBID
    createdAt
  }
}
```

**الأخطاء:**
| كود الخطأ | المعنى | ما يعرضه الفرونت |
|:---|:---|:---|
| `AUCTION_NOT_FOUND` | المزاد غير موجود | — |
| `This auction is not currently active` | المزاد انتهى أو لم يبدأ | "المزاد غير نشط حالياً" |
| `INSUFFICIENT_FUNDS` | الرصيد المتاح غير كافٍ | "رصيدك غير كافٍ" + زر "شحن الرصيد" |
| `You cannot place a bid on your own auction` | محاولة المزايدة على مزادك | "لا يمكنك المزايدة على مزادك الخاص" |
| `You are already the highest bidder for this auction` | أنت بالفعل الأعلى | "أنت المزايد الأعلى بالفعل!" |
| `High bidding volume on this auction. Please try again in a moment.` | ضغط عالٍ | "يرجى الانتظار لحظة والمحاولة مجدداً" |

---

### 4.2 ضبط المزايدة التلقائية (setAutoBid) — محمي

```graphql
mutation {
  setAutoBid(input: {
    auctionId: ID!
    maxAmount: Float!    # الحد الأقصى للمزايدة التلقائية
  }) {
    _id  auctionId  userId
    maxAmount            # String! (Decimal)
    status               # ACTIVE | EXHAUSTED | CANCELLED
    createdAt  updatedAt
  }
}
```

> **ملاحظة معمارية حاسمة (Multi-Auction Balance Check):**
> الباك إند يقوم بحساب المبالغ المحجوزة عبر كافة المزادات الأخرى النشطة التي وضع فيها المستخدم Auto-Bid. إذا لم يكن الرصيد المتاح كافياً لتغطية `maxAmount` بالتزامن مع باقي الـ Auto-Bids النشطة، سيرفض الطلب بـ `INSUFFICIENT_FUNDS`.

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `You already have an active auto-bid configuration for this auction` | يوجد Auto-bid نشط مسبقاً |
| `You cannot set an auto-bid on your own auction` | مزادك الخاص |
| `INSUFFICIENT_FUNDS` | رصيد غير كافٍ لتغطية الـ maxAmount |

---

### 4.3 عرض المزايدة التلقائية لمزاد معين (myAutoBid) — محمي

```graphql
query {
  myAutoBid(auctionId: ID!) {
    _id  auctionId  userId  maxAmount  status  createdAt  updatedAt
  }
}
```

---

### 4.4 قائمة مزايداتي التلقائية (myAutoBids) — محمي

```graphql
query {
  myAutoBids(
    input: { page: 1, limit: 10 }
    status: ACTIVE    # اختياري: ACTIVE | EXHAUSTED | CANCELLED
  ) {
    items { _id  auctionId  maxAmount  status  createdAt }
    total  totalPages  hasNextPage
  }
}
```

---

### 4.5 إلغاء المزايدة التلقائية (cancelAutoBid) — محمي

```graphql
mutation { cancelAutoBid(input: { auctionId: ID! }) }
```

---

### 4.6 مزايداتي (myBids) — محمي

```graphql
query {
  myBids(
    input: { page: 1, limit: 10 }
    filter: { status: WINNING } # اختياري: WINNING | OUTBID
  ) {
    items {
      _id  auctionId  bidderId
      amount     # String! (Decimal)
      status
      createdAt
    }
    total  totalPages  hasNextPage
  }
}
```

---

### 4.7 مزايدات مزاد معين (auctionBids) — عام

```graphql
query {
  auctionBids(
    auctionId: "auction_id_here"
    input: { page: 1, limit: 10 }
    filter: { status: WINNING }
  ) {
    items {
      _id  bidderId
      amount     # String! (Decimal)
      status
      createdAt
    }
    total  totalPages  hasNextPage
  }
}
```

---

## 5. Wallet Module

### 5.1 محفظتي (myWallet) — محمي

```graphql
query {
  myWallet {
    _id  userId
    balance           # String! (Decimal — الرصيد الإجمالي، استخدم Number() في الفرونت)
    heldBalance       # String! (Decimal — المحجوز في مزادات نشطة و escrow)
    availableBalance  # String! (Decimal — المتاح للسحب والمزايدة)
    createdAt  updatedAt
  }
}
```

---

### 5.2 سجل معاملاتي (myTransactions) — محمي

```graphql
query {
  myTransactions(
    input: { page: 1, limit: 10 }
    filter: {
      type: DEPOSIT       # اختياري: DEPOSIT | WITHDRAW | HOLD | RELEASE | CAPTURE | REFUND
      status: SUCCESS     # اختياري: PENDING | PROCESSING | SUCCESS | FAILED | CANCELLED | EXPIRED
      startDate: DateTime
      endDate: DateTime
    }
  ) {
    items {
      _id  type
      amount              # String! (Decimal — حوله بـ Number في الفرونت)
      currency            # "EGP"
      status              # PENDING | PROCESSING | SUCCESS | FAILED | CANCELLED | EXPIRED
      referenceId         # ID المرجع (مزاد، صفقة، أو نزاع)
      referenceType       # AUCTION | TRANSACTION | ESCROW | DISPUTE
      gatewayProvider     # "PAYMOB" | "STRIPE"
      gatewayTransactionId
      createdAt
    }
    total  totalPages  hasNextPage
  }
}
```

---

### 5.3 سحب رصيد (withdraw) — محمي

```graphql
mutation {
  withdraw(input: { amount: Float! }) {
    _id
    balance           # String!
    heldBalance       # String!
    availableBalance  # String!
  }
}
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `INSUFFICIENT_FUNDS` | المبلغ > الـ availableBalance |
| `INVALID_AMOUNT` | المبلغ 0 أو سالب |

---

## 6. Payment Module (REST API — مختلف عن GraphQL!)

### 6.1 بدء عملية الإيداع (initializePayment)

```http
POST http://localhost:3000/payments/initialize
Authorization: Bearer <accessToken>
Content-Type: application/json

Body:
{
  "provider": "PAYMOB",  // أو "STRIPE"
  "amount": 10000,       // بالوحدات الصغرى (قروش / cents): 100 جنيه = 10000
  "currency": "EGP"      // اختياري — الافتراضي EGP
}
```

> ⚠️ **معادلة المبلغ في الفرونت إند:**
> `amountInRequest = userAmountInEgp * 100`

**Response الناجح:**
```json
{
  "gatewayPaymentIntentId": "67890",
  "clientSecret": "cs_test_...",
  "paymentUrl": "https://accept.paymob.com/unifiedcheckout/?publicKey=egy_pk_test_...&clientSecret=cs_test_...",
  "idempotencyKey": "uuid-..."
}
```

---

### 6.2 دورة حياة الدفع الكاملة في الفرونت إند (Paymob Unified Checkout Flow):

1. **إرسال الطلب:** يرسل الفرونت `POST /payments/initialize` بالمبلغ بالقرش.
2. **توجيه العميل:** يقرأ الفرونت `response.paymentUrl` ويوجه متصفح المستخدم فوراً:
   ```javascript
   window.location.href = response.paymentUrl;
   ```
3. **صفحة الدفع الموحدة:** تفتح للمستخدم صفحة Paymob الرسمية وفيها كافة طرق الدفع المفعلة:
   * البطاقات البنكية (Visa / MasterCard).
   * المحافظ الإلكترونية (فودافون كاش، اتصالات، أورنج، وي).
   * إنستاباي (InstaPay).
4. **بعد الدفع (التحويل التلقائي):** تقوم صفحة Paymob بتحويل متصفح العميل إلى:
   `http://localhost:5173/wallet` (أو الرابط المعرّف في Redirect URL).
5. **تحديث الرصيد اللحظي:**
   * سيرفر Paymob يرسل الـ Webhook مباشرة للباك إند `POST /payments/webhooks/paymob`.
   * الباك إند يتحقق من الـ HMAC ويشحن الرصيد في الداتابيز.
   * في صفحة `/wallet` بالفرونت إند، يمكنك عمل `refetch` لـ `myWallet` أو الاعتماد على الاشتراك اللحظي `walletUpdated` لإظهار الرصيد الجديد فوراً!

---

## 7. Escrow Module

### 7.1 عرض ضمان مزاد (escrowByAuction) — محمي

```graphql
query {
  escrowByAuction(auctionId: ID!) {
    _id  auctionId  buyerId  sellerId  amount  currency
    status              # HELD | RELEASED | REFUNDED | DISPUTED
    inspectionPeriodEndsAt
    releasedAt  refundedAt  disputeId
    createdAt
  }
}
```

---

### 7.2 تأكيد الاستلام وتحرير المبلغ (confirmDelivery) — محمي (المشتري فقط)

```graphql
mutation {
  confirmDelivery(escrowId: ID!) {
    _id  status  releasedAt
  }
}
```

---

### 7.3 فتح نزاع (openDispute) — محمي (المشتري فقط)

```graphql
mutation {
  openDispute(input: {
    auctionId: String!
    reason: ITEM_NOT_RECEIVED | ITEM_DAMAGED | ITEM_MISMATCH | COUNTERFEIT_ITEM | OTHER
    description: String!
    evidenceUrls: [String!]   # URLs لصور الأدلة (اختياري)
  }) {
    _id  status  reason  description
  }
}
```

---

### 7.4 ضماناتي (myEscrows) — محمي

```graphql
query {
  myEscrows(
    input: { page: 1  limit: 10 }
    filter: { status: EscrowStatus }
  ) {
    items { _id  auctionId  buyerId  sellerId  amount  status  ... }
    total
  }
}
```

---

### 7.5 تفاصيل نزاع (dispute) — محمي

```graphql
query {
  dispute(id: ID!) {
    _id  escrowId  auctionId  openedById  againstUserId
    reason  description  evidenceUrls
    status    # OPEN | UNDER_REVIEW | RESOLVED_BUYER_REFUNDED | RESOLVED_SELLER_PAID | CANCELLED
    adminDecision  adminNotes  resolvedAt
  }
}
```

---

## 8. Notifications Module

### 8.1 إشعاراتي (myNotifications) — محمي

```graphql
query {
  myNotifications(input: { page: 1  limit: 20 }) {
    items {
      _id  type  title  body  isRead
      referenceId    # ID الكيان المرتبط بالإشعار
      referenceType  # AUCTION | TRANSACTION | WALLET | REVIEW | ESCROW | DISPUTE
      createdAt
    }
    total  hasNextPage
  }
}
```

**أنواع الإشعارات (type):**
```
OUTBID                  → خرجت من المزايدة — وجّه لـ /auctions/:referenceId
AUCTION_WON             → فزت بمزاد — وجّه لـ /my-won-auctions
AUCTION_ENDED_SELLER    → مزادك انتهى — وجّه لـ /my-auctions
DEPOSIT_SUCCESSFUL      → تم الإيداع — وجّه لـ /wallet
WITHDRAWAL_COMPLETED    → تم السحب — وجّه لـ /wallet
AUCTION_STARTED         → مزاد بدأ — وجّه لـ /auctions/:referenceId
WELCOME                 → رسالة ترحيب
NEW_BID                 → مزايدة جديدة على مزادك
AUCTION_CANCELLED       → إلغاء مزاد
REVIEW_RECEIVED         → تقييم جديد
REVIEW_REPLIED          → رد على تقييمك
AUTO_BID_PLACED         → مزايدة تلقائية تمت
AUTO_BID_EXHAUSTED      → نفذ رصيد المزايدة التلقائية
ESCROW_CREATED          → تم إنشاء الضمان
ESCROW_RELEASED         → تم تحرير مبلغ الضمان للبائع
ESCROW_REFUNDED         → تم إرجاع المبلغ للمشتري
DISPUTE_OPENED          → تم فتح نزاع
DISPUTE_RESOLVED        → تم حل النزاع
```

---

### 8.2 تحديد كمقروء (markNotificationAsRead / markAllNotificationsAsRead) — محمي

```graphql
mutation { markNotificationAsRead(notificationId: ID!) { _id  isRead } }
mutation { markAllNotificationsAsRead }
```

---

## 9. Chat Module

### 9.1 رسائل شات مزاد (chatMessages) — محمي

```graphql
query {
  chatMessages(
    auctionId: ID!
    limit: Float! = 20   # عدد الرسائل
    cursor: String        # للـ Pagination (آخر _id للرسالة)
  ) {
    items {
      _id  clientMessageId  auctionId  senderId  senderName
      type        # TEXT | IMAGE
      content     # النص
      mediaUrls   # الصور
      reactions { emoji  userId }
      isEdited  isDeleted
      createdAt
    }
    hasNextPage  endCursor
  }
}
```

---

### 9.2 إرسال رسالة (sendMessage) — محمي

```graphql
mutation {
  sendMessage(input: {
    auctionId: ID!
    content: String         # النص
    type: TEXT | IMAGE
    mediaUrls: [String!]    # لو صورة
    clientMessageId: String!  # UUID فريد من الفرونت لمنع التكرار
  }) {
    _id  content  senderId  senderName  createdAt
  }
}
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `CHAT_NOT_ALLOWED` | الشات مغلق (المزاد لم يبدأ أو انتهى) |

---

### 9.3 تعديل / حذف رسالة — محمي

```graphql
mutation { editMessage(messageId: ID!  newContent: String!) { ... } }
mutation { deleteMessage(messageId: ID!) { ... } }
mutation { reactToMessage(messageId: ID!  emoji: String) { ... } }   # null لإزالة الـ reaction
```

---

## 10. Reviews Module

### 10.1 فحص إمكانية التقييم (canReviewAuction) — محمي

```graphql
query {
  canReviewAuction(auctionId: ID!) {
    canReview    # Boolean
    reason       # سبب عدم الإمكانية لو canReview = false
  }
}
```

> **استخدم هذا Query أولاً** قبل ما تعرض زر التقييم.

---

### 10.2 إنشاء تقييم (createReview) — محمي

```graphql
mutation {
  createReview(input: {
    auctionId: String!
    overallRating: Int!      # من 1 إلى 5
    criteria: {
      itemAccuracy: Int      # من 1 إلى 5
      communication: Int
      packaging: Int
      smoothExperience: Int
    }
    comment: String
  }) { _id  overallRating  status  createdAt }
}
```

**الأخطاء:**
| كود الخطأ | المعنى |
|:---|:---|
| `REVIEW_ALREADY_EXISTS` | قيّمت بالفعل |
| `REVIEW_WINDOW_EXPIRED` | انتهت فترة التقييم |
| `CANNOT_REVIEW_YOURSELF` | لا يمكن تقييم نفسك |

---

### 10.3 الرد على تقييم (replyToReview) — محمي (البائع فقط)

```graphql
mutation {
  replyToReview(input: { reviewId: String!  reply: String! }) { _id  reply  repliedAt }
}
```

---

## 11. WebSocket Subscriptions

يستخدم مزادك **GraphQL Subscriptions** عبر WebSocket Protocol.
الاتصال على: `ws://localhost:3000/graphql`

> ⚠️ **المصادقة في الـ WebSocket:**
> عند الاتصال بالـ WebSocket، يجب إرسال الـ Token في الـ `connectionParams`:
> ```json
> {
>   "authorization": "Bearer <accessToken>"
> }
> ```

---

### 11.1 إشعارات فورية (notificationAdded) — محمي

```graphql
subscription {
  notificationAdded {
    _id  type  title  body  isRead  referenceId  referenceType  createdAt
  }
}
```

---

### 11.2 مزاد جديد تم إنشاؤه (auctionCreated) — عام

```graphql
subscription {
  auctionCreated {
    _id  title  description  startingPrice  currentPrice  status  images  endTime  createdAt
  }
}
```

> يُستخدم في الصفحة الرئيسية وقوائم المزادات لإضافة المزاد الجديد فور إنشائه بدون Refresh.

---

### 11.3 تغيير حالة مزاد (auctionStatusChanged)

```graphql
subscription {
  auctionStatusChanged(auctionId: ID!) {
    auction { _id  status  winnerId  currentPrice  isFinalized }
  }
}
```

> يُستخدم في صفحة تفاصيل المزاد لإغلاق المزايدة فور انتهاء الوقت.

---

### 11.4 مزايدة جديدة (bidAdded)

```graphql
subscription {
  bidAdded(auctionId: ID!) {
    bid { _id  bidderId  amount  status }
    currentPrice     # Float — السعر الجديد
    leadingBidderId  # ID المزايد الحالي الأعلى
    bidCount         # عدد المزايدات الكلي
  }
}
```

> يُستخدم لتحديث الـ `currentPrice` فورياً في الشاشة بدون Polling.

---

### 11.5 تحديث المحفظة اللحظي (walletUpdated) — محمي

```graphql
subscription {
  walletUpdated {
    _id  userId  balance  heldBalance  availableBalance  createdAt  updatedAt
  }
}
```

> يُستخدم لمزامنة رصيد المحفظة المتاح والمحجوز لحظياً فور أي عملية مزايدة أو سحب أو إيداع ناجح.

---

### 11.6 رسائل الشات (messageSent / messageUpdated)

```graphql
subscription {
  messageSent(auctionId: ID!) {
    _id  content  senderId  senderName  type  mediaUrls  createdAt
  }
}

subscription {
  messageUpdated(auctionId: ID!) {
    _id  content  isEdited  isDeleted  reactions { emoji  userId }
  }
}
```

---

### 11.7 تحديث حالة قراءة الشات (chatReadStatusUpdated)

```graphql
subscription {
  chatReadStatusUpdated(auctionId: ID!) {
    auctionId
    userId
    lastReadMessageId
    lastReadAt
  }
}
```

---

## 12. Admin Module

> كل هذه العمليات تتطلب `role: ADMIN` في الـ JWT Token.

```graphql
# الإحصائيات:
query { adminGetDashboardStats { totalUsers  verifiedUsers  activeAuctions  todaysRevenue ... } }

# إدارة المستخدمين:
mutation { adminToggleUserBan(userId: ID!) { _id  isBanned } }

# إلغاء مزاد:
mutation { adminCancelAuction(auctionId: ID!  reason: String!) }

# حل نزاع:
mutation {
  resolveDispute(input: {
    disputeId: String!
    decision: REFUND_BUYER | PAY_SELLER
    adminNotes: String
  }) { _id  status  adminDecision  resolvedAt }
}
```

---

## ملخص سريع — جميع نقاط الـ API

| نوع الطلب | الـ Endpoint | الوصف |
|:---:|:---|:---|
| **POST** | `/graphql` | كل الـ GraphQL Mutations & Queries |
| **GET** | `/graphql?query=...` | بعض الـ Queries عبر GET (اختياري) |
| **POST** | `/payments/initialize` | بدء عملية الإيداع (يحتاج Auth) |
| **POST** | `/payments/webhooks/stripe` | Webhook من Stripe (Public) |
| **POST** | `/payments/webhooks/paymob` | Webhook من Paymob (Public) |
| **WS** | `/graphql` | WebSocket للـ Subscriptions |

