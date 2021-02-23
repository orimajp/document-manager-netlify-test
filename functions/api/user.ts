import { APIGatewayEvent, Handler } from 'aws-lambda'
import { createContainer } from './container/ServiceContainer'

export const handler: Handler = (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  return user(event)
}

const user = async (event: APIGatewayEvent) => {
  const conatainer = await createContainer()

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method NotAllowd' }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  const token = conatainer.authService.checkAuth(event)
  if (!token) {
    return {
      statusCode: 403,
      body: 'Forbidden',
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ user: token }),
    headers: {
      'Content-type': 'application/json;charset=UTF-8'
    }
  }
}
