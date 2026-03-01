/**
 * 欢乐钓鱼 - 微信小游戏
 * 完整修复版
 */

export default class Game {
  constructor(adManager, canvas, ctx) {
    this.adManager = adManager
    this.canvas = canvas
    this.ctx = ctx
    
    this.systemInfo = wx.getSystemInfoSync()
    this.width = this.systemInfo.windowWidth
    this.height = this.systemInfo.windowHeight
    
    // 游戏状态
    this.state = 'menu' // menu, playing, gameover
    this.time = 180  // 3 分钟
    this.score = 0
    this.caught = 0
    
    // 鱼钩 - 固定在顶部中间
    this.hookX = this.width / 2
    this.hookY = 60
    this.hookTargetX = this.width / 2
    this.hookSpeed = 8
    
    // 鱼线
    this.lineLength = 0
    this.maxLineLength = this.height - 100
    this.lineSpeed = 5
    this.lineState = 'idle' // idle, dropping, pulling, caught
    
    // 鱼
    this.fishTypes = [
      { name: '小鱼', color: '#4ECDC4', score: 10, speed: 2, size: 25 },
      { name: '中鱼', color: '#45B7D1', score: 20, speed: 3, size: 35 },
      { name: '大鱼', color: '#FF6B6B', score: 30, speed: 1.5, size: 45 },
      { name: '金鱼', color: '#FFD700', score: 50, speed: 4, size: 30 }
    ]
    
    this.fishes = []
    this.caughtFish = null
    this.spawnTimer = 0
    this.spawnInterval = 60 // 帧
    
    // 触摸
    this.touchX = 0
  }
  
  // 初始化
  init() {
    console.log('[游戏] 初始化')
    this.bindEvents()
    this.render()
  }
  
  // 生成鱼
  spawnFish() {
    const typeIndex = Math.floor(Math.random() * this.fishTypes.length)
    const type = this.fishTypes[typeIndex]
    const fromLeft = Math.random() > 0.5
    
    const fish = {
      x: fromLeft ? -50 : this.width + 50,
      y: 120 + Math.random() * (this.height - 200),
      type: type,
      direction: fromLeft ? 1 : -1,
      caught: false,
      hooked: false
    }
    
    this.fishes.push(fish)
    console.log('[鱼] 生成:', type.name)
  }
  
  // 更新
  update() {
    if (this.state !== 'playing') return
    
    // 时间
    this.time--
    if (this.time <= 0) {
      this.state = 'gameover'
      console.log('[游戏] 结束! 分数:', this.score)
      return
    }
    
    // 鱼钩左右移动
    if (Math.abs(this.hookX - this.hookTargetX) > 1) {
      this.hookX += (this.hookTargetX > this.hookX) ? this.hookSpeed : -this.hookSpeed
    }
    
    // 鱼线状态
    if (this.lineState === 'dropping') {
      this.lineLength += this.lineSpeed
      if (this.lineLength >= this.maxLineLength) {
        this.lineState = 'pulling'
        console.log('[鱼钩] 到达底部')
      }
      this.checkCollision()
    } else if (this.lineState === 'pulling') {
      this.lineLength -= this.lineSpeed * 1.5
      if (this.lineLength <= 0) {
        this.lineLength = 0
        this.lineState = 'idle'
        if (this.caughtFish) {
          this.score += this.caughtFish.type.score
          this.caught++
          console.log('[得分] +', this.caughtFish.type.score, '总分:', this.score)
          this.caughtFish = null
        }
      }
    }
    
    // 更新鱼
    this.updateFishes()
    
    // 生成鱼
    this.spawnTimer++
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnFish()
      this.spawnTimer = 0
    }
  }
  
  // 更新鱼
  updateFishes() {
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const fish = this.fishes[i]
      
      if (fish.caught) {
        // 被钓起的鱼跟随鱼钩
        fish.x = this.hookX
        fish.y = this.hookY + this.lineLength + 30
        continue
      }
      
      // 移动
      fish.x += fish.type.speed * fish.direction
      
      // 移除超出屏幕的
      if ((fish.direction === 1 && fish.x > this.width + 100) ||
          (fish.direction === -1 && fish.x < -100)) {
        this.fishes.splice(i, 1)
      }
    }
  }
  
  // 检查碰撞
  checkCollision() {
    const hookY = this.hookY + this.lineLength
    
    for (let i = 0; i < this.fishes.length; i++) {
      const fish = this.fishes[i]
      if (fish.caught || fish.hooked) continue
      
      const dx = Math.abs(fish.x - this.hookX)
      const dy = Math.abs(fish.y - hookY)
      
      if (dx < fish.type.size && dy < fish.type.size + 10) {
        // 钓到了!
        fish.hooked = true
        fish.caught = true
        this.caughtFish = fish
        this.lineState = 'pulling'
        console.log('[钓鱼] 钓到:', fish.type.name)
        break
      }
    }
  }
  
  // 绑定事件
  bindEvents() {
    console.log('[事件] 绑定')
    
    // 触摸开始
    wx.onTouchStart((res) => {
      console.log('[TouchStart]')
      
      if (this.state === 'menu') {
        console.log('[菜单] 开始游戏')
        this.startGame()
        return
      }
      
      if (this.state === 'gameover') {
        console.log('[结束] 重新开始')
        this.startGame()
        return
      }
      
      // 放下鱼钩
      if (this.lineState === 'idle') {
        console.log('[钓鱼] 放下鱼钩')
        this.lineState = 'dropping'
      }
    })
    
    // 触摸移动
    wx.onTouchMove((res) => {
      const touch = res.touches[0]
      this.hookTargetX = touch.clientX
      console.log('[TouchMove] 目标:', this.hookTargetX)
    })
    
    // 触摸结束
    wx.onTouchEnd(() => {
      console.log('[TouchEnd]')
    })
    
    console.log('[事件] 完成')
  }
  
  // 开始游戏
  start() {
    console.log('[游戏] 启动')
    this.state = 'menu'
    this.init()
  }
  
  // 新游戏
  startGame() {
    console.log('[游戏] === 新游戏 ===')
    this.state = 'playing'
    this.time = 60
    this.score = 0
    this.caught = 0
    this.fishes = []
    this.caughtFish = null
    this.lineLength = 0
    this.lineState = 'idle'
    this.hookX = this.width / 2
    this.hookTargetX = this.width / 2
    this.spawnTimer = 0
  }
  
  // 游戏循环
  gameLoop() {
    if (this.state === 'playing') {
      this.update()
      this.render()
    }
    requestAnimationFrame(() => this.gameLoop())
  }
  
  // 渲染
  render() {
    if (!this.ctx) return
    
    const ctx = this.ctx
    
    // 清空
    ctx.fillStyle = '#87CEEB'
    ctx.fillRect(0, 0, this.width, this.height)
    
    if (this.state === 'menu') {
      this.renderMenu()
    } else if (this.state === 'playing') {
      this.renderGame()
    } else if (this.state === 'gameover') {
      this.renderGameOver()
    }
  }
  
  // 渲染菜单
  renderMenu() {
    const ctx = this.ctx
    
    ctx.fillStyle = '#FF6B6B'
    ctx.font = 'bold 42px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('欢乐钓鱼', this.width / 2, this.height / 4)
    
    ctx.fillStyle = '#fff'
    ctx.font = '18px Arial'
    ctx.fillText('滑动左右移动', this.width / 2, this.height / 3)
    ctx.fillText('点击放下鱼钩', this.width / 2, this.height / 3 + 35)
    
    ctx.fillStyle = '#4ECDC4'
    ctx.fillRect(this.width / 2 - 80, this.height / 2, 160, 55)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 22px Arial'
    ctx.fillText('开始钓鱼', this.width / 2, this.height / 2 + 35)
  }
  
  // 渲染游戏
  renderGame() {
    const ctx = this.ctx
    
    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(1, '#1E90FF')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)
    
    // 顶部信息栏
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, this.width, 45)
    
    ctx.fillStyle = '#fff'
    ctx.font = '16px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('时间:' + this.time + 's', 12, 28)
    ctx.textAlign = 'center'
    ctx.fillText('分数:' + this.score, this.width / 2, 28)
    ctx.textAlign = 'right'
    ctx.fillText('钓到:' + this.caught, this.width - 12, 28)
    
    // 鱼钩支架
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(this.hookX - 3, 0, 6, this.hookY)
    
    // 鱼线
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(this.hookX, this.hookY)
    ctx.lineTo(this.hookX, this.hookY + this.lineLength)
    ctx.stroke()
    
    // 鱼钩
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(this.hookX, this.hookY + this.lineLength, 12, 0, Math.PI, false)
    ctx.stroke()
    
    // 钓到的鱼
    if (this.caughtFish) {
      this.drawFish(this.caughtFish, this.hookX, this.hookY + this.lineLength + 30)
    }
    
    // 所有的鱼
    this.fishes.forEach(fish => {
      if (!fish.caught) {
        this.drawFish(fish, fish.x, fish.y)
      }
    })
  }
  
  // 绘制鱼
  drawFish(fish, x, y) {
    const ctx = this.ctx
    const type = fish.type
    const dir = fish.direction
    
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(dir, 1)
    
    // 身体
    ctx.fillStyle = type.color
    ctx.beginPath()
    ctx.ellipse(0, 0, type.size, type.size / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 尾巴
    ctx.beginPath()
    ctx.moveTo(-type.size + 5, 0)
    ctx.lineTo(-type.size - 12, -8)
    ctx.lineTo(-type.size - 12, 8)
    ctx.closePath()
    ctx.fill()
    
    // 眼睛
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(type.size / 2, -5, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(type.size / 2 + 2, -5, 2, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }
  
  // 渲染结束
  renderGameOver() {
    const ctx = this.ctx
    
    ctx.fillStyle = 'rgba(0,0,0,0.85)'
    ctx.fillRect(0, 0, this.width, this.height)
    
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 36px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('时间到!', this.width / 2, this.height / 3)
    
    ctx.fillStyle = '#fff'
    ctx.font = '24px Arial'
    ctx.fillText('总分:' + this.score, this.width / 2, this.height / 2)
    ctx.fillText('钓到:' + this.caught + '条', this.width / 2, this.height / 2 + 40)
    
    ctx.fillStyle = '#4ECDC4'
    ctx.fillRect(this.width / 2 - 70, this.height * 0.65, 140, 45)
    ctx.fillStyle = '#fff'
    ctx.font = '18px Arial'
    ctx.fillText('再玩一次', this.width / 2, this.height * 0.65 + 28)
  }
  
  // 暂停
  pause() {
    if (this.state === 'playing') this.state = 'paused'
  }
  
  // 恢复
  resume() {
    if (this.state === 'paused') this.state = 'playing'
  }
  
  // 广告
  useAdReward(type) {
    if (type === 'extraTime') this.time += 30
  }
}
