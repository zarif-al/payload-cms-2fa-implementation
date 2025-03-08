'use client'

import React from 'react'
import type { UserWithToken } from '@payloadcms/ui'
import type { FormState } from 'payload'
import {
  EmailField,
  Form,
  FormSubmit,
  PasswordField,
  useAuth,
  useConfig,
  useTranslation,
} from '@payloadcms/ui'
import { formatAdminURL } from '@payloadcms/ui/shared'
import { email } from 'payload/shared'
import Link from 'next/link'
import { OTPComponent } from './otp'

const baseClass = 'login__form'

export const LoginForm: React.FC<{
  prefillEmail?: string
  prefillPassword?: string
  searchParams: { [key: string]: string | string[] | undefined } | undefined
}> = ({ prefillEmail, prefillPassword, searchParams }) => {
  const { config } = useConfig()

  const {
    admin: {
      routes: { forgot: forgotRoute },
    },
    routes: { admin: adminRoute },
  } = config

  const { t } = useTranslation()
  const { setUser } = useAuth()

  const initialState: FormState = {
    password: {
      initialValue: prefillPassword ?? undefined,
      valid: true,
      value: prefillPassword ?? undefined,
    },
    otp: {
      initialValue: undefined,
      valid: false,
      value: undefined,
    },
  }

  initialState.email = {
    initialValue: prefillEmail ?? undefined,
    valid: true,
    value: prefillEmail ?? undefined,
  }

  const handleLogin = (data: UserWithToken) => {
    setUser(data)
  }

  return (
    <Form
      action={`/api/login`}
      className={baseClass}
      disableSuccessStatus
      initialState={initialState}
      method="POST"
      onSuccess={async (json) => {
        handleLogin(json as UserWithToken)
      }}
      redirect={typeof searchParams?.redirect === 'string' ? searchParams.redirect : adminRoute}
      waitForAutocomplete
    >
      <div className={`${baseClass}__inputWrap`}>
        <EmailField
          field={{
            name: 'email',
            admin: {
              autoComplete: 'email',
              placeholder: '',
            },
            label: t('general:email'),
            required: true,
          }}
          path="email"
          validate={email}
        />
        <PasswordField
          field={{
            name: 'password',
            label: t('general:password'),
            required: true,
          }}
          path="password"
          validate={(value) => {
            if (!value) {
              return t('validation:required')
            }
            return true
          }}
        />
        <OTPComponent />
      </div>

      <Link
        href={formatAdminURL({
          adminRoute,
          path: forgotRoute,
        })}
        prefetch={false}
      >
        {t('authentication:forgotPasswordQuestion')}
      </Link>

      <FormSubmit size="large">{t('authentication:login')}</FormSubmit>
    </Form>
  )
}
