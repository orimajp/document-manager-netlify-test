import { APIGatewayEvent, Handler } from 'aws-lambda'
import { createContainer } from './container/ServiceContainer'

export const handler: Handler = (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  return getUser(event)
}

const getUser = async (event: APIGatewayEvent) => {
  const conatainer = await createContainer()
  const userService = conatainer.userService
  const authService = conatainer.authService

  if (event.httpMethod !== 'GET') {
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

  console.log(token)
  console.log(`userId=${token.userId}`)

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method NotAllowd' }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  const userId = event.queryStringParameters?.userid
  if (!userId) {
    const errors = { userId: 'userIdは必須です' }
    return {
      statusCode: 400,
      body: JSON.stringify({ error: errors }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  if (userId.length !== 12 && userId.length !== 24) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: { uesrId: 'userId長が不正です' } }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  const user = await userService.findUserById(userId)
  if (!user) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'userが見つかりません' }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }
  return {
    statusCode: 200,
    body: JSON.stringify(user),
    headers: {
      'Content-type': 'application/json;charset=UTF-8'
    }
  }
}
