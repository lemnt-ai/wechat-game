/**
 * 游戏主控制器
 */

import Game from './game.js'
import AdManager from './ad.js'

export default class Main {
  constructor() {
    this.game = null
    this.adManager = null
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
      
      // 检查 Canvas
      if (systemInfo.canvas) {
        console.log('Canvas 可用')
      } else {
        console.warn('Canvas 不可用')
      }
      
      // 初始化广告管理器
      this.adManager = new AdManager()
      this.adManager.init()
      
      // 初始化游戏
      this.game = new Game(this.adManager)
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
    try {
      const systemInfo = wx.getSystemInfoSync()
      const canvas = systemInfo.canvas
      if (!canvas) return
      
      const ctx = canvas.getContext('2d')
      const width = systemInfo.windowWidth
      const height = systemInfo.windowHeight
      
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, width, height)
      
      ctx.fillStyle = '#ff6b6b'
      ctx.font = 'bold 32px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('启动失败', width / 2, height / 3)
      
      ctx.fillStyle = '#fff'
      ctx.font = '20px Arial'
      ctx.fillText(message || '未知错误', width / 2, height / 2)
      
      ctx.font = '16px Arial'
      ctx.fillText('请查看控制台日志', width / 2, height / 2 + 40)
    } catch (e) {
      console.error('显示错误失败:', e)
    }
  }
}
