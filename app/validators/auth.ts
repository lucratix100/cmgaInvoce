import vine from '@vinejs/vine'

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim().toLowerCase(),
    password: vine.string(),
  })
)

export const forgotPasswordValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim().toLowerCase(),
  })
)

export const resetPasswordValidator = vine.compile(
  vine.object({
    token: vine.string().minLength(20),
    password: vine.string().minLength(8),
    confirmPassword: vine.string().minLength(8),
  })
)
