import { NextResponse } from 'next/server'
import { hashWithHmac } from '../../lib/hash'
import { getPayload, headersWithCors, type User } from 'payload'
import config from '@payload-config'

interface IPayloadLoginForm {
  email?: string
  otp?: number
  password?: string
}

export async function POST(req: Request): Promise<Response> {
  const formData = await req.formData()

  const form = formData.get('_payload') as string | null

  if (!form) {
    return NextResponse.json(
      {
        errors: [{ message: 'Invalid form submission.' }],
      },
      { status: 401 },
    )
  }

  const parsedFormData = JSON.parse(form) as IPayloadLoginForm

  const { email, otp, password } = parsedFormData

  // Validate form fields
  if (!email || !otp || !password) {
    return NextResponse.json(
      {
        errors: [{ message: 'Invalid form submission.' }],
      },
      { status: 401 },
    )
  }

  const payload = await getPayload({ config })

  const userResult = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: email,
      },
    },
    showHiddenFields: true,
    select: {
      loginAttempts: true,
      lockUntil: true,
    },
  })

  const user = userResult.docs[0]

  if (!user) {
    return NextResponse.json(
      {
        errors: [
          {
            message: payload.config.i18n.translations.en?.error.emailOrPasswordIncorrect,
          },
        ],
      },
      {
        status: 401,
      },
    )
  }

  // Check if user is locked out
  if (user.lockUntil) {
    const lockUntil = new Date(user.lockUntil).getTime()

    if (lockUntil > Date.now()) {
      return NextResponse.json(
        {
          errors: [
            {
              message: payload.config.i18n.translations.en?.error.userLocked,
            },
          ],
        },
        {
          status: 401,
        },
      )
    }
  }

  // Process OTP code.
  const otpDocs = await payload.find({
    collection: 'otp',
    where: {
      userEmail: {
        equals: email,
      },
      otpCode: {
        equals: hashWithHmac(otp.toString()),
      },
      expiresAt: {
        greater_than: new Date().toISOString(),
      },
      isUsed: {
        equals: false,
      },
    },
  })

  if (!otpDocs.docs[0]) {
    // Increase user login attempt count. Lock account if max attempts reached.
    const { maxLoginAttempts, lockTime } = payload.collections.users.config.auth

    const updatePayload: Pick<User, 'loginAttempts' | 'lockUntil'> = {
      loginAttempts: Number(user.loginAttempts) + 1,
      lockUntil: null,
    }

    if (updatePayload.loginAttempts >= maxLoginAttempts) {
      updatePayload.lockUntil = new Date(Date.now() + lockTime).toISOString()
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: updatePayload,
    })

    return NextResponse.json(
      {
        errors: [
          {
            message: payload.config.i18n.translations.en?.error.emailOrPasswordIncorrect,
          },
        ],
      },
      {
        status: 401,
      },
    )
  }

  /**
   * If OTP is good then process the rest of the login logic.
   * 1. Extract method, headers, and body from the request
   * 2. Clone headers and remove Content-Type and Content-Length headers
   * 3. Extract form data from the incoming request
   * 4. Call the users login route with headers and form data
   * 5. Extract headers and body from the response
   * 6. Set Content-Encoding to identity to prevent Next.js from trying to decompress the response
   * 7. Return the response
   */
  const { method, headers: originalHeaders } = req

  const modifiedHeaders = new Headers(originalHeaders)

  modifiedHeaders.delete('Content-Type')
  modifiedHeaders.delete('Content-Length')

  const usersLoginResponse = await fetch(process.env.NEXT_PUBLIC_SERVER_URL + '/api/users/login', {
    method,
    headers: headersWithCors({
      headers: modifiedHeaders,
      req: {
        headers: modifiedHeaders,
        payload,
      },
    }),
    body: formData,
  })

  // If login is successful and we have an OTP, mark the OTP as used.
  if (usersLoginResponse.ok && otpDocs?.docs[0]) {
    // Mark the OTP as used.
    await payload.update({
      collection: 'otp',
      id: otpDocs.docs[0].id,
      data: {
        isUsed: true,
      },
    })
  }

  const usersLoginResponseHeaders = new Headers(usersLoginResponse.headers)

  // Set Content-Encoding to identity to prevent Next.js from trying to decompress the response
  usersLoginResponseHeaders.set('Content-Encoding', 'identity')

  const usersLoginResponseBody = await usersLoginResponse.text()

  return new NextResponse(usersLoginResponseBody, {
    status: usersLoginResponse.status,
    headers: usersLoginResponseHeaders,
  })
}
