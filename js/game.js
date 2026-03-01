/**
 * 欢乐钓鱼 - 微信小游戏
 * 控制鱼钩左右移动，点击放下鱼钩钓鱼
 */

export default class Game {
  constructor(adManager, canvas, ctx) {
    this.adManager = adManager
    this.canvas = canvas
    this.ctx = ctx
    
    // 获取系统信息
    this.systemInfo = wx.getSystemInfoSync()
    this.width = this.systemInfo.windowWidth
    this.height = this.systemInfo.windowHeight
    
    console.log('[钓鱼] 初始化:', this.width, 'x', this.height)
    
    // 游戏状态
    this.state = 'menu' // menu, playing, gameover
    this.time = 60 // 游戏时间（秒）
    this.lastTime = Date.now()
    
    // 分数
    this.score = 0
    this.caught = 0 // 钓到的鱼数量
    
    // 鱼钩配置
    this.hookX = this.width / 2
    this.hookY = 80
    this.hookWidth = 40
    this.hookSpeed = 8
    this.hookDirection = 0 // -1 左，0 停，1 右
    
    // 鱼线
    this.lineY = 80
    this.lineSpeed = 5
    this.lineState = 'idle' // idle, dropping, pulling
    
    // 鱼的配置
    this.fishTypes = [
      { name: '小鱼', color: '#4ECDC4', score: 10, speed: 2, size: 20 },
      { name: '中鱼', color: '#45B7D1', score: 20, speed: 3, size: 30 },
      { name: '大鱼', color: '#FF6B6B', score: 30, speed: 1.5, size: 40 },
      { name: '金魚', color: '#FFD700', score: 50, speed: 4, size: 25 },
      { name: '鲨鱼', color: '#6c5ce7', score: 100, speed: 2.5, size: 50 }
    ]
    
    this.fishes = []
    this.caughtFish = null // 当前钓到的鱼
    
    // 生成鱼的间隔
    this.spawnInterval = 1500
    this.lastSpawn = 0
    
    // 触摸
    this.touchStartX = 0
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
    
    console.log('[鱼] 生成:', type.name)
  }
  
  // 更新鱼的位置
  updateFishes() {
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const fish = this.fishes[i]
      
      if (!fish.caught) {
        fish.x += fish.type.speed * fish.direction
      }
      
      // 移除超出屏幕的鱼
      if ((fish.direction === 1 && fish.x > this.width + 100) ||
          (fish.direction === -1 && fish.x < -100)) {
        this.fishes.splice(i, 1)
      }
    }
  }
  
  // 更新鱼钩
  updateHook() {
    // 左右移动
    if (this.hookDirection === -1) {
      this.hookX -= this.hookSpeed
      if (this.hookX < 20) this.hookX = 20
    } else if (this.hookDirection === 1) {
      this.hookX += this.hookSpeed
      if (this.hookX > this.width - 20) this.hookX = this.width - 20
    }
    
    // 鱼线状态
    if (this.lineState === 'dropping') {
      this.lineY += this.lineSpeed
      if (this.lineY >= this.height - 50) {
        this.lineState = 'pulling'
      }
      this.checkCatch()
    } else if (this.lineState === 'pulling') {
      this.lineY -= this.lineSpeed * 1.5
      if (this.lineY <= this.hookY) {
        this.lineY = this.hookY
        this.lineState = 'idle'
        
        if (this.caughtFish) {
          this.score += this.caughtFish.type.score
          this.caught++
          console.log('[钓鱼] 得分:', this.caughtFish.type.score, '总分:', this.score)
          this.caughtFish = null
        }
      }
    }
  }
  
  // 检查是否钓到鱼
  checkCatch() {
    for (let i = 0; i < this.fishes.length; i++) {
      const fish = this.fishes[i]
      if (fish.caught) continue
      
      const dx = Math.abs(fish.x - this.hookX)
      const dy = Math.abs(fish.y - this.lineY)
      
      if (dx < fish.type.size && dy < fish.type.size + 10) {
        // 钓到了！
        fish.caught = true
        this.caughtFish = fish
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
      const touch = res.touches[0]
      this.touchStartX = touch.clientX
      
      if (this.state === 'menu') {
        this.startGame()
        return
      }
      
      if (this.state === 'gameover') {
        this.startGame()
        return
      }
      
      if (this.state !== 'playing') return
      
      // 放下鱼钩
      if (this.lineState === 'idle') {
        this.lineState = 'dropping'
        console.log('[钓鱼] 放下鱼钩')
      }
    })
    
    // 触摸移动
    wx.onTouchMove((res) => {
      if (this.state !== 'playing') return
      
      const touch = res.touches[0]
      const deltaX = touch.clientX - this.touchStartX
      
      if (deltaX > 10) {
        this.hookDirection = 1
      } else if (deltaX < -10) {
        this.hookDirection = -1
      } else {
        this.hookDirection = 0
      }
    })
    
    // 触摸结束
    wx.onTouchEnd(() => {
      if (this.state !== 'playing') return
      this.hookDirection = 0
    })
    
    console.log('[事件] 完成')
  }
  
  // 更新游戏时间
  updateTime() {
    const now = Date.now()
    const delta = (now - this.lastTime) / 1000
    
    if (delta >= 1) {
      this.time--
      this.lastTime = now
      
      if (this.time <= 0) {
        this.state = 'gameover'
        console.log('[游戏] 结束')
      }
    }
  }
  
  // 开始游戏
  start() {
    console.log('[游戏] 启动')
    this.state = 'menu'
    this.bindEvents()
    this.render()
  }
  
  // 开始新游戏
  startGame() {
    console.log('[游戏] 开始')
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
  }
  
  // 游戏循环
  gameLoop() {
    if (this.state === 'playing') {
      this.updateTime()
      this.updateHook()
      this.updateFishes()
      
      // 生成鱼
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
    if (!this.ctx) return
    
    // 清空
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
    
    // 标题
    ctx.fillStyle = '#FF6B6B'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('欢乐钓鱼', this.width / 2, this.height / 4)
    
    // 说明
    ctx.fillStyle = '#fff'
    ctx.font = '20px Arial'
    ctx.fillText('滑动左右移动鱼钩', this.width / 2, this.height / 3)
    ctx.fillText('点击放下鱼钩钓鱼', this.width / 2, this.height / 3 + 40)
    
    // 鱼的图例
    const startY = this.height / 2
    this.fishTypes.forEach((type, i) => {
      const y = startY + i * 50
      
      // 鱼
      ctx.fillStyle = type.color
      ctx.beginPath()
      ctx.ellipse(this.width / 2, y, type.size, type.size / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // 分数
      ctx.fillStyle = '#333'
      ctx.font = '16px Arial'
      ctx.fillText(type.name + ' +' + type.score + '分', this.width / 2 + 50, y + 6)
    })
    
    // 开始按钮
    ctx.fillStyle = '#4ECDC4'
    ctx.fillRect(this.width / 2 - 80, this.height * 0.8, 160, 55)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 24px Arial'
    ctx.fillText('开始钓鱼', this.width / 2, this.height * 0.8 + 35)
  }
  
  // 渲染游戏
  renderGame() {
    const ctx = this.ctx
    
    // 天空
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(0.3, '#E0F6FF')
    gradient.addColorStop(1, '#1E90FF')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)
    
    // 顶部信息栏
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, this.width, 50)
    
    ctx.fillStyle = '#fff'
    ctx.font = '18px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('时间：' + this.time + '秒', 15, 32)
    ctx.textAlign = 'center'
    ctx.fillText('分数：' + this.score, this.width / 2, 32)
    ctx.textAlign = 'right'
    ctx.fillText('钓到：' + this.caught + '条', this.width - 15, 32)
    
    // 绘制鱼钩支架
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(this.hookX - 5, 0, 10, this.hookY)
    
    // 绘制鱼线
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(this.hookX, this.hookY)
    ctx.lineTo(this.hookX, this.lineY)
    ctx.stroke()
    
    // 绘制鱼钩
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(this.hookX, this.lineY, 10, 0, Math.PI, false)
    ctx.stroke()
    
    // 绘制钓到的鱼
    if (this.caughtFish) {
      this.drawFish(this.caughtFish, this.hookX, this.lineY + 20)
    }
    
    // 绘制鱼
    this.fishes.forEach(fish => {
      if (!fish.caught) {
        this.drawFish(fish, fish.x, fish.y)
      }
    })
    
    // 底部提示
    if (this.lineState === 'idle') {
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('点击屏幕放下鱼钩', this.width / 2, this.height - 20)
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
    
    // 鱼身
    ctx.fillStyle = type.color
    ctx.beginPath()
    ctx.ellipse(0, 0, type.size, type.size / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 鱼尾
    ctx.beginPath()
    ctx.moveTo(-type.size + 5, 0)
    ctx.lineTo(-type.size - 10, -type.size / 3)
    ctx.lineTo(-type.size - 10, type.size / 3)
    ctx.closePath()
    ctx.fill()
    
    // 鱼鳍
    ctx.beginPath()
    ctx.moveTo(0, -type.size / 2)
    ctx.lineTo(-10, -type.size / 2 - 8)
    ctx.lineTo(10, -type.size / 2)
    ctx.closePath()
    ctx.fill()
    
    // 眼睛
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(type.size / 2, -type.size / 6, type.size / 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(type.size / 2 + 2, -type.size / 6, type.size / 10, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }
  
  // 渲染游戏结束
  renderGameOver() {
    const ctx = this.ctx
    
    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.fillRect(0, 0, this.width, this.height)
    
    // 标题
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 40px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('时间到!', this.width / 2, this.height / 4)
    
    // 分数
    ctx.fillStyle = '#fff'
    ctx.font = '28px Arial'
    ctx.fillText('总分：' + this.score, this.width / 2, this.height / 2)
    
    ctx.font = '22px Arial'
    ctx.fillText('钓到：' + this.caught + '条鱼', this.width / 2, this.height / 2 + 50)
    
    // 评级
    let rating = '菜鸟'
    if (this.score >= 100) rating = '渔夫'
    if (this.score >= 300) rating = '高手'
    if (this.score >= 500) rating = '大师'
    if (this.score >= 800) rating = '传奇'
    
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 24px Arial'
    ctx.fillText('评级：' + rating, this.width / 2, this.height / 2 + 100)
    
    // 重新开始
    ctx.fillStyle = '#4ECDC4'
    ctx.fillRect(this.width / 2 - 80, this.height * 0.7, 160, 50)
    ctx.fillStyle = '#fff'
    ctx.font = '20px Arial'
    ctx.fillText('再钓一次', this.width / 2, this.height * 0.7 + 30)
  }
  
  // 暂停
  pause() {
    if (this.state === 'playing') {
      this.state = 'paused'
    }
  }
  
  // 恢复
  resume() {
    if (this.state === 'paused') {
      this.state = 'playing'
    }
  }
  
  // 广告奖励
  useAdReward(type) {
    if (type === 'extraTime') {
      this.time += 30
    }
  }
}
