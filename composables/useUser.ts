import { v4 as uuidv4 } from 'uuid'

const USER_ID_KEY = 'json-share-user-id'

export const useUser = () => {
  const getUserId = (): string => {
    if (process.server) {
      return ''
    }
    
    let userId = localStorage.getItem(USER_ID_KEY)
    if (!userId) {
      userId = uuidv4()
      localStorage.setItem(USER_ID_KEY, userId)
    }
    return userId
  }

  const getUserHeaders = () => {
    const userId = getUserId()
    return userId ? { 'X-User-ID': userId } : {}
  }

  return {
    getUserId,
    getUserHeaders
  }
}