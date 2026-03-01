/**
 * 游戏入口文件
 */

import Game from './game.js'
import AdManager from './ad.js'

// 游戏实例
let gameInstance = null

// 广告管理器
let adManager = null

wx.onShow(() => {
  console.log('游戏显示')
  if (gameInstance) {
    gameInstance.resume()
  }
})

wx.onHide(() => {
  console.log('游戏隐藏')
  if (gameInstance) {
    gameInstance.pause()
  }
})

// 游戏启动
function startGame() {
  // 初始化广告管理器
  adManager = new AdManager()
  adManager.init()
  
  // 初始化游戏
  gameInstance = new Game(adManager)
  gameInstance.start()
  
  console.log('游戏启动成功!')
}

// 等待加载完成
if (wx.canIUse('getSystemInfoSync')) {
  startGame()
} else {
  wx.onLoad(() => {
    startGame()
  })
}
