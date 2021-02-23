import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { APIGatewayEvent } from 'aws-lambda'
import { Collections } from '../db/DbService'
import { SECRET_KEY } from '../system/Config'
import { LoginInfo } from './LoginInfo'
import { DecodeTokenInfo } from './DecodeTokenInfo'

// https://qiita.com/sa9ra4ma/items/67edf18067eb64a0bf40

export class AuthService {
  constructor(private readonly collections: Collections) {}

  async login(loginInfo: LoginInfo) {
    console.log(`AuthService#login(): params=${loginInfo}`)
    const user = await this.collections.users.findOne({
      email: loginInfo.email
    })
    if (!user) {
      return null
    }

    const matches = await bcrypt.compare(loginInfo.password, user.password)
    if (!matches) {
      return null
    }

    const payload = {
      userId: user._id?.toHexString(),
      userName: user.userName,
      email: user.email
    }

    const option = {
      expiresIn: '1m'
    }

    return jwt.sign(payload, SECRET_KEY, option)
  }

  checkAuth(event: APIGatewayEvent): DecodeTokenInfo | null {
    const headers = event.headers
    const authorization = headers.authorization
    if (!authorization) {
      return null
    }
    const authorizations = authorization.split(' ')
    if (authorizations.length < 2 || authorizations[0] !== 'Bearer') {
      return null
    }
    const token = authorizations[1]
    try {
      return jwt.verify(token, SECRET_KEY) as DecodeTokenInfo
    } catch (err) {
      console.log('トークンエラー')
      // console.log(err)
      return null
    }
  }
}
