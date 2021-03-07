import { UpdateDocumentAttribute } from './UpdateDocumentAttribute'

export interface LockDocumentInfo extends UpdateDocumentAttribute {
  lock: boolean
}
