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
      const systemInfo = wx.getSystemInfoSync()
      console.log('系统信息:', {
        platform: systemInfo.platform,
        system: systemInfo.system,
        windowWidth: systemInfo.windowWidth,
        windowHeight: systemInfo.windowHeight,
        SDKVersion: systemInfo.SDKVersion
      })
      
      // 尝试多种方式获取 Canvas
      this.canvas = this.getCanvas(systemInfo)
      
      if (!this.canvas) {
        console.error('所有方式都无法获取 Canvas')
        this.showError('无法初始化 Canvas，请重启微信开发者工具')
        return
      }
      
      console.log('Canvas 获取成功')
      
      // 设置尺寸
      this.canvas.width = systemInfo.windowWidth
      this.canvas.height = systemInfo.windowHeight
      console.log('Canvas 尺寸:', this.canvas.width, 'x', this.canvas.height)
      
      // 获取上下文
      this.ctx = this.canvas.getContext('2d')
      if (!this.ctx) {
        console.error('无法获取 2D 上下文')
        this.showError('无法获取 Canvas 上下文')
        return
      }
      
      // 初始化广告
      this.adManager = new AdManager()
      this.adManager.init()
      
      // 初始化游戏
      this.game = new Game(this.adManager, this.canvas, this.ctx)
      this.game.start()
      
      // 启动游戏循环
      setTimeout(() => {
        if (this.game && this.game.gameLoop) {
          this.game.gameLoop()
        }
      }, 100)
      
      console.log('=== 启动完成 ===')
    } catch (err) {
      console.error('启动失败:', err)
      console.error('堆栈:', err.stack)
      this.showError(err.message)
    }
  }
  
  // 获取 Canvas（尝试多种方式）
  getCanvas(systemInfo) {
    // 方式 1: 从系统信息获取
    if (systemInfo.canvas) {
      console.log('方式 1: 使用 systemInfo.canvas')
      return systemInfo.canvas
    }
    
    // 方式 2: 尝试 wx.createCanvas
    if (typeof wx.createCanvas === 'function') {
      try {
        const canvas = wx.createCanvas()
        if (canvas) {
          console.log('方式 2: wx.createCanvas()')
          return canvas
        }
      } catch (e) {
        console.log('方式 2 失败:', e.message)
      }
    }
    
    // 方式 3: 尝试 wx.getSharedCanvas
    if (typeof wx.getSharedCanvas === 'function') {
      try {
        const canvas = wx.getSharedCanvas()
        if (canvas) {
          console.log('方式 3: wx.getSharedCanvas()')
          return canvas
        }
      } catch (e) {
        console.log('方式 3 失败:', e.message)
      }
    }
    
    // 方式 4: 尝试 wx.createOffscreenCanvas
    if (typeof wx.createOffscreenCanvas === 'function') {
      try {
        const canvas = wx.createOffscreenCanvas({
          type: '2d',
          width: systemInfo.windowWidth,
          height: systemInfo.windowHeight
        })
        if (canvas) {
          console.log('方式 4: wx.createOffscreenCanvas()')
          return canvas
        }
      } catch (e) {
        console.log('方式 4 失败:', e.message)
      }
    }
    
    console.error('所有 Canvas 获取方式都失败了')
    return null
  }
  
  // 显示错误
  showError(message) {
    console.error('显示错误:', message)
    
    // 尝试用最简单的方式显示
    try {
      const systemInfo = wx.getSystemInfoSync()
      const canvas = systemInfo.canvas || wx.createCanvas()
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(0, 0, systemInfo.windowWidth, systemInfo.windowHeight)
        
        ctx.fillStyle = '#ff6b6b'
        ctx.font = 'bold 28px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('启动失败', systemInfo.windowWidth / 2, systemInfo.windowHeight / 3)
        
        ctx.fillStyle = '#fff'
        ctx.font = '16px Arial'
        ctx.fillText(message, systemInfo.windowWidth / 2, systemInfo.windowHeight / 2)
        
        ctx.font = '14px Arial'
        ctx.fillText('请重启微信开发者工具', systemInfo.windowWidth / 2, systemInfo.windowHeight / 2 + 40)
      }
    } catch (e) {
      console.error('显示错误也失败了:', e)
    }
  }
}
