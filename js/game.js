/**
 * 欢乐钓鱼 - 微信小游戏
 * 触摸修复版
 */

export default class Game {
  constructor(adManager, canvas, ctx) {
    this.adManager = adManager
    this.canvas = canvas
    this.ctx = ctx
    
    this.systemInfo = wx.getSystemInfoSync()
    this.width = this.systemInfo.windowWidth
    this.height = this.systemInfo.windowHeight
    
    console.log('[钓鱼] 尺寸:', this.width, 'x', this.height)
    
    // 游戏状态
    this.state = 'menu'
    this.time = 60
    this.lastTime = Date.now()
    this.score = 0
    this.caught = 0
    
    // 鱼钩
    this.hookX = this.width / 2
    this.hookY = 80
    this.hookSpeed = 6
    
    // 鱼线
    this.lineY = 80
    this.lineSpeed = 6
    this.lineState = 'idle'
    
    // 鱼
    this.fishTypes = [
      { name: '小鱼', color: '#4ECDC4', score: 10, speed: 2, size: 20 },
      { name: '中鱼', color: '#45B7D1', score: 20, speed: 3, size: 30 },
      { name: '大鱼', color: '#FF6B6B', score: 30, speed: 1.5, size: 40 },
      { name: '金鱼', color: '#FFD700', score: 50, speed: 4, size: 25 }
    ]
    
    this.fishes = []
    this.caughtFish = null
    this.spawnInterval = 1500
    this.lastSpawn = Date.now()
    
    // 触摸
    this.isTouching = false
  }
  
  // 生成鱼
  spawnFish() {
    const type = this.fishTypes[Math.floor(Math.random() * this.fishTypes.length)]
    const fromLeft = Math.random() > 0.5
    
    this.fishes.push({
      x: fromLeft ? -50 : this.width + 50,
      y: 150 + Math.random() * (this.height - 250),
      type: type,
      direction: fromLeft ? 1 : -1,
      caught: false
    })
    
    console.log('[鱼] 生成:', type.name, '位置:', this.fishes[this.fishes.length-1].x, this.fishes[this.fishes.length-1].y)
  }
  
  // 更新鱼
  updateFishes() {
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const fish = this.fishes[i]
      if (!fish.caught) {
        fish.x += fish.type.speed * fish.direction
      }
      if ((fish.direction === 1 && fish.x > this.width + 100) ||
          (fish.direction === -1 && fish.x < -100)) {
        this.fishes.splice(i, 1)
      }
    }
  }
  
  // 更新鱼钩
  updateHook() {
    if (this.lineState === 'dropping') {
      this.lineY += this.lineSpeed
      if (this.lineY >= this.height - 50) {
        this.lineState = 'pulling'
        console.log('[鱼钩] 到达底部，开始收回')
      }
      this.checkCatch()
    } else if (this.lineState === 'pulling') {
      this.lineY -= this.lineSpeed * 1.5
      if (this.lineY <= this.hookY) {
        this.lineY = this.hookY
        this.lineState = 'idle'
        console.log('[鱼钩] 收回完成')
        if (this.caughtFish) {
          this.score += this.caughtFish.type.score
          this.caught++
          console.log('[得分]', this.caughtFish.type.score, '总分:', this.score, '钓到:', this.caught)
          this.caughtFish = null
        }
      }
    }
  }
  
  // 检查钓到鱼
  checkCatch() {
    for (let i = 0; i < this.fishes.length; i++) {
      const fish = this.fishes[i]
      if (fish.caught) continue
      
      const dx = Math.abs(fish.x - this.hookX)
      const dy = Math.abs(fish.y - this.lineY)
      
      if (dx < fish.type.size + 15 && dy < fish.type.size + 15) {
        fish.caught = true
        this.caughtFish = fish
        console.log('[钓鱼] 钓到:', fish.type.name)
        break
      }
    }
  }
  
  // 绑定事件
  bindEvents() {
    console.log('[事件] 开始绑定')
    
    // 触摸开始
    wx.onTouchStart((res) => {
      console.log('[TouchStart] touches:', res.touches.length)
      
      if (this.state === 'menu') {
        console.log('[菜单] -> 开始游戏')
        this.startGame()
        return
      }
      
      if (this.state === 'gameover') {
        console.log('[结束] -> 重新开始')
        this.startGame()
        return
      }
      
      if (this.state !== 'playing') {
        console.log('[状态] 不是 playing:', this.state)
        return
      }
      
      this.isTouching = true
      
      // 鱼钩空闲时才能放下
      if (this.lineState === 'idle') {
        console.log('[钓鱼] -> 放下鱼钩! 位置:', this.hookX)
        this.lineState = 'dropping'
      } else {
        console.log('[钓鱼] 鱼钩正在:', this.lineState)
      }
    })
    
    // 触摸移动
    wx.onTouchMove((res) => {
      if (!this.isTouching || this.state !== 'playing') return
      
      const touch = res.touches[0]
      const newX = touch.clientX
      
      // 直接设置鱼钩位置
      this.hookX = newX
      
      // 限制范围
      if (this.hookX < 20) this.hookX = 20
      if (this.hookX > this.width - 20) this.hookX = this.width - 20
    })
    
    // 触摸结束
    wx.onTouchEnd((res) => {
      console.log('[TouchEnd]')
      this.isTouching = false
    })
    
    console.log('[事件] 绑定完成')
  }
  
  // 更新时间
  updateTime() {
    const now = Date.now()
    if (now - this.lastTime >= 1000) {
      this.time--
      this.lastTime = now
      console.log('[时间] 剩余:', this.time)
      if (this.time <= 0) {
        this.state = 'gameover'
        console.log('[游戏] 结束!')
      }
    }
  }
  
  // 开始
  start() {
    console.log('[游戏] 启动')
    this.state = 'menu'
    this.bindEvents()
    this.render()
  }
  
  // 开始新游戏
  startGame() {
    console.log('[游戏] === 新游戏开始 ===')
    this.state = 'playing'
    this.time = 60
    this.score = 0
    this.caught = 0
    this.fishes = []
    this.caughtFish = null
    this.lineY = this.hookY
    this.lineState = 'idle'
    this.hookX = this.width / 2
    this.lastTime = Date.now()
    this.lastSpawn = Date.now()
    console.log('[游戏] 状态:', this.state, '时间:', this.time)
  }
  
  // 游戏循环
  gameLoop() {
    if (this.state === 'playing') {
      this.updateTime()
      this.updateHook()
      this.updateFishes()
      
      const now = Date.now()
      if (now - this.lastSpawn > this.spawnInterval) {
        this.spawnFish()
        this.lastSpawn = now
      }
      
      this.render()
      requestAnimationFrame(() => this.gameLoop())
    }
  }
  
  // 渲染
  render() {
    if (!this.ctx) {
      console.warn('[渲染] ctx 为空')
      return
    }
    
    this.ctx.fillStyle = '#87CEEB'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
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
    ctx.fillText('滑动移动鱼钩', this.width / 2, this.height / 3)
    ctx.fillText('点击放下鱼钩', this.width / 2, this.height / 3 + 35)
    
    // 开始按钮
    ctx.fillStyle = '#4ECDC4'
    ctx.fillRect(this.width / 2 - 80, this.height / 2, 160, 55)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 22px Arial'
    ctx.fillText('开始钓鱼', this.width / 2, this.height / 2 + 35)
  }
  
  // 渲染游戏
  renderGame() {
    const ctx = this.ctx
    
    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(1, '#1E90FF')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)
    
    // 顶部信息
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
    
    // 鱼线
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(this.hookX, this.hookY)
    ctx.lineTo(this.hookX, this.lineY)
    ctx.stroke()
    
    // 鱼钩
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(this.hookX, this.lineY, 12, 0, Math.PI, false)
    ctx.stroke()
    
    // 钓到的鱼
    if (this.caughtFish) {
      this.drawFish(this.caughtFish, this.hookX, this.lineY + 25)
    }
    
    // 所有的鱼
    this.fishes.forEach(fish => {
      if (!fish.caught) {
        this.drawFish(fish, fish.x, fish.y)
      }
    })
    
    // 状态提示
    if (this.lineState === 'idle') {
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('点击放下鱼钩', this.width / 2, this.height - 20)
    }
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
