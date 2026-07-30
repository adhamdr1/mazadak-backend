// src/notifications/enums/notification.enum.ts
export enum EmailTemplates {
  CONFIRM_EMAIL = 'confirm-email',
  RESET_PASSWORD = 'reset-password',
  WELCOME = 'welcome',
  PASSWORD_CHANGED = 'password-changed',
  OUTBID = 'outbid',
  AUCTION_WON = 'auction-won',
  AUCTION_STARTED_SELLER = 'auction-started-seller',
  AUCTION_ENDED_SELLER = 'auction-ended-seller',
  DEPOSIT_SUCCESSFUL = 'deposit-successful',
  WITHDRAWAL_COMPLETED = 'withdrawal-completed',
  AUCTION_CANCELLED_BY_ADMIN = 'auction-cancelled-by-admin',
}

export enum EmailSubjects {
  CONFIRM_EMAIL = 'Welcome to Mazadak - Please confirm your email',
  RESET_PASSWORD = 'Reset your Mazadak password',
  WELCOME = 'Welcome to Mazadak - Account Verified',
  PASSWORD_CHANGED = 'Security Alert - Your Mazadak password was changed',
  OUTBID = 'You have been outbid on Mazadak!',
  AUCTION_WON = 'Congratulations! You won the auction on Mazadak!',
  AUCTION_STARTED_SELLER = 'Your auction is now LIVE on Mazadak!',
  AUCTION_ENDED_SELLER = 'Your auction has ended on Mazadak',
  DEPOSIT_SUCCESSFUL = 'Wallet Deposit Successful - Mazadak',
  WITHDRAWAL_COMPLETED = 'Wallet Withdrawal Completed - Mazadak',
  AUCTION_CANCELLED_BY_ADMIN = 'Notice: Your auction has been cancelled by an Admin',
}
