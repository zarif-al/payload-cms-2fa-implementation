# 2FA Implementation

This is my approach to implementing 2FA without completely replacing Payload's default authentication systems. It was a requirement in one of my client projects.

Payload has a robust JWT implementation and I did not have enough time to replace this with a custom auth logic that will implement the same level of security measures.

My best option is to extend Payload's auth implementation. Fortunately, Payload (along with NextJS) is very extensible so I have been able to come up with a simple solution.

## Guide

Here are the steps we used to implement a custom authentication flow:

1. Create a collection to store OTP codes, we call it `otp`.

   > In an ideal world, these would be stored in a Redis database, for simplicity of the guide I am creating this withing our MongoDB.
   > If you keep this collection with Payload then make sure to do the following:
   >
   > - Set all access set to `false`. That way it is only accessible by the `Local API`.
   > - Create an index for the `expiresAt` property and make sure its a `TTL` index with appropriate expiration time

2. Create the Login UI to replace Payload's default. This is largely based on Payload's original login code [here](https://github.com/payloadcms/payload/blob/main/packages/next/src/views/Login/index.tsx). I have made just enough tweaks to support and additional OTP input.

   1. Create a function to hash our OTP codes. You can find the relevant file [here](<src/app/(payload)/lib/hash.ts>).
   2. Create the Login UI. I will list out the files in order of creation to avoid import hassles
      1. [OTP Email Server Action](<src/app/(payload)/components/login/components/otp/send-otp.ts>)
         > In this example it will print the OTP in the console. Once you have a SMTP setup you can remove the console.log
      2. [OTP Field](<src/app/(payload)/components/login/components/otp/index.tsx>)
      3. [Login Form](<src/app/(payload)/components/login/components/login-form.tsx>)
      4. [Login View](<src/app/(payload)/components/login/index.tsx>)

3. Create a [route handler](<src/app/(payload)/api/login/route.ts>) to implement the necessary logic to receive a login form POST request and validate the OTP. Here are some notes on this endpoint

   - If the OTP is valid then the request is forwarded to Payload's default endpoint for user authentication.
   - If not then I am using Payload's translation object to return appropriate error messages. This is to keep the experience consistent with Payload's default authentication endpoint as that also uses this object for error messages.

   > For this to work properly you will need to be able to have the domain URL in the environment. In this example I have set it to the `NEXT_PUBLIC_SERVER_URL` environment variable.

4. Create a [clone](<src/app/(payload)/translations/en.ts>) of Payload's `en` translations and overwrite the translation for `emailOrPasswordIncorrect`, to include the `otp` keyword. This is to ensure the error messages are ambiguous and no information is leaked.

   > We are using Payload's default login endpoint, which uses Payload's default translations.
   > If we try to only overwrite the `en.emailOrPasswordIncorrect` property, the whole `en` translation object gets overwritten, so we had to import their full translation object and update the `emailOrPasswordIncorrect` property ourselves.

5. Update the `admin` property of the Payload `config` like so:

   1. Update the default login route to be `deprecated-login`.
   2. Add a `customLogin` property to the `components.views` property. Set the route for our custom login component as `/login`
   3. Update the `i18n.translations.en` property with our customised `en` translations object.

   > Don't forget to run importmap

6. Update `next.config` to permanently redirect any request to `/admin/deprecated-login` (the new Payload default login route) to `/login`

## Notes

This solution works due to the following reasons.

1. The custom views in Payload are public by default

2. We have changed Payload's default login route to `/deprecated-login` and set a permanent redirect in NextJS to redirect users to `/admin/login` from `/deprecated-login`
   .
3. The custom view in `/login` is identical to Payload's default login and re-uses as much code as possible from Payload's codebase.

## Issues

1. I am not confident on my approach with error handling and overwriting the entire english translations object. This does not scale well when I have to support multiple languages.
2. I was not able to test if CORS is workin properly.
