/**
 * 游戏主控制器
 */

import Game from './game.js'
import AdManager from './ad.js'

export default class Main {
  constructor() {
    this.game = null
    this.adManager = null
    this.canvas = null
    this.ctx = null
  }

  // 启动游戏
  start() {
    console.log('=== 游戏启动 ===')
    
    try {
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync()
      console.log('系统信息:', {
        platform: systemInfo.platform,
        system: systemInfo.system,
        windowWidth: systemInfo.windowWidth,
        windowHeight: systemInfo.windowHeight
      })
      
      // 获取 Canvas
      this.canvas = systemInfo.canvas
      if (this.canvas) {
        // 设置 Canvas 尺寸
        this.canvas.width = systemInfo.windowWidth
        this.canvas.height = systemInfo.windowHeight
        this.ctx = this.canvas.getContext('2d')
        console.log('Canvas 已就绪:', this.canvas.width, 'x', this.canvas.height)
      } else {
        console.error('无法获取 Canvas')
        return
      }
      
      // 初始化广告
      this.adManager = new AdManager()
      this.adManager.init()
      
      // 初始化游戏
      this.game = new Game(this.adManager, this.canvas, this.ctx)
      this.game.start()
      
      console.log('=== 启动完成 ===')
    } catch (err) {
      console.error('启动失败:', err)
      console.error('堆栈:', err.stack)
    }
  }
}
