/**
 * 欢乐钓鱼 - 参考 wow-fishing 重构版
 * 微信小游戏原生版本 - 支持看广告加时间
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
    
    // 广告相关
    this.canShowAd = true
    this.adCooldown = 0
    
    // 鱼钩 - 炮台在底部
    this.hookX = this.width / 2
    this.hookY = this.height - 80  // 底部位置
    this.hookTargetX = this.width / 2
    
    // 鱼线 - 钓鱼大赢家模式
    this.lineLength = 0
    this.maxLineLength = 350
    this.lineSpeed = 10
    this.lineState = 'idle' // idle, casting, reeling, hooked
    this.castPower = 0 // 抛竿力度 0-100
    this.isCasting = false // 是否正在蓄力抛竿
    this.castStartTime = 0 // 蓄力开始时间
    
    // 鱼配置
    this.fishTypes = [
      { name: '小鱼', color: '#4ECDC4', score: 10, speed: 2, size: 25, rarity: 'common' },
      { name: '中鱼', color: '#45B7D1', score: 20, speed: 3, size: 35, rarity: 'common' },
      { name: '大鱼', color: '#FF6B6B', score: 30, speed: 1.5, size: 45, rarity: 'uncommon' },
      { name: '金鱼', color: '#FFD700', score: 50, speed: 4, size: 30, rarity: 'rare' },
      { name: '鲨鱼', color: '#6c5ce7', score: 100, speed: 2, size: 55, rarity: 'legendary' }
    ]
    
    this.fishes = []
    this.caughtFish = null
    this.spawnTimer = 0
    this.spawnInterval = 50
    
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
  
  // 生成鱼（鱼在水面区域：顶部 1/3 区域）
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
      y: 80 + Math.random() * (this.height * 0.35),  // 鱼在顶部 35% 区域
      type: type,
      direction: fromLeft ? 1 : -1,
      caught: false,
      hooked: false
    }
    
    this.fishes.push(fish)
    console.log('[鱼] 生成:', type.name, type.rarity)
  }
  
  // 更新
  update() {
    if (this.state !== 'playing') return
    
    // 时间
    const now = Date.now()
    if (now - this.lastTime >= 1000) {
      this.time--
      this.lastTime = now
      
      // 广告冷却
      if (this.adCooldown > 0) {
        this.adCooldown--
        if (this.adCooldown <= 0) {
          this.canShowAd = true
        }
      }
      
      if (this.time <= 0) {
        this.time = 0
        this.state = 'gameover'
        console.log('[游戏] 结束！分数:', this.score)
        return
      }
    }
    
    // 鱼钩移动
    if (Math.abs(this.hookX - this.hookTargetX) > 1) {
      this.hookX += (this.hookTargetX > this.hookX) ? 8 : -8
    }
    
    // 鱼线状态（钓鱼大赢家模式）
    if (this.lineState === 'casting') {
      // 抛竿后自动向下沉
      this.lineLength += this.lineSpeed
      if (this.lineLength >= this.maxLineLength) {
        this.lineLength = this.maxLineLength
        this.lineState = 'reeling'
        console.log('[鱼钩] 到达最远距离，自动收竿')
      }
      this.checkCollision()
    } else if (this.lineState === 'reeling') {
      // 收竿
      this.lineLength -= this.lineSpeed * 2
      if (this.lineLength <= 50) {
        this.lineLength = 50
        this.lineState = 'idle'
        if (this.caughtFish) {
          this.score += this.caughtFish.type.score
          this.caught++
          console.log('[得分] +', this.caughtFish.type.score, '总分:', this.score, '钓到:', this.caught)
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
        fish.x = this.hookX
        fish.y = this.hookY + this.lineLength + 30
        continue
      }
      
      fish.x += fish.type.speed * fish.direction
      
      if ((fish.direction === 1 && fish.x > this.width + 100) ||
          (fish.direction === -1 && fish.x < -100)) {
        this.fishes.splice(i, 1)
      }
    }
  }
  
  // 检查碰撞（鱼钩位置：路亚竿梢）
  checkCollision() {
    // 竿梢位置
    const tipY = this.hookY - 330
    const hookY = tipY - this.lineLength
    
    for (let i = 0; i < this.fishes.length; i++) {
      const fish = this.fishes[i]
      if (fish.caught || fish.hooked) continue
      
      const dx = Math.abs(fish.x - this.hookX)
      const dy = Math.abs(fish.y - hookY)
      
      if (dx < fish.type.size && dy < fish.type.size + 10) {
        fish.hooked = true
        fish.caught = true
        this.caughtFish = fish
        this.lineState = 'pulling'
        console.log('[钓鱼] 钓到:', fish.type.name, fish.type.rarity)
        break
      }
    }
  }
  
  // 绑定事件（钓鱼大赢家模式 - 蓄力抛竿）
  bindEvents() {
    console.log('[事件] 绑定')
    
    wx.onTouchStart((res) => {
      const touch = res.touches[0]
      console.log('[TouchStart]', touch.clientX, touch.clientY)
      
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
      
      // 检查广告按钮
      if (this.checkAdButton(touch.clientX, touch.clientY)) {
        this.showTimeAd()
        return
      }
      
      // 钓鱼大赢家模式：点击蓄力抛竿
      if (this.lineState === 'idle') {
        console.log('[钓鱼] 开始蓄力')
        this.isCasting = true
        this.castPower = 0
        this.castStartTime = Date.now()
      } else if (this.lineState === 'casting') {
        // 再次点击：收竿
        console.log('[钓鱼] 收竿')
        this.lineState = 'reeling'
        this.isCasting = false
      }
    })
    
    wx.onTouchMove((res) => {
      const touch = res.touches[0]
      this.hookTargetX = touch.clientX
      
      // 蓄力中：显示力度条
      if (this.isCasting && this.lineState === 'idle') {
        const elapsed = Date.now() - this.castStartTime
        this.castPower = Math.min(elapsed / 20, 100) // 2 秒满力
      }
    })
    
    wx.onTouchEnd(() => {
      console.log('[TouchEnd]')
      
      // 松开手指：抛竿
      if (this.isCasting && this.lineState === 'idle') {
        console.log('[钓鱼] 抛竿！力度:', this.castPower)
        this.lineState = 'casting'
        this.isCasting = false
        
        // 根据力度设置初始鱼线长度
        this.lineLength = 50 + (this.castPower / 100) * (this.maxLineLength - 50)
      }
    })
    
    console.log('[事件] 完成')
  }
  
  // 检查广告按钮点击
  checkAdButton(x, y) {
    if (this.state !== 'playing') return false
    if (!this.canShowAd) return false
    
    // 广告按钮位置：右上角
    const btnX = this.width - 100
    const btnY = 55
    const btnWidth = 90
    const btnHeight = 35
    
    return (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight)
  }
  
  // 显示时间广告
  showTimeAd() {
    console.log('[广告] 请求 +30 秒广告')
    
    if (!this.canShowAd) {
      console.log('[广告] 冷却中，剩余:', this.adCooldown, '秒')
      return
    }
    
    if (this.adManager && this.adManager.showRewardedAd) {
      this.adManager.showRewardedAd('extraTime')
      this.canShowAd = false
      this.adCooldown = 60 // 60 秒冷却
    }
  }
  
  // 添加时间
  addTime(seconds) {
    this.time += seconds
    console.log('[时间] +', seconds, '秒，当前:', this.time, '秒')
    
    // 显示提示
    this.showTimeToast('+30 秒!')
  }
  
  // 显示时间提示
  showTimeToast(text) {
    const toastY = this.height / 2
    const toastX = this.width / 2
    let alpha = 1
    
    const showAnimation = () => {
      if (alpha <= 0) return
      
      this.ctx.save()
      this.ctx.globalAlpha = alpha
      this.ctx.fillStyle = '#4ECDC4'
      this.ctx.font = 'bold 48px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(text, toastX, toastY)
      this.ctx.restore()
      
      alpha -= 0.05
      setTimeout(showAnimation, 50)
    }
    
    showAnimation()
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
    this.lineLength = 0
    this.lineState = 'idle'
    this.hookX = this.width / 2
    this.hookTargetX = this.width / 2
    this.spawnTimer = 0
    this.lastTime = Date.now()
    this.canShowAd = true
    this.adCooldown = 0
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
    ctx.fillText('滑动左右移动鱼竿', this.width / 2, this.height / 3)
    ctx.fillText('长按蓄力，松手抛竿', this.width / 2, this.height / 3 + 35)
    ctx.fillText('再次点击收竿', this.width / 2, this.height / 3 + 65)
    
    ctx.fillStyle = '#4ECDC4'
    ctx.fillRect(this.width / 2 - 80, this.height / 2, 160, 55)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 22px Arial'
    ctx.fillText('开始钓鱼', this.width / 2, this.height / 2 + 35)
  }
  
  // 渲染游戏
  renderGame() {
    const ctx = this.ctx
    
    // 背景渐变（天空到水）
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#87CEEB')  // 天空
    gradient.addColorStop(0.5, '#E0F6FF')  // 天空
    gradient.addColorStop(0.5, '#1E90FF')  // 水面
    gradient.addColorStop(1, '#006994')  // 深水
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)
    
    // 水面线（顶部 1/3 处）
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, this.height * 0.35)
    ctx.lineTo(this.width, this.height * 0.35)
    ctx.stroke()
    
    // 水波纹
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      const y = this.height * 0.35 + 15 + i * 10
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(this.width, y)
      ctx.stroke()
    }
    
    // 顶部信息栏
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, this.width, 50)
    
    // 时间
    ctx.fillStyle = this.time < 30 ? '#ff6b6b' : '#fff'
    ctx.font = 'bold 18px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('时间:' + this.time + 's', 12, 32)
    
    // 分数
    ctx.fillStyle = '#fff'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('分数:' + this.score, this.width / 2, 32)
    
    // 钓到数量
    ctx.textAlign = 'right'
    ctx.fillText('钓到:' + this.caught, this.width - 12, 32)
    
    // 广告按钮（左上角）
    this.renderAdButton()
    
    // 抛竿力度条（钓鱼大赢家特色）
    this.renderCastPower(ctx)
    
    // 路亚鱼竿（底部）
    this.renderFishingRod(ctx)
    
    // 所有的鱼
    this.fishes.forEach(fish => {
      if (!fish.caught) {
        this.drawFish(fish, fish.x, fish.y)
      }
    })
  }
  
  // 渲染广告按钮（左上角）
  renderAdButton() {
    const ctx = this.ctx
    
    if (!this.canShowAd) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(10, 55, 90, 35)
      ctx.fillStyle = '#999'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(this.adCooldown + '秒后', 55, 78)
    } else {
      ctx.fillStyle = '#FFD700'
      ctx.fillRect(10, 55, 90, 35)
      ctx.fillStyle = '#000'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('+30 秒', 55, 78)
    }
  }
  
  // 渲染抛竿力度条（钓鱼大赢家特色）
  renderCastPower(ctx) {
    if (!this.isCasting || this.lineState !== 'idle') return
    
    const barWidth = 200
    const barHeight = 20
    const barX = (this.width - barWidth) / 2
    const barY = this.height / 2
    
    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4)
    
    // 力度条渐变
    const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0)
    gradient.addColorStop(0, '#4ECDC4')
    gradient.addColorStop(0.5, '#FFD700')
    gradient.addColorStop(1, '#FF6B6B')
    
    ctx.fillStyle = gradient
    ctx.fillRect(barX, barY, barWidth * (this.castPower / 100), barHeight)
    
    // 边框
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.strokeRect(barX, barY, barWidth, barHeight)
    
    // 文字提示
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('松开抛竿！', this.width / 2, barY - 10)
    
    // 力度百分比
    ctx.fillStyle = '#fff'
    ctx.font = '14px Arial'
    ctx.fillText(Math.round(this.castPower) + '%', this.width / 2, barY + 35)
  }
  
  // 渲染路亚鱼竿（缩短版）
  renderFishingRod(ctx) {
    const rodX = this.hookX
    const rodY = this.hookY
    
    // 鱼竿角度（根据鱼线状态微调）
    let rodAngle = 0
    if (this.lineState === 'dropping') {
      rodAngle = -0.15 // 抛竿时略微向下
    } else if (this.lineState === 'pulling' && this.caughtFish) {
      rodAngle = 0.2 // 中鱼时弯曲
    }
    
    // 1. 鱼线轮（卷线器）
    const reelX = rodX - 12
    const reelY = rodY - 25
    
    // 线轮主体
    ctx.fillStyle = '#C0C0C0'
    ctx.beginPath()
    ctx.arc(reelX, reelY, 14, 0, Math.PI * 2)
    ctx.fill()
    
    // 线轮中心
    ctx.fillStyle = '#606060'
    ctx.beginPath()
    ctx.arc(reelX, reelY, 6, 0, Math.PI * 2)
    ctx.fill()
    
    // 线轮摇把
    ctx.strokeStyle = '#404040'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(reelX - 4, reelY)
    ctx.lineTo(reelX + 12, reelY)
    ctx.stroke()
    
    ctx.fillStyle = '#8B4513'
    ctx.beginPath()
    ctx.arc(reelX + 14, reelY, 4, 0, Math.PI * 2)
    ctx.fill()
    
    // 2. 鱼竿握把（缩短）
    const gripGradient = ctx.createLinearGradient(rodX - 10, rodY - 50, rodX + 10, rodY)
    gripGradient.addColorStop(0, '#2C2C2C')
    gripGradient.addColorStop(1, '#1A1A1A')
    
    ctx.fillStyle = gripGradient
    ctx.beginPath()
    ctx.moveTo(rodX - 10, rodY - 50)
    ctx.lineTo(rodX + 10, rodY - 50)
    ctx.lineTo(rodX + 12, rodY)
    ctx.lineTo(rodX - 12, rodY)
    ctx.closePath()
    ctx.fill()
    
    // 握把纹理（缩短）
    ctx.strokeStyle = '#3A3A3A'
    ctx.lineWidth = 2
    for (let i = 0; i < 5; i++) {
      const y = rodY - 45 - i * 8
      ctx.beginPath()
      ctx.moveTo(rodX - 9, y)
      ctx.lineTo(rodX + 9, y)
      ctx.stroke()
    }
    
    // 3. 鱼竿竿身（缩短版）
    ctx.save()
    ctx.translate(rodX, rodY - 50)
    ctx.rotate(rodAngle)
    
    // 竿身渐变（碳素材质）
    const rodGradient = ctx.createLinearGradient(0, 0, 0, -120)
    rodGradient.addColorStop(0, '#1A1A2E')
    rodGradient.addColorStop(0.5, '#16213E')
    rodGradient.addColorStop(1, '#0F3460')
    
    ctx.strokeStyle = rodGradient
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(3, -60, 8, -120) // 略微弯曲
    ctx.stroke()
    
    // 竿梢（更细更短）
    ctx.strokeStyle = '#E94560'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(8, -120)
    ctx.quadraticCurveTo(10, -140, 12, -150)
    ctx.stroke()
    
    // 导环（3 个就够了）
    ctx.strokeStyle = '#C0C0C0'
    ctx.lineWidth = 2
    for (let i = 1; i <= 3; i++) {
      const guideY = -30 - i * 30
      const guideX = 2 + i * 1.5
      ctx.beginPath()
      ctx.arc(guideX, guideY, 2.5, 0, Math.PI * 2)
      ctx.stroke()
    }
    
    ctx.restore()
    
    // 4. 鱼线（从竿梢伸出 - 缩短）
    const tipX = rodX + 12
    const tipY = rodY - 200
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(tipX, tipY)
    
    // 鱼线弧度（根据状态）
    if (this.lineState === 'dropping') {
      // 抛竿时鱼线松弛
      ctx.quadraticCurveTo(
        tipX + 15, tipY - this.lineLength / 2,
        this.hookX, tipY - this.lineLength
      )
    } else if (this.lineState === 'pulling') {
      // 收线时鱼线绷紧
      ctx.lineTo(this.hookX, tipY - this.lineLength)
    } else {
      // 空闲时自然下垂
      ctx.quadraticCurveTo(
        tipX + 8, tipY - 20,
        this.hookX, tipY - 40
      )
    }
    ctx.stroke()
    
    // 5. 鱼钩和鱼
    const hookY = tipY - this.lineLength
    
    // 鱼钩
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(this.hookX, hookY, 6, 0, Math.PI, true)
    ctx.stroke()
    
    // 假饵（路亚饵）
    ctx.fillStyle = '#FF6B6B'
    ctx.beginPath()
    ctx.ellipse(this.hookX, hookY + 8, 6, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 假饵尾部的羽毛
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.moveTo(this.hookX - 4, hookY + 10)
    ctx.lineTo(this.hookX, hookY + 16)
    ctx.lineTo(this.hookX + 4, hookY + 10)
    ctx.closePath()
    ctx.fill()
    
    // 钓到的鱼
    if (this.caughtFish) {
      this.drawFish(this.caughtFish, this.hookX, hookY + 25)
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
    
    // 评级
    let rating = '菜鸟'
    if (this.score >= 100) rating = '渔夫'
    if (this.score >= 300) rating = '高手'
    if (this.score >= 500) rating = '大师'
    if (this.score >= 800) rating = '传奇'
    
    ctx.fillStyle = '#FFD700'
    ctx.font = '20px Arial'
    ctx.fillText('评级:' + rating, this.width / 2, this.height / 2 + 90)
    
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
