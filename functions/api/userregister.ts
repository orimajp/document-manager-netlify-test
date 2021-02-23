import { APIGatewayEvent, Handler } from 'aws-lambda'
import * as EmailValidator from 'email-validator'
import { RegisterUserInfo } from './users/RegisterUserInfo'
import { createContainer } from './container/ServiceContainer'

export const handler: Handler = (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  return registerUser(event)
}

const registerUser = async (event: APIGatewayEvent) => {
  const conatainer = await createContainer()
  const userService = conatainer.userService
  const authService = conatainer.authService

  if (event.httpMethod !== 'POST' || !event.body) {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method NotAllowd' }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  const token = authService.checkAuth(event)
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: '認証エラー' }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  const data = JSON.parse(event.body) as RegisterUserInfo
  const errors = validate(data)
  if (errors.length) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: errors }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  const existsUser = await userService.existsUserByEmail(data.email)
  if (existsUser) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: { email: '登録済みのメールアドレスです' }
      }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  const userInfo = await userService.registerUser(data)
  return {
    statusCode: 200,
    body: JSON.stringify(userInfo),
    headers: {
      'Content-type': 'application/json;charset=UTF-8'
    }
  }
}

const validate = (data: RegisterUserInfo) => {
  const errors: Array<any> = []
  if (!data.userName) {
    errors.push({ name: 'ユーザー名を指定してください' })
  }
  if (!data.email) {
    errors.push({ email: 'メールアドレスを指定してください' })
  }
  if (!data.password) {
    errors.push({ password: 'パスワードを指定してください' })
  }
  if (!data.confirmPassword) {
    errors.push({ confirmPassword: '確認パスワードを指定してください' })
  }
  if (
    data.password &&
    data.confirmPassword &&
    data.password !== data.confirmPassword
  ) {
    errors.push({ password: 'パスワードと確認パスワードが一致しません' })
  }
  if (data.email && !EmailValidator.validate(data.email)) {
    errors.push({ email: 'メールアドレスが正しくありません' })
  }
  return errors
}
