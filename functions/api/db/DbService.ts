import { Collection, MongoClient, ObjectID } from 'mongodb'
import { Binary } from 'bson'
import dotenv from 'dotenv'
import { DB_NAME, MONGODB_URI } from '../system/Config'

dotenv.config()

export type User = {
  _id?: ObjectID
  userName: string
  email: string
  password: string
}

export type Group = {
  _id?: ObjectID
  name: string
  registerDate: Date
  registerUserId: ObjectID
  updateDate: Date
  updateUserId: ObjectID
  version: number
}

export type Document = {
  _id?: ObjectID
  groupId: ObjectID
  editLock: boolean
  archive: boolean
  registerDate: Date
  registerUserId: ObjectID
  updateDate: Date
  updateUserId: ObjectID
  version: number
}

export type Page = {
  _id?: ObjectID
  documentId: ObjectID
  pageTitle: string
  pageData: string
  searchData: string
  delete: boolean
  registerDate: Date
  registerUserId: ObjectID
  updateDate: Date
  updateUserId: ObjectID
  version: number
}

export type Node = {
  _id?: ObjectID
  documentId: ObjectID
  parentId: ObjectID
  nodes: Array<ObjectID>
  version: number
}

export type Asset = {
  _id?: ObjectID
  documentId: ObjectID
  pageId: ObjectID
  fileName: string
  mimeType: string
  data: Binary
  registerDate: Date
  registerUserId: ObjectID
}

export type Collections = {
  users: Collection<User>
  groups: Collection<Group>
  documents: Collection<Document>
  pages: Collection<Page>
  nodes: Collection<Node>
  asstes: Collection<Asset>
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
  collections.groups = db.collection<Group>('groups')
  collections.documents = db.collection<Document>('documents')
  collections.pages = db.collection<Page>('pages')
  collections.nodes = db.collection<Node>('nodes')
  collections.asstes = db.collection<Asset>('assets')

  return collections
}
