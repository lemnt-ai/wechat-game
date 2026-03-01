/**
 * 微信广告管理器
 * 
 * 微信小游戏支持的广告类型：
 * 1. 激励视频广告 - 收益最高，用户主动观看
 * 2. 插屏广告 - 全屏广告，适合关卡切换
 * 3. Banner 广告 - 底部横幅
 * 4. 格子广告 - 小格子形式
 * 5. 原生模板广告 - 自定义样式
 */

export default class AdManager {
  constructor() {
    this.rewardedAd = null      // 激励视频广告
    this.interstitialAd = null  // 插屏广告
    this.bannerAd = null        // Banner 广告
    this.gridAd = null          // 格子广告
    
    // 广告配置
    this.adUnitIds = {
      rewarded: '',      // 在微信后台创建后填写
      interstitial: '',  // 在微信后台创建后填写
      banner: '',        // 在微信后台创建后填写
      grid: ''           // 在微信后台创建后填写
    }
    
    // 广告冷却时间（防止频繁展示）
    this.adCooldowns = {
      rewarded: 0,
      interstitial: 0
    }
    this.cooldownTime = 30000 // 30 秒冷却
    
    // 回调函数
    this.callbacks = {
      onReward: null,
      onClose: null,
      onError: null
    }
  }
  
  // 初始化广告
  init() {
    console.log('初始化广告管理器...')
    
    // 检查是否支持广告
    if (!wx.createRewardedVideoAd) {
      console.warn('当前环境不支持广告')
      return
    }
    
    // 初始化激励视频广告
    this.initRewardedAd()
    
    // 初始化插屏广告
    this.initInterstitialAd()
    
    // 初始化 Banner 广告
    this.initBannerAd()
    
    console.log('广告管理器初始化完成')
  }
  
  // 初始化激励视频广告
  initRewardedAd() {
    if (!this.adUnitIds.rewarded) {
      console.warn('未配置激励视频广告 ID')
      return
    }
    
    try {
      this.rewardedAd = wx.createRewardedVideoAd({
        adUnitId: this.adUnitIds.rewarded
      })
      
      // 广告加载成功
      this.rewardedAd.onLoad(() => {
        console.log('激励视频广告加载成功')
      })
      
      // 广告加载失败
      this.rewardedAd.onError((err) => {
        console.error('激励视频广告加载失败', err)
        // 广告失败后需要重新创建
        this.rewardedAd = null
      })
      
      // 用户观看完广告
      this.rewardedAd.onClose((res) => {
        console.log('激励视频广告关闭', res)
        
        if (res && res.isEnded) {
          // 用户完整观看了广告，给予奖励
          this.onReward('rewarded')
        } else {
          // 用户中途退出，不给奖励
          console.log('用户未完整观看广告')
        }
        
        // 重置广告实例（微信要求每次展示后重新创建）
        setTimeout(() => {
          this.initRewardedAd()
        }, 1000)
      })
      
    } catch (err) {
      console.error('创建激励视频广告失败', err)
    }
  }
  
  // 初始化插屏广告
  initInterstitialAd() {
    if (!this.adUnitIds.interstitial) {
      console.warn('未配置插屏广告 ID')
      return
    }
    
    if (!wx.createInterstitialAd) {
      console.warn('当前版本不支持插屏广告')
      return
    }
    
    try {
      this.interstitialAd = wx.createInterstitialAd({
        adUnitId: this.adUnitIds.interstitial
      })
      
      this.interstitialAd.onLoad(() => {
        console.log('插屏广告加载成功')
      })
      
      this.interstitialAd.onError((err) => {
        console.error('插屏广告加载失败', err)
        this.interstitialAd = null
      })
      
      this.interstitialAd.onClose(() => {
        console.log('插屏广告关闭')
        setTimeout(() => {
          this.initInterstitialAd()
        }, 1000)
      })
      
    } catch (err) {
      console.error('创建插屏广告失败', err)
    }
  }
  
  // 初始化 Banner 广告
  initBannerAd() {
    if (!this.adUnitIds.banner) {
      console.warn('未配置 Banner 广告 ID')
      return
    }
    
    if (!wx.createBannerAd) {
      console.warn('当前版本不支持 Banner 广告')
      return
    }
    
    try {
      const { windowWidth, windowHeight } = wx.getSystemInfoSync()
      
      this.bannerAd = wx.createBannerAd({
        adUnitId: this.adUnitIds.banner,
        adIntervals: 30, // 30 秒自动刷新
        style: {
          left: 0,
          top: windowHeight - 80,
          width: windowWidth
        }
      })
      
      this.bannerAd.onLoad(() => {
        console.log('Banner 广告加载成功')
      })
      
      this.bannerAd.onError((err) => {
        console.error('Banner 广告加载失败', err)
      })
      
    } catch (err) {
      console.error('创建 Banner 广告失败', err)
    }
  }
  
  // 初始化格子广告
  initGridAd() {
    if (!this.adUnitIds.grid) {
      console.warn('未配置格子广告 ID')
      return
    }
    
    if (!wx.createGridAd) {
      console.warn('当前版本不支持格子广告')
      return
    }
    
    try {
      const { windowWidth, windowHeight } = wx.getSystemInfoSync()
      
      this.gridAd = wx.createGridAd({
        adUnitId: this.adUnitIds.grid,
        adIntervals: 30,
        style: {
          left: 10,
          top: windowHeight - 200,
          width: windowWidth - 20
        }
      })
      
      this.gridAd.onLoad(() => {
        console.log('格子广告加载成功')
      })
      
      this.gridAd.onError((err) => {
        console.error('格子广告加载失败', err)
      })
      
    } catch (err) {
      console.error('创建格子广告失败', err)
    }
  }
  
  // 显示激励视频广告
  showRewardedAd() {
    // 检查冷却时间
    if (Date.now() < this.adCooldowns.rewarded) {
      console.log('广告冷却中，请稍后再试')
      return false
    }
    
    if (!this.rewardedAd) {
      console.warn('激励视频广告未初始化')
      return false
    }
    
    try {
      this.rewardedAd.show()
        .catch(err => {
          console.error('显示激励视频广告失败', err)
          // 失败后重新初始化
          this.initRewardedAd()
        })
      
      // 设置冷却时间
      this.adCooldowns.rewarded = Date.now() + this.cooldownTime
      
      return true
    } catch (err) {
      console.error('显示激励视频广告异常', err)
      return false
    }
  }
  
  // 显示插屏广告
  showInterstitialAd() {
    // 检查冷却时间
    if (Date.now() < this.adCooldowns.interstitial) {
      console.log('插屏广告冷却中')
      return false
    }
    
    if (!this.interstitialAd) {
      console.warn('插屏广告未初始化')
      return false
    }
    
    try {
      this.interstitialAd.show()
        .catch(err => {
          console.error('显示插屏广告失败', err)
          this.initInterstitialAd()
        })
      
      // 设置冷却时间（插屏广告冷却更长）
      this.adCooldowns.interstitial = Date.now() + this.cooldownTime * 2
      
      return true
    } catch (err) {
      console.error('显示插屏广告异常', err)
      return false
    }
  }
  
  // 隐藏 Banner 广告
  hideBannerAd() {
    if (this.bannerAd) {
      this.bannerAd.hide()
    }
  }
  
  // 显示 Banner 广告
  showBannerAd() {
    if (this.bannerAd) {
      this.bannerAd.show()
    }
  }
  
  // 销毁广告
  destroy() {
    if (this.rewardedAd) {
      this.rewardedAd.destroy()
      this.rewardedAd = null
    }
    if (this.interstitialAd) {
      this.interstitialAd.destroy()
      this.interstitialAd = null
    }
    if (this.bannerAd) {
      this.bannerAd.destroy()
      this.bannerAd = null
    }
    if (this.gridAd) {
      this.gridAd.destroy()
      this.gridAd = null
    }
  }
  
  // 设置回调
  setCallback(type, callback) {
    if (type === 'onReward') {
      this.callbacks.onReward = callback
    } else if (type === 'onClose') {
      this.callbacks.onClose = callback
    } else if (type === 'onError') {
      this.callbacks.onError = callback
    }
  }
  
  // 奖励处理
  onReward(adType) {
    console.log('广告奖励发放', adType)
    if (this.callbacks.onReward) {
      this.callbacks.onReward(adType)
    }
  }
  
  // 更新广告配置
  updateAdUnitIds(config) {
    this.adUnitIds = { ...this.adUnitIds, ...config }
    console.log('广告配置已更新', this.adUnitIds)
    // 重新初始化
    this.init()
  }
}

/**
 * 广告最佳实践建议：
 * 
 * 1. 激励视频广告：
 *    - 在用户需要帮助时提供（复活、额外步数、双倍奖励）
 *    - 不要强制观看，给用户选择权
 *    - 确保奖励及时发放
 * 
 * 2. 插屏广告：
 *    - 在自然断点展示（关卡结束、游戏结束）
 *    - 避免在游戏过程中突然弹出
 *    - 控制展示频率（建议每 2-3 关一次）
 * 
 * 3. Banner 广告：
 *    - 放在界面底部，不遮挡游戏内容
 *    - 可以常驻显示
 *    - 收益较低但稳定
 * 
 * 4. 注意事项：
 *    - 遵守微信广告规范
 *    - 不要诱导点击
 *    - 合理控制广告频率，避免用户流失
 *    - 测试时可使用测试广告 ID
 */
