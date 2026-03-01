/**
 * 游戏核心逻辑 - 开心消消乐
 */

export default class Game {
  constructor(adManager, canvas, ctx) {
    this.adManager = adManager
    this.canvas = canvas
    this.ctx = ctx
    
    // 获取系统信息
    this.systemInfo = wx.getSystemInfoSync()
    console.log('游戏初始化 - 系统信息:', {
      windowWidth: this.systemInfo.windowWidth,
      windowHeight: this.systemInfo.windowHeight
    })
    
    // 屏幕尺寸
    this.width = this.canvas ? this.canvas.width : this.systemInfo.windowWidth
    this.height = this.canvas ? this.canvas.height : this.systemInfo.windowHeight
    
    console.log('游戏尺寸:', this.width, this.height)
    
    // 游戏状态
    this.state = 'menu' // menu, playing, paused, gameover
    this.score = 0
    this.level = 1
    this.moves = 20
    
    // 网格配置
    this.gridSize = 8
    this.cellSize = Math.min(this.width, this.height) / this.gridSize
    this.offsetX = (this.width - this.cellSize * this.gridSize) / 2
    this.offsetY = (this.height - this.cellSize * this.gridSize) / 2 + 50
    
    // 宝石颜色
    this.gemColors = [
      '#FF6B6B', // 红
      '#4ECDC4', // 青
      '#45B7D1', // 蓝
      '#96CEB4', // 绿
      '#FFEAA7', // 黄
      '#DDA0DD'  // 紫
    ]
    
    // 网格数据
    this.grid = []
    
    // 选中状态
    this.selectedCell = null
    
    // 触摸起始位置
    this.touchStartPos = null
  }
  
  // 初始化网格
  initGrid() {
    this.grid = []
    for (let i = 0; i < this.gridSize; i++) {
      this.grid[i] = []
      for (let j = 0; j < this.gridSize; j++) {
        this.grid[i][j] = Math.floor(Math.random() * this.gemColors.length)
      }
    }
    // 消除初始匹配
    this.removeInitialMatches()
  }
  
  // 移除初始匹配
  removeInitialMatches() {
    let hasMatch = true
    while (hasMatch) {
      hasMatch = false
      for (let i = 0; i < this.gridSize; i++) {
        for (let j = 0; j < this.gridSize; j++) {
          if (this.checkMatch(i, j)) {
            this.grid[i][j] = Math.floor(Math.random() * this.gemColors.length)
            hasMatch = true
          }
        }
      }
    }
  }
  
  // 检查匹配
  checkMatch(row, col) {
    const color = this.grid[row][col]
    
    // 横向检查
    if (col >= 2) {
      if (this.grid[row][col-1] === color && this.grid[row][col-2] === color) {
        return true
      }
    }
    
    // 纵向检查
    if (row >= 2) {
      if (this.grid[row-1][col] === color && this.grid[row-2][col] === color) {
        return true
      }
    }
    
    return false
  }
  
  // 绑定触摸事件
  bindEvents() {
    console.log('绑定事件...')
    
    // 使用 wx.onTouchStart
    wx.onTouchStart((res) => {
      if (this.state !== 'playing') {
        // 菜单状态下点击开始游戏
        if (this.state === 'menu') {
          this.startGame()
        } else if (this.state === 'gameover') {
          // 游戏结束状态下看广告复活
          this.adManager.showRewardedAd()
        }
        return
      }
      
      const touch = res.touches[0]
      const x = touch.clientX
      const y = touch.clientY
      
      this.touchStartPos = { x, y }
      
      const col = Math.floor((x - this.offsetX) / this.cellSize)
      const row = Math.floor((y - this.offsetY) / this.cellSize)
      
      console.log('触摸位置:', row, col, '网格:', this.gridSize)
      
      if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
        if (this.selectedCell) {
          // 尝试交换
          this.trySwap(this.selectedCell, { row, col })
          this.selectedCell = null
        } else {
          this.selectedCell = { row, col }
        }
        this.render()
      }
    })
    
    // 使用 wx.onTouchEnd
    wx.onTouchEnd((res) => {
      if (!this.touchStartPos) return
      
      const touch = res.changedTouches[0]
      const x = touch.clientX
      const y = touch.clientY
      
      const startCol = Math.floor((this.touchStartPos.x - this.offsetX) / this.cellSize)
      const startRow = Math.floor((this.touchStartPos.y - this.offsetY) / this.cellSize)
      const endCol = Math.floor((x - this.offsetX) / this.cellSize)
      const endRow = Math.floor((y - this.offsetY) / this.cellSize)
      
      // 滑动检测
      if (startRow >= 0 && startRow < this.gridSize && startCol >= 0 && startCol < this.gridSize) {
        const dr = Math.abs(endRow - startRow)
        const dc = Math.abs(endCol - startCol)
        
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
          this.trySwap({ row: startRow, col: startCol }, { row: endRow, col: endCol })
        }
      }
      
      this.touchStartPos = null
      this.selectedCell = null
      this.render()
    })
    
    console.log('事件绑定完成')
  }
  
  // 尝试交换
  trySwap(cell1, cell2) {
    const dr = Math.abs(cell1.row - cell2.row)
    const dc = Math.abs(cell1.col - cell2.col)
    
    // 必须相邻
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      // 交换
      const temp = this.grid[cell1.row][cell1.col]
      this.grid[cell1.row][cell1.col] = this.grid[cell2.row][cell2.col]
      this.grid[cell2.row][cell2.col] = temp
      
      // 检查是否有匹配
      const hasMatch = this.checkMatch(cell1.row, cell1.col) || 
                       this.checkMatch(cell2.row, cell2.col)
      
      if (hasMatch) {
        this.moves--
        this.processMatches()
        this.checkGameState()
      } else {
        // 换回来
        const temp = this.grid[cell1.row][cell1.col]
        this.grid[cell1.row][cell1.col] = this.grid[cell2.row][cell2.col]
        this.grid[cell2.row][cell2.col] = temp
      }
    }
  }
  
  // 处理匹配
  processMatches() {
    let matched = []
    
    // 查找所有匹配
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        if (this.checkMatch(i, j)) {
          matched.push({ row: i, col: j })
        }
      }
    }
    
    if (matched.length > 0) {
      // 计分
      this.score += matched.length * 10
      if (matched.length > 3) {
        this.score += (matched.length - 3) * 20 // 连击奖励
      }
      
      // 消除并下落
      this.clearAndDrop(matched)
    }
  }
  
  // 清除并下落
  clearAndDrop(matched) {
    // 清除
    matched.forEach(({ row, col }) => {
      this.grid[row][col] = -1
    })
    
    // 下落
    for (let col = 0; col < this.gridSize; col++) {
      let writeRow = this.gridSize - 1
      for (let row = this.gridSize - 1; row >= 0; row--) {
        if (this.grid[row][col] !== -1) {
          this.grid[writeRow][col] = this.grid[row][col]
          writeRow--
        }
      }
      // 填充新宝石
      while (writeRow >= 0) {
        this.grid[writeRow][col] = Math.floor(Math.random() * this.gemColors.length)
        writeRow--
      }
    }
    
    // 连锁反应
    setTimeout(() => {
      this.processMatches()
    }, 200)
  }
  
  // 检查游戏状态
  checkGameState() {
    if (this.moves <= 0) {
      this.state = 'gameover'
    }
  }
  
  // 开始游戏
  start() {
    console.log('游戏启动...')
    this.state = 'menu'
    this.bindEvents()
    this.render()
  }
  
  // 开始游戏（从菜单）
  startGame() {
    console.log('开始新游戏')
    this.state = 'playing'
    this.score = 0
    this.level = 1
    this.moves = 20
    this.initGrid()
    this.render()
    this.gameLoop()
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
      console.warn('Canvas 上下文为空，无法渲染')
      return
    }
    
    // 清空画布
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
    console.log('渲染菜单...')
    
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 48px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('开心消消乐', this.width / 2, this.height / 3)
    
    this.ctx.font = '24px Arial'
    this.ctx.fillText('点击屏幕开始', this.width / 2, this.height / 2)
    
    // 开始按钮
    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.fillRect(this.width / 2 - 100, this.height / 2 + 50, 200, 60)
    this.ctx.fillStyle = '#fff'
    this.ctx.fillText('开始游戏', this.width / 2, this.height / 2 + 90)
    
    console.log('菜单渲染完成')
  }
  
  // 渲染游戏
  renderGame() {
    // 绘制信息栏
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '20px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(`分数：${this.score}`, 20, 40)
    this.ctx.textAlign = 'right'
    this.ctx.fillText(`步数：${this.moves}`, this.width - 20, 40)
    
    // 绘制网格背景
    this.ctx.fillStyle = '#16213e'
    this.ctx.fillRect(
      this.offsetX - 5,
      this.offsetY - 5,
      this.cellSize * this.gridSize + 10,
      this.cellSize * this.gridSize + 10
    )
    
    // 绘制宝石
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const x = this.offsetX + j * this.cellSize
        const y = this.offsetY + i * this.cellSize
        
        if (this.grid[i][j] >= 0) {
          // 宝石
          this.ctx.fillStyle = this.gemColors[this.grid[i][j]]
          this.ctx.beginPath()
          this.ctx.arc(
            x + this.cellSize / 2,
            y + this.cellSize / 2,
            this.cellSize / 2 - 5,
            0,
            Math.PI * 2
          )
          this.ctx.fill()
          
          // 高光
          this.ctx.fillStyle = 'rgba(255,255,255,0.3)'
          this.ctx.beginPath()
          this.ctx.arc(
            x + this.cellSize / 2 - 5,
            y + this.cellSize / 2 - 5,
            this.cellSize / 6,
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
    
    // 广告按钮
    this.renderAdButtons()
  }
  
  // 渲染广告按钮
  renderAdButtons() {
    const btnY = this.height - 80
    
    // 复活按钮（游戏结束时显示）
    if (this.state === 'gameover') {
      this.ctx.fillStyle = '#FFD700'
      this.ctx.fillRect(this.width / 2 - 80, btnY, 160, 50)
      this.ctx.fillStyle = '#000'
      this.ctx.font = '18px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('看广告复活', this.width / 2, btnY + 32)
    }
    
    // 提示按钮
    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.fillRect(20, btnY, 100, 40)
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '16px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('看广告 +5 步', 70, btnY + 26)
  }
  
  // 渲染游戏结束
  renderGameOver() {
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 40px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('游戏结束', this.width / 2, this.height / 3)
    
    this.ctx.font = '28px Arial'
    this.ctx.fillText(`最终分数：${this.score}`, this.width / 2, this.height / 2)
    
    this.ctx.font = '20px Arial'
    this.ctx.fillText('看广告可以复活！', this.width / 2, this.height / 2 + 60)
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
      this.gameLoop()
    }
  }
  
  // 使用广告奖励
  useAdReward(type) {
    if (type === 'extraMoves') {
      this.moves += 5
      this.state = 'playing'
      this.gameLoop()
    } else if (type === 'revive') {
      this.moves = 10
      this.state = 'playing'
      this.gameLoop()
    }
  }
}
