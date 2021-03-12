import { APIGatewayEvent, Handler } from 'aws-lambda'
import { createContainer } from './container/ServiceContainer'

export const handler: Handler = (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  return getDocument(event)
}

const getDocument = async (event: APIGatewayEvent) => {
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

  const documentId = event.queryStringParameters?.documentId
  if (!documentId) {
    const errors = { documentId: 'documentIdは必須です' }
    return {
      statusCode: 400,
      body: JSON.stringify({ error: errors }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  const document = await documentService.getDocumentById(documentId)
  if (!document) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'documentIdが見つかりません' }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(document),
    headers: {
      'Content-type': 'application/json;charset=UTF-8'
    }
  }
}
