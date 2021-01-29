import SparkMD5 from 'spark-md5'
import * as Type from './type'

export function promisify(func) {
  if (!Type.isFunction(func)) return func
  return (args = {}) => new Promise((resolve, reject) => {
    func(
      Object.assign(args, {
        success: resolve,
        fail: reject
      })
    )
  })
}

export function addParams(url = '', params = {}) {
  const parts = url.split('?')
  const query = Object.keys(params).map(key => `${key}=${params[key]}`).join('&')
  return query ? `${parts[0]}?${query}` : parts[0]
}

export const awaitWrap = (promise) => promise
  .then(data => [null, data])
  .catch(err => [err, null])

export const compareVersion = (v1, v2) => {
  v1 = v1.split('.')
  v2 = v2.split('.')
  const len = Math.max(v1.length, v2.length)

  while (v1.length < len) {
    v1.push('0')
  }
  while (v2.length < len) {
    v2.push('0')
  }

  for (let i = 0; i < len; i++) {
    const num1 = parseInt(v1[i], 10)
    const num2 = parseInt(v2[i], 10)

    if (num1 > num2) {
      return 1
    } else if (num1 < num2) {
      return -1
    }
  }

  return 0
}

export function filterParams(params) {
  return Object.keys(params)
    .filter(value => value.startsWith('x:'))
    .map(k => [k, params[k].toString()])
}

export function computeMd5(buffer) {
  const spark = new SparkMD5.ArrayBuffer()
  spark.append(buffer)
  const md5 = spark.end()
  spark.destroy()
  return md5
}

export function getAuthHeaders(token) {
  const auth = 'UpToken ' + token
  return {Authorization: auth}
}

// 因为小程序缓存有上限，因此不能一直缓存
const localKey = 'mini_js_sdk_upload_file'
export function setLocalFileInfo(size, info) {
  try {
    const data = wx.getStorageSync(localKey)
    wx.setStorageSync(localKey, {
      ...data,
      [size]: info
    })
  } catch (err) {
    console.warn('setLocalFileInfo failed', err)
  }
}

export function removeLocalFileInfo(size) {
  try {
    const data = wx.getStorageSync(localKey)
    delete data[size]
    wx.setStorageSync(localKey, data)
  } catch (err) {
    console.warn('removeLocalFileInfo failed', err)
  }
}

export function getLocalFileInfo(size) {
  try {
    return (wx.getStorageSync(localKey) || {})[size] || []
  } catch (err) {
    console.warn('getLocalFileInfo failed', err)
    return []
  }
}

export function clearExpiredLocalFileInfo() {
  try {
    const data = wx.getStorageSync(localKey)
    if (!data) return
    const newData = {}
    Object.keys(data).forEach(key => {
      const info = data[key] || []
      const item = info.find(i => i && i.time)
      if (item && !isChunkExpired(item.time)) {
        newData[key] = info
      }
    })
    wx.setStorageSync(localKey, newData)
  } catch (err) {
    console.warn('getLocalFileInfo failed', err)
  }
}

// 对上传块本地存储时间检验是否过期
// TODO: 最好用服务器时间来做判断
export function isChunkExpired(time) {
  // const expireAt = time + 3600 * 24 * 1000
  const expireAt = time + 3600 * 1000 * 100 / 60
  return new Date().getTime() > expireAt
}
