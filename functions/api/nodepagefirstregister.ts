import { APIGatewayEvent, Handler } from 'aws-lambda'
import { createContainer } from './container/ServiceContainer'
import { RegisterPageFirstNodeInfo } from './nodes/model/RegisterPageFirstNodeInfo'

export const handler: Handler = (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  return registerPageFirstNode(event)
}

const registerPageFirstNode = async (event: APIGatewayEvent) => {
  const conatainer = await createContainer()
  const nodeService = conatainer.nodeService
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

  const data = JSON.parse(event.body as string) as RegisterPageFirstNodeInfo
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

  const result = await nodeService.registerPageFirstNode(data)
  if (!result) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'ドキュメント先頭ノードへのページ追加に失敗しました'
      }),
      headers: {
        'Content-type': 'application/json;charset=UTF-8'
      }
    }
  }

  // TODO 返値をどうするか？、変更後のデータを返すか？
  return {
    statusCode: 204
  }
}

const validate = (data: RegisterPageFirstNodeInfo) => {
  const errors: Array<any> = []
  if (!data.documentId) {
    errors.push({ documentId: '' })
  }
  if (!data.pageId) {
    errors.push({ pageId: '' })
  }
  return errors
}
