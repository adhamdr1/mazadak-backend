// src/notifications/enums/notification.enum.ts
export enum EmailTemplates {
  CONFIRM_EMAIL = 'confirm-email',
  RESET_PASSWORD = 'reset-password',
  WELCOME = 'welcome',
  PASSWORD_CHANGED = 'password-changed',
  OUTBID = 'outbid',
  AUCTION_WON = 'auction-won',
}

export enum EmailSubjects {
  CONFIRM_EMAIL = 'Welcome to Mazadak - Please confirm your email',
  RESET_PASSWORD = 'Reset your Mazadak password',
  WELCOME = 'Welcome to Mazadak - Account Verified',
  PASSWORD_CHANGED = 'Security Alert - Your Mazadak password was changed',
  OUTBID = 'You have been outbid on Mazadak!',
  AUCTION_WON = 'Congratulations! You won the auction on Mazadak!',
}
