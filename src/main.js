import Logger from 'js-logger'
import config from './config'
import EventEmitter from './eventEmitter'
import * as Util from './util'
import * as Type from './type'
import {urlSafeBase64Encode} from './base64'

Logger.useDefaults({
  defaultLevel: Logger.OFF,
  formatter(messages) {
    const now = new Date()
    const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
    messages.unshift(time)
    messages.unshift('[Uploader]')
  }
})

const fileManager = wx.getFileSystemManager()
const readFileAsync = Util.promisify(fileManager.readFile)
const systemInfo = wx.getSystemInfoSync()

// 清理过期的缓存
Util.clearExpiredLocalFileInfo()

class Uploader {
  constructor(option = {}) {
    // if (option.verbose) Logger.setLevel(Logger.INFO)
    if (option.verbose) Logger.setLevel(Logger.TRACE)
    Logger.debug('construct option ', option)
    // this.config = Object.assign(config, option)
    this.config = {...config, ...option}
    this.emitter = new EventEmitter()
    this.totalSize = this.config.totalSize
    this.chunkSize = this.config.chunkSize
    this.continueByMD5 = this.config.continueByMD5
    this.tempFilePath = this.config.tempFilePath
    this.totalChunks = Math.ceil(this.totalSize / this.chunkSize)
    this.maxLoadChunks = Math.floor(this.config.maxMemory / this.chunkSize)
    this.isDirectUpload = this.config.forceDirect || this.totalSize < this.config.directChunkSize // 直传：强制直传或者文件大小小于分片大小
    this._event()
  }

  static isSupport() {
    const version = systemInfo.SDKVersion
    return Util.compareVersion(version, '2.10.0') >= 0
  }

  async upload() {
    this._reset()

    this.chunksNeedSend = this.chunksIndexNeedSend.length
    this.sizeNeedSend = this.chunksNeedSend * this.chunkSize
    if (this.chunksIndexNeedSend.includes(this.totalChunks - 1)) {
      this.sizeNeedSend -= (this.totalChunks * this.chunkSize - this.totalSize)
    }

    Logger.debug(`
      start upload
        chunksQueue: ${this.chunksQueue},
        chunksIndexNeedRead: ${this.chunksIndexNeedRead},
        chunksNeedSend: ${this.chunksIndexNeedSend},
        sizeNeedSend: ${this.sizeNeedSend}
    `)

    Logger.info('start upload chunks')
    Logger.time('[Uploader] uploadChunks')
    // step1: 开始上传
    this.isUploading = true
    this._upload()
  }

  _requestAsync(args = {}, callback) {
    const {
      chunkRetryInterval,
      maxChunkRetries,
      successStatus,
      failStatus,
      timeout
    } = this.config

    let retries = maxChunkRetries
    return new Promise((resolve, reject) => {
      const doRequest = () => {
        const task = wx.request({
          ...args,
          timeout,
          success: (res) => {
            const statusCode = res.statusCode

            // 标示成功的返回码
            if (successStatus.includes(statusCode)) {
              resolve(res)
            // 标示失败的返回码
            } else if (failStatus.includes(statusCode)) {
              reject(res)
            } else if (retries > 0) {
              setTimeout(() => {
                this.emit('retry', {
                  statusCode,
                  url: args.url
                })
                --retries
                doRequest()
              }, chunkRetryInterval)
            } else {
              reject(res)
            }
          },
          fail: (res) => {
            reject(res)
          }
        })

        if (Type.isFunction(callback)) {
          callback(task)
        }
      }

      doRequest()
    })
  }

  handleFail(e) {
    if (this.isFail) return
    Logger.error('upload file fail: ', e)
    this.isFail = true
    this.cancel()
    this.emit('fail', e)
    this.emit('complete', e)
  }

  _event() {
    // step2: 发送合并请求
    this.on('uploadDone', async () => {
      Logger.timeEnd('[Uploader] uploadChunks')
      Logger.info('upload chunks end')
      this.isUploading = false
      Logger.info('start merge reqeust')
      Logger.time('[Uploader] mergeRequest')
      const [mergeErr, mergeResp] = await Util.awaitWrap(this.mergeRequest())
      Logger.timeEnd('[Uploader] mergeRequest')
      Logger.info('merge reqeust end')
      Logger.debug('mergeRequest', mergeErr, mergeResp)
      if (this.continueByMD5) Util.removeLocalFileInfo(this.totalSize)
      if (mergeErr) {
        this.handleFail({
          errCode: 20003,
          errrMsg: mergeErr.errMsg,
          errInfo: mergeErr
        })
        return
      }
      Logger.info('upload file success')
      this.emit('success', {
        errCode: 0,
        ...mergeResp.data
      })
      this.emit('complete', {
        errCode: 0,
        ...mergeResp.data
      })
    })
    // 直传：当文件大小小于分片大小
    this.on('directUploadDone', async () => {
      const [requestErr, request] = await Util.awaitWrap(this.directUpload())
      this.updateUploadSize(this.totalSize)
      if (requestErr) {
        this.handleFail({
          errCode: 20003,
          errrMsg: requestErr.errMsg,
          errInfo: requestErr
        })
        return
      }
      Logger.info('directUploadDone file success')
      this.emit('success', {
        errCode: 0,
        ...request.data
      })
      this.emit('complete', {
        errCode: 0,
        ...request.data
      })
    })
  }

  async _upload() {
    this.startUploadTime = Date.now()
    this._uploadedSize = 0

    // 直传
    if (this.isDirectUpload) {
      this.emit('directUploadDone')
      return
    }

    if (this.chunksQueue.length) {
      const maxConcurrency = this.config.maxConcurrency
      for (let i = 0; i < maxConcurrency; i++) {
        this.uploadChunk()
      }
    } else {
      this.readFileChunk()
    }
  }

  directUpload() {
    const {
      key, uphost, token, timeout, successStatus, failStatus, maxChunkRetries, chunkRetryInterval
    } = this.config
    let retries = maxChunkRetries
    return new Promise((resolve, reject) => {
      const doRequest = () => {
        this.directTask = wx.uploadFile({
          url: uphost,
          filePath: this.tempFilePath,
          name: 'file',
          formData: {
            key,
            token
          },
          timeout,
          success: (res) => {
            console.log('uploadFile res', res, retries)
            const statusCode = res.statusCode
            // 标示成功的返回码
            if (successStatus.includes(statusCode)) {
              resolve(res)
            // 标示失败的返回码
            } else if (failStatus.includes(statusCode)) {
              reject(res)
            } else if (retries > 0) {
              setTimeout(() => {
                this.emit('retry', {
                  statusCode,
                  url: this.tempFilePath
                })
                --retries
                doRequest()
              }, chunkRetryInterval)
            } else {
              reject(res)
            }
          },
          fail(error) {
            reject(error)
          }
        })
      }

      doRequest()
    })
  }

  updateUploadSize(currUploadSize) {
    this.uploadedSize += currUploadSize // 总体上传大小，暂停后累计
    this._uploadedSize += currUploadSize // 上传大小，暂停后清空
    const time = Date.now() - this.startUploadTime // 当前耗时
    const averageSpeed = this._uploadedSize / time // B/ms
    const sizeWaitSend = this.sizeNeedSend - this.uploadedSize // 剩余需要发送的大小
    this.timeRemaining = parseInt(sizeWaitSend / averageSpeed, 10) // 剩余时间
    this.averageSpeed = parseInt(averageSpeed, 10) * 1000 // 平均速度 B/s
    this.progress = parseInt(((this.uploadedSize * 100) / this.sizeNeedSend), 10)
    this.dispatchProgress()
  }

  dispatchProgress() {
    this.emit('progress', {
      totalSize: this.totalSize,
      progress: this.progress,
      uploadedSize: this.uploadedSize,
      averageSpeed: this.averageSpeed,
      timeRemaining: this.timeRemaining
    })
  }

  pause() {
    Logger.info('** pause **')
    this.isUploading = false

    if (this.isDirectUpload) {
      this.directTask.abort()
      return
    }

    const abortIndex = Object.keys(this.uploadTasks).map(v => v * 1)
    abortIndex.forEach(index => {
      this.chunksIndexNeedRead.push(index)
      this.uploadTasks[index].abort()
    })
    this.uploadTasks = {}
  }

  resume() {
    Logger.info('** resume **')
    this.isUploading = true
    this._upload()
  }

  cancel() {
    Logger.info('** cancel **')
    this.pause()
    this._reset()
  }

  _reset() {
    // [0, 1, 2, 3, 4, 5, ...]，需要被读取的分片的序号数组
    this.chunksIndexNeedRead = Array.from(Array(this.totalChunks).keys())
    this.chunksIndexNeedSend = Array.from(Array(this.totalChunks).keys())
    this.chunksNeedSend = this.totalChunks
    this.sizeNeedSend = this.totalSize
    this.chunksSend = 0
    this.chunksQueue = []
    this.uploadTasks = {}
    this.isUploading = false
    this.isFail = false
    this.progress = 0
    this.uploadedSize = 0
    this.averageSpeed = 0
    this.timeRemaining = Number.POSITIVE_INFINITY
    this.ctxList = []
    this.localInfo = this.continueByMD5 ? Util.getLocalFileInfo(this.totalSize) : null
    this.dispatchProgress()
  }

  readFileChunk() {
    const {
      tempFilePath,
      chunkSize,
      maxLoadChunks,
      chunksQueue,
      chunksIndexNeedRead,
      totalSize
    } = this
    const chunks = Math.min(chunksIndexNeedRead.length, maxLoadChunks - chunksQueue.length)
    // 异步读取
    Logger.debug(`readFileChunk chunks: ${chunks}, chunksIndexNeedRead`, this.chunksIndexNeedRead)
    for (let i = 0; i < chunks; i++) {
      const index = chunksIndexNeedRead.shift()
      const position = index * chunkSize
      const length = Math.min(totalSize - position, chunkSize)
      if (this.isFail) break

      readFileAsync({
        filePath: tempFilePath,
        position,
        length
      }).then(res => {
        const chunk = res.data
        let md5 = ''
        if (this.continueByMD5) {
          const t1 = Date.now()
          md5 = Util.computeMd5(chunk)
          console.log('time ' + index, Date.now() - t1)
        }
        this.chunksQueue.push({
          chunk,
          length,
          index,
          md5
        })
        this.uploadChunk()
        return null
      }).catch(e => {
        this.handleFail({
          errCode: 10001,
          errMsg: e.errMsg,
          errInfo: e
        })
      })
    }
  }

  uploadChunk() {
    // 暂停中
    if (!this.isUploading || this.isFail) return
    // 没有更多数据了
    if (!this.chunksQueue.length) return
    // 达到最大并发度
    if (Object.keys(this.uploadTasks).length === this.config.maxConcurrency) return

    const {
      chunk,
      index,
      length,
      md5
    } = this.chunksQueue.shift()

    if (this.continueByMD5) {
      // 通过文件size作为id来缓存上传部分分片后失败的文件
      // 如果缓存中存在该文件，并且对比md5发现某些分片已经上传，则不再重复上传该分片
      const info = this.localInfo[index]
      const savedReusable = info && !Util.isChunkExpired(info.time)
      if (savedReusable && md5 === info.md5) {
        this.ctxList[index] = {...info}
        this.chunksSend++
        this.updateUploadSize(length)
        // 所有分片发送完毕
        if (this.chunksSend === this.chunksNeedSend) {
          this.emit('uploadDone')
        } else {
          // 尝试继续加载文件
          this.readFileChunk()
          // 尝试继续发送下一条
          this.uploadChunk()
        }
        return
      }
    }

    Logger.debug(`uploadChunk index: ${index}, lenght ${length}`)
    Logger.time(`[Uploader] uploadChunk index-${index}`)
    const requestUrl = this.config.uphost + '/mkblk/' + length
    this._requestAsync({
      url: requestUrl,
      data: chunk,
      header: {
        ...Util.getAuthHeaders(this.config.token),
        'content-type': 'application/octet-stream'
      },
      method: 'POST',
    }, (task) => {
      this.uploadTasks[index] = task
    }).then((res) => {
      this.ctxList[index] = {
        time: new Date().getTime(),
        ctx: res.data.ctx,
        size: length,
        md5
      }
      this.chunksSend++
      delete this.uploadTasks[index]
      this.updateUploadSize(length)
      Logger.debug(`uploadChunk success chunksSend: ${this.chunksSend}`)
      Logger.timeEnd(`[Uploader] uploadChunk index-${index}`)
      // 尝试继续加载文件
      this.readFileChunk()
      // 尝试继续发送下一条
      this.uploadChunk()
      // 所有分片发送完毕
      if (this.chunksSend === this.chunksNeedSend) {
        this.emit('uploadDone')
      }
      if (this.continueByMD5) Util.setLocalFileInfo(this.totalSize, this.ctxList)
      return null
    }).catch(res => {
      if (res.errMsg.includes('request:fail abort')) {
        Logger.info(`chunk index-${index} will be aborted`)
      } else {
        this.handleFail({
          errCode: 20002,
          errMsg: res.errMsg,
          errInfo: res
        })
      }
    })
  }

  emit(event, data) {
    this.emitter.emit(event, data)
  }

  on(event, listenr) {
    this.emitter.on(event, listenr)
  }

  off(event, listenr) {
    this.emitter.off(event, listenr)
  }

  // 构造file上传url
  createMkFileUrl() {
    const {putExtra, key, uphost} = this.config
    let requestUrl = uphost + '/mkfile/' + this.totalSize
    if (key != null) {
      requestUrl += '/key/' + urlSafeBase64Encode(key)
    }
    // 由于没有file.type，因此不处理mimeType
    // if (putExtra.mimeType) {
    //   requestUrl += '/mimeType/' + urlSafeBase64Encode(file.type)
    // }
    const fname = putExtra.fname
    if (fname) {
      requestUrl += '/fname/' + urlSafeBase64Encode(fname)
    }
    if (putExtra.params) {
      Util.filterParams(putExtra.params).forEach(
        item => (requestUrl += '/' + encodeURIComponent(item[0]) + '/' + urlSafeBase64Encode(item[1]))
      )
    }
    return requestUrl
  }

  async mergeRequest() {
    const requestUrL = this.createMkFileUrl()
    const data = this.ctxList.map(value => value.ctx).join(',')

    const mergeResp = await this._requestAsync({
      url: requestUrL,
      header: {
        ...Util.getAuthHeaders(this.config.token),
        'content-type': 'text/plain'
      },
      data,
      method: 'POST',
    })
    return mergeResp
  }
}

export default Uploader
