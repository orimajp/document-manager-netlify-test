import dotenv from 'dotenv'

dotenv.config()

export const MONGODB_URI = process.env.MONGODB_URL
export const DB_NAME = process.env.DB_NAME

if (!MONGODB_URI) {
  throw new Error('MONGODB URL not defined.')
}

if (!DB_NAME) {
  throw new Error('DB_NAME not defined.')
}

export const SECRET_KEY = process.env.SECRET_KEY!.replace(/\\n/g, '\n')
// export const SECRET_KEY = 'secret'
