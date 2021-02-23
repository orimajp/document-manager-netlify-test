import * as EmailValidator from 'email-validator'
import { APIGatewayEvent, Handler } from 'aws-lambda'
import { createContainer } from './container/ServiceContainer'
import { LoginInfo } from './auth/LoginInfo'

export const handler: Handler = (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  return loginUser(event)
}

const loginUser = async (event: APIGatewayEvent) => {
  const conatainer = await createContainer()
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

  const data = JSON.parse(event.body) as LoginInfo
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

  const result = await authService.login(data)
  if (!result) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: { error: { email: 'メールアドレスまたはパスワードが違います' } }
      }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      token: result
    }),
    headers: {
      'Content-type': 'application/json;charset=UTF-8'
    }
  }
}

const validate = (data: LoginInfo) => {
  const errors: Array<any> = []

  if (!data.email) {
    errors.push({ email: 'メールアドレスを指定してください' })
  }
  if (!data.password) {
    errors.push({ password: 'パスワードを指定してください' })
  }
  if (data.email && !EmailValidator.validate(data.email)) {
    errors.push({ email: 'メールアドレスが正しくありません' })
  }

  return errors
}
