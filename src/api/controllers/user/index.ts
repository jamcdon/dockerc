import * as crypto from 'crypto'
import * as service from '../../../db/sql/services/userService'
import {
    CreateUserDTO,
    UpdateUserDTO,
    FilterUserDTO,
    CreateUserNoSalt,
    UpdateUserNoSalt,
    SignInUserDTO,
    UserCookieDTO
} from '../../dto/user.dto'
import {User} from '../../interfaces'
import * as mapper from './mapper'
import {redisClient} from '../../../db/cache/init'
import { createToken } from '../../../db/cache/dal/User'
import { Request } from "express";

export const saltHash = (password: string, passedSalt?: string):  { salt: string, hexHash: string }=> {
    let salt;
    if (passedSalt == undefined){
        salt = crypto.randomBytes(64)
            .toString('hex')
    }
    else {
        salt = passedSalt
    }
        const hash = crypto.createHmac('sha512', salt)
        hash.update(password)
        const hexHash = hash.digest('hex')
       return {salt, hexHash}
}

export const createUserSaltHash = async(payload: CreateUserNoSalt): Promise<CreateUserDTO> => {
    const {salt, hexHash} = saltHash(payload.password)

    const saltHashUserDTO:CreateUserDTO = {
        id: payload.id,
        email: payload.email,
        username: payload.username,
        passwordSalt: salt,
        passwordHash: hexHash,
        bio: payload.bio,
        sso: undefined,
        admin: false
    }

    return saltHashUserDTO
}

export const create = async(payload: CreateUserDTO): Promise<User | undefined> => {
    const user = await service.create(payload)
    if (user != undefined){
        return mapper.toUser(user)
    }
    return undefined
}

export const updateUserSaltHash = async(payload: UpdateUserNoSalt): Promise<UpdateUserDTO> => {
    // if payload.password does not exist return, else resalt and rehash
    if (!payload.password) {
        return payload as unknown as UpdateUserDTO
    }
    else {
        const {salt, hexHash} = saltHash(payload.password)
        
        const newPayload: any = payload
        delete newPayload.password
        newPayload.passwordSalt = salt
        newPayload.passwordHash = hexHash
        const saltHashUserDTO:UpdateUserDTO = newPayload

        return saltHashUserDTO
    }
}

export const update = async (id: number, payload: UpdateUserDTO): Promise<User | undefined> => {
    const user = await service.update(id, payload)
    if (user != undefined){
        return mapper.toUser(user)
    }
    return undefined
}

export const getById = async (id: number): Promise<User | undefined> => {
    const user = await service.getById(id)
    if (user != undefined){
        return mapper.toUser(user)
    }
    return undefined
}

export const getByUsername = async(username: string): Promise<User | undefined> => {
    const userObject = await service.getByUsername(username)
    if (userObject != undefined){
        return mapper.toUser(userObject)
    }
    return undefined
}

export const validateUsername = async(username: string): Promise<boolean> => {
    return (await service.validateUsername(username))
}

export const validateEmail = async(email: string): Promise<boolean> => {
    return (await service.validateEmail(email))
}

export const authenticateByEmail = async(payload: SignInUserDTO): Promise <string> => {
    const salt = await service.getSaltFromEmail(payload.email)
    const hash = saltHash(payload.password as string, salt).hexHash
    const newPayload: SignInUserDTO = {
        email: payload.email,
        hash: hash
    }
    return (await service.authenticateByEmail(newPayload))
}

export const deleteById = async (id: number): Promise<Boolean> => {
    const isDeleted = await service.deleteById(id)
    return isDeleted
}

export const setCookie = async (username: string): Promise<string> => {
    const id = await createToken()
    const user = await service.getByUsername(username) as any // dangerous! but should be safe
    const userObject: UserCookieDTO = {
        username: username,
        id: user.id,
        isAdmin: user.admin
    }
    const userObjectString = JSON.stringify(userObject)
    redisClient.set(id, userObjectString)
    redisClient.expire(id, 259200) // set TLL to 3 days
    return id 
}

export const delCookie = async(id: string): Promise<boolean> => {
    const deleted = await redisClient.del(id)
    return (deleted == 1 ? true : false)
}

export const getCookieID = async(req: Request): Promise<number | undefined> => {
    if (req.signedCookies.loginToken) {
        const loginToken = await redisClient.get(req.signedCookies.loginToken)
        if (loginToken != null){
            try {
                const userCookie: UserCookieDTO = JSON.parse(loginToken)
                return userCookie.id
            }
            catch {
                return undefined
            }
        }
        return undefined
    }
}