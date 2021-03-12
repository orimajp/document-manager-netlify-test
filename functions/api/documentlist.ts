import { APIGatewayEvent, Handler } from 'aws-lambda'
import { createContainer } from './container/ServiceContainer'

export const handler: Handler = (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  return getDocumentList(event)
}

const getDocumentList = async (event: APIGatewayEvent) => {
  const conatainer = await createContainer()
  const documentService = conatainer.documentService
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

  const userList = await documentService.getDocumentList()

  return {
    statusCode: 200,
    body: JSON.stringify(userList),
    headers: {
      'Content-type': 'application/json;charset=UTF-8'
    }
  }
}
