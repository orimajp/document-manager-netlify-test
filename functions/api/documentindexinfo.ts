import { APIGatewayEvent, Handler } from 'aws-lambda'
import { SearchDocumentIndexInfo } from './documents/model/SearchDocumentIndexInfo'
import { createContainer } from './container/ServiceContainer'

export const handler: Handler = (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  return getIndexList(event)
}

const getIndexList = async (event: APIGatewayEvent) => {
  const conatainer = await createContainer()
  const documentService = conatainer.documentService
  const authService = conatainer.authService

  if (event.httpMethod !== 'POST') {
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

  const data = JSON.parse(event.body as string) as SearchDocumentIndexInfo
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

  const result = await documentService.getIndexList(data)

  return {
    statusCode: 200,
    body: JSON.stringify(result),
    headers: {
      'Content-type': 'application/json;charset=UTF-8'
    }
  }
}

const validate = (data: SearchDocumentIndexInfo) => {
  const errors: Array<any> = []
  if (!data.documentId) {
    errors.push({ documentId: '' })
  }
  return errors
}
