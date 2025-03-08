import { redirect } from 'next/navigation.js'
import React from 'react'
import { LoginForm } from './components/login-form'
import { MinimalTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import { PayloadLogo } from '@payloadcms/ui/shared'

export const loginBaseClass = 'login'

export const LoginView: React.FC<AdminViewServerProps> = ({ searchParams, initPageResult }) => {
  const { req } = initPageResult

  const {
    payload: { config },
    user,
  } = req

  const {
    routes: { admin },
  } = config

  if (user) {
    if (!searchParams?.redirect) {
      redirect(admin)
    } else if (typeof searchParams?.redirect === 'string') {
      redirect(searchParams.redirect)
    } else {
      redirect(searchParams.redirect.join('/'))
    }
  }

  const prefillAutoLogin =
    typeof config.admin?.autoLogin === 'object' && config.admin?.autoLogin.prefillOnly

  const prefillEmail =
    prefillAutoLogin && typeof config.admin?.autoLogin === 'object'
      ? config.admin?.autoLogin.email
      : undefined

  const prefillPassword =
    prefillAutoLogin && typeof config.admin?.autoLogin === 'object'
      ? config.admin?.autoLogin.password
      : undefined

  return (
    <MinimalTemplate>
      <div className={`${loginBaseClass}__brand`}>
        <PayloadLogo />
      </div>
      <LoginForm
        prefillEmail={prefillEmail}
        prefillPassword={prefillPassword}
        searchParams={searchParams}
      />
    </MinimalTemplate>
  )
}
