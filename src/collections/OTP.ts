import type { CollectionConfig } from 'payload'

export const OTP: CollectionConfig = {
  slug: 'otp',
  admin: {
    hidden: true,
  },
  // This should be only accessable by Paylod local API. No other API should be able to access this collection.
  access: {
    create: () => false,
    read: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'userEmail',
      type: 'email',
      required: true,
      index: true,
    },
    {
      name: 'otpCode',
      type: 'text',
      required: true,
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
    },
    {
      name: 'isUsed',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
}
