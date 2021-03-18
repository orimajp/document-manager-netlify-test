import { connectDb } from '../db/DbService'
import { UserService } from '../users/UserService'
import { AuthService } from '../auth/AuthService'
import { DocumentService } from '../documents/DocumentService'
import { NodeService } from '../nodes/NodeService'

export class ServiceContainer {
  constructor(
    public readonly userService: UserService,
    public readonly authService: AuthService,
    public readonly documentService: DocumentService,
    public readonly nodeService: NodeService
  ) {}
}

let container: ServiceContainer | null = null

export async function createContainer(): Promise<ServiceContainer> {
  if (container) {
    return container
  }

  const collections = await connectDb()
  container = new ServiceContainer(
    new UserService(collections),
    new AuthService(collections),
    new DocumentService(collections),
    new NodeService(collections)
  )

  return container
}
