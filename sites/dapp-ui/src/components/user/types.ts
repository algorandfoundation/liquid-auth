export type CredentialMetadata = {
    device: string
    publicKey: string
    credId: string
    prevCounter: number
}
export type User = {
    wallet: string
    id: string
    credentials: CredentialMetadata[]
}
