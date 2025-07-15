export type user = {
    id: number
    firstname: string
    lastname: string
    phone: string
    email: string
    depotId: number
    role: string
    isActive: boolean
}

export type depot = {
    id: number
    name: string
    needDoubleCheck: boolean
    isActive: boolean
}