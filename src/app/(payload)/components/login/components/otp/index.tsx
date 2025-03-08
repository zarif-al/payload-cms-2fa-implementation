'use client'

import { Button, useField, toast, NumberField, useTranslation } from '@payloadcms/ui'
import { sendOtp } from './send-otp'
import { useState } from 'react'

export function OTPComponent() {
  const { value } = useField<string>({ path: 'email' })
  const { t } = useTranslation()

  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
      }}
      className="login-otp-input-parent"
    >
      <NumberField
        field={{
          name: 'otp',
          label: 'OTP',
          required: true,
        }}
        path="otp"
        validate={(value) => {
          if (!value) {
            return t('validation:required')
          }

          if (value.toString().length !== 6) {
            return 'OTP must be 6 digits'
          }

          return true
        }}
      />

      <Button
        type="button"
        size="large"
        buttonStyle="primary"
        disabled={isSubmitting}
        onClick={async () => {
          setIsSubmitting(true)

          const result = await sendOtp(value)

          if (result !== true) {
            toast.error(result)
          } else {
            toast.success('OTP sent successfully')
          }

          setIsSubmitting(false)
        }}
      >
        Send OTP
      </Button>
    </div>
  )
}
