import Uploader from '../lib/uploader'
// import Uploader from 'miniprogram-uploader'

let time1 = 0 // 分片上传时间汇总
let num1 = 0
let time2 = 0 // 直传时间汇总
let num2 = 0
const MB = 1024 * 1024
Page({
  data: {
    progress: 0,
    uploadedSize: 0,
    averageSpeed: 0,
    timeRemaining: Number.POSITIVE_INFINITY,
    testChunks: false
  },

  onLoad() {
    this.chunkSize = 5 * MB
  },

  onTestChunksChange(e) {
    const value = e.detail.value
    this.data.testChunks = value
  },

  async getToken(suffix) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://xxx/file/token',
        data: {
          suffix,
        },
        header: {
          'token': 'xxxxx',
        },
        success: (result) => {
          const data = result && result.data
          console.log('======result', result)
          if (data && data.meta && data.meta.code === 0 && data.response) {
            resolve(data.response)
          } else {
            reject(data)
          }
        },
        fail: (error) => {
          reject(error)
        },
        complete: () => {}
      })
    })
  },

  chooseImg() {
    return wx.chooseImage({
      sizeType: ['original'],
      sourceType: ['album'],
      compressed: false
    })
  },

  async chooseImage() {
    this.reset()
  
    const {tempFiles} = await this.chooseImg()
    const tempFilePath = tempFiles[0].path
    const size = tempFiles[0].size
    console.log('tempFiles', tempFiles, size/MB)
    
    const suffix = (tempFilePath.match(/\.(\w+)$/) || [])[1] || 'jpeg'

    // 获取token
    const {token, key, hosts} = await this.getToken(suffix)

    if (!Uploader.isSupport()) {
      wx.showToast({
        title: '分片上传在 2.10.0 版本以上支持',
        icon: 'none',
        duration: 3000
      })
      return
    }
    const putExtra = {
      fname: '',
      params: {},
      mimeType: null
    };

    const t1 = Date.now()
    const uploader = new Uploader({
      tempFilePath,
      totalSize: size,
      key,
      token,
      uphost: 'https://xxx/upload',
      putExtra, // 放在合并请求url中
      verbose: true,
      // forceDirect: true,
    })
    uploader.on('retry', (res) => {
      console.log('retry', res.url)
    })

    uploader.on('complete', (res) => {
      console.log('upload complete', res)
    })

    uploader.on('success', (res) => {
      time1 += Date.now() - t1
      num1++
      this.setData({
        num1,
        aver1: (time1 / num1 / 1000).toFixed(2)
      })
      console.log('upload success time', Date.now() - t1)
      console.log('upload success', res)
    })

    uploader.on('fail', (res) => {
      console.log('upload fail', res)
    })

    uploader.on('progress', (res) => {
      this.setData({
        progress: res.progress,
        uploadedSize: parseInt(res.uploadedSize / 1024),
        averageSpeed: parseInt(res.averageSpeed / 1024),
        timeRemaining: res.timeRemaining
      })
    })

    uploader.upload()

    this.uploader = uploader
  },

  async chooseImageDirect() {
    const {tempFiles} = await this.chooseImg()
    console.log('tempFiles', tempFiles)
    const tempFilePath = tempFiles[0].path
    const size = tempFiles[0].size
    
    const suffix = (tempFilePath.match(/\.(\w+)$/) || [])[1] || 'jpeg'

    // 获取token
    const {token, key, hosts} = await this.getToken(suffix)
    const putExtra = {
      fname: '',
      params: {},
      mimeType: null
    };

    const t1 = Date.now()
    const uploader = new Uploader({
      tempFilePath,
      totalSize: size,
      key,
      token,
      uphost: (hosts.main || hosts.backup).replace('http:', 'https:'),
      putExtra, // 放在合并请求url中
      verbose: true,
      forceDirect: true,
    })

    uploader.on('success', (res) => {
      time2 += Date.now() - t1
      num2++
      this.setData({
        num2,
        aver2: (time2 / num2 / 1000).toFixed(2)
      })
      console.log('chooseImageDirect success time', Date.now() - t1)
      console.log('chooseImageDirect success', res)
    })

    uploader.on('fail', (res) => {
      console.log('chooseImageDirect fail', res)
    })

    uploader.upload()
  },

  reset() {
    this.setData({
      progress: 0,
      uploadedSize: 0,
      averageSpeed: 0,
      timeRemaining: Number.POSITIVE_INFINITY,
    })
  },

  handleUpload() {
    this.uploader && this.uploader.upload()
  },

  handlePause() {
    this.uploader && this.uploader.pause()
  },

  handleResume() {
    this.uploader && this.uploader.resume()
  },

  handleCancel() {
    this.uploader && this.uploader.cancel()
  }
})
