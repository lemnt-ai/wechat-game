/**
 * 欢乐钓鱼 - 微信小游戏
 * 海底世界风格 - 渔夫在船上钓鱼
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
    this.state = 'menu'
    this.time = 180
    this.lastTime = Date.now()
    this.score = 0
    this.caught = 0
    
    // 船和渔夫在水面
    this.boatX = this.width / 2
    this.boatY = 175  // 船在水面位置 (150-200px 之间)
    this.hookX = this.width / 2
    this.hookY = this.boatY
    this.hookTargetX = this.width / 2
    
    // 鱼线
    this.lineLength = 30
    this.targetLineLength = 30
    this.maxLineLength = 600
    this.lineSpeed = 18
    this.lineState = 'idle'
    this.castPower = 0
    this.isCasting = false
    this.castTimer = null
    
    // 鱼配置
    this.fishTypes = [
      { name: '小鱼', color: '#FF6B6B', score: 10, speed: 2, size: 25, rarity: 'common' },
      { name: '中鱼', color: '#4ECDC4', score: 20, speed: 3, size: 35, rarity: 'common' },
      { name: '大鱼', color: '#45B7D1', score: 30, speed: 1.5, size: 45, rarity: 'uncommon' },
      { name: '金鱼', color: '#FFD700', score: 50, speed: 4, size: 30, rarity: 'rare' },
      { name: '鲨鱼', color: '#6c5ce7', score: 100, speed: 2, size: 55, rarity: 'legendary' }
    ]
    
    this.fishes = []
    this.caughtFish = null
    this.spawnTimer = 0
    this.spawnInterval = 50
    
    // 气泡
    this.bubbles = []
    
    // 广告
    this.canShowAd = true
    this.adCooldown = 0
    
    // 设置广告回调
    if (this.adManager) {
      this.adManager.setCallback('onReward', (type) => {
        if (type === 'extraTime') {
          this.addTime(30)
        }
      })
    }
  }
  
  // 初始化
  init() {
    console.log('[游戏] 初始化')
    this.bindEvents()
    this.render()
  }
  
  // 生成鱼
  spawnFish() {
    const rand = Math.random()
    let typeIndex
    if (rand < 0.4) typeIndex = 0
    else if (rand < 0.7) typeIndex = 1
    else if (rand < 0.85) typeIndex = 2
    else if (rand < 0.95) typeIndex = 3
    else typeIndex = 4
    
    const type = this.fishTypes[typeIndex]
    const fromLeft = Math.random() > 0.5
    
    const fish = {
      x: fromLeft ? -50 : this.width + 50,
      y: 250 + Math.random() * (this.height - 400),  // 鱼在 250px 到海底之间
      type: type,
      direction: fromLeft ? 1 : -1,
      caught: false,
      hooked: false
    }
    
    this.fishes.push(fish)
  }
  
  // 生成气泡
  spawnBubble() {
    this.bubbles.push({
      x: Math.random() * this.width,
      y: this.height,
      size: 5 + Math.random() * 10,
      speed: 1 + Math.random()
    })
  }
  
  // 更新
  update() {
    if (this.state !== 'playing') return
    
    // 时间
    const now = Date.now()
    if (now - this.lastTime >= 1000) {
      this.time--
      this.lastTime = now
      
      if (this.adCooldown > 0) {
        this.adCooldown--
        if (this.adCooldown <= 0) this.canShowAd = true
      }
      
      if (this.time <= 0) {
        this.time = 0
        this.state = 'gameover'
        return
      }
    }
    
    // 鱼钩移动
    if (Math.abs(this.hookX - this.hookTargetX) > 1) {
      this.hookX += (this.hookTargetX > this.hookX) ? 8 : -8
    }
    
    // 鱼线状态
    if (this.lineState === 'moving_out') {
      if (this.lineLength < this.targetLineLength) {
        this.lineLength += this.lineSpeed
        this.checkCollision()
      } else {
        this.lineState = 'moving_in'
      }
    } else if (this.lineState === 'moving_in') {
      this.lineLength -= this.lineSpeed * 2
      if (this.lineLength <= 30) {
        this.lineLength = 30
        this.lineState = 'idle'
        if (this.caughtFish) {
          this.score += this.caughtFish.type.score
          this.caught++
          this.caughtFish = null
        }
      }
    }
    
    // 更新鱼
    this.updateFishes()
    
    // 更新气泡
    this.updateBubbles()
    
    // 生成鱼
    this.spawnTimer++
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnFish()
      this.spawnTimer = 0
    }
    
    // 生成气泡
    if (Math.random() < 0.1) {
      this.spawnBubble()
    }
  }
  
  // 更新鱼
  updateFishes() {
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const fish = this.fishes[i]
      
      if (fish.caught) {
        const lineStartY = this.boatY + 10
        fish.x = this.hookX
        fish.y = lineStartY + this.lineLength + 30
        continue
      }
      
      fish.x += fish.type.speed * fish.direction
      
      if ((fish.direction === 1 && fish.x > this.width + 100) ||
          (fish.direction === -1 && fish.x < -100)) {
        this.fishes.splice(i, 1)
      }
    }
  }
  
  // 更新气泡
  updateBubbles() {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]
      b.y -= b.speed
      if (b.y < -20) {
        this.bubbles.splice(i, 1)
      }
    }
  }
  
  // 检查碰撞
  checkCollision() {
    const lineStartY = this.boatY + 10
    const hookY = lineStartY + this.lineLength
    
    for (let i = 0; i < this.fishes.length; i++) {
      const fish = this.fishes[i]
      if (fish.caught || fish.hooked) continue
      
      const dx = Math.abs(fish.x - this.hookX)
      const dy = Math.abs(fish.y - hookY)
      
      if (dx < fish.type.size && dy < fish.type.size + 10) {
        fish.hooked = true
        fish.caught = true
        this.caughtFish = fish
        this.lineState = 'moving_in'
        break
      }
    }
  }
  
  // 绑定事件
  bindEvents() {
    console.log('[事件] 绑定')
    
    wx.onTouchStart((res) => {
      const touch = res.touches[0]
      
      if (this.state === 'menu') {
        this.startGame()
        return
      }
      
      if (this.state === 'gameover') {
        this.startGame()
        return
      }
      
      if (this.checkAdButton(touch.clientX, touch.clientY)) {
        this.showTimeAd()
        return
      }
      
      // 长按蓄力
      if (this.lineState === 'idle') {
        this.isCasting = true
        this.castPower = 0
        
        if (this.castTimer) clearInterval(this.castTimer)
        this.castTimer = setInterval(() => {
          this.castPower = Math.min(this.castPower + 1.5, 100)
        }, 50)
      }
    })
    
    wx.onTouchMove((res) => {
      const touch = res.touches[0]
      this.hookTargetX = touch.clientX
    })
    
    wx.onTouchEnd(() => {
      if (this.castTimer) {
        clearInterval(this.castTimer)
        this.castTimer = null
      }
      
      if (this.isCasting && this.lineState === 'idle') {
        const power = Math.max(this.castPower, 10)
        this.targetLineLength = 30 + (power / 100) * (this.maxLineLength - 30)
        this.lineState = 'moving_out'
        this.isCasting = false
      }
    })
    
    console.log('[事件] 完成')
  }
  
  // 检查广告按钮
  checkAdButton(x, y) {
    if (this.state !== 'playing') return false
    if (!this.canShowAd) return false
    return (x >= this.width - 60 && x <= this.width - 10 && y >= 10 && y <= 60)
  }
  
  // 显示时间广告
  showTimeAd() {
    if (!this.canShowAd) return
    if (this.adManager && this.adManager.showRewardedAd) {
      this.adManager.showRewardedAd('extraTime')
      this.canShowAd = false
      this.adCooldown = 60
    }
  }
  
  // 添加时间
  addTime(seconds) {
    this.time += seconds
  }
  
  // 开始
  start() {
    console.log('[游戏] 启动')
    this.state = 'menu'
    this.init()
  }
  
  // 新游戏
  startGame() {
    console.log('[游戏] === 新游戏 ===')
    this.state = 'playing'
    this.time = 180
    this.score = 0
    this.caught = 0
    this.fishes = []
    this.caughtFish = null
    this.lineLength = 30
    this.targetLineLength = 30
    this.lineState = 'idle'
    this.hookX = this.width / 2
    this.hookTargetX = this.width / 2
    this.spawnTimer = 0
    this.lastTime = Date.now()
    this.canShowAd = true
    this.adCooldown = 0
    this.bubbles = []
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
    this.renderBackground()
    
    if (this.state === 'menu') {
      this.renderMenu()
    } else if (this.state === 'playing') {
      this.renderGame()
    } else if (this.state === 'gameover') {
      this.renderGameOver()
    }
  }
  
  // 渲染背景（海底世界）
  renderBackground() {
    const ctx = this.ctx
    const waterSurfaceY = 200  // 水面位置
    const seaBottomY = this.height - 100  // 海底位置
    
    // 1. 天空区域 (0 - 150px)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, 150)
    skyGradient.addColorStop(0, '#87CEEB')
    skyGradient.addColorStop(1, '#E0F6FF')
    ctx.fillStyle = skyGradient
    ctx.fillRect(0, 0, this.width, 150)
    
    // 云朵
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    this.renderCloud(ctx, 80, 40, 35)
    this.renderCloud(ctx, 130, 50, 40)
    this.renderCloud(ctx, this.width - 150, 60, 45)
    this.renderCloud(ctx, this.width - 80, 50, 35)
    
    // 2. 水面区域 (150 - 200px)
    const surfaceGradient = ctx.createLinearGradient(0, 150, 0, 200)
    surfaceGradient.addColorStop(0, '#00BFFF')
    surfaceGradient.addColorStop(1, '#1E90FF')
    ctx.fillStyle = surfaceGradient
    ctx.fillRect(0, 150, this.width, 50)
    
    // 水波纹
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 2
    for (let i = 0; i < 10; i++) {
      const x = i * 80
      ctx.beginPath()
      ctx.moveTo(x, 175)
      ctx.quadraticCurveTo(x + 20, 170, x + 40, 175)
      ctx.stroke()
    }
    
    // 3. 水下区域 (200px - 海底)
    const waterGradient = ctx.createLinearGradient(0, 200, 0, seaBottomY)
    waterGradient.addColorStop(0, '#1E90FF')
    waterGradient.addColorStop(0.5, '#006994')
    waterGradient.addColorStop(1, '#003366')
    ctx.fillStyle = waterGradient
    ctx.fillRect(0, 200, this.width, seaBottomY - 200)
    
    // 光线效果
    ctx.save()
    ctx.globalAlpha = 0.15
    ctx.fillStyle = '#fff'
    for (let i = 0; i < 6; i++) {
      const x = 100 + i * 130
      ctx.beginPath()
      ctx.moveTo(x - 30, 200)
      ctx.lineTo(x - 60, seaBottomY)
      ctx.lineTo(x + 30, seaBottomY)
      ctx.lineTo(x + 10, 200)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
    
    // 4. 海底沙子 (seaBottomY - height)
    const sandGradient = ctx.createLinearGradient(0, seaBottomY, 0, this.height)
    sandGradient.addColorStop(0, '#F4D03F')
    sandGradient.addColorStop(0.5, '#D4AC0D')
    sandGradient.addColorStop(1, '#9A7D0A')
    ctx.fillStyle = sandGradient
    ctx.fillRect(0, seaBottomY, this.width, 100)
    
    // 海底装饰
    this.renderSeaDecorations(ctx, seaBottomY)
    
    // 气泡
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    this.bubbles.forEach(b => {
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  
  // 渲染云朵
  renderCloud(ctx, x, y, size) {
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.arc(x + size * 0.8, y - 5, size * 0.9, 0, Math.PI * 2)
    ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
  
  // 渲染海底装饰
  renderSeaDecorations(ctx, seaBottomY) {
    // 海草
    this.renderSeaweed(ctx, 60, seaBottomY, 70)
    this.renderSeaweed(ctx, 120, seaBottomY, 90)
    this.renderSeaweed(ctx, 180, seaBottomY, 60)
    this.renderSeaweed(ctx, this.width - 150, seaBottomY, 80)
    this.renderSeaweed(ctx, this.width - 90, seaBottomY, 70)
    this.renderSeaweed(ctx, this.width - 40, seaBottomY, 90)
    
    // 海星
    this.renderStarfish(ctx, 200, seaBottomY + 30, '#FF6B6B')
    this.renderStarfish(ctx, this.width - 200, seaBottomY + 50, '#FFD700')
    
    // 贝壳
    this.renderShell(ctx, 300, seaBottomY + 40, '#FFB6C1')
    this.renderShell(ctx, this.width - 300, seaBottomY + 20, '#DDA0DD')
  }
  
  // 渲染海草
  renderSeaweed(ctx, x, y, height) {
    const sway = Math.sin(Date.now() / 500 + x) * 10
    ctx.fillStyle = '#228B22'
    ctx.beginPath()
    ctx.moveTo(x - 8, y)
    ctx.quadraticCurveTo(x + sway, y - height / 2, x - 4, y - height)
    ctx.quadraticCurveTo(x + 4, y - height / 2, x + 8, y)
    ctx.closePath()
    ctx.fill()
  }
  
  // 渲染海星
  renderStarfish(ctx, x, y, color) {
    ctx.fillStyle = color
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.PI / 5)
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(10, -5)
      ctx.lineTo(15, 0)
      ctx.lineTo(10, 5)
      ctx.closePath()
      ctx.fill()
      ctx.rotate(Math.PI * 2 / 5)
    }
    ctx.restore()
  }
  
  // 渲染贝壳
  renderShell(ctx, x, y, color) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(x, y, 15, 10, 0, Math.PI, 0)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  
  // 渲染海草
  renderSeaweed(ctx, x, y, height) {
    ctx.fillStyle = '#228B22'
    const sway = Math.sin(Date.now() / 500 + x) * 10
    ctx.beginPath()
    ctx.moveTo(x - 10, y)
    ctx.quadraticCurveTo(x + sway, y - height / 2, x - 5, y - height)
    ctx.quadraticCurveTo(x + 5, y - height / 2, x + 10, y)
    ctx.closePath()
    ctx.fill()
  }
  
  // 渲染菜单
  renderMenu() {
    const ctx = this.ctx
    
    ctx.fillStyle = '#FF6B6B'
    ctx.font = 'bold 42px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('欢乐钓鱼', this.width / 2, this.height / 3)
    
    ctx.fillStyle = '#fff'
    ctx.font = '18px Arial'
    ctx.fillText('长按蓄力，松手抛竿', this.width / 2, this.height / 2)
    
    ctx.fillStyle = '#4ECDC4'
    ctx.fillRect(this.width / 2 - 80, this.height * 0.6, 160, 55)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 22px Arial'
    ctx.fillText('开始钓鱼', this.width / 2, this.height * 0.6 + 35)
  }
  
  // 渲染游戏
  renderGame() {
    const ctx = this.ctx
    
    // 顶部信息栏
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(0, 0, this.width, 50)
    
    // 时间进度条
    const barWidth = this.width * 0.5
    ctx.fillStyle = '#fff'
    ctx.fillRect((this.width - barWidth) / 2, 15, barWidth, 10)
    ctx.fillStyle = this.time < 30 ? '#ff0000' : '#00ff00'
    ctx.fillRect((this.width - barWidth) / 2, 15, barWidth * (this.time / 180), 10)
    
    // 分数
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('分数:' + this.score + ' 钓到:' + this.caught, this.width / 2, 45)
    
    // 广告按钮
    this.renderAdButton()
    
    // 船和渔夫
    this.renderBoatAndFisherman()
    
    // 鱼线
    this.renderFishingLine()
    
    // 鱼
    this.fishes.forEach(fish => {
      if (!fish.caught) {
        this.drawFish(fish, fish.x, fish.y)
      }
    })
    
    // 钓到的鱼
    if (this.caughtFish) {
      this.drawFish(this.caughtFish, this.hookX, this.hookY - this.lineLength + 30)
    }
  }
  
  // 渲染船和渔夫
  renderBoatAndFisherman() {
    const ctx = this.ctx
    const boatX = this.boatX
    const boatY = this.boatY
    
    // 船身（红色）
    ctx.fillStyle = '#DC143C'
    ctx.beginPath()
    ctx.ellipse(boatX, boatY, 80, 25, 0, Math.PI, 0)
    ctx.fill()
    
    // 船舷
    ctx.fillStyle = '#B01030'
    ctx.fillRect(boatX - 80, boatY - 10, 160, 10)
    
    // 船编号
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 20px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('9', boatX, boatY + 5)
    
    // 渔夫
    const manX = boatX + 20
    const manY = boatY - 10
    
    // 身体
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(manX, manY - 15, 15, 0, Math.PI * 2)
    ctx.fill()
    
    // 帽子（斗笠）
    ctx.fillStyle = '#8B4513'
    ctx.beginPath()
    ctx.moveTo(manX - 25, manY - 25)
    ctx.lineTo(manX, manY - 45)
    ctx.lineTo(manX + 25, manY - 25)
    ctx.closePath()
    ctx.fill()
    
    // 鱼竿
    ctx.strokeStyle = '#8B4513'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(manX + 15, manY - 10)
    ctx.lineTo(manX + 40, manY - 60)
    ctx.stroke()
  }
  
  // 渲染鱼线
  renderFishingLine() {
    const ctx = this.ctx
    const lineStartX = this.boatX + 30
    const lineStartY = this.boatY + 10  // 从船边伸出
    
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(lineStartX, lineStartY)
    
    if (this.lineState === 'moving_out') {
      // 鱼钩向下沉
      ctx.lineTo(this.hookX, lineStartY + this.lineLength)
    } else if (this.lineState === 'moving_in') {
      // 收回时摆动
      ctx.quadraticCurveTo(
        this.hookX + 20, lineStartY + this.lineLength / 2,
        this.hookX, lineStartY + this.lineLength
      )
    } else {
      // 空闲时自然下垂
      ctx.quadraticCurveTo(
        lineStartX + 10, lineStartY + 30,
        this.hookX, lineStartY + 50
      )
    }
    ctx.stroke()
    
    // 鱼钩
    const hookY = lineStartY + this.lineLength
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(this.hookX, hookY, 7, 0, Math.PI, true)
    ctx.stroke()
    
    // 鱼饵
    ctx.fillStyle = '#DC143C'
    ctx.beginPath()
    ctx.ellipse(this.hookX, hookY + 10, 6, 3, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  
  // 渲染广告按钮
  renderAdButton() {
    const ctx = this.ctx
    
    if (!this.canShowAd) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.beginPath()
      ctx.arc(this.width - 35, 35, 25, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#999'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(this.adCooldown + 's', this.width - 35, 40)
    } else {
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.arc(this.width - 35, 35, 25, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#000'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('+30s', this.width - 35, 40)
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
  
  pause() {
    if (this.state === 'playing') this.state = 'paused'
  }
  
  resume() {
    if (this.state === 'paused') this.state = 'playing'
  }
  
  useAdReward(type) {
    if (type === 'extraTime') this.time += 60
  }
}
