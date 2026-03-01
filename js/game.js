/**
 * 游戏核心逻辑 - 开心消消乐
 * 滑动模式版本
 */

export default class Game {
  constructor(adManager, canvas, ctx) {
    this.adManager = adManager
    this.canvas = canvas
    this.ctx = ctx
    
    // 获取系统信息
    this.systemInfo = wx.getSystemInfoSync()
    
    // 屏幕尺寸
    this.width = this.systemInfo.windowWidth
    this.height = this.systemInfo.windowHeight
    
    console.log('[游戏] 尺寸:', this.width, 'x', this.height)
    
    // 游戏状态
    this.state = 'menu'
    this.score = 0
    this.moves = 20
    
    // 网格配置
    this.gridSize = 6
    this.cellSize = Math.min(this.width, this.height) / this.gridSize * 0.9
    this.offsetX = (this.width - this.cellSize * this.gridSize) / 2
    this.offsetY = (this.height - this.cellSize * this.gridSize) / 2 + 30
    
    // 宝石颜色
    this.gemColors = [
      '#FF6B6B',
      '#4ECDC4', 
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD'
    ]
    
    this.grid = []
    this.selectedCell = null
    this.isProcessing = false
    
    // 滑动相关
    this.touchStart = null
    this.minSwipeDistance = 30 // 最小滑动距离
  }
  
  // 初始化网格
  initGrid() {
    this.grid = []
    for (let i = 0; i < this.gridSize; i++) {
      this.grid[i] = []
      for (let j = 0; j < this.gridSize; j++) {
        let color
        do {
          color = Math.floor(Math.random() * this.gemColors.length)
        } while (
          (i >= 2 && this.grid[i-1][j] === color && this.grid[i-2][j] === color) ||
          (j >= 2 && this.grid[i][j-1] === color && this.grid[i][j-2] === color)
        )
        this.grid[i][j] = color
      }
    }
  }
  
  // 检查匹配
  checkMatch(row, col) {
    const color = this.grid[row][col]
    
    // 横向
    if (col >= 2 && this.grid[row][col-1] === color && this.grid[row][col-2] === color) {
      return true
    }
    // 纵向
    if (row >= 2 && this.grid[row-1][col] === color && this.grid[row-2][col] === color) {
      return true
    }
    
    return false
  }
  
  // 绑定事件
  bindEvents() {
    console.log('[事件] 开始绑定')
    
    // 触摸开始 - 记录起始位置
    wx.onTouchStart((res) => {
      const touch = res.touches[0]
      this.touchStart = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }
      console.log('[滑动] 开始:', this.touchStart.x, this.touchStart.y)
    })
    
    // 触摸结束 - 检测滑动
    wx.onTouchEnd((res) => {
      if (!this.touchStart) return
      
      const touch = res.changedTouches[0]
      const deltaX = touch.clientX - this.touchStart.x
      const deltaY = touch.clientY - this.touchStart.y
      const deltaTime = Date.now() - this.touchStart.time
      
      console.log('[滑动] 结束:', touch.clientX, touch.clientY)
      console.log('[滑动] 距离:', deltaX, deltaY, '时间:', deltaTime)
      
      // 判断是点击还是滑动
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance < this.minSwipeDistance) {
        // 点击 - 处理点击逻辑
        this.handleTap(this.touchStart.x, this.touchStart.y)
      } else {
        // 滑动 - 处理滑动逻辑
        this.handleSwipe(deltaX, deltaY)
      }
      
      this.touchStart = null
    })
    
    console.log('[事件] 绑定完成')
  }
  
  // 处理点击
  handleTap(x, y) {
    console.log('[点击] 坐标:', x, y)
    
    if (this.isProcessing) {
      console.log('[点击] 处理中，忽略')
      return
    }
    
    // 菜单状态 - 点击开始
    if (this.state === 'menu') {
      console.log('[点击] 开始游戏')
      this.startGame()
      return
    }
    
    // 游戏结束 - 看广告
    if (this.state === 'gameover') {
      console.log('[点击] 游戏结束')
      this.adManager.showRewardedAd()
      return
    }
    
    // 计算点击的网格位置
    const col = Math.floor((x - this.offsetX) / this.cellSize)
    const row = Math.floor((y - this.offsetY) / this.cellSize)
    
    console.log('[点击] 网格:', row, col)
    
    // 检查是否在有效范围内
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
      this.selectedCell = null
      this.render()
      return
    }
    
    // 第一次点击 - 选中
    if (!this.selectedCell) {
      console.log('[点击] 选中:', row, col)
      this.selectedCell = { row, col }
      this.render()
    } else {
      // 第二次点击 - 尝试交换
      const dr = Math.abs(this.selectedCell.row - row)
      const dc = Math.abs(this.selectedCell.col - col)
      
      console.log('[点击] 尝试交换:', this.selectedCell, '->', { row, col })
      
      // 必须是相邻的
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        this.swapAndCheck(this.selectedCell, { row, col })
      } else {
        // 不是相邻的，更新选中
        this.selectedCell = { row, col }
        this.render()
      }
    }
  }
  
  // 处理滑动
  handleSwipe(deltaX, deltaY) {
    console.log('[滑动] 方向检测:', deltaX, deltaY)
    
    if (this.isProcessing) {
      console.log('[滑动] 处理中，忽略')
      return
    }
    
    if (this.state !== 'playing') {
      return
    }
    
    // 如果没有选中，先选中第一个
    if (!this.selectedCell) {
      console.log('[滑动] 未选中，忽略')
      return
    }
    
    // 判断滑动方向
    let targetCell = null
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平滑动
      if (deltaX > 0) {
        // 向右
        targetCell = { row: this.selectedCell.row, col: this.selectedCell.col + 1 }
        console.log('[滑动] 向右')
      } else {
        // 向左
        targetCell = { row: this.selectedCell.row, col: this.selectedCell.col - 1 }
        console.log('[滑动] 向左')
      }
    } else {
      // 垂直滑动
      if (deltaY > 0) {
        // 向下
        targetCell = { row: this.selectedCell.row + 1, col: this.selectedCell.col }
        console.log('[滑动] 向下')
      } else {
        // 向上
        targetCell = { row: this.selectedCell.row - 1, col: this.selectedCell.col }
        console.log('[滑动] 向上')
      }
    }
    
    // 检查目标位置是否有效
    if (targetCell && 
        targetCell.row >= 0 && targetCell.row < this.gridSize &&
        targetCell.col >= 0 && targetCell.col < this.gridSize) {
      console.log('[滑动] 目标:', targetCell)
      this.swapAndCheck(this.selectedCell, targetCell)
    } else {
      console.log('[滑动] 目标无效')
    }
  }
  
  // 交换并检查
  swapAndCheck(cell1, cell2) {
    console.log('[交换] 开始')
    
    const val1 = this.grid[cell1.row][cell1.col]
    const val2 = this.grid[cell2.row][cell2.col]
    
    // 交换
    this.grid[cell1.row][cell1.col] = val2
    this.grid[cell2.row][cell2.col] = val1
    
    // 检查匹配
    const match1 = this.checkMatch(cell1.row, cell1.col)
    const match2 = this.checkMatch(cell2.row, cell2.col)
    
    console.log('[交换] 匹配:', match1, match2)
    
    if (match1 || match2) {
      // 有匹配，消除
      console.log('[交换] 消除!')
      this.moves--
      this.isProcessing = true
      this.selectedCell = null
      this.render()
      
      setTimeout(() => {
        this.processMatches()
      }, 100)
    } else {
      // 无匹配，换回来
      console.log('[交换] 无匹配，还原')
      this.grid[cell1.row][cell1.col] = val1
      this.grid[cell2.row][cell2.col] = val2
      this.selectedCell = null
      this.render()
    }
  }
  
  // 处理匹配
  processMatches() {
    console.log('[消除] 开始')
    
    const matched = []
    
    // 查找所有匹配
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.checkMatch(i, j)) {
          matched.push({ row: i, col: j })
        }
      }
    }
    
    console.log('[消除] 数量:', matched.length)
    
    if (matched.length === 0) {
      this.isProcessing = false
      this.checkGameState()
      return
    }
    
    // 计分
    this.score += matched.length * 10
    
    // 消除
    matched.forEach(({ row, col }) => {
      this.grid[row][col] = -1
    })
    
    // 下落
    this.dropGems()
    
    this.render()
    
    // 连锁反应
    setTimeout(() => {
      this.processMatches()
    }, 300)
  }
  
  // 宝石下落
  dropGems() {
    for (let col = 0; col < this.gridSize; col++) {
      let writeRow = this.gridSize - 1
      for (let row = this.gridSize - 1; row >= 0; row--) {
        if (this.grid[row][col] !== -1) {
          this.grid[writeRow][col] = this.grid[row][col]
          writeRow--
        }
      }
      while (writeRow >= 0) {
        this.grid[writeRow][col] = Math.floor(Math.random() * this.gemColors.length)
        writeRow--
      }
    }
    this.render()
  }
  
  // 检查游戏状态
  checkGameState() {
    if (this.moves <= 0) {
      this.state = 'gameover'
    }
    this.isProcessing = false
    this.render()
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
    console.log('[游戏] 新游戏')
    this.state = 'playing'
    this.score = 0
    this.moves = 20
    this.isProcessing = false
    this.selectedCell = null
    this.initGrid()
    this.render()
  }
  
  // 游戏循环
  gameLoop() {
    if (this.state === 'playing') {
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
    
    // 清空
    this.ctx.fillStyle = '#1a1a2e'
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
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 36px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('开心消消乐', this.width / 2, this.height / 3)
    
    this.ctx.font = '20px Arial'
    this.ctx.fillText('滑动宝石进行交换', this.width / 2, this.height / 2 - 20)
    this.ctx.fillText('点击屏幕开始', this.width / 2, this.height / 2 + 20)
    
    // 开始按钮
    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.fillRect(this.width / 2 - 80, this.height / 2 + 50, 160, 50)
    this.ctx.fillStyle = '#fff'
    this.ctx.fillText('开始游戏', this.width / 2, this.height / 2 + 82)
  }
  
  // 渲染游戏
  renderGame() {
    // 分数和步数
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '18px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.fillText('分数:' + this.score, 15, 30)
    this.ctx.textAlign = 'right'
    this.ctx.fillText('步数:' + this.moves, this.width - 15, 30)
    
    // 网格背景
    this.ctx.fillStyle = '#16213e'
    this.ctx.fillRect(
      this.offsetX - 3,
      this.offsetY - 3,
      this.cellSize * this.gridSize + 6,
      this.cellSize * this.gridSize + 6
    )
    
    // 绘制宝石
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const x = this.offsetX + j * this.cellSize
        const y = this.offsetY + i * this.cellSize
        const color = this.grid[i][j]
        
        if (color >= 0) {
          // 宝石
          this.ctx.fillStyle = this.gemColors[color]
          this.ctx.beginPath()
          this.ctx.arc(
            x + this.cellSize / 2,
            y + this.cellSize / 2,
            this.cellSize / 2 - 4,
            0,
            Math.PI * 2
          )
          this.ctx.fill()
          
          // 高光
          this.ctx.fillStyle = 'rgba(255,255,255,0.4)'
          this.ctx.beginPath()
          this.ctx.arc(
            x + this.cellSize / 2 - 3,
            y + this.cellSize / 2 - 3,
            this.cellSize / 8,
            0,
            Math.PI * 2
          )
          this.ctx.fill()
        }
        
        // 选中框
        if (this.selectedCell && this.selectedCell.row === i && this.selectedCell.col === j) {
          this.ctx.strokeStyle = '#fff'
          this.ctx.lineWidth = 3
          this.ctx.strokeRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4)
        }
      }
    }
    
    // 提示
    if (!this.selectedCell) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.6)'
      this.ctx.font = '14px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('滑动宝石交换', this.width / 2, this.offsetY + this.cellSize * this.gridSize + 25)
    }
  }
  
  // 渲染游戏结束
  renderGameOver() {
    this.ctx.fillStyle = 'rgba(0,0,0,0.8)'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 32px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('游戏结束', this.width / 2, this.height / 3)
    
    this.ctx.font = '24px Arial'
    this.ctx.fillText('分数:' + this.score, this.width / 2, this.height / 2)
    
    this.ctx.font = '18px Arial'
    this.ctx.fillText('点击看广告复活', this.width / 2, this.height / 2 + 50)
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
    if (type === 'extraMoves') {
      this.moves += 5
    } else if (type === 'revive') {
      this.moves = 10
    }
    this.state = 'playing'
  }
}
