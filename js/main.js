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
        windowHeight: systemInfo.windowHeight,
        version: systemInfo.version
      })
      
      // 获取 Canvas - 微信小游戏专用方式
      this.canvas = wx.getSystemInfoSync().canvas
      if (!this.canvas) {
        // 备用方案：尝试创建 Canvas
        if (typeof wx.createCanvas === 'function') {
          this.canvas = wx.createCanvas()
          console.log('已创建 Canvas')
        } else {
          // 开发者工具中可能没有 canvas，使用离屏 Canvas
          console.log('创建离屏 Canvas')
          this.canvas = {
            width: systemInfo.windowWidth,
            height: systemInfo.windowHeight,
            getContext: () => {
              // 创建一个 2D 上下文用于模拟
              const offscreen = document ? document.createElement('canvas') : null
              if (offscreen) {
                offscreen.width = systemInfo.windowWidth
                offscreen.height = systemInfo.windowHeight
                return offscreen.getContext('2d')
              }
              return null
            }
          }
        }
      }
      
      if (this.canvas) {
        console.log('Canvas 已就绪:', this.canvas.width, this.canvas.height)
        this.ctx = this.canvas.getContext('2d')
      } else {
        console.error('无法获取 Canvas')
      }
      
      // 初始化广告管理器
      this.adManager = new AdManager()
      this.adManager.init()
      
      // 初始化游戏（传入 canvas 和 ctx）
      this.game = new Game(this.adManager, this.canvas, this.ctx)
      this.game.start()
      
      console.log('=== 游戏启动完成 ===')
    } catch (err) {
      console.error('游戏启动失败:', err)
      console.error('错误堆栈:', err.stack)
      
      // 显示错误信息
      this.showError(err.message)
    }
  }
  
  // 显示错误
  showError(message) {
    console.error('显示错误:', message)
  }
}
