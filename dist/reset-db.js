"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt = __importStar(require("bcrypt"));
async function resetDb() {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/mazadak?replicaSet=rs0';
    console.log(`Connecting to MongoDB at ${uri}...`);
    const conn = await mongoose_1.default.connect(uri);
    const db = conn.connection.db;
    if (!db) {
        throw new Error('Database connection not established.');
    }
    console.log('--- Step 1: Cleaning collections (preserving users) ---');
    const collectionsToClean = [
        'auctions',
        'bids',
        'autobids',
        'transactions',
        'inappnotifications',
        'outbox_events',
        'reviews',
        'chatmessages',
        'chatreadstates',
        'webhookevents',
        'refreshtokens',
    ];
    for (const colName of collectionsToClean) {
        try {
            const col = db.collection(colName);
            const res = await col.deleteMany({});
            console.log(`Cleared collection '${colName}': deleted ${res.deletedCount} documents.`);
        }
        catch (err) {
            console.log(`Collection '${colName}' not found or error clearing: ${err.message}`);
        }
    }
    console.log('\n--- Step 2: Ensuring test users exist ---');
    const usersCol = db.collection('users');
    const walletsCol = db.collection('wallets');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const standardUsers = [
        {
            email: 'adhamdr10@gmail.com',
            firstName: 'Adham',
            lastName: 'Darwish',
            role: 'USER',
            phoneNumber: '+201012345678',
        },
        {
            email: 'seller@mazadak.com',
            firstName: 'Seller',
            lastName: 'Mazadak',
            role: 'USER',
            phoneNumber: '+201099990001',
        },
        {
            email: 'bidder1@mazadak.com',
            firstName: 'Bidder',
            lastName: 'One',
            role: 'USER',
            phoneNumber: '+201099990002',
        },
        {
            email: 'bidder2@mazadak.com',
            firstName: 'Bidder',
            lastName: 'Two',
            role: 'USER',
            phoneNumber: '+201099990003',
        },
        {
            email: 'admin@mazadak.com',
            firstName: 'Admin',
            lastName: 'System',
            role: 'ADMIN',
            phoneNumber: '+201099990000',
        },
    ];
    for (const u of standardUsers) {
        const existing = await usersCol.findOne({ email: u.email });
        if (!existing) {
            await usersCol.insertOne({
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                password: passwordHash,
                role: u.role,
                phoneNumber: u.phoneNumber,
                dateOfBirth: new Date('1995-01-01'),
                address: { city: 'Cairo', street: 'El Tahrir' },
                authProvider: 'LOCAL',
                isEmailVerified: true,
                isBanned: false,
                ratingStats: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            console.log(`Created user: ${u.email} (${u.role})`);
        }
        else {
            await usersCol.updateOne({ _id: existing._id }, {
                $set: {
                    password: passwordHash,
                    isEmailVerified: true,
                    isBanned: false,
                    deletedAt: null,
                    updatedAt: new Date(),
                },
            });
            console.log(`Updated user credentials: ${u.email}`);
        }
    }
    console.log('\n--- Step 3: Resetting all user wallets to 10,000 EGP ---');
    const allUsers = await usersCol.find({}).toArray();
    for (const user of allUsers) {
        await walletsCol.updateOne({ userId: user._id }, {
            $set: {
                balance: mongoose_1.Types.Decimal128.fromString('10000'),
                heldBalance: mongoose_1.Types.Decimal128.fromString('0'),
                updatedAt: new Date(),
            },
            $setOnInsert: {
                createdAt: new Date(),
            },
        }, { upsert: true });
    }
    console.log('\n--- Step 4: Creating active test auction for Seller ---');
    const auctionsCol = db.collection('auctions');
    const sellerUser = await usersCol.findOne({ email: 'seller@mazadak.com' });
    if (!sellerUser) {
        throw new Error('Seller user not found!');
    }
    const now = new Date();
    const auctionInsertRes = await auctionsCol.insertOne({
        sellerId: sellerUser._id,
        title: 'MacBook Pro M3 Max 16-inch 36GB RAM',
        description: 'Brand new sealed Apple MacBook Pro M3 Max space black 36GB Unified Memory 1TB SSD.',
        images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8'],
        category: 'ELECTRONICS',
        startingPrice: mongoose_1.Types.Decimal128.fromString('1000'),
        minimumBidIncrement: mongoose_1.Types.Decimal128.fromString('100'),
        currentPrice: mongoose_1.Types.Decimal128.fromString('1000'),
        status: 'ACTIVE',
        startTime: new Date(now.getTime() - 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        winnerId: null,
        isFinalized: false,
        adminActionReason: null,
        createdAt: now,
        updatedAt: now,
    });
    console.log(`Created active auction: "${String(auctionInsertRes.insertedId)}" (Title: MacBook Pro M3 Max 16-inch 36GB RAM, Starting: 1000 EGP, Increment: 100 EGP, Status: ACTIVE)`);
    console.log(`\n=== Database Reset Complete! Summary of Active Users ===`);
    for (const user of allUsers) {
        const wallet = await walletsCol.findOne({ userId: user._id });
        console.log(`- User: ${String(user.firstName)} ${String(user.lastName)} | Email: ${String(user.email)} | Role: ${String(user.role)} | ID: ${String(user._id)} | Balance: ${wallet?.balance ? String(wallet.balance) : '0'} | Held: ${wallet?.heldBalance ? String(wallet.heldBalance) : '0'}`);
    }
    console.log(`\n=== Test Auction ID ===`);
    console.log(`AUCTION_ID: ${String(auctionInsertRes.insertedId)}`);
    await mongoose_1.default.disconnect();
    process.exit(0);
}
resetDb().catch((err) => {
    console.error('Error resetting database:', err);
    process.exit(1);
});
//# sourceMappingURL=reset-db.js.map