'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { hashWithHmac } from '@/app/(payload)/lib/hash'

export async function sendOtp(email: string): Promise<string | true> {
  const payload = await getPayload({ config })

  if (!email) {
    return 'Email missing'
  }

  // Check if user exists and their lock status
  const userResult = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: email,
      },
    },
    showHiddenFields: true,
    select: {
      lockUntil: true,
    },
  })

  const user = userResult.docs[0]

  if (!user) {
    return payload.config.i18n.translations.en?.error.noUser || 'User not found'
  }

  if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
    return payload.config.i18n.translations.en?.error.userLocked || 'User is locked'
  }

  /**
   * Check if we have already sent an OTP to this email
   *
   * The expiry time for an OTP is 2 minutes, we will allow the
   * user to request a new OTP after 1 minute.
   */
  const existingOtp = await payload.find({
    collection: 'otp',
    where: {
      userEmail: {
        equals: email,
      },
      isUsed: {
        equals: false,
      },
      expiresAt: {
        greater_than: new Date(Date.now() + 60000).toISOString(),
      },
    },
    sort: ['-createdAt'],
    pagination: false,
    limit: 1,
  })

  if (existingOtp.docs[0]) {
    const expiryTime = existingOtp.docs[0].expiresAt
    const remainingTime = new Date(expiryTime).getTime() - (Date.now() + 60000)

    return `An OTP has already been sent to this email. Please try again after ${Math.floor(remainingTime / 1000)} seconds.`
  }

  // Generate a random 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000)

  // Hash the OTP
  const hash = hashWithHmac(otp.toString())

  // Save OTP in datbase
  let otpID: string = ''
  try {
    const result = await payload.create({
      collection: 'otp',
      data: {
        userEmail: email,
        otpCode: hash,
        expiresAt: new Date(Date.now() + 2 * 60000).toISOString(),
      },
    })

    otpID = result.id
  } catch (e) {
    payload.logger.error(e, 'Failed to save OTP.')

    return 'Failed to save OTP'
  }

  // Send the OTP to the user
  try {
    // TODO: Remove this when the email service is setup
    payload.logger.info(`Sending OTP to ${email}. OTP: ${otp}`)

    await payload.sendEmail({
      to: email,
      subject: 'Merton College | Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <p style="margin-bottom: 20px; font-size: 16px;">
            Please login using the OTP provided below. If you did not request this OTP, please ignore this email.
          </p>

          <div style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; background-color: #f5f5f5; padding: 16px; border-radius: 6px; font-size: 16px; line-height: 1.5; ">
            <span><strong>OTP:</strong> ${otp}</span>
          </div>

          <p style="margin-bottom: 20px; font-size: 16px;">
            <strong>
              This OTP is valid for 2 minutes.
            </strong>
          </p>
        </div>
      `,
    })
  } catch (e) {
    payload.logger.error(e, 'Failed to send OTP email.')

    // Delete the OTP from the database
    await payload.delete({
      collection: 'otp',
      id: otpID,
    })

    return 'Failed to send OTP'
  }

  return true
}
