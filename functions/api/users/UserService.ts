import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { Collections } from '../db/DbService'
import { UserInfo } from './UserInfo'
import { RegisterUserInfo } from './RegisterUserInfo'

export class UserService {
  constructor(private readonly collections: Collections) {}

  async registerUser(registUserInfo: RegisterUserInfo): Promise<UserInfo> {
    const hashedPassword = await bcrypt.hash(registUserInfo.password, 10)
    const result = await this.collections.users.insertOne({
      userName: registUserInfo.userName,
      email: registUserInfo.email,
      password: hashedPassword
    })
    const user = await this.collections.users.findOne({
      _id: result.insertedId
    })
    if (!user) {
      throw new Error('ユーザの登録に失敗しました')
    }
    return {
      userId: result.insertedId.toHexString(),
      userName: user.userName as string,
      email: user.email as string
    }
  }

  async existsUserByEmail(email: string) {
    const count = await this.collections.users
      .find({
        email
      })
      .count()
    return count !== 0
  }

  async findUserById(userId: string): Promise<UserInfo | null> {
    const user = await this.collections.users.findOne({
      _id: new ObjectId(userId)
    })

    if (!user) {
      return null
    }

    return {
      // @ts-ignore
      userId: user._id.toHexString(),
      userName: user.userName,
      email: user.email
    }
  }
}
