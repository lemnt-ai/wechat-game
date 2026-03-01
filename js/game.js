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
    this.hookY = this.height - 50  // 底部位置
    this.hookTargetX = this.width / 2
    
    // 鱼线 - 钓鱼大赢家模式
    this.lineLength = 30 // 初始长度（鱼钩在猫咪面前）
    this.targetLineLength = 30 // 目标长度（蓄力决定）
    this.maxLineLength = 600 // 最大长度（增加，让鱼钩能到顶部）
    this.lineSpeed = 18 // 鱼钩移动速度（加快）
    this.lineState = 'idle' // idle, moving_out, moving_in
    this.castPower = 0 // 抛竿力度 0-100
    this.isCasting = false // 是否正在蓄力
    this.castTimer = null // 蓄力定时器
    
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
  
  // 生成鱼（鱼在水面区域：中间区域）
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
      y: 150 + Math.random() * (this.height * 0.5),  // 鱼在中间 50% 区域
      type: type,
      direction: fromLeft ? 1 : -1,
      caught: false,
      hooked: false
    }
    
    this.fishes.push(fish)
    console.log('[鱼] 生成:', type.name, 'Y:', fish.y)
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
    if (this.lineState === 'moving_out') {
      // 鱼钩向目标距离移动
      if (this.lineLength < this.targetLineLength) {
        this.lineLength += this.lineSpeed
        this.checkCollision()
      } else {
        // 到达目标距离，自动返回
        this.lineState = 'moving_in'
        console.log('[鱼钩] 到达目标距离，自动返回')
      }
    } else if (this.lineState === 'moving_in') {
      // 鱼钩返回
      this.lineLength -= this.lineSpeed * 2
      if (this.lineLength <= 50) {
        this.lineLength = 50
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
  
  // 检查碰撞（鱼钩位置）
  checkCollision() {
    // 计算鱼钩位置
    const tipY = this.hookY - 145
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
        this.lineState = 'moving_in' // 钓到后直接返回
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
      console.log('[TouchStart]', touch.clientX, touch.clientY, '状态:', this.lineState)
      
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
      
      // 钓鱼大赢家模式：长按蓄力抛竿
      if (this.lineState === 'idle') {
        console.log('[钓鱼] 开始蓄力')
        this.isCasting = true
        this.castPower = 0
        
        // 启动蓄力定时器
        if (this.castTimer) clearInterval(this.castTimer)
        this.castTimer = setInterval(() => {
          this.castPower = Math.min(this.castPower + 1.5, 100) // 每秒 30%，约 3 秒满力
        }, 50)
      }
    })
    
    wx.onTouchMove((res) => {
      const touch = res.touches[0]
      this.hookTargetX = touch.clientX
    })
    
    wx.onTouchEnd(() => {
      console.log('[TouchEnd] 蓄力:', this.isCasting, '力度:', this.castPower)
      
      // 停止蓄力定时器
      if (this.castTimer) {
        clearInterval(this.castTimer)
        this.castTimer = null
      }
      
      // 松开手指：抛出鱼钩
      if (this.isCasting && this.lineState === 'idle') {
        const power = Math.max(this.castPower, 10) // 至少 10%
        this.targetLineLength = 30 + (power / 100) * (this.maxLineLength - 30)
        this.lineState = 'moving_out' // 鱼钩向外移动
        this.isCasting = false
        console.log('[钓鱼] 抛竿！力度:', power, '目标距离:', this.targetLineLength)
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
    this.lineLength = 50
    this.targetLineLength = 50
    this.lineState = 'idle'
    this.hookX = this.width / 2
    this.hookTargetX = this.width / 2
    this.spawnTimer = 0
    this.lastTime = Date.now()
    this.canShowAd = true
    this.adCooldown = 0
    this.isCasting = false
    this.castPower = 0
    
    // 清除蓄力定时器
    if (this.castTimer) {
      clearInterval(this.castTimer)
      this.castTimer = null
    }
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
    ctx.fillText('滑动左右移动猫咪', this.width / 2, this.height / 3)
    ctx.fillText('长按蓄力，松手抛竿', this.width / 2, this.height / 3 + 35)
    ctx.fillText('力度越大抛得越远', this.width / 2, this.height / 3 + 65)
    
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
    
    // 水面线（顶部）
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, 100)
    ctx.lineTo(this.width, 100)
    ctx.stroke()
    
    // 水波纹
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      const y = 115 + i * 12
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
    
    // 猫咪和鱼竿（底部，往上一些）
    this.renderCatAndRod(ctx)
    
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
  
  // 渲染猫咪和炮台
  renderCatAndRod(ctx) {
    const catX = this.hookX
    const catY = this.hookY
    
    // 1. 渲染猫咪（坐在炮台旁边）
    this.renderCat(ctx, catX - 50, catY)
    
    // 2. 渲染炮台
    this.renderRod(ctx, catX, catY)
  }
  
  // 渲染猫咪
  renderCat(ctx, catX, catY) {
    ctx.save()
    ctx.translate(catX, catY)
    
    // 猫咪身体（橙色）
    ctx.fillStyle = '#FFA500'
    ctx.beginPath()
    ctx.ellipse(0, 0, 35, 25, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 猫咪头部
    ctx.beginPath()
    ctx.arc(0, -30, 22, 0, Math.PI * 2)
    ctx.fill()
    
    // 耳朵
    ctx.beginPath()
    ctx.moveTo(-15, -45)
    ctx.lineTo(-10, -60)
    ctx.lineTo(-5, -48)
    ctx.fill()
    
    ctx.beginPath()
    ctx.moveTo(15, -45)
    ctx.lineTo(10, -60)
    ctx.lineTo(5, -48)
    ctx.fill()
    
    // 耳朵内侧（粉色）
    ctx.fillStyle = '#FFB6C1'
    ctx.beginPath()
    ctx.moveTo(-13, -46)
    ctx.lineTo(-10, -57)
    ctx.lineTo(-7, -46)
    ctx.fill()
    
    ctx.beginPath()
    ctx.moveTo(13, -46)
    ctx.lineTo(10, -57)
    ctx.lineTo(7, -46)
    ctx.fill()
    
    // 眼睛
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(-8, -32, 6, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(8, -32, 6, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    
    // 眼珠（根据鱼竿状态移动）
    const eyeOffset = this.lineState === 'casting' ? -2 : (this.lineState === 'reeling' ? 2 : 0)
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(-8 + eyeOffset, -32, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(8 + eyeOffset, -32, 3, 0, Math.PI * 2)
    ctx.fill()
    
    // 鼻子（粉色）
    ctx.fillStyle = '#FFB6C1'
    ctx.beginPath()
    ctx.moveTo(-3, -25)
    ctx.lineTo(3, -25)
    ctx.lineTo(0, -22)
    ctx.closePath()
    ctx.fill()
    
    // 嘴巴
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, -22)
    ctx.lineTo(-3, -18)
    ctx.moveTo(0, -22)
    ctx.lineTo(3, -18)
    ctx.stroke()
    
    // 胡须
    ctx.beginPath()
    ctx.moveTo(-10, -20)
    ctx.lineTo(-25, -18)
    ctx.moveTo(-10, -17)
    ctx.lineTo(-25, -17)
    ctx.moveTo(-10, -14)
    ctx.lineTo(-25, -16)
    ctx.moveTo(10, -20)
    ctx.lineTo(25, -18)
    ctx.moveTo(10, -17)
    ctx.lineTo(25, -17)
    ctx.moveTo(10, -14)
    ctx.lineTo(25, -16)
    ctx.stroke()
    
    // 尾巴（摇摆动画）
    const tailWag = Math.sin(Date.now() / 200) * 10
    ctx.strokeStyle = '#FFA500'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(30, -10)
    ctx.quadraticCurveTo(45 + tailWag, 0, 50 + tailWag, -15)
    ctx.stroke()
    
    // 爪子（握着鱼竿）
    ctx.fillStyle = '#FFA500'
    ctx.beginPath()
    ctx.ellipse(15, 10, 10, 8, 0.3, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }
  
  // 渲染炮台
  renderRod(ctx, catX, catY) {
    const turretX = catX
    const turretY = catY
    
    // 炮台根据状态旋转
    let turretAngle = -Math.PI / 2 // 默认向上
    if (this.lineState === 'moving_out') {
      turretAngle = -Math.PI / 2 - 0.2 // 抛出时略微向后
    } else if (this.lineState === 'moving_in') {
      turretAngle = -Math.PI / 2 + 0.1 // 收回时向前
    }
    
    ctx.save()
    ctx.translate(turretX, turretY)
    
    // 1. 炮台底座
    ctx.fillStyle = '#696969'
    ctx.beginPath()
    ctx.arc(0, 15, 35, Math.PI, 0)
    ctx.fill()
    
    // 底座纹理
    ctx.strokeStyle = '#505050'
    ctx.lineWidth = 2
    for (let i = 0; i < 5; i++) {
      const y = 10 + i * 3
      ctx.beginPath()
      ctx.moveTo(-30, y)
      ctx.lineTo(30, y)
      ctx.stroke()
    }
    
    // 2. 旋转基座
    ctx.save()
    ctx.rotate(turretAngle + Math.PI / 2)
    
    ctx.fillStyle = '#808080'
    ctx.beginPath()
    ctx.rect(-20, -20, 40, 30)
    ctx.fill()
    
    // 基座铆钉
    ctx.fillStyle = '#C0C0C0'
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.arc(-12 + i * 8, -12, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 3. 炮管（主炮筒）
    const barrelGradient = ctx.createLinearGradient(0, -40, 0, -120)
    barrelGradient.addColorStop(0, '#708090')
    barrelGradient.addColorStop(0.5, '#607080')
    barrelGradient.addColorStop(1, '#506070')
    
    ctx.fillStyle = barrelGradient
    ctx.beginPath()
    ctx.rect(-12, -120, 24, 90)
    ctx.fill()
    
    // 炮管高光
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.beginPath()
    ctx.rect(-8, -115, 6, 80)
    ctx.fill()
    
    // 炮管箍环
    ctx.fillStyle = '#405060'
    ctx.beginPath()
    ctx.rect(-13, -80, 26, 8)
    ctx.fill()
    ctx.beginPath()
    ctx.rect(-13, -50, 26, 8)
    ctx.fill()
    
    // 4. 炮口
    ctx.fillStyle = '#304050'
    ctx.beginPath()
    ctx.rect(-14, -125, 28, 10)
    ctx.fill()
    
    // 炮口内部（黑色）
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.ellipse(0, -125, 10, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
    
    // 5. 鱼线（从炮口伸出）
    const tipX = turretX + Math.cos(turretAngle) * 120
    const tipY = turretY + Math.sin(turretAngle) * 120
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(tipX, tipY)
    
    // 鱼线根据状态显示
    if (this.lineState === 'moving_out') {
      // 抛出时鱼线绷紧
      ctx.lineTo(this.hookX, tipY - this.lineLength)
    } else if (this.lineState === 'moving_in') {
      // 收回时鱼线摆动
      ctx.quadraticCurveTo(
        this.hookX + 20, tipY - this.lineLength / 2,
        this.hookX, tipY - this.lineLength
      )
    } else {
      // 空闲时自然下垂
      ctx.quadraticCurveTo(
        tipX + 10, tipY - 30,
        this.hookX, tipY - 50
      )
    }
    ctx.stroke()
    
    // 6. 鱼钩和鱼饵
    const hookY = tipY - this.lineLength
    
    // 鱼钩
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(this.hookX, hookY, 7, 0, Math.PI, true)
    ctx.stroke()
    
    // 鱼饵（红色蠕虫）
    ctx.fillStyle = '#DC143C'
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.ellipse(this.hookX, hookY + 12 + i * 5, 5 - i, 3, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 钓到的鱼
    if (this.caughtFish) {
      this.drawFish(this.caughtFish, this.hookX, hookY + 35)
    }
    
    ctx.restore()
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
