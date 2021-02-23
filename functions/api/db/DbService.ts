import { Collection, MongoClient, ObjectID } from 'mongodb'
import dotenv from 'dotenv'
import { DB_NAME, MONGODB_URI } from '../system/Config'

dotenv.config()

export type User = {
  _id?: ObjectID
  userName: string
  email: string
  password: string
}

export type Collections = {
  users: Collection<User>
}

let collections: Collections

export async function connectDb() {
  if (collections) {
    return collections
  }

  console.log('db connect start.')
  const client = await MongoClient.connect(MONGODB_URI as string, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  console.log('db connect end.')

  const db = client.db(DB_NAME)

  collections = {} as Collections
  collections.users = db.collection<User>('users')

  return collections
}
