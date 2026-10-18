# 📋 Admin GraphQL Contracts & Filter Specification

هذا المستند يمثل العقد البرمجي الرسمي (Official Backend API Contract) بين الـ Backend والـ Frontend لكافة شاشات واستعلامات لوحة تحكم المشرف (Admin Dashboard).

---

## 🌟 الميزات العامة المشتركة (Core Capabilities)

1. **البحث الموحد الذكي (Unified Search):**
   * خانة البحث `search` تدعم البحث متعدد الحقول (Multi-Field Search).
   * في المعاملات المالية، يتعرف السيرفر تلقائياً على رقم هاتف العميل (`phoneNumber`)، بريده الإلكتروني (`email`)، اسمه، أو كود العملية/المزاد (`referenceId`).

2. **فلتر النطاق الزمني الموحد (Unified Date Range Filter):**
   * يدعم حقلي `startDate: DateTime` و `endDate: DateTime`.
   * **مرونة الحقول (Nullable):** يمكن إرسال أحدهما فقط أو كلاهما معاً.
   * **معيار شمول اليوم بالكامل (End-of-Day Inclusive):** يقوم السيرفر تلقائياً بضبط توقيت `endDate` حتى `23:59:59.999Z` لضمان شمول كامل عمليات اليوم المختار.
   * **التحقق المنطقي (Validation):** يمنع السيرفر اختيار تاريخ نهاية يسبق تاريخ البداية (`endDate >= startDate`).

---

## 1. المعاملات المالية (Admin Transactions)

* **GraphQL Query:** `adminGetTransactions`
* **Filter Input:** `TransactionsFilterInput`

```graphql
input TransactionsFilterInput {
  search: String             # 👈 يبحث برقم الهاتف، الإيميل، الاسم، أو كود العملية
  walletId: String
  walletIds: [String!]
  userId: String
  type: TransactionType
  status: TransactionStatus
  startDate: DateTime        # 👈 تاريخ البداية
  endDate: DateTime          # 👈 تاريخ النهاية (شامل حتى 23:59:59.999)
  expiresAtBefore: DateTime
  hasChild: Boolean
  sort: TransactionsSortInput
}
```

### استعلام الـ GraphQL:
```graphql
query AdminGetTransactions($input: PaginationInput!, $filter: TransactionsFilterInput) {
  adminGetTransactions(input: $input, filter: $filter) {
    items {
      _id
      walletId
      type
      amount
      currency
      status
      referenceId
      referenceType
      createdAt
    }
    total
    totalPages
    hasNextPage
  }
}
```

---

## 2. الضمان المالي وعقود الإسكرو (Admin Escrows)

* **GraphQL Query:** `adminGetEscrows`
* **Filter Input:** `EscrowFilterInput`

```graphql
input EscrowFilterInput {
  search: String             # 👈 يبحث باسم المزاد، كود المزاد، سبب الإفراج، وأطراف العملية
  excludeDisputed: Boolean   # 👈 true لاستبعاد أي عملية ضمان مفتوح عليها نزاع حالياً
  status: EscrowStatus
  userId: String
  buyerId: String
  sellerId: String
  auctionId: String
  startDate: DateTime        # 👈 تاريخ إنشاء الضمان (البداية)
  endDate: DateTime          # 👈 تاريخ إنشاء الضمان (النهاية)
}
```

### استعلام الـ GraphQL:
```graphql
query AdminGetEscrows($input: PaginationInput!, $filter: EscrowFilterInput) {
  adminGetEscrows(input: $input, filter: $filter) {
    items {
      _id
      auctionId
      buyerId
      sellerId
      amount
      status
      isDisputed
      createdAt
    }
    total
    totalPages
    hasNextPage
  }
}
```

---

## 3. فض النزاعات (Admin Disputes)

* **GraphQL Query:** `adminGetDisputes`
* **Filter Input:** `DisputeFilterInput`

```graphql
input DisputeFilterInput {
  search: String             # 👈 يبحث في نص وأسباب النزاع وبيانات الأطراف
  status: DisputeStatus
  userId: String
  openedById: String
  againstUserId: String
  auctionId: String
  startDate: DateTime        # 👈 تاريخ فتح النزاع (البداية)
  endDate: DateTime          # 👈 تاريخ فتح النزاع (النهاية)
}
```

### استعلام الـ GraphQL:
```graphql
query AdminGetDisputes($input: PaginationInput!, $filter: DisputeFilterInput) {
  adminGetDisputes(input: $input, filter: $filter) {
    items {
      _id
      escrowId
      auctionId
      openedById
      againstUserId
      reason
      status
      createdAt
    }
    total
    totalPages
    hasNextPage
  }
}
```

---

## 4. المزادات (Admin Auctions)

* **GraphQL Query:** `adminGetAuctions` (أو `auctions`)
* **Filter Input:** `AuctionsFilterInput`

```graphql
input AuctionsFilterInput {
  category: AuctionCategory
  status: AuctionStatus
  search: String             # 👈 يبحث في عنوان المزاد ووصفه
  sort: AuctionsSortInput
  startDate: DateTime        # 👈 تاريخ إضافة المزاد (البداية)
  endDate: DateTime          # 👈 تاريخ إضافة المزاد (النهاية)
}
```

---

## 5. إدارة المستخدمين (Admin Users)

* **GraphQL Query:** `adminGetUsers`
* **Filter Input:** `UsersFilterInput`

```graphql
input UsersFilterInput {
  search: String             # 👈 يبحث بالاسم، الإيميل، رقم الهاتف، أو الـ ID
  sort: UsersSortInput
  isBanned: Boolean
  role: UserRole
  isEmailVerified: Boolean
  startDate: DateTime        # 👈 تاريخ تسجيل المستخدم (البداية)
  endDate: DateTime          # 👈 تاريخ تسجيل المستخدم (النهاية)
}
```

---

## 6. الخزينة وطلبات السحب (Admin Withdrawals)

* **GraphQL Query:** `adminGetWithdrawals`
* **Filter Input:** `WithdrawalsFilterInput`

```graphql
input WithdrawalsFilterInput {
  search: String             # 👈 يبحث بكود الطلب أو بيانات الحساب البنكي
  userId: String
  status: WithdrawalStatus
  payoutMethod: PayoutMethod
  sortOrder: SortOrder
  startDate: DateTime        # 👈 تاريخ طلب السحب (البداية)
  endDate: DateTime          # 👈 تاريخ طلب السحب (النهاية)
}
```
