export default {
  tempFilePath: '',
  totalSize: 0,
  maxConcurrency: 3,
  chunkSize: 4 * 1024 * 1024,
  maxMemory: 100 * 1024 * 1024,
  chunkRetryInterval: 0,
  maxChunkRetries: 0,
  timeout: 20000,
  successStatus: [200, 201, 202],
  failStatus: [404, 415, 500, 501],
  verbose: false,
  continueByMD5: true, // 断点续传：通过对比本地md5对失败文件的分片进行保存
  forceDirect: false, // 强制直传
  directChunkSize: 4 * 1024 * 1024, // 文件尺寸超过这个值就采用分片，否则直传
}
