/**
 * 大家来找茬 - 微信小游戏
 * 找出两张图片之间的差异
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
    
    console.log('[找茬] 初始化:', this.width, 'x', this.height)
    
    // 游戏状态
    this.state = 'menu' // menu, playing, gameover
    this.level = 1
    this.maxLevel = 5
    
    // 差异点配置
    this.diffCount = 3 // 每关差异数量
    this.foundDiffs = [] // 已找到的差异
    this.markedDiffs = [] // 已标记的差异位置
    
    // 图片区域配置
    this.padding = 20
    this.gap = 10
    this.imageWidth = (this.width - this.padding * 3 - this.gap) / 2
    this.imageHeight = this.imageWidth
    
    // 差异点数据（简化版：用色块表示图片）
    this.differences = []
    
    // 触摸相关
    this.lastTapTime = 0
  }
  
  // 生成差异点
  generateDifferences() {
    this.differences = []
    this.foundDiffs = []
    this.markedDiffs = []
    
    // 随机生成差异点位置
    for (let i = 0; i < this.diffCount; i++) {
      let diff
      let attempts = 0
      do {
        diff = {
          x: Math.random() * (this.imageWidth - 40) + 20,
          y: Math.random() * (this.imageHeight - 40) + 20,
          radius: 15 + Math.random() * 10,
          found: false
        }
        attempts++
      } while (
        attempts < 50 &&
        this.differences.some(d => 
          Math.abs(d.x - diff.x) < 50 && Math.abs(d.y - diff.y) < 50
        )
      )
      this.differences.push(diff)
    }
    
    console.log('[找茬] 生成差异点:', this.differences.length)
  }
  
  // 绑定事件
  bindEvents() {
    console.log('[事件] 绑定')
    
    wx.onTouchStart((res) => {
      const touch = res.touches[0]
      this.handleTap(touch.clientX, touch.clientY)
    })
    
    console.log('[事件] 完成')
  }
  
  // 处理点击
  handleTap(x, y) {
    console.log('[点击]', x, y)
    
    if (this.state === 'menu') {
      this.startGame()
      return
    }
    
    if (this.state === 'gameover') {
      this.level = 1
      this.startGame()
      return
    }
    
    if (this.state !== 'playing') return
    
    // 计算点击位置（相对于左图）
    const leftImageX = this.padding
    const leftImageY = this.padding + 40
    
    // 检查是否点击在左图范围内
    if (x >= leftImageX && x <= leftImageX + this.imageWidth &&
        y >= leftImageY && y <= leftImageY + this.imageHeight) {
      
      const clickX = x - leftImageX
      const clickY = y - leftImageY
      
      console.log('[点击] 图片内:', clickX, clickY)
      
      // 检查是否点到差异点
      this.checkDifference(clickX, clickY)
    }
  }
  
  // 检查差异
  checkDifference(x, y) {
    for (let i = 0; i < this.differences.length; i++) {
      const diff = this.differences[i]
      if (diff.found) continue
      
      const dx = x - diff.x
      const dy = y - diff.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      console.log('[检查] 差异点:', i, '距离:', distance, '半径:', diff.radius)
      
      if (distance <= diff.radius + 10) {
        // 找到差异！
        diff.found = true
        this.foundDiffs.push(i)
        this.markedDiffs.push({ x, y })
        
        console.log('[找茬] 找到差异!', this.foundDiffs.length, '/', this.diffCount)
        
        // 播放效果
        this.showFoundEffect(x, y)
        
        // 检查是否全部找到
        if (this.foundDiffs.length >= this.diffCount) {
          setTimeout(() => {
            this.levelComplete()
          }, 500)
        }
        break
      }
    }
    
    this.render()
  }
  
  // 显示找到效果
  showFoundEffect(x, y) {
    // 简单实现：在渲染时显示圈圈
  }
  
  // 关卡完成
  levelComplete() {
    console.log('[关卡] 完成:', this.level)
    
    if (this.level >= this.maxLevel) {
      // 游戏通关
      this.state = 'gameover'
      this.showWin()
    } else {
      // 下一关
      this.level++
      this.generateDifferences()
      this.render()
      
      // 显示提示
      this.showLevelUp()
    }
  }
  
  // 显示通关
  showWin() {
    this.render()
  }
  
  // 显示升级
  showLevelUp() {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(0, 0, this.width, this.height)
    
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 36px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('第' + this.level + '关', this.width / 2, this.height / 2)
    
    ctx.font = '20px Arial'
    ctx.fillStyle = '#fff'
    ctx.fillText('准备...', this.width / 2, this.height / 2 + 50)
    
    setTimeout(() => {
      this.render()
    }, 1500)
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
    this.level = 1
    this.generateDifferences()
    this.render()
  }
  
  // 渲染
  render() {
    if (!this.ctx) return
    
    // 清空
    this.ctx.fillStyle = '#1a1a2e'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    if (this.state === 'menu') {
      this.renderMenu()
    } else if (this.state === 'playing') {
      this.renderGame()
    } else if (this.state === 'gameover') {
      this.renderWin()
    }
  }
  
  // 渲染菜单
  renderMenu() {
    const ctx = this.ctx
    
    // 标题
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 42px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('大家来找茬', this.width / 2, this.height / 4)
    
    // 说明
    ctx.fillStyle = '#fff'
    ctx.font = '18px Arial'
    ctx.fillText('找出两张图片的差异', this.width / 2, this.height / 3)
    ctx.fillText('共 ' + this.maxLevel + ' 关', this.width / 2, this.height / 3 + 30)
    
    // 示例图
    const demoSize = 100
    const demoX = (this.width - demoSize * 2 - 10) / 2
    const demoY = this.height / 2
    
    // 左图
    ctx.fillStyle = '#4ECDC4'
    ctx.fillRect(demoX, demoY, demoSize, demoSize)
    ctx.fillStyle = '#FF6B6B'
    ctx.beginPath()
    ctx.arc(demoX + 30, demoY + 30, 15, 0, Math.PI * 2)
    ctx.fill()
    
    // 右图（有差异）
    ctx.fillStyle = '#4ECDC4'
    ctx.fillRect(demoX + demoSize + 10, demoY, demoSize, demoSize)
    ctx.fillStyle = '#45B7D1' // 颜色不同
    ctx.beginPath()
    ctx.arc(demoX + demoSize + 10 + 30, demoY + 30, 15, 0, Math.PI * 2)
    ctx.fill()
    
    // 差异标记
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(demoX + demoSize + 10 + 30, demoY + 30, 20, 0, Math.PI * 2)
    ctx.stroke()
    
    // 开始按钮
    ctx.fillStyle = '#4ECDC4'
    ctx.fillRect(this.width / 2 - 80, this.height * 0.75, 160, 55)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 24px Arial'
    ctx.fillText('开始游戏', this.width / 2, this.height * 0.75 + 35)
  }
  
  // 渲染游戏
  renderGame() {
    const ctx = this.ctx
    
    // 顶部信息
    ctx.fillStyle = '#fff'
    ctx.font = '18px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('关卡：' + this.level + '/' + this.maxLevel, 15, 28)
    ctx.textAlign = 'right'
    ctx.fillText('找到：' + this.foundDiffs.length + '/' + this.diffCount, this.width - 15, 28)
    
    const imageY = this.padding + 40
    
    // 绘制左图
    this.drawImage(ctx, this.padding, imageY, false)
    
    // 绘制右图
    this.drawImage(ctx, this.padding + this.imageWidth + this.gap, imageY, true)
    
    // 绘制已标记的差异
    this.drawMarkedDiffs(ctx, this.padding, imageY)
    this.drawMarkedDiffs(ctx, this.padding + this.imageWidth + this.gap, imageY)
    
    // 底部提示
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = '14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('点击左图找出差异', this.width / 2, imageY + this.imageHeight + 25)
  }
  
  // 绘制图片（用色块模拟）
  drawImage(ctx, x, y, isRight) {
    // 背景
    ctx.fillStyle = '#2d3436'
    ctx.fillRect(x, y, this.imageWidth, this.imageHeight)
    
    // 边框
    ctx.strokeStyle = '#636e72'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, this.imageWidth, this.imageHeight)
    
    // 绘制场景（简化版：用几何图形表示）
    const centerX = x + this.imageWidth / 2
    const centerY = y + this.imageHeight / 2
    
    // 天空
    ctx.fillStyle = '#74b9ff'
    ctx.fillRect(x, y, this.imageWidth, this.imageHeight / 2)
    
    // 草地
    ctx.fillStyle = '#55efc4'
    ctx.fillRect(x, y + this.imageHeight / 2, this.imageWidth, this.imageHeight / 2)
    
    // 太阳
    ctx.fillStyle = '#ffeaa7'
    ctx.beginPath()
    ctx.arc(centerX - 30, y + 40, 25, 0, Math.PI * 2)
    ctx.fill()
    
    // 房子
    ctx.fillStyle = '#fd79a8'
    ctx.fillRect(centerX - 40, centerY, 80, 60)
    
    // 屋顶
    ctx.fillStyle = '#d63031'
    ctx.beginPath()
    ctx.moveTo(centerX - 50, centerY)
    ctx.lineTo(centerX, centerY - 40)
    ctx.lineTo(centerX + 50, centerY)
    ctx.fill()
    
    // 门
    ctx.fillStyle = '#6c5ce7'
    ctx.fillRect(centerX - 15, centerY + 20, 30, 40)
    
    // 窗户
    ctx.fillStyle = '#fdcb6e'
    ctx.fillRect(centerX - 35, centerY + 10, 20, 20)
    ctx.fillRect(centerX + 15, centerY + 10, 20, 20)
    
    // 树
    ctx.fillStyle = '#a29bfe'
    ctx.fillRect(centerX + 60, centerY + 20, 15, 40)
    ctx.fillStyle = '#00b894'
    ctx.beginPath()
    ctx.arc(centerX + 67, centerY, 30, 0, Math.PI * 2)
    ctx.fill()
    
    // 绘制差异（右图时）
    if (isRight) {
      this.drawRightDifferences(ctx, x, y)
    }
    
    // 绘制差异标记圈
    this.drawDifferenceCircles(ctx, x, y)
  }
  
  // 绘制右图差异
  drawRightDifferences(ctx, x, y) {
    // 差异 1: 太阳颜色不同
    if (this.level >= 1) {
      ctx.fillStyle = '#fab1a0' // 不同的颜色
      ctx.beginPath()
      ctx.arc(x + this.imageWidth / 2 - 30 + 67, y + 40, 25, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // 差异 2: 门颜色不同
    if (this.level >= 2) {
      ctx.fillStyle = '#a29bfe'
      ctx.fillRect(x + this.imageWidth / 2 - 15 + 67, y + this.imageHeight / 2 + 20, 30, 40)
    }
    
    // 差异 3: 树颜色不同
    if (this.level >= 3) {
      ctx.fillStyle = '#6c5ce7'
      ctx.beginPath()
      ctx.arc(x + this.imageWidth / 2 + 67 + 67, y + this.imageHeight / 2, 30, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  
  // 绘制差异标记圈
  drawDifferenceCircles(ctx, x, y) {
    for (let i = 0; i < this.differences.length; i++) {
      const diff = this.differences[i]
      if (!diff.found) continue
      
      const cx = x + diff.x
      const cy = y + diff.y
      
      // 红色圈圈
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, diff.radius + 5, 0, Math.PI * 2)
      ctx.stroke()
      
      // 对勾
      ctx.fillStyle = '#00ff00'
      ctx.font = 'bold 20px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('✓', cx, cy)
    }
  }
  
  // 绘制已标记的差异
  drawMarkedDiffs(ctx, offsetX, offsetY) {
    // 在图片上方显示标记
  }
  
  // 渲染通关
  renderWin() {
    const ctx = this.ctx
    
    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.fillRect(0, 0, this.width, this.height)
    
    // 标题
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 40px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('恭喜通关!', this.width / 2, this.height / 3)
    
    // 分数
    ctx.fillStyle = '#fff'
    ctx.font = '24px Arial'
    ctx.fillText('你找出了所有差异!', this.width / 2, this.height / 2)
    
    // 重新开始
    ctx.fillStyle = '#4ECDC4'
    ctx.fillRect(this.width / 2 - 80, this.height * 0.65, 160, 50)
    ctx.fillStyle = '#fff'
    ctx.font = '20px Arial'
    ctx.fillText('再玩一次', this.width / 2, this.height * 0.65 + 30)
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
    console.log('[广告] 奖励:', type)
  }
}
