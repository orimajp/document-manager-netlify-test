import { APIGatewayEvent, Handler } from 'aws-lambda'
import { createContainer } from './container/ServiceContainer'
import { RegisterDocument } from './documents/model/RegisterDocument'

export const handler: Handler = (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  return registerDocument(event)
}

const registerDocument = async (event: APIGatewayEvent) => {
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

  const data = JSON.parse(event.body as string) as RegisterDocument
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

  const documetId = await documentService.registerDocument(data, token)
  return {
    statusCode: 200,
    body: JSON.stringify({ documentId: documetId }),
    headers: {
      'Content-type': 'application/json;charset=UTF-8'
    }
  }
}

const validate = (data: RegisterDocument) => {
  const errors: Array<any> = []
  if (!data.pageData) {
    errors.push({ pageData: '本文を指定してください' })
  }
  if (!data.pageTitle) {
    errors.push({ pageTitle: 'タイトルを指定してください' })
  }
  /*
  if (!data.groupId) {
    errors.push({ groupId: '' })
  }
   */
  return errors
}
